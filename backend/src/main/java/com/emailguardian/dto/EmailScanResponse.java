package com.emailguardian.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for email scan results with full explainable output.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailScanResponse {
    private Long emailId;
    private Long analysisId;
    private double totalScore;
    private Map<String, Double> factors;
    private List<String> detectedSignals;
    private String explanation;
    private String actionTaken;
    private boolean aiDeepAnalysisTriggered;
    private Double aiConfidence;
    private int analysisDurationMs;
}
