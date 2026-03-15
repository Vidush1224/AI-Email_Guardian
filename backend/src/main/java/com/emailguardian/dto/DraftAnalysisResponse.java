package com.emailguardian.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

/**
 * Response for real-time draft analysis (fast layer only, no AI service call).
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DraftAnalysisResponse {
    private double quickScore;
    private Map<String, Double> factorScores;
    private List<String> detectedSignals;
}
