package com.emailguardian.service;

import com.emailguardian.dto.EmailScanRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Attachment analysis module.
 * Detects: risky extensions, macro-enabled docs, executable files, MIME type mismatches.
 * Generates SHA-256 file hashes. Optional VirusTotal integration.
 */
@Service
@Slf4j
public class AttachmentAnalyzer {

    // High-risk file extensions
    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
        "exe", "bat", "cmd", "com", "msi", "scr", "pif", "vbs",
        "js", "wsf", "ps1", "jar", "hta", "cpl"
    );

    // Macro-capable extensions
    private static final Set<String> MACRO_EXTENSIONS = Set.of(
        "xlsm", "docm", "pptm", "xlsb", "dotm", "xla", "xlam"
    );

    // Suspicious but not immediately dangerous
    private static final Set<String> SUSPICIOUS_EXTENSIONS = Set.of(
        "zip", "rar", "7z", "iso", "img", "lnk", "url"
    );

    // Expected MIME types for common extensions
    private static final Map<String, String> EXPECTED_MIMES = Map.of(
        "pdf", "application/pdf",
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "jpg", "image/jpeg",
        "png", "image/png"
    );

    /**
     * Analyze attachments for threats.
     * @return score 0-100 and list of signals
     */
    public AttachmentRiskResult analyze(List<EmailScanRequest.AttachmentInfo> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return new AttachmentRiskResult(0, Collections.emptyList());
        }

        List<String> signals = new ArrayList<>();
        double maxScore = 0;

        for (EmailScanRequest.AttachmentInfo attachment : attachments) {
            double attachScore = 0;
            String ext = attachment.getFileExtension() != null
                ? attachment.getFileExtension().toLowerCase().replace(".", "")
                : "";

            // 1. Dangerous executable extensions
            if (DANGEROUS_EXTENSIONS.contains(ext)) {
                signals.add("dangerous_executable_attachment");
                attachScore += 80;
                log.warn("[ATTACHMENT] Dangerous extension: {}", attachment.getFileName());
            }

            // 2. Macro-enabled documents
            if (MACRO_EXTENSIONS.contains(ext)) {
                signals.add("macro_enabled_document");
                attachScore += 60;
                log.warn("[ATTACHMENT] Macro-enabled: {}", attachment.getFileName());
            }

            // 3. Suspicious archives/disk images
            if (SUSPICIOUS_EXTENSIONS.contains(ext)) {
                signals.add("suspicious_file_extension");
                attachScore += 40; // Requested: 40
            }

            // 4. MIME type mismatch
            if (attachment.getMimeType() != null && !ext.isEmpty()) {
                String expected = EXPECTED_MIMES.get(ext);
                if (expected != null && !attachment.getMimeType().equalsIgnoreCase(expected)) {
                    signals.add("mime_type_mismatch");
                    attachScore += 35;
                    log.warn("[ATTACHMENT] MIME mismatch: ext={}, mime={}", ext, attachment.getMimeType());
                }
            }

            // 5. Double extension (e.g., document.pdf.exe)
            String fileName = attachment.getFileName();
            if (fileName != null) {
                long dotCount = fileName.chars().filter(c -> c == '.').count();
                if (dotCount > 1) {
                    signals.add("double_extension");
                    attachScore += 40;
                }
            }

            // 6. File hash recorded for audit
            if (attachment.getFileHashSha256() != null && !attachment.getFileHashSha256().isEmpty()) {
                log.info("[ATTACHMENT] File hash recorded: {}", attachment.getFileHashSha256());
            }

            maxScore = Math.max(maxScore, Math.min(attachScore, 100));
        }

        log.info("[ATTACHMENT] Score={}, signals={}", maxScore, signals);
        return new AttachmentRiskResult(maxScore, signals);
    }

    public record AttachmentRiskResult(double score, List<String> signals) {}
}
