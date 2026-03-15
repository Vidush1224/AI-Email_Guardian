"""
Sensitive Data Detector (NLP Module)
Detects PII and confidential information using NLP entity patterns.
Complements the regex-based detection in the Java backend.
"""

import re
from typing import List, Tuple


class SensitiveDataDetectorNLP:
    """
    NLP-enhanced sensitive data detection.
    Focuses on contextual patterns that regex alone might miss.
    """

    # Contextual patterns (regex + surrounding context)
    CONTEXTUAL_PATTERNS = [
        # SSN in context
        (r'(social\s+security|ssn|ss#?)\s*[:\-]?\s*\d{3}[\-\s]?\d{2}[\-\s]?\d{4}', "ssn_in_context"),
        # Bank account in context
        (r'(account\s*(number|#|no\.?))\s*[:\-]?\s*\d{8,17}', "bank_account_in_context"),
        # Routing number in context
        (r'(routing\s*(number|#|no\.?)|aba)\s*[:\-]?\s*\d{9}', "routing_number_in_context"),
        # Credit card with context
        (r'(card\s*(number|#)|credit\s+card|visa|mastercard|amex)\s*[:\-]?\s*\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}',
         "credit_card_in_context"),
        # API keys / tokens
        (r'(api[_\s\-]?key|access[_\s\-]?token|secret[_\s\-]?key|bearer)\s*[:\=]\s*\S{16,}', "api_key_in_context"),
        # Passwords
        (r'(password|passwd|pwd|pass)\s*[:\=]\s*\S{4,}', "password_in_context"),
        # Internal documents
        (r'\b(confidential|internal\s+only|restricted|classified|proprietary)\b', "confidential_marker"),
    ]

    def detect(self, text: str) -> Tuple[float, List[str]]:
        """
        Detect sensitive data with contextual NLP patterns.
        Returns: (score 0-100, list of signal names)
        """
        if not text:
            return 0.0, []

        signals = []
        score = 0.0

        for pattern, signal in self.CONTEXTUAL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                if signal not in signals:
                    signals.append(signal)
                    score += 20

        # Multiple sensitive data types = higher risk
        if len(signals) >= 3:
            score += 15

        return min(score, 100), signals
