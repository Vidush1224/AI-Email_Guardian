"""
Pydantic models for AI service request/response.
"""

from pydantic import BaseModel
from typing import List, Optional


class EmailAnalysisRequest(BaseModel):
    email_body: str = ""
    subject: str = ""
    sender: str = ""
    recipients: str = ""


class EmailAnalysisResponse(BaseModel):
    ai_phishing_score: float = 0.0
    detected_signals: List[str] = []
    explanation: str = ""
    confidence: float = 0.0


class HealthResponse(BaseModel):
    status: str
    service: str
