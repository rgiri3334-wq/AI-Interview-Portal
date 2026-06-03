# CHAPTER 9
# MODULE IMPLEMENTATION

============================================================
9. MODULE IMPLEMENTATION
============================================================

---

## 9.1 Introduction

The Sterling AI Recruitment Engine is implemented as a collection of 22 distinct functional modules, spanning both the frontend React application and the backend FastAPI microservices architecture. Each module is designed with single responsibility — handling one discrete functional domain — enabling isolated development, independent testing, and modular enhancement.

This chapter provides a detailed implementation description of each module, covering its purpose, the specific code components involved, key algorithms or logic patterns, interfaces with other modules, and notable engineering decisions.

---

## 9.2 Module 1 — Candidate Registration

**Purpose**: Enables new candidates to create an account on the platform.

**Frontend Component**: `Login.jsx` (handles both login and registration form states)

**Backend Service**: `auth_service.py` → `POST /api/register`

**Implementation Details**:
- Candidate submits name, email, and password via the registration form.
- Frontend performs basic client-side validation (email format, password minimum length 8 characters) using HTML5 form validation attributes before submission.
- `POST /api/register` receives a Pydantic-validated `CandidateRegisterSchema` payload.
- `auth_service.py` checks for email uniqueness in the `Candidate` table.
- Password is hashed using bcrypt with a cost factor of 12 before storage.
- A new `Candidate` record is inserted; an initial `StatusLookup` record (`status_id = 1: REGISTERED`) is associated.
- Upon success, a JWT token is issued and returned, automatically logging the candidate in.

**Engineering Decision**: Registration and login share the `Login.jsx` component, toggling between form states via a `useState` flag. This avoids a separate registration page route and reduces bundle size.

---

## 9.3 Module 2 — Candidate Login

**Purpose**: Authenticates existing candidates and administrators and issues session tokens.

**Frontend Component**: `Login.jsx`

**Backend Service**: `auth_service.py` → `POST /api/login`

**Implementation Details**:
- The platform supports two user roles: `CANDIDATE` and `ADMIN`. The role is determined by the email domain or a pre-designated admin flag in the `Candidate` table.
- Upon credential submission, `auth_service.py` retrieves the `Candidate` record by email, verifies the submitted password against the stored bcrypt hash using `bcrypt.checkpw()`.
- On successful verification, a JWT is generated with the following claims:
  ```json
  { "sub": "candidate_id", "role": "CANDIDATE", "exp": "timestamp+24h" }
  ```
- The JWT is returned to the frontend and stored in browser `sessionStorage` (not `localStorage`) to limit persistence to the current tab session.

---

## 9.4 Module 3 — Resume Upload

**Purpose**: Enables candidates to upload their PDF resume, which is then processed by the Resume Screening Engine.

**Frontend Component**: A dedicated file upload section within the Candidate Dashboard or onboarding flow.

**Backend Service**: `resume_engine.py` → `POST /api/resume/upload`

**Implementation Details**:
- Frontend presents a drag-and-drop PDF upload zone with file type and size validation (max 5MB, `.pdf` only).
- The file is transmitted as `multipart/form-data` to the backend endpoint.
- `resume_engine.py` saves the PDF to the server filesystem and immediately initiates the parsing pipeline.
- The `Resume` database record is created with status `PARSING_IN_PROGRESS`.
- Upon parsing completion, the record is updated with `extracted_text`, `skills_detected`, `experience_years`, and `resume_score`.

---

## 9.5 Module 4 — Resume Screening Engine

**Purpose**: Automatically parses PDF resumes to extract structured information and compute a role-match compatibility score.

**Backend Service**: `resume_engine.py`

**Implementation Details**:

**Step 1 — PDF Text Extraction**:
The PDF file is processed using `pypdf` to extract raw text content. For complex PDFs with multi-column layouts or graphical elements where `pypdf` fails, the engine falls back to raw binary text extraction, preserving as much content as possible.

**Step 2 — Skill Detection**:
The extracted text is scanned against a role-specific skill lexicon — a dictionary mapping technical terms to domain relevance scores. For Sterling E-Mobility's engineering roles, the lexicon includes:
- EV domain terms: MCU, BLDC, PMSM, field-oriented control, CAN-BUS, AUTOSAR, ISO 26262
- Embedded systems: ARM Cortex, FreeRTOS, C/C++, UDS, LIN, SPI, I2C
- General software: Python, Linux, Git, Agile, CI/CD

