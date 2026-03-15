package com.emailguardian.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Email metadata analysis module.
 * Detects: impersonation patterns, suspicious subjects, data exfiltration signals.
 * Runs entirely locally — no AI service dependency.
 */
@Service
@Slf4j
public class EmailMetadataAnalyzer {

    @Value("${fraud-detection.company-domain:company.com}")
    private String companyDomain;

    // Subject line patterns indicating phishing
    private static final List<String> URGENT_SUBJECTS = List.of(
        "urgent", "immediate", "action required", "act now",
        "verify your", "confirm your", "suspended", "compromised",
        "unauthorized", "security alert", "password reset",
        "mandatory", "compliance", "deadline", "expired"
    );

    // Executive titles used in impersonation
    private static final List<String> EXECUTIVE_TITLES = List.of(
        "ceo", "cfo", "cto", "coo", "president", "vice president",
        "director", "managing director", "chairman", "founder"
    );

    /**
     * Analyze email metadata for fraud signals.
     * @return score 0-100 and list of signals
     */
    public MetadataRiskResult analyze(String sender, String senderName,
                                       String recipients, String subject,
                                       String direction) {
        List<String> signals = new ArrayList<>();
        double score = 0;

        // 1. Sender impersonation detection
        if (senderName != null && sender != null) {
            String senderDomain = extractDomain(sender);

            // Check: display name suggests executive but domain is external
            String lowerName = senderName.toLowerCase();
            for (String title : EXECUTIVE_TITLES) {
                if (lowerName.contains(title)) {
                    if (senderDomain != null && !senderDomain.equalsIgnoreCase(companyDomain)) {
                        signals.add("external_sender_impersonating_executive");
                        score += 35;
                        log.warn("[METADATA] Executive impersonation: name='{}', domain='{}'", senderName, senderDomain);
                    }
                    break;
                }
            }

            // Check: sender name doesn't match domain
            if (senderDomain != null && isFreeEmailProvider(senderDomain) && lowerName.length() > 5) {
                signals.add("impersonation_free_email");
                score += 15;
            }
        }

        // 2. Urgent subject line detection
        if (subject != null) {
            String lowerSubject = subject.toLowerCase();
            for (String urgent : URGENT_SUBJECTS) {
                if (lowerSubject.contains(urgent)) {
                    signals.add("urgency_language");
                    score += 15;
                    break;
                }
            }
        }

        // 3. Internal → External data transfer detection
        if ("OUTBOUND".equalsIgnoreCase(direction) && recipients != null) {
            String[] recipientList = recipients.split("[,;\\s]+");
            boolean hasExternal = false;
            for (String r : recipientList) {
                String rDomain = extractDomain(r.trim());
                if (rDomain != null && !rDomain.equalsIgnoreCase(companyDomain)) {
                    hasExternal = true;
                    break;
                }
            }
            if (hasExternal) {
                signals.add("outbound_to_external");
                score += 15;
            }
        }

        // 4. Multiple external recipients
        if (recipients != null) {
            String[] recipientList = recipients.split("[,;\\s]+");
            int extCount = 0;
            for (String r : recipientList) {
                String rDomain = extractDomain(r.trim());
                if (rDomain != null && !rDomain.equalsIgnoreCase(companyDomain)) {
                    extCount++;
                }
            }
            if (extCount > 3) {
                signals.add("many_external_recipients");
                score += 15;
            }
        }

        // 5. Reply-chain hijacking indicator (RE: / FW: with external sender)
        if (subject != null && sender != null) {
            String lowerSubject = subject.toLowerCase().trim();
            String senderDomain = extractDomain(sender);
            if ((lowerSubject.startsWith("re:") || lowerSubject.startsWith("fw:"))
                && senderDomain != null && !senderDomain.equalsIgnoreCase(companyDomain)) {
                signals.add("reply_chain_external");
                score += 10;
            }
        }

        score = Math.min(score, 100);
        log.info("[METADATA] Score={}, signals={}", score, signals.size());

        return new MetadataRiskResult(score, signals);
    }

    private boolean isFreeEmailProvider(String domain) {
        return List.of("gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "protonmail.com", "aol.com", "icloud.com")
                .contains(domain.toLowerCase());
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(email.lastIndexOf("@") + 1).trim();
    }

    public record MetadataRiskResult(double score, List<String> signals) {}
}
