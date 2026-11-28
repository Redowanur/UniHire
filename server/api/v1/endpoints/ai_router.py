from fastapi import APIRouter, Depends, HTTPException, status

from core.deps import get_current_user
from enums.user_enums import UserType
from models.recruiter_model import Recruiter
from models.student_model import Student
from schemas.ai_schema import GenerateQuestionsRequest, GenerateQuestionsResponse
from schemas.screening_test_schema import QuestionCreate
from services.ai_service import DEFAULT_MODELS, AIError, generate_questions

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/generate-questions")
async def generate_screening_questions(
    data: GenerateQuestionsRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> GenerateQuestionsResponse:
    """Drafts questions with the recruiter's own OpenAI or Gemini key. Nothing is saved here:
    the recruiter reviews the draft in the test form first. The key is never stored."""
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only recruiters can generate questions")

    try:
        questions, skipped = await generate_questions(
            data.provider, data.api_key.get_secret_value(), data.model, data.prompt, data.count
        )
    except AIError as error:
        raise HTTPException(status_code=error.status, detail=error.message)

    return GenerateQuestionsResponse(
        questions=[QuestionCreate(**q) for q in questions],
        skipped=skipped,
        model=(data.model or "").strip() or DEFAULT_MODELS[data.provider],
    )
