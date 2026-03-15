"""
Model Training Entry Point
Run: python train.py
Downloads (if needed) and trains ML models on the real Kaggle Phishing Email dataset.
"""

import sys
import os
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ml_trainer import EmailFraudTrainer


def main():
    print("=" * 60)
    print("  AI EMAIL GUARDIAN - MODEL TRAINING")
    print("  Training on Real Kaggle Phishing Email Dataset")
    print("=" * 60)

    trainer = EmailFraudTrainer()
    results = trainer.train()

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\nBest model: {trainer.best_model_name}")
    print(f"Accuracy:   {results[trainer.best_model_name]['accuracy']:.4f}")
    print(f"F1 Score:   {results[trainer.best_model_name]['f1_weighted']:.4f}")
    print(f"\nModel artifacts saved to: ai-service/models/")
    print("You can now start the AI service with: uvicorn app.main:app --port 8000")


if __name__ == "__main__":
    main()
