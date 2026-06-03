# CHAPTER 5
# PROPOSED SYSTEM

============================================================
5. PROPOSED SYSTEM
============================================================

---

## 5.1 System Overview

The Sterling Intelligent Interview & Candidate Assessment Platform is an enterprise-grade, AI-powered web application designed to automate the complete preliminary technical recruitment lifecycle — from candidate registration and resume screening through dynamic AI-driven technical interview, automated evaluation, and structured report generation. The platform eliminates the dependency on human interviewer involvement in the screening phase while simultaneously delivering a richer, more rigorous, and more consistent assessment experience than traditional manual interviews.

At its core, the platform functions as an intelligent conversational agent — embodied as a 3D AI Avatar with high-fidelity voice synthesis — that conducts a fully structured technical interview in real time. The avatar poses questions, listens to and evaluates spoken responses, observes code written by the candidate in an integrated Monaco Editor workspace, and dynamically adapts the interview trajectory based on the candidate's demonstrated competency level. Upon interview completion, the system automatically generates a comprehensive evaluation report containing multi-dimensional scores, a candidate ranking, and a hiring recommendation — enabling HR managers and engineering leads at Sterling E-Mobility to make data-informed decisions with zero preliminary screening time investment.

---

## 5.2 Advantages of the Proposed System Over Existing Approaches

**Table 5.1 — Proposed System Advantages Matrix**

| Dimension | Traditional Manual Process | Proposed System |
|---|---|---|
| Scheduling | Requires alignment of candidate + interviewer calendars (3–7 day delay typical) | 24/7 asynchronous availability; candidate self-schedules |
| Consistency | Variable question sets; subjective scoring | Identical role-specific question framework for all candidates; mathematical scoring |
| Engineering Time | 2–4 hours/candidate (senior engineer involved) | Zero engineering hours for preliminary screening |
| Scalability | Linear with interviewer availability | Horizontally scalable; handles concurrent sessions |
| Candidate Experience | Telephonic/generic video | Immersive 3D Avatar + glassmorphism UI; premium brand reflection |
| Evaluation Depth | Verbal only; no code assessment in preliminary stage | Voice + Code (Monaco) + LLM semantic evaluation |
| Data Output | Qualitative narrative notes | Structured JSON scores + PDF report with rankings |
| Resume Screening | Manual; HR subject-matter expertise gap | NLP-automated; role-specific skill matching with scoring |
| Proctoring | None in preliminary stage | Face detection + tab monitoring + focus tracking |
| Cost per Candidate | ~₹6,875 (engineering opportunity cost) | Near-zero marginal cost post deployment |

---

## 5.3 Functional Requirements

The functional requirements of the Sterling AI Recruitment Engine are specified below, organised by user role:

### 5.3.1 Candidate Portal Requirements

| FR-C-01 | The system shall allow candidates to self-register with name, email, and password. |
|---|---|
| FR-C-02 | The system shall authenticate registered candidates via secure login. |
| FR-C-03 | The system shall allow authenticated candidates to upload PDF resumes. |
| FR-C-04 | The system shall automatically parse uploaded resumes and compute a role-match score. |
| FR-C-05 | The system shall present the candidate with available job roles and departments for selection. |
| FR-C-06 | The system shall verify microphone and camera availability before launching the interview. |
| FR-C-07 | The system shall conduct a real-time voice-based interview with the 3D AI Avatar. |
| FR-C-08 | The system shall provide an integrated Monaco Code Editor for code-based question responses. |
| FR-C-09 | The system shall display real-time transcript feedback during the interview. |
| FR-C-10 | The system shall allow the candidate to view their interview report upon completion. |

### 5.3.2 Admin/HR Portal Requirements

| FR-A-01 | The system shall allow administrators to securely log in to the admin command centre. |
|---|---|
| FR-A-02 | The system shall allow creation, modification, and deletion of Departments and Job Roles. |
| FR-A-03 | The system shall allow configuration of role-specific grading weights (Technical/Comm/EQ/Confidence). |
| FR-A-04 | The system shall allow management of the Question Bank (CRUD operations). |
| FR-A-05 | The system shall support bulk import of questions via CSV upload. |
| FR-A-06 | The system shall display a system-wide analytics dashboard with candidate pipeline metrics. |
| FR-A-07 | The system shall allow administrators to view detailed candidate evaluation reports. |
| FR-A-08 | The system shall allow administrators to override AI hiring decisions (PENDING → HIRED/REJECTED). |
| FR-A-09 | The system shall support PDF export of individual candidate reports. |
| FR-A-10 | The system shall maintain a comprehensive audit log of all administrative actions. |

---

## 5.4 Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Speech-to-Text transcription latency ≤ 1 second for standard internet connections |
| NFR-02 | Performance | Text-to-Speech audio generation and streaming ≤ 2 seconds from LLM response generation |
| NFR-03 | Performance | Resume scoring completion ≤ 5 seconds after PDF upload |
| NFR-04 | Scalability | System shall support concurrent interview sessions without performance degradation |
| NFR-05 | Reliability | Circuit breaker pattern shall ensure graceful degradation on external API failure |
| NFR-06 | Security | All passwords shall be stored as bcrypt hashes; JWT tokens used for session management |
| NFR-07 | Security | WebSocket buffer limited to 15MB to prevent OOM/overflow attacks |
| NFR-08 | Compatibility | Frontend shall be compatible with Chrome 100+, Firefox 100+, Edge 100+ on desktop |
| NFR-09 | Usability | Interview UI shall achieve System Usability Scale (SUS) score ≥ 75 |
| NFR-10 | Maintainability | Microservices architecture shall allow isolated update/deployment of individual services |
| NFR-11 | Portability | System shall operate on i3-class server hardware with standard Python 3.x environment |
| NFR-12 | Data Integrity | SQLite WAL mode shall ensure data consistency during concurrent read-write operations |

