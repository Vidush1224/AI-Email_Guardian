"""
ML Model Trainer for Email Fraud Detection
Trains classifiers on the real Kaggle Phishing Email dataset using
TF-IDF features + hand-crafted features. Evaluates multiple models
and saves the best one.
"""

import sys
import io
import os
import re
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    f1_score, precision_score, recall_score
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from scipy.sparse import hstack, csr_matrix
import joblib

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"


class FeatureEngineer:
    """
    Extracts hand-crafted features from email text to complement TF-IDF.
    These capture structural/behavioral signals that bag-of-words misses.
    """

    URGENCY_WORDS = [
        'urgent', 'immediately', 'asap', 'right away', 'act now',
        'deadline', 'expires', 'suspend', 'deactivat', 'terminat',
        'within 24', 'within 48', 'last chance', 'final notice'
    ]

    FINANCIAL_WORDS = [
        'wire transfer', 'bank transfer', 'gift card', 'invoice',
        'payment due', 'bitcoin', 'cryptocurrency', 'western union',
        'moneygram', 'bank account', 'routing number', 'iban'
    ]

    CREDENTIAL_WORDS = [
        'verify your', 'confirm your identity', 'enter your password',
        'update your account', 'click here', 'log in', 'sign in',
        'validate your', 'submit your credentials', 'security verification'
    ]

    SOCIAL_ENGINEERING = [
        'do not tell', "don't share", 'keep this between',
        'confidential', 'personal favor', 'help me with',
        'i am in a meeting', 'cannot call', 'trust me'
    ]

    def extract(self, texts: pd.Series) -> np.ndarray:
        """Extract hand-crafted features from a series of email texts."""
        features = []
        for text in texts:
            text_lower = str(text).lower()
            feat = self._extract_single(text_lower)
            features.append(feat)
        return np.array(features, dtype=np.float64)

    def _extract_single(self, text: str) -> list:
        """Extract features for a single email."""
        return [
            # Length features
            len(text),
            len(text.split()),
            np.mean([len(w) for w in text.split()]) if text.split() else 0,

            # Urgency signals
            sum(1 for w in self.URGENCY_WORDS if w in text),

            # Financial signals
            sum(1 for w in self.FINANCIAL_WORDS if w in text),

            # Credential harvesting signals
            sum(1 for w in self.CREDENTIAL_WORDS if w in text),

            # Social engineering signals
            sum(1 for w in self.SOCIAL_ENGINEERING if w in text),

            # URL count
            len(re.findall(r'https?://[^\s]+', text)),

            # Email address count
            len(re.findall(r'[\w.\-]+@[\w.\-]+\.\w+', text)),

            # Exclamation marks / caps ratio
            text.count('!'),
            sum(1 for c in text if c.isupper()) / max(len(text), 1),

            # Number of dollar signs / amounts
            len(re.findall(r'\$[\d,]+', text)),

            # Suspicious patterns
            1.0 if re.search(r'click\s+(here|below|the\s+link)', text) else 0.0,
            1.0 if re.search(r'verify\s+your\s+(identity|account)', text) else 0.0,
            1.0 if 'password' in text else 0.0,
            1.0 if any(w in text for w in ['bitcoin', 'crypto', 'gift card']) else 0.0,

            # Sentence count
            len(re.findall(r'[.!?]+', text)),
        ]

    @property
    def feature_names(self) -> list:
        return [
            'text_length', 'word_count', 'avg_word_length',
            'urgency_count', 'financial_count', 'credential_count',
            'social_engineering_count', 'url_count', 'email_count',
            'exclamation_count', 'caps_ratio', 'dollar_amount_count',
            'has_click_here', 'has_verify_identity', 'has_password',
            'has_crypto_giftcard', 'sentence_count'
        ]


