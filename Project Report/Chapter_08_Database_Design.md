# CHAPTER 8
# DATABASE DESIGN

============================================================
8. DATABASE DESIGN
============================================================

---

## 8.1 Database Design Philosophy

The database design of the Sterling AI Recruitment Engine follows the principles of **Third Normal Form (3NF) relational normalisation** to eliminate data redundancy and ensure referential integrity throughout the schema. The 15-table schema is structured around a central hub-and-spoke topology, with the `InterviewSession` entity serving as the primary hub connecting candidates, roles, evaluations, reports, and conversation history.

A deliberate design decision was made to include one denormalised aggregate table — `UnifiedInterviewData` — as a **reporting optimisation table**. Rather than executing complex multi-table JOIN queries every time a FinalReport is generated, interview evaluation data is pre-aggregated into this table at session completion, enabling the `ranking_engine.py` to generate complete candidate reports with a single SELECT query. This trade-off between normalisation purity and reporting performance is standard practice in enterprise reporting architectures.

The database engine is **SQLite 3** configured with **WAL (Write-Ahead Logging) journal mode**, selected for its ability to support concurrent read operations alongside write operations without table-level locking — a critical requirement for the platform's concurrent interview session handling.

---

## 8.2 Entity Relationship Overview

[INSERT DATABASE ER DIAGRAM]

*Figure 8.1 — Entity-Relationship Diagram: 15-Table Schema — Sterling AI Recruitment Engine*

The complete schema consists of the following fifteen entities, described in detail in subsequent sections:

1. Department
2. JobRole
3. StatusLookup
4. Candidate
5. Resume
6. InterviewSession
7. QuestionBank
8. InterviewQuestionsLog
9. CandidateAnswer
10. KeywordEvaluation
11. QuestionEvaluation
12. UnifiedInterviewData
13. ConversationHistory
14. FinalReport
15. AuditLog

---

## 8.3 Entity 1 — Department

**Purpose**: Defines the organisational department hierarchy within Sterling E-Mobility. Departments serve as the top-level grouping for Job Roles, enabling department-specific configuration of interview parameters.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `department_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique department identifier |
| `department_name` | VARCHAR(100) | NOT NULL, UNIQUE | Department name (e.g., "Engineering — Firmware", "Product Management") |
| `description` | TEXT | NULL | Detailed description of department function |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Relationships**:
- 1:N with `JobRole` (one department contains many roles)
- 1:N with `QuestionBank` (one department may have many questions)

---

## 8.4 Entity 2 — JobRole

**Purpose**: Defines specific positions within Sterling E-Mobility's organisational structure. Each role carries configuration parameters that determine how the AI interview engine assesses candidates — including the AI persona, question difficulty distribution, and the weighted importance of different evaluation dimensions.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `role_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique role identifier |
| `department_id` | INTEGER | FOREIGN KEY → Department, NOT NULL | Parent department |
| `role_name` | VARCHAR(100) | NOT NULL | Role title (e.g., "Embedded Systems Engineer") |
| `persona` | TEXT | NOT NULL | AI interviewer persona description for LLM role-conditioning |
| `tech_weight` | FLOAT | NOT NULL, CHECK 0≤x≤1 | Weight of technical score in composite evaluation |
| `comm_weight` | FLOAT | NOT NULL, CHECK 0≤x≤1 | Weight of communication score in composite evaluation |
| `eq_weight` | FLOAT | NOT NULL, CHECK 0≤x≤1 | Weight of emotional intelligence score |
| `conf_weight` | FLOAT | NOT NULL, CHECK 0≤x≤1 | Weight of confidence score |
| `difficulty_distribution` | JSON | NULL | Distribution of Easy/Medium/Hard questions |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Constraint**: `tech_weight + comm_weight + eq_weight + conf_weight = 1.0` (enforced at application layer)

**Relationships**:
- N:1 with `Department`
- 1:N with `InterviewSession`
- 1:N with `QuestionBank`

---

## 8.5 Entity 3 — StatusLookup

**Purpose**: Provides a lookup table for all valid interview session states, implementing a type-safe state machine for interview lifecycle management.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `status_id` | INTEGER | PRIMARY KEY | Status identifier |
| `status_name` | VARCHAR(50) | NOT NULL, UNIQUE | Status name |
| `status_description` | TEXT | NULL | Detailed description |

**Standard Status Values**:

| status_id | status_name | Description |
|---|---|---|
| 1 | REGISTERED | Candidate registered; interview not yet initiated |
| 2 | RESUME_UPLOADED | Resume uploaded and scored |
| 3 | INTERVIEW_PENDING | Interview started but not yet completed |
| 4 | INTERVIEW_COMPLETED | Interview session terminated; evaluation in progress |
| 5 | REPORT_GENERATED | FinalReport available |
| 6 | PENDING | Awaiting HR manual review decision |
| 7 | HIRED | Candidate approved for advancement |
| 8 | REJECTED | Candidate rejected |

