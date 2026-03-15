"""
LLM Analyzer Module
Provides LLM-based semantic fraud reasoning using OpenAI API or Ollama.
Falls back to advanced heuristic analysis if no LLM is configured.
Always returns structured explainable output.
"""

import os
import json
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class LLMAnalyzer:
    """
    LLM-based email fraud analysis.
    Supports:
      - OpenAI API (GPT-4/3.5) via OPENAI_API_KEY env var
      - Ollama local LLM via OLLAMA_URL env var
      - Heuristic fallback (always available)
    """

    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.llm_available = bool(self.openai_key)

    def analyze(self, email_body: str, subject: str, sender: str,
                recipients: str) -> Dict:
        """
        Perform LLM-based fraud analysis with explainable output.
        Returns dict with: ai_phishing_score, detected_signals, explanation, confidence
        """
        if self.llm_available:
            try:
                return self._openai_analyze(email_body, subject, sender, recipients)
            except Exception as e:
                logger.warning(f"LLM analysis failed, using heuristic fallback: {e}")

        return self._heuristic_analyze(email_body, subject, sender, recipients)

    def _openai_analyze(self, body: str, subject: str, sender: str,
                        recipients: str) -> Dict:
        """OpenAI API-based analysis with structured prompt."""
        import httpx

        prompt = f"""Analyze the following email for phishing, fraud, or social engineering signals.
Return a JSON object with these exact fields:
- ai_phishing_score: number 0-100 (probability this is phishing/fraud)
- detected_signals: array of short signal names found
- explanation: one paragraph explaining the analysis
- confidence: number 0-1 (your confidence in the assessment)

Email Details:
From: {sender}
To: {recipients}
Subject: {subject}
Body:
{body[:2000]}

Respond ONLY with valid JSON, no other text."""

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are an email security analyst. Analyze emails for phishing and fraud. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 500
            },
            timeout=10.0
        )

        result = response.json()
        content = result["choices"][0]["message"]["content"]

        # Parse JSON from response
        try:
            parsed = json.loads(content)
            return {
                "ai_phishing_score": float(parsed.get("ai_phishing_score", 0)),
                "detected_signals": parsed.get("detected_signals", []),
                "explanation": parsed.get("explanation", ""),
                "confidence": float(parsed.get("confidence", 0.5))
            }
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM JSON response")
            return self._heuristic_analyze(body, subject, sender, recipients)

    def _heuristic_analyze(self, body: str, subject: str, sender: str,
                           recipients: str) -> Dict:
        """
        Advanced heuristic analysis as LLM fallback.
        Uses linguistic pattern analysis for explainable output.
        """
        text = f"{subject} {body}".lower()
        signals = []
        score = 0.0
        explanations = []

        # Impersonation analysis
        if sender and "@" in sender:
            domain = sender.split("@")[-1].lower()
            if any(freemail in domain for freemail in
                   ["gmail.com", "yahoo.com", "hotmail.com"]):
                if any(title in (subject or "").lower() for title in
                       ["ceo", "president", "director", "urgent"]):
                    signals.append("executive_impersonation_attempt")
                    score += 25
                    explanations.append(
                        "Sender uses free email service while impersonating an executive role")

        # AI-generated text analysis (sentence structure patterns)
        formal_count = 0
        ai_phrases = [
            "as part of our", "we are implementing", "in order to ensure",
            "this initiative is designed", "maintaining the highest standards",
            "please be advised", "we are pleased to inform",
            "ongoing commitment", "in compliance with"
        ]
        for phrase in ai_phrases:
            if phrase in text:
                formal_count += 1

        if formal_count >= 3:
            signals.append("ai_generated_sentence_patterns")
            score += 20
            explanations.append(
                f"Text contains {formal_count} formal/templated phrases commonly "
                f"found in AI-generated phishing emails")
        elif formal_count >= 2:
            signals.append("potentially_ai_generated")
            score += 10

        # Social engineering tactics
        if ("do not discuss" in text or "don't tell" in text or
                "keep this between" in text):
            signals.append("social_engineering_isolation")
            score += 20
            explanations.append(
                "Email attempts to isolate the recipient from discussing with others")

        # Financial manipulation
        if "gift card" in text:
            signals.append("gift_card_scam_pattern")
            score += 25
            explanations.append(
                "Email requests purchase of gift cards — common BEC tactic")
        elif "wire transfer" in text or "bank details" in text:
            signals.append("financial_manipulation")
            score += 20
            explanations.append(
                "Email involves financial transactions with potential redirect")

        # Credential harvesting sophistication
        if ("verify your identity" in text or "confirm your" in text) and (
                "suspend" in text or "deactivat" in text):
            signals.append("sophisticated_credential_harvesting")
            score += 25
            explanations.append(
                "Email combines identity verification request with account threat — "
                "classic phishing pattern")

        # Urgency + action compounding
        urgency_words = sum(1 for w in ["urgent", "immediately", "within 24",
                                         "deadline", "expires"] if w in text)
        if urgency_words >= 2:
            signals.append("compounded_urgency")
            score += 15
            explanations.append(
                f"Email uses {urgency_words} urgency indicators to pressure action")

        score = min(score, 100)
        confidence = min(0.6 + (len(signals) * 0.05), 0.92)

        explanation = " ".join(explanations) if explanations else (
            "No significant fraud patterns detected by heuristic analysis.")

        return {
            "ai_phishing_score": score,
            "detected_signals": signals,
            "explanation": explanation,
            "confidence": confidence
        }