Detected skills are stored as a JSON array in `Resume.skills_detected`.

**Step 3 — Experience Estimation**:
The engine employs regular expression patterns to identify date ranges in the "Work Experience" section of the resume (e.g., "June 2020 – Present", "Jan 2019 – Dec 2021"). Duration of each role is summed to produce `experience_years` (rounded to 1 decimal).

**Step 4 — Role-Match Scoring**:
The `resume_score` is computed as a weighted function of:
- Skills coverage score: (matched skills ÷ total required skills for role) × 60
- Experience score: min(experience_years ÷ required_years, 1.0) × 30
- Education score: Degree level match bonus × 10

`resume_score` range: 0–100. Candidates below a configurable threshold (default: 40) are flagged as insufficient for interview access.

**Fallback Mechanism**: If PDF parsing produces fewer than 100 characters of text (suggesting a graphical/scanned PDF), the engine logs the failure and stores the partial extraction, prompting the candidate to submit a text-based resume version.

---

## 9.6 Module 5 — Role and Department Selection

**Purpose**: Enables candidates to select the department and job role they are applying for, determining the interview configuration.

**Frontend Component**: Role selection UI within the candidate onboarding flow.

**Backend Service**: `role_service.py` → `GET /api/departments`, `GET /api/roles?department_id={id}`

**Implementation Details**:
- Departments are fetched and presented in a dropdown. Upon department selection, available roles within that department are dynamically fetched.
- The selected `role_id` is persisted to the candidate's active session and linked to the `InterviewSession` entity when the interview is initiated.
- Role configuration (`persona`, `tech_weight`, `comm_weight`, `eq_weight`, `conf_weight`, `difficulty_distribution`) is loaded from the database at interview start to configure the `ai_orchestrator.py` pipeline.

---

## 9.7 Module 6 — Department Management (Admin)

**Purpose**: Provides administrators with full CRUD capability over the department hierarchy.

**Frontend Component**: `AdminPanel.jsx` — Department Management tab

**Backend Service**: `admin_service.py` → `/api/admin/departments` (GET, POST, PUT, DELETE)

**Implementation Details**:
- The admin UI presents a paginated table of all departments with inline edit and delete controls.
- Department creation includes name, description, and optional default grading weights applied to new roles created within the department.
- Deletion is protected by a foreign key constraint check — departments with associated roles or questions cannot be deleted until their dependencies are reassigned.

---

## 9.8 Module 7 — Interview Engine Core

**Purpose**: Manages the complete lifecycle of a live interview session, from WebSocket connection establishment through question sequencing, response handling, and session termination.

**Backend Service**: `Main.py` (`/ws/stt`), `ai_orchestrator.py`, `conversation_manager.py`, `interview_memory.py`

**Implementation Details**:

**Session Initialisation**:
When a candidate navigates to the `LiveInterview.jsx` page, the frontend establishes a WebSocket connection to `/ws/stt`. The server-side WebSocket handler in `Main.py` creates a new `InterviewSession` record with `status_id = 3 (INTERVIEW_PENDING)` and loads the role configuration.

**Session State Machine**:
The interview progresses through the following states managed by `conversation_manager.py`:

1. `GREETING` — AI Avatar introduces itself; small talk handling active.
2. `RESUME_REVIEW` — AI references candidate's resume score and skills (optional).
3. `TECHNICAL_INTERVIEW` — Core Q&A phase; question selection and follow-up logic active.
4. `CODE_CHALLENGE` — Monaco Editor activated; code submission integrated with verbal explanation.
5. `WRAP_UP` — AI thanks candidate; session termination sequence initiated.
6. `COMPLETED` — Session ends; report generation triggered.

**Context Memory**:
`interview_memory.py` maintains a rolling context window of the last N conversation turns (configurable), formatted as a structured conversation history that is prepended to each LLM prompt. This enables the AI to reference previous candidate answers ("You mentioned earlier that you have experience with CAN-BUS — can you explain the difference between CAN 2.0A and CAN-FD?") without asking redundant questions.

**Dynamic Difficulty Adaptation**:
After each candidate response, `interview_scoring.py` computes a running technical score. If the running score exceeds a "High Performance" threshold, the next question is drawn from the `Hard` difficulty pool. If the running score falls below a "Low Performance" threshold, the next question is drawn from the `Easy` pool. This adaptive mechanism ensures that the interview comprehensively maps the candidate's full competency spectrum.