---

## 8.6 Entity 4 — Candidate

**Purpose**: Stores the identity and authentication credentials of all registered candidates. This is the primary identity entity for the candidate user type.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `candidate_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique candidate identifier |
| `name` | VARCHAR(200) | NOT NULL | Candidate full name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email address (login identifier) |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| `phone` | VARCHAR(20) | NULL | Contact phone number |
| `created_at` | DATETIME | NOT NULL | Registration timestamp |
| `last_login` | DATETIME | NULL | Last login timestamp |

**Relationships**:
- 1:N with `Resume`
- 1:N with `InterviewSession`
- 1:N with `CandidateAnswer`
- 1:N with `FinalReport`

---

## 8.7 Entity 5 — Resume

**Purpose**: Stores both the raw text extracted from a candidate's uploaded PDF resume and the derived analytical metrics — skill detection results, experience quantification, and role-match score — computed by `resume_engine.py`.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `resume_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique resume identifier |
| `candidate_id` | INTEGER | FOREIGN KEY → Candidate, NOT NULL | Owning candidate |
| `file_path` | VARCHAR(500) | NOT NULL | Server filesystem path to stored PDF |
| `extracted_text` | TEXT | NOT NULL | Full raw text extracted from PDF |
| `skills_detected` | JSON | NULL | List of identified skill keywords |
| `experience_years` | FLOAT | NULL | Estimated years of experience |
| `resume_score` | FLOAT | NOT NULL | Role-match compatibility score (0–100) |
| `upload_timestamp` | DATETIME | NOT NULL | Upload timestamp |
| `role_id_applied` | INTEGER | FOREIGN KEY → JobRole | Role this resume was evaluated against |

---

## 8.8 Entity 6 — InterviewSession

**Purpose**: The central hub entity that tracks the complete lifecycle of a single interview session for a candidate applying for a specific role. All evaluation data flows through this entity.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `interview_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique session identifier |
| `candidate_id` | INTEGER | FOREIGN KEY → Candidate, NOT NULL | Candidate undertaking the interview |
| `role_id` | INTEGER | FOREIGN KEY → JobRole, NOT NULL | Role being interviewed for |
| `status_id` | INTEGER | FOREIGN KEY → StatusLookup, NOT NULL | Current lifecycle status |
| `start_timestamp` | DATETIME | NOT NULL | Session start time |
| `end_timestamp` | DATETIME | NULL | Session end time (NULL if in progress) |
| `duration_seconds` | INTEGER | NULL | Total interview duration |
| `overall_score` | FLOAT | NULL | Computed composite score (0–100) |
| `technical_score` | FLOAT | NULL | Technical dimension score |
| `communication_score` | FLOAT | NULL | Communication dimension score |
| `eq_score` | FLOAT | NULL | Emotional intelligence dimension score |
| `confidence_score` | FLOAT | NULL | Confidence dimension score |
| `proctoring_flags` | JSON | NULL | Array of proctoring anomaly flags |

**Relationships**: Central hub connecting to `CandidateAnswer`, `InterviewQuestionsLog`, `ConversationHistory`, `FinalReport`, `KeywordEvaluation`, `QuestionEvaluation`.

---

## 8.9 Entity 7 — QuestionBank

**Purpose**: Central repository for all technical interview questions available to the AI interview engine.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `question_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique question identifier |
| `department_id` | INTEGER | FOREIGN KEY → Department, NOT NULL | Associated department |
| `role_id` | INTEGER | FOREIGN KEY → JobRole, NULL | Specific role (NULL = department-wide) |
| `question_text` | TEXT | NOT NULL | Full question text |
| `difficulty` | VARCHAR(10) | NOT NULL, CHECK IN ('Easy','Medium','Hard') | Difficulty classification |
| `category` | VARCHAR(100) | NULL | Question category (e.g., "Motor Control", "Embedded C") |
| `keywords` | JSON | NOT NULL | Expected answer keywords for evaluation |
| `follow_up_prompt` | TEXT | NULL | LLM prompt for follow-up question generation |
| `created_by` | VARCHAR(100) | NOT NULL | Creator identifier |
| `created_at` | DATETIME | NOT NULL | Creation timestamp |

---

## 8.10 Entity 8 — InterviewQuestionsLog

