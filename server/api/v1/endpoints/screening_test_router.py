from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.deps import get_current_user
from enums.cohort_enums import CampusInviteStatus
from enums.user_enums import UserType
from models.campus_invite_model import CampusInvite
from models.recruiter_model import Recruiter
from models.screening_test_model import Question, ScreeningTest
from models.student_model import Student
from models.test_submission_model import TestSubmission
from schemas.screening_test_schema import (
    QuestionFull,
    QuestionPublic,
    ScreeningTestCreateRequest,
    ScreeningTestDetail,
    ScreeningTestSummary,
    ShortlistRequest,
    SubmissionResult,
    SubmissionRow,
    SubmitAnswersRequest,
)

router = APIRouter(prefix="/screening-tests", tags=["Screening Tests"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_screening_test(
    data: ScreeningTestCreateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> ScreeningTestDetail:
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can create screening tests",
        )

    invite = await CampusInvite.get(data.campus_invite_id)
    if not invite or invite.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campus invite not found")
    if invite.status != CampusInviteStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only create a test for a cohort that accepted your invite",
        )

    test = ScreeningTest(
        campus_invite_id=invite.id,
        cohort_id=invite.cohort_id,
        recruiter_id=user.id,
        title=data.title,
        description=data.description,
        questions=[Question(**q.model_dump()) for q in data.questions],
    )
    await test.insert()
    return _to_detail(test, is_owner=True, already_submitted=False)


def _to_detail(
    test: ScreeningTest,
    is_owner: bool,
    already_submitted: bool,
    my_score: int | None = None,
    my_total: int | None = None,
) -> ScreeningTestDetail:
    questions = (
        [QuestionFull(id=q.id, text=q.text, options=q.options, correct_index=q.correct_index) for q in test.questions]
        if is_owner
        else [QuestionPublic(id=q.id, text=q.text, options=q.options) for q in test.questions]
    )
    return ScreeningTestDetail(
        id=str(test.id),
        campus_invite_id=str(test.campus_invite_id),
        cohort_id=str(test.cohort_id),
        recruiter_id=str(test.recruiter_id),
        title=test.title,
        description=test.description,
        questions=questions,
        created_at=test.created_at,
        is_owner=is_owner,
        already_submitted=already_submitted,
        my_score=my_score,
        my_total=my_total,
    )


async def _require_access(test_id: PydanticObjectId, user: Student | Recruiter) -> tuple[ScreeningTest, bool]:
    test = await ScreeningTest.get(test_id)
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screening test not found")

    is_owner = user.user_type == UserType.RECRUITER and test.recruiter_id == user.id
    is_cohort_member = user.user_type == UserType.STUDENT and user.cohort_id == test.cohort_id
    if not (is_owner or is_cohort_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this screening test",
        )
    return test, is_owner


@router.get("")
async def list_screening_tests(
    cohort_id: PydanticObjectId | None = Query(None),
    campus_invite_id: PydanticObjectId | None = Query(None),
    user: Student | Recruiter = Depends(get_current_user),
) -> list[ScreeningTestSummary]:
    filters = []
    if user.user_type == UserType.RECRUITER:
        filters.append(ScreeningTest.recruiter_id == user.id)
    elif user.user_type == UserType.STUDENT:
        if user.cohort_id is None:
            return []
        filters.append(ScreeningTest.cohort_id == user.cohort_id)

    if cohort_id:
        filters.append(ScreeningTest.cohort_id == cohort_id)
    if campus_invite_id:
        filters.append(ScreeningTest.campus_invite_id == campus_invite_id)

    tests = await ScreeningTest.find(*filters).sort("-created_at").to_list()
    result = []
    for test in tests:
        recruiter = await Recruiter.get(test.recruiter_id)
        result.append(
            ScreeningTestSummary(
                id=str(test.id),
                campus_invite_id=str(test.campus_invite_id),
                cohort_id=str(test.cohort_id),
                recruiter_id=str(test.recruiter_id),
                company_name=recruiter.company_name if recruiter else "Unknown company",
                title=test.title,
                description=test.description,
                question_count=len(test.questions),
                created_at=test.created_at,
            )
        )
    return result


@router.get("/{test_id}")
async def get_screening_test(
    test_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> ScreeningTestDetail:
    test, is_owner = await _require_access(test_id, user)

    submission = None
    if user.user_type == UserType.STUDENT:
        submission = await TestSubmission.find_one(
            TestSubmission.test_id == test.id,
            TestSubmission.student_id == user.id,
        )

    return _to_detail(
        test,
        is_owner=is_owner,
        already_submitted=submission is not None,
        my_score=submission.score if submission else None,
        my_total=submission.total if submission else None,
    )


@router.post("/{test_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_screening_test(
    test_id: PydanticObjectId,
    data: SubmitAnswersRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> SubmissionResult:
    if user.user_type != UserType.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can take this test")

    test, _ = await _require_access(test_id, user)

    if len(data.answers) != len(test.questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected {len(test.questions)} answers, got {len(data.answers)}",
        )

    existing = await TestSubmission.find_one(
        TestSubmission.test_id == test.id,
        TestSubmission.student_id == user.id,
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already submitted this test")

    score = sum(
        1 for answer, question in zip(data.answers, test.questions) if answer == question.correct_index
    )

    submission = TestSubmission(
        test_id=test.id,
        student_id=user.id,
        answers=data.answers,
        score=score,
        total=len(test.questions),
    )
    await submission.insert()
    return SubmissionResult(score=score, total=len(test.questions))


@router.get("/{test_id}/submissions")
async def list_submissions(
    test_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> list[SubmissionRow]:
    test, is_owner = await _require_access(test_id, user)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recruiter who created this test can view submissions",
        )

    submissions = await TestSubmission.find(TestSubmission.test_id == test.id).sort("-score").to_list()
    rows = []
    for submission in submissions:
        student = await Student.get(submission.student_id)
        rows.append(
            SubmissionRow(
                student_id=str(submission.student_id),
                student_name=student.name if student else "Unknown student",
                reg_no=student.reg_no if student else 0,
                score=submission.score,
                total=submission.total,
                shortlisted=submission.shortlisted,
                submitted_at=submission.submitted_at,
            )
        )
    return rows


@router.patch("/{test_id}/submissions/{student_id}/shortlist")
async def toggle_shortlist(
    test_id: PydanticObjectId,
    student_id: PydanticObjectId,
    data: ShortlistRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> SubmissionRow:
    test, is_owner = await _require_access(test_id, user)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recruiter who created this test can shortlist candidates",
        )

    submission = await TestSubmission.find_one(
        TestSubmission.test_id == test.id,
        TestSubmission.student_id == student_id,
    )
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    submission.shortlisted = data.shortlisted
    await submission.save()

    student = await Student.get(submission.student_id)
    return SubmissionRow(
        student_id=str(submission.student_id),
        student_name=student.name if student else "Unknown student",
        reg_no=student.reg_no if student else 0,
        score=submission.score,
        total=submission.total,
        shortlisted=submission.shortlisted,
        submitted_at=submission.submitted_at,
    )
