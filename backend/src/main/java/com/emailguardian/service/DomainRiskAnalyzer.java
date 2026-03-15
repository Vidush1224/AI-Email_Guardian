package com.emailguardian.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Domain risk analysis module.
 * Detects: external domains, typosquatting, look-alike domains, suspicious patterns.
 * Runs entirely locally — no AI service dependency.
 */
@Service
@Slf4j
public class DomainRiskAnalyzer {

    @Value("${fraud-detection.company-domain:company.com}")
    private String companyDomain;

    // Well-known domains to check for typosquatting
    private static final List<String> KNOWN_DOMAINS = List.of(
        "microsoft.com", "google.com", "apple.com", "amazon.com",
        "paypal.com", "facebook.com", "linkedin.com", "outlook.com",
        "office365.com", "dropbox.com", "adobe.com", "salesforce.com"
    );

    // Suspicious domain patterns
    private static final List<String> SUSPICIOUS_PATTERNS = List.of(
        "secure-", "verify-", "support-", "login-", "account-",
        "update-", "alert-", "confirm-", "billing-", "helpdesk-",
        "-security", "-verify", "-support", "-login", "-auth"
    );

    // Common character substitutions used in typosquatting
    private static final Map<Character, List<Character>> SUBSTITUTIONS = Map.of(
        'o', List.of('0'),
        'l', List.of('1', 'I'),
        'i', List.of('1', 'l'),
        'e', List.of('3'),
        'a', List.of('@', '4'),
        's', List.of('5', '$'),
        'g', List.of('9'),
        't', List.of('7')
    );

    /**
     * Analyze sender domain for risk signals.
     * @return score 0-100 and list of signals
     */
    public DomainRiskResult analyze(String senderEmail, String recipients) {
        if (senderEmail == null || senderEmail.isEmpty()) {
            return new DomainRiskResult(0, Collections.emptyList());
        }

        List<String> signals = new ArrayList<>();
        double score = 0;

        String senderDomain = extractDomain(senderEmail);
        if (senderDomain == null) {
            return new DomainRiskResult(0, Collections.emptyList());
        }

        // 1. External domain detection
        if (!senderDomain.equalsIgnoreCase(companyDomain)) {
            signals.add("external_domain");
            score += 15;
            log.debug("[DOMAIN] External domain: {}", senderDomain);
        }

        // 2. Typosquatting detection
        for (String known : KNOWN_DOMAINS) {
            if (!senderDomain.equalsIgnoreCase(known) && isTyposquatting(senderDomain, known)) {
                signals.add("typosquatting_domain");
                score += 40;
                log.warn("[DOMAIN] Typosquatting detected: {} looks like {}", senderDomain, known);
                break;
            }
        }

        // Also check against company domain
        if (!senderDomain.equalsIgnoreCase(companyDomain) && isTyposquatting(senderDomain, companyDomain)) {
            signals.add("company_domain_impersonation");
            score += 35;
        }

        // 3. Suspicious domain patterns
        String lowerDomain = senderDomain.toLowerCase();
        for (String pattern : SUSPICIOUS_PATTERNS) {
            if (lowerDomain.contains(pattern)) {
                signals.add("suspicious_domain_pattern");
                score += 20;
                log.debug("[DOMAIN] Suspicious pattern: {} in {}", pattern, senderDomain);
                break;
            }
        }

        // 4. Free email provider for business context
        if (isFreeEmailProvider(senderDomain)) {
            signals.add("free_email_provider");
            score += 10;
        }

        // 5. External recipients on outbound (data exfiltration risk)
        if (recipients != null && !recipients.isEmpty()) {
            String[] recipientList = recipients.split("[,;\\s]+");
            int externalCount = 0;
            for (String r : recipientList) {
                String rDomain = extractDomain(r.trim());
                if (rDomain != null && !rDomain.equalsIgnoreCase(companyDomain)) {
                    externalCount++;
                }
            }
            if (externalCount > 0) {
                signals.add("external_recipients");
                score += 10;
            }
            if (externalCount > 3) {
                signals.add("multiple_external_recipients");
                score += 15;
            }
        }

        score = Math.min(score, 100);
        log.info("[DOMAIN] Score={}, domain={}, signals={}", score, senderDomain, signals);

        return new DomainRiskResult(score, signals);
    }

    /**
     * Detect typosquatting using Levenshtein distance and character substitution.
     */
    private boolean isTyposquatting(String suspect, String legitimate) {
        String s = suspect.toLowerCase().replaceAll("\\.(com|net|org|io)$", "");
        String l = legitimate.toLowerCase().replaceAll("\\.(com|net|org|io)$", "");

        // Levenshtein distance check (1-2 edits = suspicious)
        int distance = levenshteinDistance(s, l);
        if (distance > 0 && distance <= 2) {
            return true;
        }

        // Character substitution check
        String normalized = s;
        for (Map.Entry<Character, List<Character>> entry : SUBSTITUTIONS.entrySet()) {
            for (Character sub : entry.getValue()) {
                normalized = normalized.replace(sub, entry.getKey());
            }
        }
        if (normalized.equals(l) && !s.equals(l)) {
            return true;
        }

        return false;
    }

    private int levenshteinDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }

    private boolean isFreeEmailProvider(String domain) {
        return List.of("gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "protonmail.com", "aol.com", "icloud.com", "mail.com")
                .contains(domain.toLowerCase());
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(email.lastIndexOf("@") + 1).trim();
    }

    public record DomainRiskResult(double score, List<String> signals) {}
}
