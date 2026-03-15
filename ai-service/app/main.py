"""
AI Email Guardian - Python AI Service
FastAPI application for deep AI-based email fraud analysis.
Provides: phishing detection, NLP analysis, LLM-based reasoning, ML model inference, MCP tool orchestration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import EmailAnalysisRequest, EmailAnalysisResponse, HealthResponse
from app.mcp_orchestrator import MCPOrchestrator

app = FastAPI(
    title="AI Email Guardian - AI Service",
    description="Deep AI analysis for email fraud detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = MCPOrchestrator()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", service="ai-email-guardian")


@app.post("/analyze", response_model=EmailAnalysisResponse)
async def analyze_email(request: EmailAnalysisRequest):
    """
    Full deep AI analysis pipeline.
    Orchestrates all AI tools: phishing detection, NLP analysis, LLM reasoning.
    Returns structured explainable output.
    """
    result = orchestrator.analyze(request)
    return result


@app.post("/analyze/phishing", response_model=EmailAnalysisResponse)
async def analyze_phishing(request: EmailAnalysisRequest):
    """Phishing-only detection."""
    result = orchestrator.analyze_phishing_only(request)
    return result


@app.get("/model/status")
async def model_status():
    """Check the status of the trained ML model."""
    return orchestrator.ml_predictor.get_status()


@app.post("/model/retrain")
async def retrain_model():
    """Retrain the ML model (blocking operation)."""
    from app.ml_trainer import EmailFraudTrainer
    try:
        trainer = EmailFraudTrainer()
        results = trainer.train()
        # Reload the predictor with new model
        orchestrator.ml_predictor._load_models()
        return {
            "status": "success",
            "best_model": trainer.best_model_name,
            "accuracy": results[trainer.best_model_name]['accuracy'],
            "f1_score": results[trainer.best_model_name]['f1_weighted']
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
