# AI Email Guardian
## Real-Time GenAI Fraud Detection for Enterprise Email Communication

Enterprise security platform that detects AI-generated phishing emails, sensitive data leaks, malicious attachments, and social engineering attempts in real time.

---

## Architecture

```
Next.js Frontend (:3000) → Spring Boot Backend (:8080) → Python AI Service (:8000)
                                     ↓
                               MySQL (:3306)
```

### Two-Stage Fraud Detection Pipeline

```
Email Input
    ↓
Fast Detection Layer (<100ms)
├── Regex-based sensitive data detection
├── Domain risk analysis (typosquatting, look-alikes)
├── Email metadata analysis (impersonation, urgency)
├── Attachment analysis (extensions, MIME, macros)
└── Heuristic phishing signals
    ↓
Initial Risk Score
    ↓
If score > 40 → AI Deep Analysis
├── NLP phishing pattern detection
├── LLM semantic fraud reasoning
└── Contextual NLP sensitive data detection
    ↓
Final Risk Score → Decision Engine → Action
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) OpenAI API key for LLM-powered analysis

### Run with Docker Compose

```bash
cd docker
docker-compose up --build
```

This starts:
| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8080 | http://localhost:8080 |
| AI Service | 8000 | http://localhost:8000 |
| MySQL | 3306 | — |

### Environment Variables (Optional)

Create a `.env` file in the `docker/` directory:

```env
OPENAI_API_KEY=sk-your-key-here     # Enables LLM-powered analysis
COMPANY_DOMAIN=company.com           # Your organization's domain
VIRUSTOTAL_API_KEY=your-key          # Optional: attachment scanning
```

---

## Local Development (Without Docker)

### Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
Requires: Java 17+, Maven, MySQL running on port 3306

### AI Service (Python)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Requires: Python 3.11+

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Requires: Node.js 18+

---

## API Endpoints

### Email Scanning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emails/scan` | Full two-stage email scan |
| POST | `/api/emails/analyze-draft` | Fast-layer only (real-time compose) |
| GET | `/api/emails/{id}` | Get email with analysis |
| GET | `/api/emails` | List recent emails |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Overview statistics |
| GET | `/api/dashboard/trends` | Fraud trend data |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | List incidents (filterable by severity, type) |
| GET | `/api/incidents/{id}` | Incident detail with full email and analysis |

### Example: Scan an Email

```bash
curl -X POST http://localhost:8080/api/emails/scan \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "security-alert@micros0ft-support.com",
    "senderName": "Microsoft Security",
    "recipients": "john.smith@company.com",
    "subject": "URGENT: Your Account Has Been Compromised",
    "body": "You must verify your identity immediately. Click here to verify.",
    "direction": "INBOUND"
  }'
```

### Example Response

```json
{
  "totalScore": 92,
  "factors": {
    "phishing": 95,
    "sensitive_data": 10,
    "domain_risk": 90,
    "attachment_risk": 0,
    "metadata_risk": 85
  },
  "detectedSignals": [
    "typosquatting_domain",
    "urgency_language",
    "credential_harvesting",
    "suspension_threat"
  ],
  "explanation": "High-confidence phishing attempt using typosquatting domain...",
  "actionTaken": "BLOCK",
  "aiDeepAnalysisTriggered": true,
  "aiConfidence": 0.95
}
```

---

## Detection Capabilities

| Module | Detects |
|--------|---------|
| **Domain Risk Analyzer** | Typosquatting, look-alike domains, suspicious patterns |
| **Email Metadata Analyzer** | Executive impersonation, urgency, data exfiltration |
| **Sensitive Data Detector** | SSN, bank accounts, API keys, passwords, credit cards |
| **Attachment Analyzer** | Executables, macros, MIME mismatches, double extensions |
| **NLP Phishing Detector** | 5 signal categories with 30+ patterns |
| **LLM Fraud Analyzer** | Semantic reasoning with explainable output |

---

## Project Structure

```
AI fraud project/
├── backend/                    # Spring Boot REST API (Java 17)
│   └── src/main/java/com/emailguardian/
│       ├── controller/         # REST endpoints
│       ├── service/            # Detection modules + orchestrator
│       ├── model/              # JPA entities
│       ├── repository/         # Data access
│       ├── dto/                # Request/Response DTOs
│       └── config/             # Security + CORS
├── ai-service/                 # Python FastAPI AI/ML service
│   └── app/
│       ├── phishing_detector.py
│       ├── llm_analyzer.py
│       ├── sensitive_data_detector.py
│       └── mcp_orchestrator.py
├── frontend/                   # Next.js 14 + TypeScript + TailwindCSS
│   └── src/
│       ├── app/                # Pages (dashboard, compose, incidents, emails)
│       ├── components/         # Reusable UI components
│       └── lib/                # API client
├── database/                   # MySQL schema + seed data
│   └── init.sql
└── docker/                     # Docker Compose deployment
    └── docker-compose.yml
```

---

## Demo Data

The system comes pre-loaded with 8 test emails:
- 1 legitimate internal email
- 1 external harmless newsletter
- 2 phishing emails (typosquatting, credential harvesting)
- 2 financial fraud attempts (BEC, invoice fraud)
- 1 AI-generated phishing (compliance pretext)
- 1 attachment malware simulation (macro-enabled Excel)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| Backend | Java 17, Spring Boot 3.2, Spring Data JPA |
| AI/ML | Python, FastAPI, NLP patterns, OpenAI API (optional) |
| Database | MySQL 8.0 |
| Deployment | Docker, Docker Compose |
