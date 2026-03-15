-- AI Email Guardian - Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS email_guardian;
USE email_guardian;

-- ============================================
-- USERS TABLE (with role simulation)
-- ============================================
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('EMPLOYEE', 'SECURITY_ANALYST', 'ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- EMAILS TABLE
-- ============================================
CREATE TABLE emails (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    recipients TEXT NOT NULL,
    cc TEXT,
    bcc TEXT,
    subject VARCHAR(500),
    body TEXT,
    direction ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'INBOUND',
    status ENUM('ALLOWED', 'WARNED', 'STRONG_WARNING', 'BLOCKED') DEFAULT 'ALLOWED',
    user_id BIGINT,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sender (sender),
    INDEX idx_status (status),
    INDEX idx_scanned_at (scanned_at)
);

-- ============================================
-- FRAUD ANALYSIS TABLE (with explainable output)
-- ============================================
CREATE TABLE fraud_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_id BIGINT NOT NULL,
    total_score DOUBLE NOT NULL DEFAULT 0,
    phishing_score DOUBLE DEFAULT 0,
    sensitive_data_score DOUBLE DEFAULT 0,
    domain_risk_score DOUBLE DEFAULT 0,
    attachment_risk_score DOUBLE DEFAULT 0,
    metadata_risk_score DOUBLE DEFAULT 0,
    ai_deep_analysis_triggered BOOLEAN DEFAULT FALSE,
    ai_confidence DOUBLE,
    detected_signals JSON,
    explanation TEXT,
    action_taken ENUM('ALLOW', 'WARN', 'STRONG_WARNING', 'BLOCK') NOT NULL,
    analysis_duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_total_score (total_score),
    INDEX idx_action (action_taken),
    INDEX idx_created (created_at)
);

-- ============================================
-- RISK SCORES (per-factor breakdown history)
-- ============================================
CREATE TABLE risk_scores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fraud_analysis_id BIGINT NOT NULL,
    factor_name VARCHAR(100) NOT NULL,
    factor_score DOUBLE NOT NULL,
    factor_weight DOUBLE NOT NULL,
    weighted_score DOUBLE NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fraud_analysis_id) REFERENCES fraud_analysis(id) ON DELETE CASCADE
);

-- ============================================
-- ATTACHMENTS TABLE (with file hashing)
-- ============================================
CREATE TABLE attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_extension VARCHAR(20),
    mime_type VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    file_hash_sha256 VARCHAR(64),
    risk_score DOUBLE DEFAULT 0,
    risk_signals JSON,
    scanned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_file_hash (file_hash_sha256)
);

-- ============================================
-- INCIDENT LOGS TABLE
-- ============================================
CREATE TABLE incident_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_id BIGINT NOT NULL,
    fraud_analysis_id BIGINT,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    risk_score DOUBLE,
    action_taken ENUM('ALLOW', 'WARN', 'STRONG_WARNING', 'BLOCK') NOT NULL,
    detected_signals JSON,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by BIGINT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (fraud_analysis_id) REFERENCES fraud_analysis(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_severity (severity),
    INDEX idx_incident_type (incident_type),
    INDEX idx_resolved (resolved),
    INDEX idx_created (created_at)
);

-- ============================================
-- SEED DATA: Demo Users
-- ============================================
INSERT INTO users (username, email, full_name, role, department) VALUES
('jsmith', 'john.smith@company.com', 'John Smith', 'EMPLOYEE', 'Finance'),
('agarcia', 'ana.garcia@company.com', 'Ana Garcia', 'SECURITY_ANALYST', 'Security Operations'),
('mchen', 'michael.chen@company.com', 'Michael Chen', 'ADMIN', 'IT Administration');

-- ============================================
-- SEED DATA: 8 Demo Test Emails
-- ============================================

-- 1. Legitimate internal email
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status, user_id) VALUES
('john.smith@company.com', 'John Smith', 'ana.garcia@company.com', 'Q3 Team Meeting Agenda',
'Hi Ana,\n\nPlease find attached the agenda for our Q3 team meeting scheduled for next Thursday at 2 PM.\n\nTopics include:\n- Project status updates\n- Budget review\n- New hire onboarding\n\nLet me know if you have items to add.\n\nBest regards,\nJohn', 'OUTBOUND', 'ALLOWED', 1);

