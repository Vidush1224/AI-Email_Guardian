"""
AI Phishing Detector Module
NLP-based detection of phishing signals: urgency, impersonation, financial requests,
AI-generated text patterns, social engineering cues.
"""

import re
from typing import List, Tuple


class MLPhishingModel:
    """
    Scikit-learn based machine learning pipeline for phishing detection.
    Acts as a placeholder that trains a small dummy model on initialization
    if a pre-trained model file is not found.
    """
    def __init__(self, model_path="phishing_rf_model.joblib"):
        import os
        self.model_path = model_path
        self.pipeline = None
        
        try:
            import joblib
            if os.path.exists(self.model_path):
                self.pipeline = joblib.load(self.model_path)
            else:
                self._train_dummy_model()
        except ImportError:
            pass # scikit-learn not installed, will degrade gracefully
            
    def _train_dummy_model(self):
        import pandas as pd
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.pipeline import Pipeline
        
        # Tiny dummy dataset for the placeholder model
        data = [
            ("Please verify your account credentials immediately", 1),
            ("Urgent wire transfer request for invoice", 1),
            ("Click here to claim your gift card", 1),
            ("Your account will be suspended if you don't respond", 1),
            ("Update on the Q3 marketing campaign", 0),
            ("Lunch is ready in the breakroom", 0),
            ("Attached is the report for last week", 0),
            ("Can we schedule a meeting for tomorrow?", 0)
        ]
        df = pd.DataFrame(data, columns=["text", "label"])
        
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=100)),
            ('clf', RandomForestClassifier(n_estimators=10, random_state=42))
        ])
        
        self.pipeline.fit(df["text"], df["label"])

    def predict_risk(self, text: str) -> float:
        """Returns a risk score between 0 and 100 based on ML prediction probability"""
        if not self.pipeline:
            return 0.0
            
        try:
            # Predict probability of class 1 (phishing)
            proba = self.pipeline.predict_proba([text])[0]
            if len(proba) > 1:
                return float(proba[1] * 100.0)
        except Exception:
            pass
        return 0.0

class PhishingDetector:
    """
    Detects phishing signals using a hybrid approach:
    1. NLP heuristics and pattern matching
    2. Scikit-learn Machine Learning pipeline
    Analyzes: urgency, impersonation, financial requests, AI text markers, social engineering.
    """
    def __init__(self):
        self.ml_model = MLPhishingModel()


    # Urgency patterns with weights
    URGENCY_PATTERNS = [
        (r'\b(urgent|immediately|right away|asap|act now)\b', 15, "urgency_language"),
        (r'\bwithin\s+\d+\s+(hour|day|minute)', 12, "time_pressure"),
        (r'\b(deadline|expires?|expiring|expiration)\b', 10, "deadline_pressure"),
        (r'\b(suspend|deactivat|terminat|revok|disabl)\w*', 15, "suspension_threat"),
        (r'\b(fail(ure)?|unable) to (respond|comply|verify|complete)', 12, "failure_threat"),
    ]

    # Credential harvesting patterns
    CREDENTIAL_PATTERNS = [
        (r'\b(verify|confirm|validate)\s+(your|the)\s+(identity|account|credentials)', 25, "credential_harvesting"),
        (r'\b(enter|provide|submit)\s+(your\s+)?(password|credentials|login)', 25, "credential_request"),
        (r'\b(click\s+(here|below|the\s+link))\b', 10, "suspicious_link_text"),
        (r'\bhttps?://[^\s]+\b', 5, "contains_url"),
        (r'\b(log\s*in|sign\s*in)\s+(to|at)\b', 8, "login_redirect"),
    ]

    # Financial request patterns
    FINANCIAL_PATTERNS = [
        (r'\b(wire\s+transfer|bank\s+transfer|money\s+transfer)\b', 25, "wire_transfer_request"),
        (r'\b(gift\s+card|prepaid\s+card|itunes\s+card)\b', 30, "gift_card_scam"),
        (r'\b(invoice|payment\s+due|amount\s+due|outstanding\s+balance)\b', 15, "financial_request"),
        (r'\b(bank(ing)?\s+(detail|information|account))\b', 15, "banking_details_request"),
        (r'\b(reimburse|refund|compensation)\b', 10, "financial_incentive"),
    ]

    # Social engineering / impersonation
    SOCIAL_ENGINEERING_PATTERNS = [
        (r'\b(do not|don\'t)\s+(discuss|share|tell|mention|forward)\b', 20, "confidentiality_pressure"),
        (r'\b(keep\s+this\s+(between|confidential|private|quiet))\b', 15, "secrecy_request"),
        (r'\b(i\s+am\s+in\s+a\s+meeting|cannot\s+call|out\s+of\s+office)\b', 12, "unavailability_pretext"),
        (r'\b(personal\s+favor|help\s+me\s+with\s+something)\b', 10, "personal_appeal"),
    ]

    # AI-generated text heuristic patterns
    AI_TEXT_PATTERNS = [
        (r'\bas part of our ongoing commitment\b', 15, "ai_generated_text"),
        (r'\bwe are (pleased|excited) to (announce|inform|notify)\b', 8, "ai_generated_text"),
        (r'\bin (order|an effort) to (ensure|maintain|protect)\b', 10, "ai_generated_text"),
        (r'\bplease (be advised|note|be informed) that\b', 8, "ai_generated_text"),
        (r'\bthis (initiative|process|procedure) is designed to\b', 10, "ai_generated_text"),
        (r'\bthank you for your (cooperation|understanding|patience|attention)\b', 5, "ai_generated_text"),
        (r'\b(highest standards?|industry (best practices|regulations|standards))\b', 8, "formal_corporate_language"),
    ]

    ALL_PATTERNS = (
        URGENCY_PATTERNS +
        CREDENTIAL_PATTERNS +
        FINANCIAL_PATTERNS +
        SOCIAL_ENGINEERING_PATTERNS +
        AI_TEXT_PATTERNS
    )

    def detect(self, email_body: str, subject: str = "") -> Tuple[float, List[str]]:
        """
        Analyze email text for phishing signals.
        Returns: (score 0-100, list of signal names)
        """
        text = f"{subject} {email_body}".lower()
        signals = []
        score = 0.0

        for pattern, weight, signal_name in self.ALL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                if signal_name not in signals:
                    signals.append(signal_name)
                    score += weight

        # Bonus: multiple signal categories = higher risk (compounding)
        categories = set()
        if any(s in signals for s in ["urgency_language", "time_pressure", "deadline_pressure"]):
            categories.add("urgency")
        if any(s in signals for s in ["credential_harvesting", "credential_request"]):
            categories.add("credential")
        if any(s in signals for s in ["wire_transfer_request", "gift_card_scam", "financial_request"]):
            categories.add("financial")
        if any(s in signals for s in ["confidentiality_pressure", "secrecy_request"]):
            categories.add("social_engineering")
        if any(s in signals for s in ["ai_generated_text"]):
            categories.add("ai_text")

        # Multi-category compound risk
        if len(categories) >= 3:
            score += 15

        # Incorporate Scikit-Learn ML Model Score
        ml_score = self.ml_model.predict_risk(text)
        
        if ml_score > 60:
            if "ml_high_risk_prediction" not in signals:
                signals.append("ml_high_risk_prediction")
        
        # Combine scores (use max to be safe)
        final_score = max(score, ml_score)

        return min(final_score, 100.0), signals