**Session Termination**:
Upon receiving a termination signal (timer expiry, explicit end, or candidate disconnection), `conversation_manager.py` updates `InterviewSession.status_id = 4 (INTERVIEW_COMPLETED)` and triggers `ranking_engine.py` for final report generation.

---

## 9.9 Module 8 — Question Engine and Bank Management

**Purpose**: Manages the repository of interview questions and implements the question selection algorithm used by the interview engine.

**Backend Service**: `admin_service.py` (CRUD), question selection logic in `ai_orchestrator.py`

**Question Selection Algorithm**:
1. **Role-specific pool construction**: Questions are filtered by `role_id` (role-specific) and `department_id` (department-wide).
2. **Difficulty distribution**: Questions are selected proportionally from Easy/Medium/Hard pools according to the role's `difficulty_distribution` configuration.
3. **Deduplication**: `InterviewQuestionsLog` is checked to prevent repeating questions already asked in the current session.
4. **LLM-generated follow-ups**: If the candidate's response reveals a specific knowledge gap, `prompt_engine.py` generates a targeted follow-up question rather than selecting the next predefined question. This generated question is logged in `InterviewQuestionsLog` with a NULL `question_id` and the generated text in `question_text_used`.

**Admin Question Management**:
The `AdminPanel.jsx` provides a full-featured question bank interface with:
- Searchable, filterable question table (by department, role, difficulty, category)
- Inline CRUD (Create/Read/Update/Delete)
- Keywords editor (tag-based input for expected answer keywords)
- CSV import for bulk question addition (Module 20)

---

## 9.10 Module 9 — Speech-to-Text (STT) Module

**Purpose**: Converts the candidate's spoken interview responses from audio to text in real time with sub-second latency.

**Frontend Hooks**: `useAudioRecorder.js`, `useWebSocketSTT.js`, `useVAD.js`

**Backend Service**: `whisper_service.py`

**Implementation Flow**:

1. `useAudioRecorder.js` initialises `MediaRecorder` with the WebM/Opus audio codec (chosen for efficient compression of speech audio at 16kHz sampling rate) and captures audio in 500ms interval chunks.

2. `useVAD.js` (Voice Activity Detection) monitors audio energy levels. During AI Avatar speech (TTS playback), VAD suppresses audio capture to prevent the AI's voice from being transcribed as candidate speech (echo prevention).

3. Each 500ms WebM blob is transmitted to the server via `useWebSocketSTT.js` as a binary WebSocket frame.

4. `whisper_service.py` receives the binary frame, constructs a temporary in-memory audio buffer, and submits it to the Groq API's Whisper transcription endpoint.

5. The Groq API returns a transcript string in typically 300–700ms.

6. The transcript is returned to the frontend as a WebSocket JSON message: `{ "type": "transcript", "text": "..." }` for display in the candidate's live transcript overlay.

7. Simultaneously, the transcript is passed to `interview_memory.py` for context accumulation and to `ai_orchestrator.py` for evaluation.

**Memory Management**: A 15MB hard limit on the WebSocket receive buffer is enforced in `Main.py`'s WebSocket handler:
```python
MAX_BUFFER_SIZE = 15 * 1024 * 1024  # 15MB
if len(data) > MAX_BUFFER_SIZE:
    await websocket.close(code=1009, reason="Message too large")
    break
```
This prevents memory exhaustion attacks via maliciously large audio frames.

---

## 9.11 Module 10 — Text-to-Speech (TTS) Module

**Purpose**: Converts the AI interviewer's generated text responses to high-fidelity speech audio, streamed directly to the candidate's browser without disk I/O.

**Backend Service**: `tts_service.py`

**Frontend Consumption**: `useAvatarState.js` (triggers avatar speaking animation), `useAvatarLipSync.js` (drives lip sync)

**Implementation Details**:

`tts_service.py` receives the LLM-generated response text from `ai_orchestrator.py` and calls the ElevenLabs streaming TTS API:

```python
async def stream_tts_to_websocket(text: str, websocket: WebSocket, voice_id: str):
    async with elevenlabs_client.generate_stream(
        text=text,
        voice=voice_id,
        model="eleven_turbo_v2_5",  # Lowest latency model
        stream=True
    ) as audio_stream:
        async for chunk in audio_stream:
            await websocket.send_bytes(chunk)  # Direct stream to frontend
```

