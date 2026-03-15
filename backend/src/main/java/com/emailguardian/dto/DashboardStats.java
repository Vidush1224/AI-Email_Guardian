package com.emailguardian.dto;

import lombok.*;
import java.util.Map;

/**
 * Dashboard statistics response.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardStats {
    private long totalEmails;
    private long blockedEmails;
    private long warnedEmails;
    private long criticalIncidents;
    private long aiAnalysesTriggered;
    private Double averageRiskScore;
    private Map<String, Long> incidentsByType;
}
