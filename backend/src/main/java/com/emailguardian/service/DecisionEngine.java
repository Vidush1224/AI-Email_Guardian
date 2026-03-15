package com.emailguardian.service;

import com.emailguardian.model.FraudAnalysis;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Decision Engine.
 * Maps risk scores to actions: ALLOW (0-30), WARN (31-60), STRONG_WARNING (61-80), BLOCK (81-100).
 */
@Service
@Slf4j
public class DecisionEngine {

    /**
     * Determine action based on risk score.
     */
    public FraudAnalysis.ActionType decide(double riskScore) {
        FraudAnalysis.ActionType action;
        if (riskScore <= 30) {
            action = FraudAnalysis.ActionType.ALLOW;
        } else if (riskScore <= 60) {
            action = FraudAnalysis.ActionType.WARN;
        } else if (riskScore <= 80) {
            action = FraudAnalysis.ActionType.STRONG_WARNING;
        } else {
            action = FraudAnalysis.ActionType.BLOCK;
        }
        log.info("[DECISION] score={} action={}", String.format("%.1f", riskScore), action);
        return action;
    }

    /**
     * Get human-readable description for the action.
     */
    public String getActionDescription(FraudAnalysis.ActionType action) {
        return switch (action) {
            case ALLOW -> "Email allowed — no significant threats detected.";
            case WARN -> "Warning — potential risks identified. Review recommended.";
            case STRONG_WARNING -> "Strong warning — multiple risk factors detected. Manual review required.";
            case BLOCK -> "Email blocked — high-confidence fraud or threat detected.";
        };
    }
}