The audio stream is sent as binary WebSocket frames directly to the frontend. The frontend receives these frames in `useWebSocketSTT.js`, appends them to a `SourceBuffer` in the HTML5 `MediaSource` API, and plays them via an `AudioContext` node. This **zero-disk streaming architecture** eliminates the 200–500ms file write/read latency that would occur if the audio were written to disk first.

---

## 9.12 Module 11 — Avatar System

**Purpose**: Renders the 3D AI Avatar interviewer with real-time, audio-reactive lip synchronisation, creating an immersive humanoid interview presence.

**Frontend Components**: `Avatar3D.jsx`, `AvatarRig.jsx`

**Frontend Hooks**: `useAvatarState.js`, `useAvatarLipSync.js`

**Implementation Details**:

**Avatar Model**: The 3D avatar is a rigged humanoid model in glTF/GLB format, featuring:
- Skeletal rig for body animation (idle, thinking, nodding)
- Morph targets for facial expressions (15+ phoneme mouth shapes/visemes)
- PBR (Physically Based Rendering) materials for realistic skin and clothing rendering

**Animation State Machine** (`useAvatarState.js`):

| State | Trigger | Animation |
|---|---|---|
| IDLE | Default | Subtle breathing loop; occasional blink |
| SPEAKING | TTS audio playing | Mouth open; head nodding; gesture animations |
| THINKING | LLM processing (after candidate response) | Head tilt; thoughtful expression |
| LISTENING | Candidate speaking | Attentive pose; slight forward lean |

**Lip Synchronisation** (`useAvatarLipSync.js`):
The hook creates a `Web Audio API AnalyserNode` connected to the TTS audio output. Each animation frame (60fps), the analyser's frequency data is sampled:

```javascript
analyser.getByteFrequencyData(dataArray);
// Map frequency bands to viseme morph targets
const mouthOpen = dataArray[3] / 255;  // ~200-300Hz band — vowel energy
const mouthRound = dataArray[6] / 255; // ~400-500Hz band — consonant energy
avatarRef.current.morphTargetInfluences[VISEME_O] = mouthOpen;
avatarRef.current.morphTargetInfluences[VISEME_U] = mouthRound;
```

**Performance Optimisation**: React Three Fiber's render loop is isolated from React's reconciliation cycle via `useFrame()`. `useMemo` in `Avatar3D.jsx` caches the avatar geometry and material instances, preventing re-creation on parent component re-renders.

---

## 9.13 Module 12 — Proctoring Module

**Purpose**: Monitors candidate behaviour during the interview to detect potential assessment integrity violations.

**Frontend Hook**: `useHumanBehavior.js`

**Backend Services**: `behavior_analysis.py`, `eye_tracking.py`

**Implementation Details**:

