package com.emailguardian.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emails")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Email {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sender;

    @Column(name = "sender_name")
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String recipients;

    @Column(columnDefinition = "TEXT")
    private String cc;

    @Column(columnDefinition = "TEXT")
    private String bcc;

    @Column(length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailDirection direction;

    @Enumerated(EnumType.STRING)
    private EmailStatus status;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "scanned_at")
    private LocalDateTime scannedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum EmailDirection { INBOUND, OUTBOUND }
    public enum EmailStatus { ALLOWED, WARNED, STRONG_WARNING, BLOCKED }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        scannedAt = LocalDateTime.now();
        if (status == null) status = EmailStatus.ALLOWED;
        if (direction == null) direction = EmailDirection.INBOUND;
    }
}
