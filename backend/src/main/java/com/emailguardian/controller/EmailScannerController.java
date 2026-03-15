package com.emailguardian.controller;

import com.emailguardian.dto.*;
import com.emailguardian.model.*;
import com.emailguardian.repository.*;
import com.emailguardian.service.EmailScannerService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Email Scanner REST Controller.
 * Handles full scan and real-time draft analysis.
 */
@RestController
@RequestMapping("/api/emails")
@RequiredArgsConstructor
@Slf4j
public class EmailScannerController {

    private final EmailScannerService scannerService;
    private final EmailRepository emailRepository;
    private final FraudAnalysisRepository fraudAnalysisRepository;
    private final ObjectMapper objectMapper;

    /**
     * POST /api/emails/scan - Full two-stage email scan.
     */
    @PostMapping("/scan")
    public ResponseEntity<EmailScanResponse> scanEmail(@RequestBody EmailScanRequest request) {
        log.info("[API] POST /api/emails/scan from={}", request.getSender());
        EmailScanResponse response = scannerService.scanEmail(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/emails/analyze-draft - Fast-layer only analysis for real-time compose.
     * Never calls AI service. Returns immediately.
     */
    @PostMapping("/analyze-draft")
    public ResponseEntity<DraftAnalysisResponse> analyzeDraft(@RequestBody EmailScanRequest request) {
        DraftAnalysisResponse response = scannerService.analyzeDraft(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/emails/{id} - Get email with fraud analysis.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getEmail(@PathVariable Long id) {
        Optional<Email> emailOpt = emailRepository.findById(id);
        if (emailOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Email email = emailOpt.get();
        Optional<FraudAnalysis> analysisOpt = fraudAnalysisRepository.findByEmailId(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", email);
        if (analysisOpt.isPresent()) {
            FraudAnalysis analysis = analysisOpt.get();
            Map<String, Object> analysisMap = new LinkedHashMap<>();
            analysisMap.put("id", analysis.getId());
            analysisMap.put("totalScore", analysis.getTotalScore());
            analysisMap.put("factors", Map.of(
                "phishing", analysis.getPhishingScore(),
                "sensitive_data", analysis.getSensitiveDataScore(),
                "domain_risk", analysis.getDomainRiskScore(),
                "attachment_risk", analysis.getAttachmentRiskScore(),
                "metadata_risk", analysis.getMetadataRiskScore()
            ));
            analysisMap.put("detectedSignals", parseJsonList(analysis.getDetectedSignals()));
            analysisMap.put("explanation", analysis.getExplanation());
            analysisMap.put("actionTaken", analysis.getActionTaken());
            analysisMap.put("aiDeepAnalysisTriggered", analysis.getAiDeepAnalysisTriggered());
            analysisMap.put("aiConfidence", analysis.getAiConfidence());
            analysisMap.put("analysisDurationMs", analysis.getAnalysisDurationMs());
            result.put("analysis", analysisMap);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/emails - List recent emails.
     */
    @GetMapping
    public ResponseEntity<List<Email>> listEmails() {
        return ResponseEntity.ok(emailRepository.findTop20ByOrderByCreatedAtDesc());
    }

    private List<String> parseJsonList(String json) {
        try {
            return json != null ? objectMapper.readValue(json, new TypeReference<>() {}) : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }
}