class EmailFraudTrainer:
    """
    End-to-end ML training pipeline for email fraud detection.
    Uses real Kaggle Phishing Email dataset.
    """

    def __init__(self, data_path: str = None):
        self.data_path = data_path or str(DATA_DIR / "Phishing_Email.csv")
        self.feature_engineer = FeatureEngineer()
        self.label_encoder = LabelEncoder()
        self.tfidf = TfidfVectorizer(
            max_features=15000,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
            strip_accents='unicode',
            sublinear_tf=True
        )
        self.models = {}
        self.results = {}
        self.best_model_name = None
        self.best_model = None

    def load_data(self) -> pd.DataFrame:
        """Load and preprocess the Phishing Email dataset."""
        print(f"\n[*] Loading dataset from: {self.data_path}")

        df = pd.read_csv(self.data_path)
        print(f"   Raw dataset shape: {df.shape}")
        print(f"   Columns: {list(df.columns)}")

        # Handle different column naming conventions
        text_col = None
        label_col = None

        for col in df.columns:
            col_lower = col.lower().strip()
            if 'text' in col_lower or 'body' in col_lower or 'content' in col_lower or 'message' in col_lower:
                text_col = col
            if 'type' in col_lower or 'label' in col_lower or 'class' in col_lower or 'category' in col_lower:
                label_col = col

        if text_col is None or label_col is None:
            # Fallback: assume first column is text, last is label
            text_col = df.columns[0]
            label_col = df.columns[-1]
            print(f"   [!] Auto-detected columns: text='{text_col}', label='{label_col}'")

        print(f"   Using text column: '{text_col}'")
        print(f"   Using label column: '{label_col}'")

        # Rename for consistency
        df = df.rename(columns={text_col: 'text', label_col: 'label'})

        # Clean data
        df = df.dropna(subset=['text', 'label'])
        df['text'] = df['text'].astype(str).str.strip()
        df = df[df['text'].str.len() > 10]  # Remove too-short entries

        # Show label distribution
        print(f"\n[*] Label distribution:")
        for label, count in df['label'].value_counts().items():
            pct = count / len(df) * 100
            print(f"   {label}: {count:,} ({pct:.1f}%)")

        print(f"\n   Clean dataset shape: {df.shape}")
        return df

    def prepare_features(self, df: pd.DataFrame):
        """Create TF-IDF + hand-crafted feature matrix."""
        print("\n[*] Preparing features...")

        # Encode labels
        y = self.label_encoder.fit_transform(df['label'])
        print(f"   Label encoding: {dict(zip(self.label_encoder.classes_, self.label_encoder.transform(self.label_encoder.classes_)))}")

        # TF-IDF features
        print("   Fitting TF-IDF vectorizer (max_features=15000, bigrams)...")
        X_tfidf = self.tfidf.fit_transform(df['text'])
        print(f"   TF-IDF matrix shape: {X_tfidf.shape}")

        # Hand-crafted features
        print("   Extracting hand-crafted features...")
        X_custom = self.feature_engineer.extract(df['text'])
        X_custom_sparse = csr_matrix(X_custom)
        print(f"   Custom features shape: {X_custom_sparse.shape}")

        # Combine
        X = hstack([X_tfidf, X_custom_sparse])
        print(f"   Combined feature matrix: {X.shape}")

        return X, y

    def train(self):
        """Run the full training pipeline."""
        print("=" * 60)
        print("  EMAIL FRAUD ML MODEL TRAINING PIPELINE")
        print("=" * 60)

        # Load data
        df = self.load_data()

        # Prepare features
        X, y = self.prepare_features(df)

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        print(f"\n[*] Data split:")
        print(f"   Training set: {X_train.shape[0]:,} samples")
        print(f"   Test set:     {X_test.shape[0]:,} samples")

        # Define models
        models = {
            'RandomForest': RandomForestClassifier(
                n_estimators=200,
                max_depth=50,
                min_samples_split=5,
                min_samples_leaf=2,
                n_jobs=-1,
                random_state=42,
                class_weight='balanced'
            ),
            'LogisticRegression': LogisticRegression(
                max_iter=1000,
                C=1.0,
                solver='lbfgs',
                class_weight='balanced',
                random_state=42
            ),
            'LinearSVM': LinearSVC(
                max_iter=2000,
                C=1.0,
                class_weight='balanced',
                random_state=42
            ),
            'GradientBoosting': GradientBoostingClassifier(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.1,
                min_samples_split=5,
                random_state=42
            ),
        }

        # Train and evaluate each model
        print("\n" + "=" * 60)
        print("  TRAINING MODELS")
        print("=" * 60)

        best_f1 = 0
        for name, model in models.items():
            print(f"\n{'-' * 50}")
            print(f"  Training: {name}")
            print(f"{'-' * 50}")

            # Train
            model.fit(X_train, y_train)

            # Predict
            y_pred = model.predict(X_test)

            # Metrics
            acc = accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, average='weighted')
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            cm = confusion_matrix(y_test, y_pred)
            report = classification_report(
                y_test, y_pred,
                target_names=self.label_encoder.classes_,
                output_dict=True
            )

            # Cross-validation (3-fold for speed on large data)
            print(f"  Running 3-fold cross-validation...")
            cv_scores = cross_val_score(
                model, X_train, y_train,
                cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=42),
                scoring='f1_weighted',
                n_jobs=-1
            )

            self.models[name] = model
            self.results[name] = {
                'accuracy': float(acc),
                'f1_weighted': float(f1),
                'precision_weighted': float(precision),
                'recall_weighted': float(recall),
                'cv_f1_mean': float(cv_scores.mean()),
                'cv_f1_std': float(cv_scores.std()),
                'confusion_matrix': cm.tolist(),
                'classification_report': report
            }

            print(f"  [OK] Accuracy:   {acc:.4f}")
            print(f"  [OK] F1 Score:   {f1:.4f}")
            print(f"  [OK] Precision:  {precision:.4f}")
            print(f"  [OK] Recall:     {recall:.4f}")
            print(f"  [OK] CV F1:      {cv_scores.mean():.4f} (+/-{cv_scores.std():.4f})")
            print(f"\n  Classification Report:")
            print(classification_report(y_test, y_pred,
                                        target_names=self.label_encoder.classes_))

            if f1 > best_f1:
                best_f1 = f1
                self.best_model_name = name
                self.best_model = model

        # Summary
        print("\n" + "=" * 60)
        print("  MODEL COMPARISON SUMMARY")
        print("=" * 60)
        print(f"\n{'Model':<25} {'Accuracy':>10} {'F1':>10} {'CV F1':>12}")
        print("-" * 57)
        for name, r in self.results.items():
            marker = "  << BEST" if name == self.best_model_name else ""
            print(f"{name:<25} {r['accuracy']:>10.4f} {r['f1_weighted']:>10.4f} "
                  f"{r['cv_f1_mean']:>7.4f}+/-{r['cv_f1_std']:.4f}{marker}")

        print(f"\n>>> Best model: {self.best_model_name} (F1={best_f1:.4f})")

        # Save
        self._save_models()

        return self.results

    def _save_models(self):
        """Save the best model and all artifacts."""
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        print(f"\n[*] Saving model artifacts to: {MODEL_DIR}")

        # Save best model
        best_model_path = MODEL_DIR / "best_model.joblib"
        joblib.dump(self.best_model, best_model_path)
        print(f"   Saved: best_model.joblib ({best_model_path.stat().st_size / 1024:.0f} KB)")

        # Save TF-IDF vectorizer
        tfidf_path = MODEL_DIR / "tfidf_vectorizer.joblib"
        joblib.dump(self.tfidf, tfidf_path)
        print(f"   Saved: tfidf_vectorizer.joblib ({tfidf_path.stat().st_size / 1024:.0f} KB)")

        # Save feature engineer
        fe_path = MODEL_DIR / "feature_engineer.joblib"
        joblib.dump(self.feature_engineer, fe_path)
        print(f"   Saved: feature_engineer.joblib")

        # Save label encoder
        le_path = MODEL_DIR / "label_encoder.joblib"
        joblib.dump(self.label_encoder, le_path)
        print(f"   Saved: label_encoder.joblib")

        # Save training report
        report = {
            'training_date': datetime.now().isoformat(),
            'dataset': self.data_path,
            'best_model': self.best_model_name,
            'label_classes': list(self.label_encoder.classes_),
            'tfidf_features': self.tfidf.max_features,
            'custom_features': self.feature_engineer.feature_names,
            'results': {}
        }
        for name, r in self.results.items():
            report['results'][name] = {
                'accuracy': r['accuracy'],
                'f1_weighted': r['f1_weighted'],
                'precision_weighted': r['precision_weighted'],
                'recall_weighted': r['recall_weighted'],
                'cv_f1_mean': r['cv_f1_mean'],
                'cv_f1_std': r['cv_f1_std'],
                'confusion_matrix': r['confusion_matrix']
            }

        report_path = MODEL_DIR / "training_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"   Saved: training_report.json")

        print(f"\n[OK] All model artifacts saved successfully!")


def main():
    """Run the training pipeline."""
    trainer = EmailFraudTrainer()
    results = trainer.train()
    return results


if __name__ == "__main__":
    main()
