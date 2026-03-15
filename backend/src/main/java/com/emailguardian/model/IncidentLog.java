package com.emailguardian.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_logs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class IncidentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_id", nullable = false)
    private Long emailId;

    @Column(name = "fraud_analysis_id")
    private Long fraudAnalysisId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(name = "incident_type", nullable = false, length = 100)
    private String incidentType;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "risk_score")
    private Double riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken", nullable = false)
    private FraudAnalysis.ActionType actionTaken;

    @Column(name = "detected_signals", columnDefinition = "JSON")
    private String detectedSignals;

    @Column
    private Boolean resolved;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (resolved == null) resolved = false;
    }
}
