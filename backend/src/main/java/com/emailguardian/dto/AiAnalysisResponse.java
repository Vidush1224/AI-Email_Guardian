package com.emailguardian.dto;

import lombok.*;
import java.util.List;

/**
 * Response from AI service deep analysis.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AiAnalysisResponse {
    private double aiPhishingScore;
    private List<String> detectedSignals;
    private String explanation;
    private double confidence;
}
