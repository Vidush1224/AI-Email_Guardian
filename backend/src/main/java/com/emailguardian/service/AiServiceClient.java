package com.emailguardian.service;

import com.emailguardian.dto.AiAnalysisResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * HTTP client to communicate with the Python AI service.
 * Called only when fast-layer score exceeds threshold (two-stage pipeline).
 * Falls back gracefully if AI service is unavailable.
 */
@Service
@Slf4j
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    public AiServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Call AI service for deep semantic analysis.
     * @return AI analysis response, or fallback heuristic response if service unavailable
     */
    public AiAnalysisResponse analyzeEmail(String emailBody, String subject,
                                            String sender, String recipients) {
        try {
            log.info("[AI] Calling AI service for deep analysis...");

            Map<String, Object> request = new HashMap<>();
            request.put("email_body", emailBody);
            request.put("subject", subject);
            request.put("sender", sender);
            request.put("recipients", recipients);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                aiServiceUrl + "/analyze", entity, (Class<Map<String, Object>>)(Class<?>)Map.class);

            if (response != null && response.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> body = response.getBody();
                if (body != null) {
                    return AiAnalysisResponse.builder()
                        .aiPhishingScore(toDouble(body.get("ai_phishing_score")))
                        .detectedSignals(toStringList(body.get("detected_signals")))
                        .explanation((String) body.getOrDefault("explanation", ""))
                        .confidence(toDouble(body.get("confidence")))
                        .build();
                }
            }
        } catch (Exception e) {
            log.warn("[AI] AI service unavailable, using heuristic fallback: {}", e.getMessage());
        }

        // Fallback: return heuristic-based analysis
        return generateHeuristicFallback(emailBody, subject);
    }

    /**
     * Heuristic fallback when AI service is unavailable.
     * Uses keyword-based analysis as a substitute for LLM reasoning.
     */
    private AiAnalysisResponse generateHeuristicFallback(String body, String subject) {
        String text = ((subject != null ? subject : "") + " " + (body != null ? body : "")).toLowerCase();
        List<String> signals = new ArrayList<>();
        double score = 0;

        // Urgency detection
        if (text.contains("urgent") || text.contains("immediately") || text.contains("act now")
            || text.contains("within 24 hours") || text.contains("deadline")) {
            signals.add("urgency_language");
            score += 20;
        }

        // Credential harvesting
        if (text.contains("verify your") || text.contains("confirm your identity")
            || text.contains("enter your password") || text.contains("update your credentials")) {
            signals.add("credential_harvesting");
            score += 30;
        }

        // Financial request patterns
        if (text.contains("wire transfer") || text.contains("gift card")
            || text.contains("payment due") || text.contains("bank details")) {
            signals.add("financial_request_language");
            score += 25;
        }

        // Impersonation cues
        if (text.contains("do not discuss") || text.contains("confidential")
            || text.contains("don't tell anyone") || text.contains("keep this between")) {
            signals.add("confidentiality_pressure");
            score += 15;
        }

        // AI-text heuristic (formal/robotic patterns)
        if (text.contains("as part of our ongoing commitment")
            || text.contains("we are implementing")
            || text.contains("in order to ensure")
            || text.contains("please be advised")) {
            signals.add("ai_generated_text_patterns");
            score += 15;
        }

        // Threat/penalty language
        if (text.contains("account suspension") || text.contains("access revoked")
            || text.contains("permanently") || text.contains("deactivat")) {
            signals.add("suspension_threat");
            score += 15;
        }

        score = Math.min(score, 100);

        String explanation = signals.isEmpty()
            ? "No significant phishing patterns detected by heuristic analysis."
            : "Heuristic analysis detected " + signals.size() + " risk signal(s): " + String.join(", ", signals) + ".";

        log.info("[AI-FALLBACK] Score={}, signals={}", score, signals.size());

        return AiAnalysisResponse.builder()
            .aiPhishingScore(score)
            .detectedSignals(signals)
            .explanation(explanation)
            .confidence(0.65) // lower confidence for heuristic
            .build();
    }

    private double toDouble(Object val) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        return 0;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object val) {
        if (val instanceof List) return (List<String>) val;
        return Collections.emptyList();
    }
}