**Tab Switch Detection**:
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    reportProctorEvent({ type: 'TAB_SWITCH', timestamp: Date.now() });
  }
});
```

**Window Focus Detection**:
```javascript
window.addEventListener('blur', () => {
  reportProctorEvent({ type: 'WINDOW_BLUR', timestamp: Date.now() });
});
```

**Face Detection** (Backend-delegated):
Camera frames are sampled at 1fps and transmitted to `eye_tracking.py` via a REST endpoint. The backend uses OpenCV-based face detection to verify face presence. Detection of:
- No face in frame → `FLAG_NO_FACE`
- Multiple faces in frame → `FLAG_MULTIPLE_FACES`
- Sustained gaze deviation → `FLAG_GAZE_DEVIATION`

**Performance Optimisation**: Client-side heavy WebGL-based face inference (`useHumanBehavior.js`) is mocked on initial load for i3-class device compatibility. The hook returns simulated event data while delegating real detection to the backend, ensuring the interview UI remains smooth on low-specification hardware.

**Proctoring Report Integration**: All proctoring flags are accumulated in `InterviewSession.proctoring_flags` (JSON array) and summarised in `FinalReport.proctoring_summary`.

---

## 9.14 Module 13 — AI Assessment Engine

**Purpose**: The cognitive core of the interview pipeline — orchestrating LLM-based evaluation of candidate responses, dynamic question generation, and follow-up logic.

**Backend Service**: `ai_orchestrator.py`, `prompt_engine.py`, `openai_service.py`, `gemini_service.py`

**Prompt Engineering Architecture** (`prompt_engine.py`):
Each LLM call is constructed using a multi-layer prompt template:

1. **System Prompt** (Role Conditioning):
```
You are the Sterling Assessment Engine — an expert technical interviewer for 
Sterling E-Mobility Solutions Limited. You are currently interviewing a candidate 
for the role of {role_name}. Your persona is: {persona_description}.
CRITICAL: Never reveal that you are powered by OpenAI or any external AI. 
You are ONLY the Sterling Assessment Engine.
```

2. **Context Block** (Interview History):
```
Previous interview exchanges:
{conversation_history_last_N_turns}
```

3. **Current Turn** (Evaluation Task):
```
The candidate has just responded to the question: "{question_text}"
Candidate's spoken response: "{transcript_text}"
Candidate's code submission (if any): "{code_content}"
Evaluate the response against the following criteria: [technical accuracy, keyword coverage, communication clarity].
Generate the next question.
```

4. **Output Format Instruction**:
```json
Respond in JSON format:
{
  "evaluation": { "technical_score": X, "comm_score": X, "reasoning": "..." },
  "next_question": "...",
  "follow_up_required": true/false
}
```

**LLM Provider Routing** (`ai_orchestrator.py`):
The orchestrator uses OpenAI GPT-4o as the primary evaluation model, with automatic fallback to Google Gemini when the circuit breaker detects OpenAI rate-limiting or timeout conditions.

---

## 9.15 Module 14 — Keyword Matching Module

**Purpose**: Provides a deterministic, mathematical validation layer that checks whether the candidate's response covered the expected technical keywords for each question.

**Backend Service**: `interview_scoring.py` (keyword matching component)

**Implementation**:
Each `QuestionBank` entry contains a `keywords` JSON array specifying the technical concepts expected in a correct answer (e.g., for "Explain Field-Oriented Control": `["FOC", "d-q axis", "Park transform", "Clarke transform", "torque control", "synchronous frame"]`).

The keyword matching algorithm:
1. Tokenises the candidate's transcript text.
2. Applies lemmatisation to handle verb/noun form variations.
3. Checks for presence of each expected keyword (exact match + simple synonym expansion).
4. Computes `keyword_score = (matched_keywords / total_expected_keywords) × 100`.

The `keyword_score` is stored in `KeywordEvaluation` and contributes to the technical score computation alongside the LLM's holistic evaluation score.

---

## 9.16 Module 15 — Scoring Engine

**Purpose**: Aggregates all per-question evaluation scores into a final, weighted composite evaluation for each candidate.

**Backend Service**: `interview_scoring.py`, `confidence_engine.py`, `ranking_engine.py`

**Composite Score Formula**:

For each question q in the interview:
```
question_technical_score_q = (keyword_score_q × 0.4) + (llm_technical_score_q × 0.6)
```

Session-level scores (averaged across all questions):
```
session_technical_score = mean(question_technical_score_q) for all q
session_communication_score = mean(llm_comm_score_q) for all q
session_eq_score = mean(llm_eq_score_q) for all q
session_confidence_score = mean(confidence_engine_score_q) for all q
```

Weighted composite score (using role-specific weights):
```
overall_score = (tech_weight × session_technical_score)
              + (comm_weight × session_communication_score)
              + (eq_weight × session_eq_score)
              + (conf_weight × session_confidence_score)
