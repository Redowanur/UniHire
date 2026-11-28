import asyncio
import logging
import random

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.deps import get_current_user
from enums.cohort_enums import CampusInviteStatus
from enums.user_enums import UserType
from models.campus_invite_model import CampusInvite
from models.recruiter_model import Recruiter
from models.screening_test_model import Question, ScreeningTest
from models.student_model import Student
from models.test_attempt_model import MAX_VIOLATIONS, TestAttempt, Violation
from models.test_submission_model import TestSubmission
from schemas.screening_test_schema import (
    QuestionFull,
    QuestionPublic,
    ScreeningTestCreateRequest,
    ScreeningTestDetail,
    ScreeningTestUpdateRequest,
    ScreeningTestSummary,
    ShortlistRequest,
    StartAttemptResponse,
    SubmissionResult,
    SubmissionRow,
    SubmitAnswersRequest,
    ViolationRequest,
    ViolationResponse,
)
from services.email_service import send_exam_email
from services.live_hub import hub
from utils.helpers import as_aware_utc, utcnow

logger = logging.getLogger("screening_tests")

router = APIRouter(prefix="/screening-tests", tags=["Screening Tests"])

# Answers sent in the last seconds of the exam (auto-submit at the deadline) still count
SUBMIT_GRACE_SECONDS = 20


def _phase(test: ScreeningTest) -> str:
    now = utcnow()
    if now < test.starts_at:
        return "upcoming"
    if now >= test.ends_at:
        return "ended"
    return "live"


async def _email_cohort(test: ScreeningTest, recruiter: Recruiter, updated: bool = False) -> None:
    """Sends the exam details to every student in the cohort. Runs in the background."""
    students = await Student.find(Student.cohort_id == test.cohort_id).to_list()
    for student in students:
        try:
            await send_exam_email(
                to=student.email,
                name=student.name,
                company=recruiter.company_name,
                title=test.title,
                description=test.description,
                start=test.starts_at,
                end=test.ends_at,
                duration_minutes=test.duration_minutes,
                question_count=len(test.questions),
                test_id=str(test.id),
                updated=updated,
            )
        except Exception:
            logger.exception("Couldn't email exam details to %s", student.email)


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

    start = as_aware_utc(data.start_time)
    if (utcnow() - start).total_seconds() > 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The start time can't be in the past",
        )

    test = ScreeningTest(
        campus_invite_id=invite.id,
        cohort_id=invite.cohort_id,
        recruiter_id=user.id,
        title=data.title,
        description=data.description,
        questions=[Question(**q.model_dump()) for q in data.questions],
        start_time=start,
        duration_minutes=data.duration_minutes,
    )
    await test.insert()

    # Fire and forget: SMTP can be slow and must not hold up the response
    asyncio.create_task(_email_cohort(test, user))

    return _to_detail(test, is_owner=True, already_submitted=False)


def _to_detail(
    test: ScreeningTest,
    is_owner: bool,
    already_submitted: bool,
    my_score: int | None = None,
    my_total: int | None = None,
    attempt_count: int = 0,
) -> ScreeningTestDetail:
    # Students never get questions here; they only receive them (in their own order) from /start
    questions = (
        [
            QuestionFull(
                id=q.id, text=q.text, options=q.options, correct_index=q.correct_index, code=q.code, language=q.language
            )
            for q in test.questions
        ]
        if is_owner
        else []
    )
    return ScreeningTestDetail(
        id=str(test.id),
        campus_invite_id=str(test.campus_invite_id),
        cohort_id=str(test.cohort_id),
        recruiter_id=str(test.recruiter_id),
        title=test.title,
        description=test.description,
        questions=questions,
        start_time=test.starts_at,
        duration_minutes=test.duration_minutes,
        ends_at=test.ends_at,
        server_time=utcnow(),
        phase=_phase(test),
        created_at=test.created_at,
        is_owner=is_owner,
        already_submitted=already_submitted,
        attempt_count=attempt_count,
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
                start_time=test.starts_at,
                duration_minutes=test.duration_minutes,
                ends_at=test.ends_at,
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

    attempt_count = await TestAttempt.find(TestAttempt.test_id == test.id).count() if is_owner else 0

    return _to_detail(
        test,
        is_owner=is_owner,
        attempt_count=attempt_count,
        already_submitted=submission is not None,
        my_score=submission.score if submission else None,
        my_total=submission.total if submission else None,
    )


@router.patch("/{test_id}")
async def update_screening_test(
    test_id: PydanticObjectId,
    data: ScreeningTestUpdateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> ScreeningTestDetail:
    test, is_owner = await _require_access(test_id, user)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recruiter who created this test can edit it",
        )

    phase = _phase(test)
    if phase == "ended":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This exam has ended and can't be edited")

    changes = data.model_dump(exclude_unset=True)
    attempt_count = await TestAttempt.find(TestAttempt.test_id == test.id).count()
    schedule_or_questions_changed = False

    if "questions" in changes and changes["questions"] is not None:
        if attempt_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Questions can't be changed once a student has started the exam",
            )
        test.questions = [Question(**q) for q in changes["questions"]]
        schedule_or_questions_changed = True

    if changes.get("start_time") is not None:
        new_start = as_aware_utc(changes["start_time"])
        if new_start != test.starts_at:
            if phase == "live":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The exam is already running, so its start time can't be moved",
                )
            if (utcnow() - new_start).total_seconds() > 60:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The start time can't be in the past")
            test.start_time = new_start
            schedule_or_questions_changed = True

    if changes.get("duration_minutes") is not None and changes["duration_minutes"] != test.duration_minutes:
        test.duration_minutes = changes["duration_minutes"]
        schedule_or_questions_changed = True

    if test.ends_at <= utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That would end the exam in the past. Pick a later start or a longer duration",
        )

    if changes.get("title") is not None:
        test.title = changes["title"]
    if "description" in changes:
        test.description = changes["description"] or None

    await test.save()

    if schedule_or_questions_changed:
        asyncio.create_task(_email_cohort(test, user, updated=True))

    return _to_detail(test, is_owner=True, already_submitted=False, attempt_count=attempt_count)


