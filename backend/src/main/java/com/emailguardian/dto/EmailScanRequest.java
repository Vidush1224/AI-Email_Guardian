package com.emailguardian.dto;

import lombok.*;
import java.util.List;

/**
 * Request DTO for full email scan and draft analysis.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailScanRequest {
    private String sender;
    private String senderName;
    private String recipients;
    private String cc;
    private String bcc;
    private String subject;
    private String body;
    private String direction; // INBOUND or OUTBOUND
    private Long userId;
    private List<AttachmentInfo> attachments;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AttachmentInfo {
        private String fileName;
        private String fileExtension;
        private String mimeType;
        private Long fileSize;
        private String fileHashSha256;
    }
}
