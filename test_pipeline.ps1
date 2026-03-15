# AI Email Guardian - End-to-End Pipeline Test Script
# This script sends a high-risk phishing email to the backend to trigger the full 2-stage pipeline.

$sender = "security-alert@micros0ft-support.com"
$subject = "URGENT: Your Account Has Been Compromised"
$body = @"
Dear User,

We have detected unusual activity. Please share your sk-proj-abc123def456ghi789 for verification.
This wire transfer for bank account 4829103847 is urgent.
SSN for identity: 123-45-6789
Credit Card: 4111-2222-3333-4444

You must verify your identity immediately to prevent account suspension.
Click here to verify: https://micros0ft-support.com/verify
"@

$payload = @{
    sender = $sender
    senderName = "Microsoft Security"
    recipients = "john.smith@company.com"
    subject = $subject
    body = $body
    direction = "INBOUND"
    attachments = @(
        @{
            fileName = "security_patch.exe"
            fileExtension = "exe"
            mimeType = "application/x-msdownload"
            fileSize = 1024
            fileHashSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
    )
} | ConvertTo-Json

Write-Host "Sending high-risk email to backend (port 8080)..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/emails/scan" -Method Post -Body $payload -ContentType "application/json"
    
    Write-Host "`n--- Scan Result ---" -ForegroundColor Green
    Write-Host "Email ID: $($response.emailId)"
    Write-Host "Total Score: $($response.totalScore)"
    Write-Host "Action Taken: $($response.actionTaken)"
    Write-Host "AI Deep Analysis Triggered: $($response.aiDeepAnalysisTriggered)"
    Write-Host "AI Confidence: $($response.aiConfidence)"
    Write-Host "Explanation: $($response.explanation)"
    Write-Host "Signals: $($response.detectedSignals -join ', ')"
    Write-Host "Duration: $($response.analysisDurationMs)ms"
} catch {
    Write-Host "`nError calling API: $_" -ForegroundColor Red
}