async def _require_student(user: Student | Recruiter) -> Student:
    if user.user_type != UserType.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can take this test")
    return user


@router.post("/{test_id}/start")
async def start_attempt(
    test_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> StartAttemptResponse:
    """Opens (or resumes) the student's sitting and returns questions in their private order."""
    student = await _require_student(user)
    test, _ = await _require_access(test_id, student)

    phase = _phase(test)
    if phase == "upcoming":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This exam hasn't started yet")
    if phase == "ended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This exam has ended")

    if await TestSubmission.find_one(
        TestSubmission.test_id == test.id, TestSubmission.student_id == student.id
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already submitted this test")

    attempt = await TestAttempt.find_one(
        TestAttempt.test_id == test.id, TestAttempt.student_id == student.id
    )
    if attempt is None:
        order = [q.id for q in test.questions]
        random.shuffle(order)
        attempt = TestAttempt(test_id=test.id, student_id=student.id, question_order=order)
        await attempt.insert()
    elif attempt.terminated:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your exam was ended because of repeated rule violations",
        )

    by_id = {q.id: q for q in test.questions}
    questions = [
        QuestionPublic(
            id=qid,
            text=by_id[qid].text,
            options=by_id[qid].options,
            code=by_id[qid].code,
            language=by_id[qid].language,
        )
        for qid in attempt.question_order
        if qid in by_id
    ]
    return StartAttemptResponse(
        questions=questions,
        ends_at=test.ends_at,
        server_time=utcnow(),
        violation_count=len(attempt.violations),
        max_violations=MAX_VIOLATIONS,
    )


@router.post("/{test_id}/violations")
async def report_violation(
    test_id: PydanticObjectId,
    data: ViolationRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> ViolationResponse:
    student = await _require_student(user)
    test, _ = await _require_access(test_id, student)

    attempt = await TestAttempt.find_one(
        TestAttempt.test_id == test.id, TestAttempt.student_id == student.id
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No exam in progress")

    if not attempt.terminated and _phase(test) == "live":
        attempt.violations.append(Violation(type=data.type))
        if len(attempt.violations) >= MAX_VIOLATIONS:
            attempt.terminated = True
        await attempt.save()
        hub.set_violations(str(test.id), str(student.id), len(attempt.violations))
        await hub.notify_recruiters(
            str(test.id),
            {
                "type": "violation",
                "student_id": str(student.id),
                "kind": data.type,
                "count": len(attempt.violations),
                "terminated": attempt.terminated,
            },
        )

    return ViolationResponse(
        violation_count=len(attempt.violations),
        max_violations=MAX_VIOLATIONS,
        terminated=attempt.terminated,
    )


@router.post("/{test_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_screening_test(
    test_id: PydanticObjectId,
    data: SubmitAnswersRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> SubmissionResult:
    student = await _require_student(user)
    test, _ = await _require_access(test_id, student)

    attempt = await TestAttempt.find_one(
        TestAttempt.test_id == test.id, TestAttempt.student_id == student.id
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Start the exam before submitting")

    if (utcnow() - test.ends_at).total_seconds() > SUBMIT_GRACE_SECONDS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This exam has ended")

    existing = await TestSubmission.find_one(
        TestSubmission.test_id == test.id,
        TestSubmission.student_id == student.id,
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already submitted this test")

    # Stored in the recruiter's question order; -1 means unanswered
    answers = [data.answers.get(q.id, -1) for q in test.questions]
    score = sum(1 for answer, q in zip(answers, test.questions) if answer == q.correct_index)

    submission = TestSubmission(
        test_id=test.id,
        student_id=student.id,
        answers=answers,
        score=score,
        total=len(test.questions),
    )
    await submission.insert()
    await hub.notify_recruiters(str(test.id), {"type": "submitted", "student_id": str(student.id)})
    return SubmissionResult(score=score, total=len(test.questions))


async def _row(submission: TestSubmission) -> SubmissionRow:
    student = await Student.get(submission.student_id)
    attempt = await TestAttempt.find_one(
        TestAttempt.test_id == submission.test_id, TestAttempt.student_id == submission.student_id
    )
    return SubmissionRow(
        student_id=str(submission.student_id),
        student_name=student.name if student else "Unknown student",
        reg_no=student.reg_no if student else 0,
        score=submission.score,
        total=submission.total,
        shortlisted=submission.shortlisted,
        violation_count=len(attempt.violations) if attempt else 0,
        submitted_at=submission.submitted_at,
    )


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
    return [await _row(s) for s in submissions]


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
    return await _row(submission)
