package com.emailguardian.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.*;

/**
 * Fast-layer sensitive data detection using regex patterns.
 * Detects: SSN, bank accounts, credit cards, API keys, passwords, financial data.
 * Runs entirely locally — no AI service dependency.
 */
@Service
@Slf4j
public class SensitiveDataDetector {

    // Regex patterns for sensitive data types
    private static final Map<String, Pattern> PATTERNS = Map.of(
        "ssn", Pattern.compile("\\b\\d{3}-\\d{2}-\\d{4}\\b"),
        "credit_card", Pattern.compile("\\b(?:\\d{4}[- ]?){3}\\d{4}\\b"),
        "bank_account", Pattern.compile("\\b\\d{8,17}\\b"),
        "routing_number", Pattern.compile("\\b0[0-9]{8}\\b|\\b[0-3]\\d{8}\\b"),
        "api_key", Pattern.compile("(?i)(api[_-]?key|apikey|access[_-]?token|secret[_-]?key|sk-)[\\s:=]+['\"]?[A-Za-z0-9_\\-]{16,}"),
        "password", Pattern.compile("(?i)(password|passwd|pwd)[\\s:=]+['\"]?[^\\s'\"]{4,}"),
        "email_address_bulk", Pattern.compile("(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}[,;\\s]+){3,}")
    );

    // Keywords indicating financial/confidential data
    private static final List<String> FINANCIAL_KEYWORDS = List.of(
        "bank account", "routing number", "wire transfer", "account number",
        "credit card", "social security", "tax id", "ein",
        "confidential", "internal only", "do not share", "classified"
    );

    /**
     * Analyze email body for sensitive data patterns.
     * @return score 0-100 and list of detected signals
     */
    public SensitiveDataResult analyze(String emailBody, String subject) {
        if (emailBody == null || emailBody.isEmpty()) {
            return new SensitiveDataResult(0, Collections.emptyList());
        }

        String fullText = (subject != null ? subject + " " : "") + emailBody;
        String lowerText = fullText.toLowerCase();
        List<String> signals = new ArrayList<>();
        double score = 0;

        // Check regex patterns
        for (Map.Entry<String, Pattern> entry : PATTERNS.entrySet()) {
            Matcher matcher = entry.getValue().matcher(fullText);
            if (matcher.find()) {
                String signalName = entry.getKey() + "_exposed";
                signals.add(signalName);
                
                // Specific scores from request
                double signalScore = switch(entry.getKey()) {
                    case "ssn" -> 60;
                    case "credit_card" -> 70;
                    case "bank_account" -> 65;
                    default -> 25;
                };
                
                score += signalScore;
                log.debug("[SENSITIVE] Detected: {} score={}", signalName, signalScore);
            }
        }

        // Check financial keywords
        for (String keyword : FINANCIAL_KEYWORDS) {
            if (lowerText.contains(keyword)) {
                signals.add("financial_keyword_" + keyword.replace(" ", "_"));
                score += 10;
            }
        }

        // Cap at 100
        score = Math.min(score, 100);
        log.info("[SENSITIVE] Score={}, signals={}", score, signals.size());

        return new SensitiveDataResult(score, signals);
    }

    public record SensitiveDataResult(double score, List<String> signals) {}
}
