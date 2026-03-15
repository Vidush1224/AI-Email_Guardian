package com.emailguardian.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fraud_analysis")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_id", nullable = false)
    private Long emailId;

    @Column(name = "total_score", nullable = false)
    private Double totalScore;

    @Column(name = "phishing_score")
    private Double phishingScore;

    @Column(name = "sensitive_data_score")
    private Double sensitiveDataScore;

    @Column(name = "domain_risk_score")
    private Double domainRiskScore;

    @Column(name = "attachment_risk_score")
    private Double attachmentRiskScore;

    @Column(name = "metadata_risk_score")
    private Double metadataRiskScore;

    @Column(name = "ai_deep_analysis_triggered")
    private Boolean aiDeepAnalysisTriggered;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "detected_signals", columnDefinition = "JSON")
    private String detectedSignals;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken", nullable = false)
    private ActionType actionTaken;

    @Column(name = "analysis_duration_ms")
    private Integer analysisDurationMs;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum ActionType { ALLOW, WARN, STRONG_WARNING, BLOCK }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (aiDeepAnalysisTriggered == null) aiDeepAnalysisTriggered = false;
    }
}