---

## 5.5 System Features Matrix

**Table 5.2 — System Features Matrix**

| Feature Category | Feature | Priority |
|---|---|---|
| Authentication | Candidate Registration, Login, JWT Session | P1 |
| Resume Management | PDF Upload, NLP Parsing, Scoring, Role Matching | P1 |
| Interview Engine | WebSocket Audio Stream, STT, LLM Evaluation, TTS, Avatar | P1 |
| Code Assessment | Monaco Editor Integration, LLM Code Review | P1 |
| Proctoring | Face Detection, Tab Monitoring, Focus Tracking, Anomaly Flags | P1 |
| Scoring | Technical, Communication, EQ, Confidence — Weighted Composite | P1 |
| Reporting | Automated FinalReport, Strengths/Weaknesses, Hiring Decision | P1 |
| Admin Dashboard | Department/Role CRUD, Question Bank, Analytics | P1 |
| Data Management | CSV Import (Questions), PDF Export (Reports) | P2 |
| Manual Override | Admin PENDING → HIRED/REJECTED Decision | P2 |
| Audit Logging | All System Actions Logged with Timestamp and Actor | P2 |
| Analytics | Score Distribution Charts, Candidate Pipeline Metrics | P2 |

---

## 5.6 Use Case Diagram Description

**Primary Actors**:
- **Candidate**: Interacts with the registration, resume, and interview modules.
- **HR Administrator**: Manages roles, departments, questions, and reviews candidate reports.
- **AI System (Internal)**: Conducts interview evaluation, resume scoring, report generation.

**Key Use Cases**:

1. Register Account → Candidate
2. Upload Resume → Candidate → [includes] Parse & Score Resume → AI System
3. Select Job Role → Candidate
4. Launch Interview → Candidate → [includes] Conduct AI Interview → AI System → [includes] Evaluate Responses
5. View Report → Candidate (post-interview)
6. Manage Departments/Roles → HR Administrator
7. Manage Question Bank → HR Administrator
8. Import Questions (CSV) → HR Administrator
9. View Analytics Dashboard → HR Administrator
10. Review Candidate Report → HR Administrator
11. Override Hiring Decision → HR Administrator
12. Export Report (PDF) → HR Administrator

---

## 5.7 User Stories

**Candidate User Stories:**

- *"As a candidate, I want to register on the platform so that I can access the interview module."*
- *"As a candidate, I want to upload my resume so that the system can automatically assess my profile before the interview."*
- *"As a candidate, I want to experience a realistic conversational interview with a human-like avatar so that the assessment feels engaging and professional."*
- *"As a candidate, I want to write code in an integrated editor so that I can demonstrate my programming ability alongside my verbal responses."*
- *"As a candidate, I want to see my performance report after the interview so that I understand my evaluation outcomes."*

**HR Administrator User Stories:**

- *"As an HR administrator, I want to configure department-specific grading weights so that the system evaluates candidates appropriately for different engineering roles."*
- *"As an HR administrator, I want to import question banks via CSV so that I can quickly populate the system with role-specific interview questions."*
- *"As an HR administrator, I want to view a dashboard showing all candidate scores and statuses so that I can efficiently manage the hiring pipeline."*
- *"As an HR administrator, I want to manually approve or reject a candidate recommended by the AI so that I retain final decision-making authority."*

---

## 5.8 Data Flow Description

The high-level data flow of the proposed system encompasses five primary data streams:

**Stream 1 — Resume Data Flow**:
Candidate uploads PDF → `resume_engine.py` extracts text → NLP pipeline identifies skills, experience markers → Role-match score computed → `Resume` entity persisted in database.

**Stream 2 — Interview Audio Data Flow**:
Candidate microphone (500ms chunks) → WebSocket (`/ws/stt`) → FastAPI gateway → `whisper_service.py` (Groq API) → Transcript → `prompt_engine.py` → `ai_orchestrator.py` → GPT-4o/Gemini evaluation → LLM response text → `tts_service.py` (ElevenLabs) → Audio buffer → Frontend HTML5 Audio context → Candidate speaker.

**Stream 3 — Code Data Flow**:
Monaco Editor content → WebSocket payload → Backend Context Merger → Prepended to transcript → LLM contextual evaluation.

**Stream 4 — Proctoring Data Flow**:
Browser camera/events → `useHumanBehavior.js` (frontend) → WebSocket → `behavior_analysis.py` and `eye_tracking.py` → Anomaly flags → FinalReport proctoring section.

**Stream 5 — Reporting Data Flow**:
All `CandidateAnswer`, `KeywordEvaluation`, `QuestionEvaluation`, and `ConversationHistory` records → `ranking_engine.py` → Multi-dimensional score computation → `FinalReport` entity → `UnifiedInterviewData` denormalised aggregate → PDF export.

---

## 5.9 Feasibility Validation

Based on the comprehensive analysis presented in Chapters 3 and 4, and the requirements specification in this chapter, the following feasibility conclusions are established:

| Feasibility Dimension | Assessment | Evidence |
|---|---|---|
| Technical | **Confirmed Feasible** | All component technologies are production-ready and documented |
| Operational | **Confirmed Feasible** | Minimal infrastructure requirements; browser-based candidate interface |
| Economic | **Confirmed Feasible** | Payback within single quarter of operation at SEM hiring volumes |
| Legal/Ethical | **Confirmed Feasible** | AI evaluation supplement to (not replacement of) human decision; DPDP Act 2023 compliant data handling |
| Schedule | **Confirmed Feasible** | Microservices architecture enables parallel development by component |

---

*End of Chapter 5. Proceed to Chapter 6 — System Architecture.*