-- 2. External harmless email
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('newsletter@techconf2026.com', 'TechConf 2026', 'john.smith@company.com', 'TechConf 2026 - Early Bird Registration',
'Dear John,\n\nWe are excited to announce that TechConf 2026 registration is now open.\n\nEarly bird pricing available until April 30.\n\nVisit our website for more details.\n\nBest,\nTechConf Team', 'INBOUND', 'ALLOWED');

-- 3. Phishing email - credential harvesting
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('security-alert@micros0ft-support.com', 'Microsoft Security', 'john.smith@company.com', 'URGENT: Your Account Has Been Compromised',
'Dear User,\n\nWe have detected unusual sign-in activity on your Microsoft 365 account. Your account may have been compromised.\n\nYou must verify your identity immediately to prevent account suspension.\n\nClick here to verify: https://micros0ft-support.com/verify\n\nPlease enter your username and password to confirm your identity.\n\nThis is an automated security alert. Failure to respond within 24 hours will result in permanent account deactivation.\n\nMicrosoft Security Team', 'INBOUND', 'BLOCKED');

-- 4. Phishing email - CEO impersonation
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('ceo-office@gmail.com', 'Robert Johnson CEO', 'john.smith@company.com', 'Confidential - Immediate Action Required',
'John,\n\nI need you to handle something confidential and time-sensitive. I am in a meeting and cannot call.\n\nPlease purchase 5 gift cards of $500 each from Amazon and send me the redemption codes by email.\n\nThis is for a client appreciation initiative. Do not discuss this with anyone else until I announce it.\n\nI will reimburse the department budget.\n\nThanks,\nRobert Johnson\nCEO', 'INBOUND', 'BLOCKED');

-- 5. Financial fraud - wire transfer
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('accounts.payable@vendor-invoice.net', 'Accounts Payable', 'john.smith@company.com', 'Invoice #INV-2026-4821 - Payment Due',
'Dear Finance Team,\n\nPlease find attached Invoice #INV-2026-4821 for consulting services rendered in February 2026.\n\nAmount Due: $45,750.00\n\nIMPORTANT: Our banking details have changed. Please update your records:\n\nBank: First National Bank\nAccount: 4829103847\nRouting: 021000089\n\nPayment is due within 48 hours to avoid late penalties.\n\nRegards,\nAccounts Payable Department', 'INBOUND', 'BLOCKED');

-- 6. Financial fraud - sensitive data exfiltration
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('john.smith@company.com', 'John Smith', 'external.consultant@gmail.com', 'RE: Financial Data Request',
'Hi,\n\nAs requested, here are the details:\n\nCompany Bank Account: 7291038475\nRouting Number: 021000089\nAPI Key: sk-proj-abc123def456ghi789\nAdmin Password: S3cur3P@ss2026!\n\nPlease keep this confidential.\n\nJohn', 'OUTBOUND', 'BLOCKED');

-- 7. AI-generated phishing email
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('it-helpdesk@secure-verify.com', 'IT Helpdesk', 'john.smith@company.com', 'Mandatory Security Compliance Update - Action Required',
'Dear Valued Employee,\n\nAs part of our ongoing commitment to maintaining the highest standards of cybersecurity compliance, we are implementing a mandatory security verification process for all employees.\n\nThis initiative is designed to ensure that our organization maintains its SOC 2 Type II certification and remains in full compliance with industry regulations.\n\nTo complete your verification, please navigate to our secure portal and provide the following information:\n\n1. Your current network credentials\n2. Your employee identification number\n3. Your department and reporting manager\n\nPlease complete this process within the next 12 hours to avoid any disruption to your network access. Employees who do not complete verification by the deadline will have their access temporarily suspended.\n\nThank you for your cooperation in maintaining our security posture.\n\nBest Regards,\nIT Security Compliance Team\nEnterprise Technology Services', 'INBOUND', 'BLOCKED');

-- 8. Attachment malware simulation
INSERT INTO emails (sender, sender_name, recipients, subject, body, direction, status) VALUES
('hr-documents@company-portal.com', 'HR Documents', 'john.smith@company.com', 'Updated Employee Benefits - Please Review',
'Dear Employee,\n\nPlease review the attached updated benefits package for 2026.\n\nThe document contains important changes to your healthcare and retirement plans.\n\nPlease enable macros to view the interactive benefits calculator.\n\nHR Department', 'INBOUND', 'BLOCKED');

-- Demo attachments for email #8
INSERT INTO attachments (email_id, file_name, file_extension, mime_type, file_size, file_hash_sha256, risk_score, risk_signals, scanned) VALUES
(8, 'Benefits_2026.xlsm', 'xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12', 245760,
'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 85,
'["macro_enabled_document", "suspicious_file_extension", "external_sender"]', TRUE);

