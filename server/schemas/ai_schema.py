from typing import Literal

from pydantic import BaseModel, Field, SecretStr

from schemas.screening_test_schema import QuestionCreate


class GenerateQuestionsRequest(BaseModel):
    provider: Literal["openai", "gemini"]
    # SecretStr keeps the key out of reprs and logs; it is only unwrapped to call the provider
    api_key: SecretStr = Field(min_length=8, max_length=300)
    model: str | None = Field(default=None, max_length=80)
    prompt: str = Field(min_length=5, max_length=2000)
    count: int = Field(default=5, ge=1, le=20)


class GenerateQuestionsResponse(BaseModel):
    questions: list[QuestionCreate]
    skipped: int = 0
    model: str
