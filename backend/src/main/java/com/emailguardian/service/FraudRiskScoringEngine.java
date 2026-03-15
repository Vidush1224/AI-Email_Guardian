package com.emailguardian.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Fraud Risk Scoring Engine.
 * Aggregates outputs from all detection modules using configurable weights.
 * Returns total score AND per-factor breakdown.
 */
@Service
@Slf4j
public class FraudRiskScoringEngine {

    @Value("${fraud-detection.weights.phishing:0.30}")
    private double phishingWeight;

    @Value("${fraud-detection.weights.sensitive-data:0.25}")
    private double sensitiveDataWeight;

    @Value("${fraud-detection.weights.domain-risk:0.20}")
    private double domainRiskWeight;

    @Value("${fraud-detection.weights.attachment-risk:0.15}")
    private double attachmentRiskWeight;

    @Value("${fraud-detection.weights.metadata-risk:0.10}")
    private double metadataRiskWeight;

    /**
     * Calculate weighted aggregate risk score with factor breakdown.
     */
    public RiskScoreResult calculateScore(double phishingScore, double sensitiveDataScore,
                                           double domainRiskScore, double attachmentRiskScore,
                                           double metadataRiskScore) {
        double totalScore =
            (phishingScore * phishingWeight) +
            (sensitiveDataScore * sensitiveDataWeight) +
            (domainRiskScore * domainRiskWeight) +
            (attachmentRiskScore * attachmentRiskWeight) +
            (metadataRiskScore * metadataRiskWeight);

        // Cap between 0-100
        totalScore = Math.max(0, Math.min(100, totalScore));

        Map<String, Double> factors = new LinkedHashMap<>();
        factors.put("phishing", phishingScore);
        factors.put("sensitive_data", sensitiveDataScore);
        factors.put("domain_risk", domainRiskScore);
        factors.put("attachment_risk", attachmentRiskScore);
        factors.put("metadata_risk", metadataRiskScore);

        log.info("[SCORING] Total={}, phishing={}, sensitive={}, domain={}, attachment={}, metadata={}",
            String.format("%.1f", totalScore),
            String.format("%.1f", phishingScore),
            String.format("%.1f", sensitiveDataScore),
            String.format("%.1f", domainRiskScore),
            String.format("%.1f", attachmentRiskScore),
            String.format("%.1f", metadataRiskScore));

        return new RiskScoreResult(totalScore, factors);
    }

    public record RiskScoreResult(double totalScore, Map<String, Double> factors) {}
}
