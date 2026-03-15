package com.emailguardian.controller;

import com.emailguardian.model.*;
import com.emailguardian.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Incident Log REST Controller. Security investigation interface.
 */
@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentLogController {

    private final IncidentLogRepository incidentLogRepository;
    private final EmailRepository emailRepository;
    private final FraudAnalysisRepository fraudAnalysisRepository;
    private final ObjectMapper objectMapper;

    /**
     * GET /api/incidents - List incidents with optional filters.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listIncidents(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean resolved) {

        List<IncidentLog> incidents;

        if (severity != null) {
            incidents = incidentLogRepository.findBySeverityOrderByCreatedAtDesc(
                IncidentLog.Severity.valueOf(severity.toUpperCase()));
        } else if (type != null) {
            incidents = incidentLogRepository.findByIncidentTypeOrderByCreatedAtDesc(type);
        } else if (resolved != null) {
            incidents = incidentLogRepository.findByResolved(resolved);
        } else {
            incidents = incidentLogRepository.findAllByOrderByCreatedAtDesc();
        }

        List<Map<String, Object>> result = incidents.stream()
            .map(this::mapIncidentToResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/incidents/{id} - Detailed incident with full email content and analysis.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getIncident(@PathVariable Long id) {
        Optional<IncidentLog> opt = incidentLogRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        IncidentLog incident = opt.get();
        Map<String, Object> result = mapIncidentToResponse(incident);

        // Add full email content
        emailRepository.findById(incident.getEmailId()).ifPresent(email -> {
            Map<String, Object> emailData = new LinkedHashMap<>();
            emailData.put("sender", email.getSender());
            emailData.put("senderName", email.getSenderName());
            emailData.put("recipients", email.getRecipients());
            emailData.put("subject", email.getSubject());
            emailData.put("body", email.getBody());
            emailData.put("direction", email.getDirection());
            emailData.put("status", email.getStatus());
            result.put("email", emailData);
        });

        // Add full analysis
        if (incident.getFraudAnalysisId() != null) {
            fraudAnalysisRepository.findById(incident.getFraudAnalysisId()).ifPresent(analysis -> {
                Map<String, Object> analysisData = new LinkedHashMap<>();
                analysisData.put("totalScore", analysis.getTotalScore());
                analysisData.put("factors", Map.of(
                    "phishing", analysis.getPhishingScore(),
                    "sensitive_data", analysis.getSensitiveDataScore(),
                    "domain_risk", analysis.getDomainRiskScore(),
                    "attachment_risk", analysis.getAttachmentRiskScore(),
                    "metadata_risk", analysis.getMetadataRiskScore()
                ));
                analysisData.put("explanation", analysis.getExplanation());
                analysisData.put("aiTriggered", analysis.getAiDeepAnalysisTriggered());
                analysisData.put("aiConfidence", analysis.getAiConfidence());
                analysisData.put("durationMs", analysis.getAnalysisDurationMs());
                result.put("analysis", analysisData);
            });
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> mapIncidentToResponse(IncidentLog incident) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", incident.getId());
        map.put("emailId", incident.getEmailId());
        map.put("severity", incident.getSeverity().name());
        map.put("incidentType", incident.getIncidentType());
        map.put("title", incident.getTitle());
        map.put("description", incident.getDescription());
        map.put("riskScore", incident.getRiskScore());
        map.put("actionTaken", incident.getActionTaken().name());
        map.put("detectedSignals", parseJsonList(incident.getDetectedSignals()));
        map.put("resolved", incident.getResolved());
        map.put("createdAt", incident.getCreatedAt());
        return map;
    }

    private List<String> parseJsonList(String json) {
        try {
            return json != null ? objectMapper.readValue(json, new TypeReference<>() {}) : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }
}