**Purpose**: Audit log tracking exactly which questions were asked during each interview session, in what order, and at what time — enabling reproducible review of the interview trajectory.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `asked_question_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique log entry identifier |
| `interview_id` | INTEGER | FOREIGN KEY → InterviewSession, NOT NULL | Parent session |
| `question_id` | INTEGER | FOREIGN KEY → QuestionBank, NULL | Predefined question reference (NULL if LLM-generated) |
| `question_text_used` | TEXT | NOT NULL | Actual question text as posed (may differ from bank version if LLM-modified) |
| `sequence_number` | INTEGER | NOT NULL | Question order within session |
| `asked_at` | DATETIME | NOT NULL | Timestamp when question was posed |

---

## 8.11 Entity 9 — CandidateAnswer

**Purpose**: Stores the raw candidate response data — transcribed speech text and Monaco Editor code content — for each question answered during the interview.

| Attribute | Data Type | Constraint | Description |
|---|---|---|---|
| `answer_id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | Unique answer identifier |
| `candidate_id` | INTEGER | FOREIGN KEY → Candidate, NOT NULL | Candidate identifier |
| `interview_id` | INTEGER | FOREIGN KEY → InterviewSession, NOT NULL | Parent session |
| `question_id` | INTEGER | FOREIGN KEY → QuestionBank, NULL | Associated question |
| `transcript_text` | TEXT | NOT NULL | Whisper-transcribed spoken answer |
| `code_submission` | TEXT | NULL | Monaco Editor code content (if applicable) |
| `response_duration_seconds` | INTEGER | NULL | Time candidate took to respond |
| `answered_at` | DATETIME | NOT NULL | Response timestamp |

---

## 8.12 Entity 10 & 11 — KeywordEvaluation and QuestionEvaluation

### KeywordEvaluation

**Purpose**: Stores the granular keyword-matching evaluation result for each candidate answer. The `keywords` field of the `QuestionBank` entity defines which technical keywords the LLM checks for in the candidate's response.

| Attribute | Data Type | Description |
|---|---|---|
| `kw_eval_id` | INTEGER | Primary key |
| `answer_id` | FOREIGN KEY → CandidateAnswer | Associated answer |
| `keywords_expected` | JSON | Keywords expected per question |
| `keywords_matched` | JSON | Keywords actually present in candidate response |
| `keyword_score` | FLOAT | Score (0–100) based on keyword coverage ratio |

### QuestionEvaluation

**Purpose**: Stores the LLM-generated holistic evaluation for each candidate answer, beyond simple keyword matching.

| Attribute | Data Type | Description |
|---|---|---|
| `eval_id` | INTEGER | Primary key |
| `answer_id` | FOREIGN KEY → CandidateAnswer | Associated answer |
| `technical_score` | FLOAT | LLM technical accuracy rating (0–10) |
| `communication_score` | FLOAT | LLM communication quality rating (0–10) |
| `eq_score` | FLOAT | LLM emotional intelligence indicator (0–10) |
| `confidence_score` | FLOAT | `confidence_engine.py` linguistic analysis score (0–10) |
| `llm_reasoning` | TEXT | LLM evaluation rationale text |

---

## 8.13 Entity 12 — UnifiedInterviewData

**Purpose**: Denormalised aggregate table that pre-computes and stores the complete question-answer-evaluation data for each session in a flat format. Generated at session completion, this table powers the `FinalReport` generation without requiring multi-table JOINs at report time.

| Attribute | Data Type | Description |
|---|---|---|
| `uid_id` | INTEGER | Primary key |
| `interview_id` | FOREIGN KEY → InterviewSession | Parent session |
| `question_sequence` | INTEGER | Question order |
| `question_text` | TEXT | Question as posed |
| `candidate_answer_text` | TEXT | Verbatim transcript of answer |
| `code_submission` | TEXT | Code content if applicable |
| `technical_score` | FLOAT | Per-question technical score |
| `keyword_score` | FLOAT | Per-question keyword score |
| `communication_score` | FLOAT | Per-question communication score |
| `llm_reasoning` | TEXT | Per-question LLM rationale |

---

## 8.14 Entity 13 — ConversationHistory

**Purpose**: Verbatim transcript log of the complete interview dialogue, storing each utterance by speaker (AI or Candidate) with its timestamp. This provides the full conversational record required for HR review, audit, and LLM context injection during the interview.

| Attribute | Data Type | Description |
|---|---|---|
| `history_id` | INTEGER | Primary key |
| `interview_id` | FOREIGN KEY → InterviewSession | Parent session |
| `speaker` | VARCHAR(10) | "AI" or "Candidate" |
| `utterance_text` | TEXT | Full text of the utterance |
| `audio_timestamp_ms` | INTEGER | Position in audio timeline (milliseconds) |
| `recorded_at` | DATETIME | Server timestamp |

---

## 8.15 Entity 14 — FinalReport

**Purpose**: The ultimate output document of the interview pipeline — the structured, quantitative candidate evaluation summary that the HR manager uses as the primary input to the hiring decision.