-- Demo fraud analysis records
INSERT INTO fraud_analysis (email_id, total_score, phishing_score, sensitive_data_score, domain_risk_score, attachment_risk_score, metadata_risk_score, ai_deep_analysis_triggered, ai_confidence, detected_signals, explanation, action_taken, analysis_duration_ms) VALUES
(1, 5, 0, 0, 0, 0, 5, FALSE, NULL, '[]', 'Legitimate internal email with no fraud indicators.', 'ALLOW', 12),
(2, 15, 5, 0, 15, 0, 10, FALSE, NULL, '["external_domain"]', 'External newsletter with low risk indicators.', 'ALLOW', 18),
(3, 92, 95, 10, 90, 0, 85, TRUE, 0.95, '["typosquatting_domain", "urgency_language", "credential_harvesting", "impersonation_attempt", "suspicious_url"]', 'High-confidence phishing attempt using a typosquatting domain (micros0ft-support.com) with urgency-based social engineering to harvest credentials.', 'BLOCK', 1250),
(4, 88, 85, 15, 80, 0, 90, TRUE, 0.91, '["ceo_impersonation", "external_sender_impersonating_executive", "gift_card_scam", "urgency_language", "confidentiality_pressure"]', 'Business email compromise (BEC) attempt impersonating CEO via external Gmail address requesting gift card purchases.', 'BLOCK', 1100),
(5, 82, 70, 85, 75, 0, 60, TRUE, 0.87, '["banking_details_change", "financial_request", "urgency_language", "external_domain", "invoice_scam"]', 'Invoice fraud attempt with changed banking details designed to redirect wire transfer payments.', 'BLOCK', 980),
(6, 95, 20, 98, 30, 0, 70, TRUE, 0.93, '["bank_account_exposed", "api_key_exposed", "password_exposed", "sensitive_data_to_external", "data_exfiltration"]', 'Outbound email containing multiple sensitive data elements including bank accounts, API keys, and passwords sent to external recipient.', 'BLOCK', 850),
(7, 90, 92, 15, 85, 0, 75, TRUE, 0.92, '["ai_generated_text", "credential_harvesting", "urgency_language", "compliance_pretext", "external_domain", "suspension_threat"]', 'AI-generated phishing email using compliance pretext to harvest employee credentials with sophisticated language patterns.', 'BLOCK', 1400),
(8, 78, 45, 5, 60, 85, 55, TRUE, 0.80, '["macro_enabled_attachment", "suspicious_file_extension", "external_sender", "enable_macros_request"]', 'Email with macro-enabled Excel attachment from external sender requesting macro activation — potential malware delivery.', 'BLOCK', 920);

-- Demo incident logs
INSERT INTO incident_logs (email_id, fraud_analysis_id, severity, incident_type, title, description, risk_score, action_taken, detected_signals) VALUES
(3, 3, 'CRITICAL', 'PHISHING', 'Typosquatting Phishing Attack', 'Credential harvesting attempt via typosquatting domain micros0ft-support.com', 92, 'BLOCK', '["typosquatting_domain", "credential_harvesting"]'),
(4, 4, 'CRITICAL', 'BEC', 'CEO Impersonation - Gift Card Scam', 'Business email compromise impersonating CEO requesting gift card purchases', 88, 'BLOCK', '["ceo_impersonation", "gift_card_scam"]'),
(5, 5, 'HIGH', 'FINANCIAL_FRAUD', 'Invoice Wire Transfer Fraud', 'Fraudulent invoice with changed banking details for wire transfer redirect', 82, 'BLOCK', '["banking_details_change", "invoice_scam"]'),
(6, 6, 'CRITICAL', 'DATA_LEAK', 'Sensitive Data Exfiltration', 'Outbound email with bank accounts, API keys, and passwords to external recipient', 95, 'BLOCK', '["data_exfiltration", "sensitive_data_to_external"]'),
(7, 7, 'CRITICAL', 'AI_PHISHING', 'AI-Generated Phishing', 'Sophisticated AI-generated phishing using compliance pretext', 90, 'BLOCK', '["ai_generated_text", "credential_harvesting"]'),
(8, 8, 'HIGH', 'MALWARE', 'Macro-Enabled Attachment', 'Macro-enabled Excel file from external sender', 78, 'BLOCK', '["macro_enabled_attachment"]');
