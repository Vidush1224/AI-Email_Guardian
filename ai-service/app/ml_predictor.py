"""
ML Predictor Module for Email Fraud Detection
Loads trained model artifacts and provides inference for the MCP orchestrator.
"""

import os
import re
import logging
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"


class MLPredictor:
    """
    Production inference using trained ML models.
    Loads saved model artifacts and provides predict() method
    for integration with the MCP orchestrator.
    """

    def __init__(self):
        self.model = None
        self.tfidf = None
        self.feature_engineer = None
        self.label_encoder = None
        self.model_loaded = False
        self.model_info = {}
        self._load_models()

    def _load_models(self):
        """Load saved model artifacts from disk."""
        try:
            import joblib
            from scipy.sparse import hstack, csr_matrix

            model_path = MODEL_DIR / "best_model.joblib"
            tfidf_path = MODEL_DIR / "tfidf_vectorizer.joblib"
            fe_path = MODEL_DIR / "feature_engineer.joblib"
            le_path = MODEL_DIR / "label_encoder.joblib"
            report_path = MODEL_DIR / "training_report.json"

            if not model_path.exists():
                logger.warning("[MLPredictor] No trained model found. Run train.py first.")
                return

            self.model = joblib.load(model_path)
            self.tfidf = joblib.load(tfidf_path)
            self.feature_engineer = joblib.load(fe_path)
            self.label_encoder = joblib.load(le_path)

            # Load training report for metadata
            if report_path.exists():
                import json
                with open(report_path) as f:
                    self.model_info = json.load(f)

            self.model_loaded = True
            logger.info(f"[MLPredictor] Model loaded: {self.model_info.get('best_model', 'unknown')}")
            logger.info(f"[MLPredictor] Labels: {list(self.label_encoder.classes_)}")

        except Exception as e:
            logger.error(f"[MLPredictor] Failed to load models: {e}")
            self.model_loaded = False

    def predict(self, email_body: str, subject: str = "",
                sender: str = "") -> Dict:
        """
        Run ML prediction on an email.
        Returns: dict with ml_score, predicted_label, confidence, signals
        """
        if not self.model_loaded:
            return self._fallback_result()

        try:
            from scipy.sparse import hstack, csr_matrix

            # Combine subject and body
            text = f"{subject} {email_body}"

            # TF-IDF features
            X_tfidf = self.tfidf.transform([text])

            # Hand-crafted features
            import pandas as pd
            X_custom = self.feature_engineer.extract(pd.Series([text]))
            X_custom_sparse = csr_matrix(X_custom)

            # Combine
            X = hstack([X_tfidf, X_custom_sparse])

            # Predict
            prediction = self.model.predict(X)[0]
            predicted_label = self.label_encoder.inverse_transform([prediction])[0]

            # Get confidence (probability if available)
            confidence = 0.75  # default
            if hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(X)[0]
                confidence = float(max(proba))

            # Calculate risk score based on prediction
            ml_score = self._label_to_score(predicted_label, confidence)

            # Generate signals
            signals = self._generate_signals(predicted_label, sender, email_body, subject)

            return {
                'ml_score': ml_score,
                'predicted_label': predicted_label,
                'confidence': round(confidence, 3),
                'signals': signals,
                'model_type': self.model_info.get('best_model', 'unknown')
            }

        except Exception as e:
            logger.error(f"[MLPredictor] Prediction failed: {e}")
            return self._fallback_result()

    def _label_to_score(self, label: str, confidence: float) -> float:
        """Convert predicted label to a risk score 0-100."""
        label_lower = str(label).lower()

        # Map labels to base risk scores
        if any(w in label_lower for w in ['phishing', 'spam', 'fraud', 'malicious']):
            base_score = 85
        elif 'safe' in label_lower or 'legitimate' in label_lower or 'ham' in label_lower:
            base_score = 5
        else:
            base_score = 50

        # Adjust by confidence
        if base_score > 50:
            score = base_score * confidence
        else:
            score = base_score * (2 - confidence)

        return round(min(max(score, 0), 100), 1)

    def _generate_signals(self, label: str, sender: str,
                          body: str, subject: str) -> List[str]:
        """Generate descriptive signal names from ML prediction."""
        signals = []
        label_lower = str(label).lower()

        if any(w in label_lower for w in ['phishing', 'spam', 'fraud', 'malicious']):
            signals.append('ml_phishing_detected')

            text = f"{subject} {body}".lower()
            if any(w in text for w in ['urgent', 'immediately', 'asap']):
                signals.append('ml_urgency_detected')
            if any(w in text for w in ['verify', 'confirm', 'password', 'credential']):
                signals.append('ml_credential_request')
            if any(w in text for w in ['click here', 'click below', 'click the link']):
                signals.append('ml_suspicious_link')
            if any(w in text for w in ['wire transfer', 'gift card', 'invoice', 'payment']):
                signals.append('ml_financial_fraud')
            if any(w in text for w in ['suspend', 'deactivat', 'terminat', 'block']):
                signals.append('ml_threat_language')
        else:
            signals.append('ml_legitimate_email')

        return signals

    def _fallback_result(self) -> Dict:
        """Return default result when model is not available."""
        return {
            'ml_score': 0.0,
            'predicted_label': 'unknown',
            'confidence': 0.0,
            'signals': [],
            'model_type': 'none'
        }

    def get_status(self) -> Dict:
        """Return the current model status."""
        if not self.model_loaded:
            return {
                'loaded': False,
                'message': 'No trained model available. Run train.py to train models.'
            }

        return {
            'loaded': True,
            'model_type': self.model_info.get('best_model', 'unknown'),
            'training_date': self.model_info.get('training_date', 'unknown'),
            'label_classes': self.model_info.get('label_classes', []),
            'best_accuracy': self.model_info.get('results', {}).get(
                self.model_info.get('best_model', ''), {}
            ).get('accuracy', 0),
            'best_f1': self.model_info.get('results', {}).get(
                self.model_info.get('best_model', ''), {}
            ).get('f1_weighted', 0),
        }
