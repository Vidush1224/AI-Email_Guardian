"""
MCP (Model Context Protocol) Orchestrator
Implements tool-calling orchestration pattern for AI fraud analysis.
Coordinates: phishing detection, LLM analysis, sensitive data detection.
"""

import logging
import time
from typing import List
from app.models import EmailAnalysisRequest, EmailAnalysisResponse
from app.phishing_detector import PhishingDetector
from app.llm_analyzer import LLMAnalyzer
from app.sensitive_data_detector import SensitiveDataDetectorNLP
from app.ml_predictor import MLPredictor

logger = logging.getLogger(__name__)


class MCPOrchestrator:
    """
    MCP-style tool orchestrator.
    Coordinates AI analysis tools and aggregates results into
    unified explainable output.

    Tools:
      - tool.phishing_detection: NLP phishing pattern analysis
      - tool.llm_fraud_reasoning: LLM-based semantic fraud analysis
      - tool.sensitive_data_detection: NLP sensitive data detection
    """

    def __init__(self):
        self.phishing_detector = PhishingDetector()
        self.llm_analyzer = LLMAnalyzer()
        self.sensitive_data_nlp = SensitiveDataDetectorNLP()
        self.ml_predictor = MLPredictor()
        tool_count = 4 if self.ml_predictor.model_loaded else 3
        logger.info(f"[MCP] Orchestrator initialized with {tool_count} analysis tools")
        if self.ml_predictor.model_loaded:
            logger.info(f"[MCP] ML model loaded: {self.ml_predictor.model_info.get('best_model', 'unknown')}")

    def analyze(self, request: EmailAnalysisRequest) -> EmailAnalysisResponse:
        """
        Full analysis pipeline using all MCP tools.
        Returns aggregated, explainable fraud analysis.
        """
        start = time.time()
        all_signals: List[str] = []
        explanations: List[str] = []

        # ===== Tool 1: Phishing Detection =====
        logger.info("[MCP] Running tool.phishing_detection...")
        phishing_score, phishing_signals = self.phishing_detector.detect(
            request.email_body, request.subject
        )
        all_signals.extend(phishing_signals)
        logger.info(f"[MCP] Phishing score={phishing_score}, signals={len(phishing_signals)}")

        # ===== Tool 2: LLM Fraud Reasoning =====
        logger.info("[MCP] Running tool.llm_fraud_reasoning...")
        llm_result = self.llm_analyzer.analyze(
            request.email_body, request.subject,
            request.sender, request.recipients
        )
        llm_score = llm_result["ai_phishing_score"]
        all_signals.extend(llm_result["detected_signals"])
        if llm_result["explanation"]:
            explanations.append(llm_result["explanation"])
        logger.info(f"[MCP] LLM score={llm_score}, confidence={llm_result['confidence']}")

        # ===== Tool 3: Sensitive Data NLP =====
        logger.info("[MCP] Running tool.sensitive_data_detection...")
        sensitive_score, sensitive_signals = self.sensitive_data_nlp.detect(
            request.email_body
        )
        all_signals.extend(sensitive_signals)
        logger.info(f"[MCP] Sensitive data score={sensitive_score}, signals={len(sensitive_signals)}")

        # ===== Tool 4: ML Model Prediction =====
        ml_score = 0.0
        if self.ml_predictor.model_loaded:
            logger.info("[MCP] Running tool.ml_model_prediction...")
            ml_result = self.ml_predictor.predict(
                request.email_body, request.subject, request.sender
            )
            ml_score = ml_result['ml_score']
            all_signals.extend(ml_result['signals'])
            logger.info(f"[MCP] ML score={ml_score}, label={ml_result['predicted_label']}, "
                        f"confidence={ml_result['confidence']}")

        # ===== Aggregate Results =====
        # Weighted combination of all AI analysis tools
        if self.ml_predictor.model_loaded:
            # 4-tool weighted average
            final_score = (
                phishing_score * 0.30 +
                llm_score * 0.30 +
                ml_score * 0.25 +
                sensitive_score * 0.15
            )
        else:
            # 3-tool fallback (original weights)
            final_score = (phishing_score * 0.4) + (llm_score * 0.4) + (sensitive_score * 0.2)
        final_score = min(max(final_score, 0), 100)

        # De-duplicate signals
        unique_signals = list(dict.fromkeys(all_signals))

        # Build explanation
        explanation = " ".join(explanations) if explanations else self._generate_explanation(
            unique_signals, final_score
        )

        confidence = llm_result.get("confidence", 0.6)
        duration = time.time() - start

        logger.info(f"[MCP] Final AI score={final_score:.1f}, confidence={confidence:.2f}, "
                     f"signals={len(unique_signals)}, duration={duration:.3f}s")

        return EmailAnalysisResponse(
            ai_phishing_score=round(final_score, 1),
            detected_signals=unique_signals,
            explanation=explanation,
            confidence=round(confidence, 2)
        )

    def analyze_phishing_only(self, request: EmailAnalysisRequest) -> EmailAnalysisResponse:
        """Phishing-specific analysis using NLP detector only."""
        score, signals = self.phishing_detector.detect(
            request.email_body, request.subject
        )
        return EmailAnalysisResponse(
            ai_phishing_score=round(score, 1),
            detected_signals=signals,
            explanation=self._generate_explanation(signals, score),
            confidence=0.7
        )

    def _generate_explanation(self, signals: List[str], score: float) -> str:
        """Generate human-readable explanation from signals."""
        if not signals:
            return "No significant fraud indicators detected by AI analysis."

        signal_descriptions = {
            "urgency_language": "urgency-based pressure tactics",
            "credential_harvesting": "credential harvesting attempt",
            "credential_request": "direct request for login credentials",
            "wire_transfer_request": "wire transfer financial request",
            "gift_card_scam": "gift card purchase scam pattern",
            "confidentiality_pressure": "social isolation tactics",
            "ai_generated_text": "AI-generated text patterns",
            "suspension_threat": "account suspension threat",
            "financial_request": "financial transaction request",
            "executive_impersonation_attempt": "executive impersonation",
            "social_engineering_isolation": "social engineering isolation",
            "sophisticated_credential_harvesting": "sophisticated credential harvesting",
            "ai_generated_sentence_patterns": "AI-generated linguistic patterns",
        }

        described = [signal_descriptions.get(s, s.replace("_", " ")) for s in signals[:5]]
        signals_text = ", ".join(described)

        if score > 70:
            severity = "High-risk"
        elif score > 40:
            severity = "Moderate-risk"
        else:
            severity = "Low-risk"

        return (f"{severity} email detected with {len(signals)} fraud signal(s): "
                f"{signals_text}.")