| Attribute | Data Type | Description |
|---|---|---|
| `report_id` | INTEGER | Primary key |
| `candidate_id` | FOREIGN KEY → Candidate | Evaluated candidate |
| `interview_id` | FOREIGN KEY → InterviewSession | Source interview session |
| `overall_score` | FLOAT | Weighted composite score (0–100) |
| `technical_score` | FLOAT | Final technical dimension score |
| `communication_score` | FLOAT | Final communication score |
| `eq_score` | FLOAT | Final EQ score |
| `confidence_score` | FLOAT | Final confidence score |
| `grade` | VARCHAR(5) | Letter grade: A+, A, B+, B, C, D |
| `strengths` | TEXT | JSON array of identified candidate strengths |
| `weaknesses` | TEXT | JSON array of identified improvement areas |
| `hiring_decision` | VARCHAR(20) | AI recommendation: HIRE/HOLD/REJECT |
| `proctoring_summary` | TEXT | Summary of proctoring anomalies detected |
| `generated_at` | DATETIME | Report generation timestamp |
| `hr_override_decision` | VARCHAR(20) | NULL, or HIRED/REJECTED after manual review |
| `hr_override_by` | VARCHAR(100) | HR reviewer who made override decision |
| `hr_override_at` | DATETIME | Timestamp of override action |

---

## 8.16 Entity 15 — AuditLog

**Purpose**: Immutable audit trail of all significant system events — administrative actions, hiring decisions, system errors — enabling governance, compliance, and forensic review.

| Attribute | Data Type | Description |
|---|---|---|
| `log_id` | INTEGER | Primary key |
| `actor` | VARCHAR(100) | User or system component initiating the action |
| `action_type` | VARCHAR(50) | Action category (CREATE, UPDATE, DELETE, LOGIN, DECISION) |
| `entity_type` | VARCHAR(50) | Affected entity type |
| `entity_id` | INTEGER | Affected entity primary key |
| `details` | JSON | Action parameters and context |
| `ip_address` | VARCHAR(45) | Actor IP address (IPv4/IPv6) |
| `logged_at` | DATETIME | Event timestamp |

---

## 8.17 Foreign Key Relationship Summary

**Table 8.1 — Entity Relationships Summary**

| Child Entity | Foreign Key | Parent Entity | Relationship |
|---|---|---|---|
| JobRole | department_id | Department | N:1 — Many roles in one department |
| InterviewSession | candidate_id | Candidate | N:1 — Many sessions per candidate |
| InterviewSession | role_id | JobRole | N:1 — Many sessions for one role |
| InterviewSession | status_id | StatusLookup | N:1 — Many sessions with one status |
| Resume | candidate_id | Candidate | N:1 — Many resumes per candidate |
| QuestionBank | department_id | Department | N:1 — Many questions per department |
| QuestionBank | role_id | JobRole | N:1 — Many questions per role |
| InterviewQuestionsLog | interview_id | InterviewSession | N:1 — Many questions per session |
| InterviewQuestionsLog | question_id | QuestionBank | N:1 — Many uses of one question |
| CandidateAnswer | interview_id | InterviewSession | N:1 — Many answers per session |
| CandidateAnswer | candidate_id | Candidate | N:1 — Many answers per candidate |
| KeywordEvaluation | answer_id | CandidateAnswer | 1:1 — One eval per answer |
| QuestionEvaluation | answer_id | CandidateAnswer | 1:1 — One eval per answer |
| UnifiedInterviewData | interview_id | InterviewSession | N:1 — Many rows per session |
| ConversationHistory | interview_id | InterviewSession | N:1 — Many utterances per session |
| FinalReport | candidate_id | Candidate | N:1 — Many reports per candidate |
| FinalReport | interview_id | InterviewSession | 1:1 — One report per session |

---

## 8.18 Database Optimisation

### WAL Mode Configuration

The database is initialised with the following SQLite PRAGMA settings upon application start:

```sql
PRAGMA journal_mode=WAL;      -- Enable Write-Ahead Logging
PRAGMA synchronous=NORMAL;    -- Balanced write performance and safety
PRAGMA cache_size=10000;      -- 10MB page cache for read performance
PRAGMA foreign_keys=ON;       -- Enforce referential integrity
```

### Index Strategy

Performance-critical query patterns are supported by the following indices:

- `idx_interview_candidate` on `InterviewSession(candidate_id)` — candidate session lookup
- `idx_interview_role` on `InterviewSession(role_id)` — role-based analytics
- `idx_question_role` on `QuestionBank(role_id, difficulty)` — question selection by role and difficulty
- `idx_answer_interview` on `CandidateAnswer(interview_id)` — session answer retrieval

---

*End of Chapter 8. Proceed to Chapter 9 — Module Implementation.*
