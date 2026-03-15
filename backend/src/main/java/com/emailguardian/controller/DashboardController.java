package com.emailguardian.controller;

import com.emailguardian.dto.DashboardStats;
import com.emailguardian.model.*;
import com.emailguardian.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Dashboard REST Controller. Provides analytics and trend data.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final EmailRepository emailRepository;
    private final FraudAnalysisRepository fraudAnalysisRepository;
    private final IncidentLogRepository incidentLogRepository;

    /**
     * GET /api/dashboard/stats - Overview statistics.
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getStats() {
        Map<String, Long> incidentsByType = incidentLogRepository.findAll().stream()
            .collect(Collectors.groupingBy(IncidentLog::getIncidentType, Collectors.counting()));

        DashboardStats stats = DashboardStats.builder()
            .totalEmails(emailRepository.countTotal())
            .blockedEmails(emailRepository.countBlocked())
            .warnedEmails(emailRepository.countWarned())
            .criticalIncidents(incidentLogRepository.countCritical())
            .aiAnalysesTriggered(fraudAnalysisRepository.countAiTriggered())
            .averageRiskScore(fraudAnalysisRepository.findAverageRiskScore())
            .incidentsByType(incidentsByType)
            .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/dashboard/trends - Recent fraud analysis data for charts.
     */
    @GetMapping("/trends")
    public ResponseEntity<List<Map<String, Object>>> getTrends() {
        List<FraudAnalysis> recent = fraudAnalysisRepository.findTop20ByOrderByCreatedAtDesc();
        List<Map<String, Object>> trends = recent.stream().map(fa -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", fa.getId());
            item.put("emailId", fa.getEmailId());
            item.put("totalScore", fa.getTotalScore());
            item.put("actionTaken", fa.getActionTaken().name());
            item.put("aiTriggered", fa.getAiDeepAnalysisTriggered());
            item.put("createdAt", fa.getCreatedAt());
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(trends);
    }
}
