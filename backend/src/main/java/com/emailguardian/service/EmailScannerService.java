package com.emailguardian.service;

import com.emailguardian.dto.*;
import com.emailguardian.model.*;
import com.emailguardian.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Core email scanning orchestrator.
 * Implements the two-stage fraud detection pipeline:
 *   Stage 1 (Fast Layer): regex, domain, metadata, attachment checks (<100ms)
 *   Stage 2 (Deep AI):    LLM analysis — only if fast-layer score > threshold
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailScannerService {

    private final SensitiveDataDetector sensitiveDataDetector;
    private final DomainRiskAnalyzer domainRiskAnalyzer;
    private final EmailMetadataAnalyzer metadataAnalyzer;
    private final AttachmentAnalyzer attachmentAnalyzer;
    private final FraudRiskScoringEngine scoringEngine;
    private final DecisionEngine decisionEngine;
    private final AiServiceClient aiServiceClient;
    private final EmailRepository emailRepository;
    private final FraudAnalysisRepository fraudAnalysisRepository;
    private final AttachmentRepository attachmentRepository;
    private final IncidentLogRepository incidentLogRepository;
    private final ObjectMapper objectMapper;

    @Value("${fraud-detection.risk-threshold:40}")
    private int riskThreshold;

    /**
     * Full two-stage email scan pipeline.
     * Stage 1: Fast detection (regex, domain, metadata, attachment)
     * Stage 2: AI deep analysis (only if stage 1 score > threshold)
     */
    public EmailScanResponse scanEmail(EmailScanRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("[SCAN] Starting two-stage scan for email from: {}", request.getSender());

        // ===== Save email to database =====
        Email email = Email.builder()
            .sender(request.getSender())
            .senderName(request.getSenderName())
            .recipients(request.getRecipients())
            .cc(request.getCc())
            .bcc(request.getBcc())
            .subject(request.getSubject())
            .body(request.getBody())
            .direction(parseDirection(request.getDirection()))
            .userId(request.getUserId())
            .build();
        email = emailRepository.save(email);

        // Save attachments
        if (request.getAttachments() != null) {
            for (EmailScanRequest.AttachmentInfo att : request.getAttachments()) {
                Attachment attachment = Attachment.builder()
                    .emailId(email.getId())
                    .fileName(att.getFileName())
                    .fileExtension(att.getFileExtension())
                    .mimeType(att.getMimeType())
                    .fileSize(att.getFileSize())
                    .fileHashSha256(att.getFileHashSha256())
                    .build();
                attachmentRepository.save(attachment);
            }
        }

        // ===== STAGE 1: Fast Detection Layer =====
        log.info("[SCAN] Stage 1: Fast detection layer...");
        List<String> allSignals = new ArrayList<>();

        // 1a. Sensitive data detection (regex)
        var sensitiveResult = sensitiveDataDetector.analyze(request.getBody(), request.getSubject());
        allSignals.addAll(sensitiveResult.signals());

        // 1b. Domain risk analysis
        var domainResult = domainRiskAnalyzer.analyze(request.getSender(), request.getRecipients());
        allSignals.addAll(domainResult.signals());

        // 1c. Email metadata analysis
        var metadataResult = metadataAnalyzer.analyze(
            request.getSender(), request.getSenderName(),
            request.getRecipients(), request.getSubject(),
            request.getDirection()
        );
        allSignals.addAll(metadataResult.signals());

        // 1d. Attachment analysis
        var attachmentResult = attachmentAnalyzer.analyze(request.getAttachments());
        allSignals.addAll(attachmentResult.signals());

        // Initial scoring (phishing score = 0 until AI analysis)
        double initialPhishingScore = 0;
        var initialScore = scoringEngine.calculateScore(
            initialPhishingScore,
            sensitiveResult.score(),
            domainResult.score(),
            attachmentResult.score(),
            metadataResult.score()
        );

        log.info("[SCAN] Stage 1 initial_score={}", String.format("%.1f", initialScore.totalScore()));

        // ===== STAGE 2: Deep AI Analysis (conditional) =====
        boolean aiTriggered = false;
        AiAnalysisResponse aiResponse = null;
        double finalPhishingScore = initialPhishingScore;

        if (initialScore.totalScore() > riskThreshold) {
            log.info("[AI] Deep analysis triggered (score {} > threshold {})",
                String.format("%.1f", initialScore.totalScore()), riskThreshold);
            aiTriggered = true;

            aiResponse = aiServiceClient.analyzeEmail(
                request.getBody(), request.getSubject(),
                request.getSender(), request.getRecipients()
            );

            finalPhishingScore = aiResponse.getAiPhishingScore();
            allSignals.addAll(aiResponse.getDetectedSignals());
        }

        // ===== Final scoring =====
        var finalScoreResult = scoringEngine.calculateScore(
            finalPhishingScore,
            sensitiveResult.score(),
            domainResult.score(),
            attachmentResult.score(),
            metadataResult.score()
        );

        // ===== Decision =====
        FraudAnalysis.ActionType action = decisionEngine.decide(finalScoreResult.totalScore());

        // De-duplicate signals
        List<String> uniqueSignals = new ArrayList<>(new LinkedHashSet<>(allSignals));

        // Build explanation
        String explanation = buildExplanation(aiResponse, uniqueSignals, finalScoreResult.totalScore(), action);

        int duration = (int) (System.currentTimeMillis() - startTime);
        log.info("[SCAN] Email ID={} final_score={} action={} duration={}ms",
            email.getId(), String.format("%.1f", finalScoreResult.totalScore()), action, duration);

        // ===== Persist fraud analysis =====
        FraudAnalysis analysis = FraudAnalysis.builder()
            .emailId(email.getId())
            .totalScore(finalScoreResult.totalScore())
            .phishingScore(finalPhishingScore)
            .sensitiveDataScore(sensitiveResult.score())
            .domainRiskScore(domainResult.score())
            .attachmentRiskScore(attachmentResult.score())
            .metadataRiskScore(metadataResult.score())
            .aiDeepAnalysisTriggered(aiTriggered)
            .aiConfidence(aiResponse != null ? aiResponse.getConfidence() : null)
            .detectedSignals(toJson(uniqueSignals))
            .explanation(explanation)
            .actionTaken(action)
            .analysisDurationMs(duration)
            .build();
        analysis = fraudAnalysisRepository.save(analysis);

        // Update email status
        email.setStatus(mapActionToStatus(action));
        emailRepository.save(email);

        // ===== Create incident log if warranted =====
        if (action != FraudAnalysis.ActionType.ALLOW) {
            createIncident(email, analysis, uniqueSignals);
        }

        // ===== Build response =====
        return EmailScanResponse.builder()
            .emailId(email.getId())
            .analysisId(analysis.getId())
            .totalScore(finalScoreResult.totalScore())
            .factors(finalScoreResult.factors())
            .detectedSignals(uniqueSignals)
            .explanation(explanation)
            .actionTaken(action.name())
            .aiDeepAnalysisTriggered(aiTriggered)
            .aiConfidence(aiResponse != null ? aiResponse.getConfidence() : null)
            .analysisDurationMs(duration)
            .build();
    }

    /**
     * Fast-layer only analysis for real-time draft scanning.
     * Never calls AI service. Returns immediately with signals.
     */
    public DraftAnalysisResponse analyzeDraft(EmailScanRequest request) {
        long startTime = System.currentTimeMillis();
        List<String> allSignals = new ArrayList<>();

        var sensitiveResult = sensitiveDataDetector.analyze(request.getBody(), request.getSubject());
        allSignals.addAll(sensitiveResult.signals());

        var domainResult = domainRiskAnalyzer.analyze(request.getSender(), request.getRecipients());
        allSignals.addAll(domainResult.signals());

        var metadataResult = metadataAnalyzer.analyze(
            request.getSender(), request.getSenderName(),
            request.getRecipients(), request.getSubject(),
            request.getDirection()
        );
        allSignals.addAll(metadataResult.signals());

        var attachmentResult = attachmentAnalyzer.analyze(request.getAttachments());
        allSignals.addAll(attachmentResult.signals());

        // Quick heuristic phishing score (no AI)
        double heuristicPhishing = calculateHeuristicPhishing(request.getBody(), request.getSubject());

        var scoreResult = scoringEngine.calculateScore(
            heuristicPhishing,
            sensitiveResult.score(),
            domainResult.score(),
            attachmentResult.score(),
            metadataResult.score()
        );

        List<String> uniqueSignals = new ArrayList<>(new LinkedHashSet<>(allSignals));

        log.info("[DRAFT] quick_score={} duration={}ms",
            String.format("%.1f", scoreResult.totalScore()),
            System.currentTimeMillis() - startTime);

        return DraftAnalysisResponse.builder()
            .quickScore(scoreResult.totalScore())
            .factorScores(scoreResult.factors())
            .detectedSignals(uniqueSignals)
            .build();
    }

    /**
     * Basic heuristic phishing score for draft analysis.
     */
    private double calculateHeuristicPhishing(String body, String subject) {
        String text = ((subject != null ? subject : "") + " " + (body != null ? body : "")).toLowerCase();
        double score = 0;

        if (text.contains("urgent") || text.contains("immediately")) score += 15;
        if (text.contains("verify your") || text.contains("confirm your")) score += 20;
        if (text.contains("click here") || text.contains("click below")) score += 15;
        if (text.contains("wire transfer") || text.contains("gift card")) score += 20;
        if (text.contains("suspended") || text.contains("deactivat")) score += 15;

        return Math.min(score, 100);
    }

    private void createIncident(Email email, FraudAnalysis analysis, List<String> signals) {
        String incidentType = determineIncidentType(signals);
        IncidentLog.Severity severity = analysis.getTotalScore() > 80
            ? IncidentLog.Severity.CRITICAL
            : analysis.getTotalScore() > 60
                ? IncidentLog.Severity.HIGH
                : IncidentLog.Severity.MEDIUM;

        IncidentLog incident = IncidentLog.builder()
            .emailId(email.getId())
            .fraudAnalysisId(analysis.getId())
            .severity(severity)
            .incidentType(incidentType)
            .title(buildIncidentTitle(incidentType, email.getSender()))
            .description(analysis.getExplanation())
            .riskScore(analysis.getTotalScore())
            .actionTaken(analysis.getActionTaken())
            .detectedSignals(analysis.getDetectedSignals())
            .build();

        incidentLogRepository.save(incident);
        log.info("[INCIDENT] Created: type={}, severity={}", incidentType, severity);
    }

    private String determineIncidentType(List<String> signals) {
        if (signals.stream().anyMatch(s -> s.contains("phishing") || s.contains("credential")))
            return "PHISHING";
        if (signals.stream().anyMatch(s -> s.contains("impersonat") || s.contains("ceo")))
            return "BEC";
        if (signals.stream().anyMatch(s -> s.contains("exfiltration") || s.contains("exposed")))
            return "DATA_LEAK";
        if (signals.stream().anyMatch(s -> s.contains("financial") || s.contains("invoice") || s.contains("wire")))
            return "FINANCIAL_FRAUD";
        if (signals.stream().anyMatch(s -> s.contains("macro") || s.contains("executable")))
            return "MALWARE";
        if (signals.stream().anyMatch(s -> s.contains("ai_generated")))
            return "AI_PHISHING";
        return "SUSPICIOUS";
    }

    private String buildIncidentTitle(String type, String sender) {
        return switch (type) {
            case "PHISHING" -> "Phishing attempt from " + sender;
            case "BEC" -> "Business Email Compromise from " + sender;
            case "DATA_LEAK" -> "Potential data leak detected";
            case "FINANCIAL_FRAUD" -> "Financial fraud attempt from " + sender;
            case "MALWARE" -> "Malicious attachment detected from " + sender;
            case "AI_PHISHING" -> "AI-generated phishing from " + sender;
            default -> "Suspicious email from " + sender;
        };
    }

    private String buildExplanation(AiAnalysisResponse aiResponse, List<String> signals,
                                     double score, FraudAnalysis.ActionType action) {
        if (aiResponse != null && aiResponse.getExplanation() != null && !aiResponse.getExplanation().isEmpty()) {
            return aiResponse.getExplanation();
        }
        if (signals.isEmpty()) {
            return "No significant fraud indicators detected.";
        }
        return String.format("Analysis detected %d risk signal(s) with a total score of %.0f. Action: %s. Signals: %s",
            signals.size(), score, action.name(), String.join(", ", signals));
    }

    private Email.EmailDirection parseDirection(String direction) {
        try {
            return direction != null ? Email.EmailDirection.valueOf(direction.toUpperCase()) : Email.EmailDirection.INBOUND;
        } catch (Exception e) {
            return Email.EmailDirection.INBOUND;
        }
    }

    private Email.EmailStatus mapActionToStatus(FraudAnalysis.ActionType action) {
        return switch (action) {
            case ALLOW -> Email.EmailStatus.ALLOWED;
            case WARN -> Email.EmailStatus.WARNED;
            case STRONG_WARNING -> Email.EmailStatus.STRONG_WARNING;
            case BLOCK -> Email.EmailStatus.BLOCKED;
        };
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