```

**Confidence Analysis** (`confidence_engine.py`):
Linguistic markers of confidence/hesitation are identified in the transcript:
- Filler words ("um", "uh", "like", "you know") → negative indicators
- Hedging language ("I think", "maybe", "not sure") → negative indicators
- Assertive language ("The mechanism is", "This works by") → positive indicators
- Answer completeness (response duration, keyword density) → positive indicators

**Grade Assignment**:

| Score Range | Grade |
|---|---|
| 90–100 | A+ |
| 80–89 | A |
| 70–79 | B+ |
| 60–69 | B |
| 50–59 | C |
| Below 50 | D |

---

## 9.17 Module 16 — Manual Screening Override

**Purpose**: Enables HR administrators to review AI-generated hiring recommendations and apply a final human decision override.

**Frontend Component**: `CandidateDetails.jsx` — Hiring Decision panel

**Backend Service**: `admin_service.py` → `PATCH /api/admin/decision/:interview_id`

**Implementation Details**:
- HR managers access the candidate's complete `FinalReport` via `CandidateDetails.jsx`.
- A decision panel presents the AI hiring recommendation alongside the ability to set the final decision to HIRED or REJECTED.
- The override is recorded in `FinalReport.hr_override_decision`, `hr_override_by`, and `hr_override_at`.
- An `AuditLog` entry is created for every override action with the actor, timestamp, and decision.

---

## 9.18 Module 17 — Admin Dashboard

**Purpose**: Provides HR administrators with a system-wide analytics command centre and candidate pipeline management interface.

**Frontend Component**: `Dashboard.jsx`

**Backend Service**: `admin_service.py` → `GET /api/admin/analytics`

**Dashboard Sections**:
1. **Pipeline Overview**: Total candidates registered, in progress, completed, hired, rejected.
2. **Score Distribution**: Histogram of overall scores across all completed interviews.
3. **Department Breakdown**: Candidate counts and average scores by department.
4. **Recent Activity**: Chronological feed of recent interview completions and HR decisions.
5. **System Health**: API status indicators (Groq, OpenAI, ElevenLabs), WebSocket connection count.

---

## 9.19 Module 18 — Candidate Dashboard

**Purpose**: Provides candidates with a personalised view of their assessment status and results.

**Frontend Component**: Candidate-role section within `Dashboard.jsx` or dedicated candidate view.

**Features**:
- Resume upload status and score.
- Interview status (pending/in progress/completed).
- Post-interview: overall score, grade, and `FinalReport` summary (if HR has released results).

---

## 9.20 Module 19 — Analytics Module

**Purpose**: Aggregates platform-wide data to provide strategic recruitment intelligence to HR management.

**Backend Service**: `admin_service.py` (analytics endpoints)

**Analytics Provided**:
- **Hiring funnel**: Registration → Resume uploaded → Interview completed → Hired rates.
- **Score trends**: Average technical, communication, EQ, confidence scores by role and time period.
- **Common skill gaps**: Keywords most frequently absent from candidate responses.
- **Time metrics**: Average interview duration, average time-to-hire.

---

## 9.21 Module 20 — CSV Import Module

**Purpose**: Enables bulk import of interview questions into the Question Bank from CSV files.

**Backend Service**: `admin_service.py` → `POST /api/admin/import-csv`

**CSV Format**:
```csv
department_name,role_name,question_text,difficulty,category,keywords
"Engineering","Embedded Systems","Explain CAN-BUS protocol","Hard","Embedded Protocols","CAN,protocol,CSMA/CD,differential,bus"
```

**Implementation**:
1. CSV file is uploaded as `multipart/form-data`.
2. Server validates CSV structure against the expected schema.
3. Each row is validated for required fields, difficulty value (Easy/Medium/Hard), and department/role existence.
4. Valid rows are bulk-inserted into `QuestionBank`; invalid rows are logged and returned in the error report.

---

## 9.22 Module 21 — PDF Export Module

**Purpose**: Generates a formatted PDF report of a candidate's complete interview evaluation for HR record-keeping and candidate communication.

**Backend Service**: `ranking_engine.py` → `GET /api/report/:id/pdf`

**Implementation**:
The `ranking_engine.py` compiles the `FinalReport`, `UnifiedInterviewData`, `ConversationHistory`, and `Candidate` data into a structured HTML template, which is then rendered to PDF using a headless browser or a Python PDF generation library. The PDF includes:
- Candidate name, role applied, interview date
- Score breakdown (Technical, Communication, EQ, Confidence, Overall)
- Grade and AI hiring recommendation
- Per-question performance summary
- Proctoring anomaly summary
- Key strengths and improvement areas

---

## 9.23 Module 22 — Audit Logging Module

**Purpose**: Maintains an immutable, comprehensive audit trail of all significant platform events.

**Backend Service**: `audit_service.py` (called by all other services at event boundaries)

**Events Logged**:
- User registration and login events
- Resume upload and scoring
- Interview session start and end
- AI evaluation completion
- Admin role/department/question changes
- HR override decisions
- CSV imports and PDF exports
- Circuit breaker state changes
- API error events

**Implementation**: The `audit_service.py` exposes a single `log_event()` async function that all other services call. Events are written to the `AuditLog` table with full context JSON, IP address, and timestamp.

---

*End of Chapter 9. Proceed to Chapter 10 — Security.*
