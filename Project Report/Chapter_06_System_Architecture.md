# CHAPTER 6
# SYSTEM ARCHITECTURE

============================================================
6. SYSTEM ARCHITECTURE
============================================================

---

## 6.1 Architectural Philosophy

The architecture of the Sterling Intelligent Interview & Candidate Assessment Platform was driven by three core engineering principles: **separation of concerns**, **performance-first design**, and **graceful degradation**. These principles are not merely theoretical ideals — they emerged from direct operational requirements imposed by the platform's unique technical challenge: maintaining a real-time, low-latency, bidirectional conversational AI interview experience that simultaneously streams audio, renders a 3D avatar, evaluates code, and monitors candidate behaviour, all within a standard web browser environment.

### 6.1.1 Evolution from Monolithic to Microservices

The platform underwent a significant architectural transition from its initial monolithic prototype — where all business logic resided in a single `Main.py` FastAPI application — to the production Enterprise Version 2.0 microservices architecture described in this chapter. This transition was driven by specific technical failures observed in the monolithic version:

- **Resource contention**: Long-running LLM API calls blocked asynchronous event loops, causing WebSocket message handling delays.
- **Testing complexity**: Inability to unit test individual components in isolation made quality assurance impractical.
- **Deployment rigidity**: A single change to one component required full application restart, introducing availability gaps.
- **Technical debt accumulation**: Increasing business logic complexity within a single file became unmaintainable.

The transition to a microservices pattern — implemented as **20+ specialised Python service modules** in the `/services` directory, each handling a discrete functional domain — resolved these architectural debt issues while enabling the parallelism and isolation required for enterprise deployment.

---

## 6.2 High-Level System Architecture

[INSERT HIGH LEVEL ARCHITECTURE DIAGRAM]

*Figure 6.1 — High-Level System Architecture: Sterling AI Recruitment Engine*

The diagram above represents the complete system from the perspective of data and control flow across its primary architectural tiers. At the highest level of abstraction, the platform comprises five interconnected architectural tiers:

### Tier 1 — Presentation Layer (Frontend)

The presentation layer is a single-page application (SPA) built with **React 18 + Vite**, running entirely in the candidate's or administrator's web browser. It encompasses:

- The **Candidate Portal**: Registration, login, resume upload, role selection, and live interview interface.
- The **Admin Dashboard**: Department management, question bank, analytics, and report review.
- The **3D Avatar Renderer**: WebGL-based avatar with real-time audio-reactive lip synchronisation.
- The **Monaco Code Editor**: Integrated development environment for code submission during interview.
- The **WebSocket Client**: Bidirectional low-latency audio streaming to the backend gateway.

### Tier 2 — API Gateway Layer

The API Gateway is implemented as the **FastAPI Main.py** application, serving as the single entry point for all client communications. It fulfils:

- **REST API routing**: All CRUD operations for candidates, roles, departments, questions, and reports.
- **WebSocket endpoint management**: The `/ws/stt` endpoint handles the bidirectional audio streaming protocol.
- **Request validation and middleware**: CORS enforcement, JWT authentication, and Pydantic model validation.
- **Service delegation**: Routes incoming requests to appropriate microservices in the `/services` directory.

### Tier 3 — Microservices Layer

The core computational intelligence of the platform resides in 20+ specialised microservices, each independently responsible for a discrete domain:

| Service Module | Primary Responsibility |
|---|---|
| `ai_orchestrator.py` | Coordinates the complete interview reasoning pipeline |
| `resume_engine.py` | PDF parsing, NLP skill extraction, role-match scoring |
| `prompt_engine.py` | Prompt template management, LLM instruction construction |
| `openai_service.py` | OpenAI GPT-4o API integration for evaluation |
| `gemini_service.py` | Google Gemini API integration for evaluation |
| `whisper_service.py` | Groq Whisper STT API integration |
| `tts_service.py` | ElevenLabs TTS streaming integration |
| `interview_memory.py` | Conversation context and session state management |
| `conversation_manager.py` | Interview flow control and state transitions |
| `interview_scoring.py` | Multi-dimensional score computation |
| `confidence_engine.py` | Linguistic confidence indicator analysis |
| `ranking_engine.py` | Final report compilation and candidate ranking |
| `behavior_analysis.py` | Proctoring data analysis |
| `eye_tracking.py` | Face and gaze detection processing |
| `circuit_breaker.py` | External API fault tolerance management |

### Tier 4 — Data Layer

The data layer comprises the **SQLite database** (`database.db`) operating in **WAL (Write-Ahead Logging) mode**, accessed through the **SQLAlchemy ORM** with schema definitions in `database/models.py`. The WAL mode configuration is a critical architectural decision enabling concurrent read and write operations — resolving the database locking issues that were a known failure mode in the initial monolithic version.

### Tier 5 — External AI Services Layer

The platform integrates with four external AI service providers:

- **Groq API (Whisper)**: Sub-second speech transcription
- **OpenAI API (GPT-4o)**: Primary LLM for interview evaluation and question generation
- **Google Gemini API**: Secondary LLM (fallback and supplementary evaluation)
- **ElevenLabs API**: Neural TTS audio synthesis and streaming

All external API integrations are mediated through the `circuit_breaker.py` service, implementing the circuit breaker pattern to ensure system stability during API rate limiting, timeout, or outage conditions.

---

## 6.3 Frontend Architecture

[INSERT FRONTEND ARCHITECTURE DIAGRAM]

*Figure 6.2 — Frontend Architecture: React 18 + Vite SPA with Custom Hook Layer*

### 6.3.1 Application Structure

The frontend is structured as a React 18 Single-Page Application (SPA) compiled with Vite — selected for its native ES module build system that delivers near-instantaneous hot module replacement during development and optimised production bundle sizes with tree-shaking.

**Application Entry Points:**
- `App.jsx`: Root application component configuring React Router v7 for client-side navigation between the platform's six primary pages.

**Page Components:**

| Page Component | Route | Primary Function |
|---|---|---|
| `Landing.jsx` | `/` | Public landing page; platform introduction |
| `Login.jsx` | `/login` | Candidate and admin authentication |
| `Dashboard.jsx` | `/dashboard` | HR/Admin analytics command centre |
| `CandidateDetails.jsx` | `/candidate/:id` | Individual candidate evaluation review |
| `LiveInterview.jsx` | `/interview/:sessionId` | Core real-time interview environment |
| `Report.jsx` | `/report/:reportId` | Post-interview candidate report view |
| `AdminPanel.jsx` | `/admin` | System configuration and management |

### 6.3.2 Custom Hook Architecture

The platform's most sophisticated frontend engineering is encapsulated in its custom React Hook layer — a collection of purpose-built hooks that abstract complex stateful operations from rendering components:

| Custom Hook | Responsibility |
|---|---|
| `useAudioRecorder.js` | Captures microphone audio in 500ms WebM blob chunks for WebSocket transmission |
| `useWebSocketSTT.js` | Manages the WebSocket connection lifecycle, binary blob transmission, and transcript receipt |
| `useVAD.js` | Voice Activity Detection — intelligently pauses audio capture during AI speech to prevent echo |
| `useCodeWorkspace.js` | Maintains Monaco Editor state and synchronises code content with backend context |
| `useAvatarState.js` | Manages the 3D avatar's animation state machine (idle, speaking, thinking) |
| `useAvatarLipSync.js` | Maps audio frequency bands to 3D mesh morph targets for real-time lip synchronisation |

### 6.3.3 State Management Philosophy

The platform deliberately avoids external state management libraries (Redux, Zustand) in favour of native React Hooks (`useState`, `useEffect`, `useRef`, `useMemo`). This decision was driven by the performance requirements of the `LiveInterview.jsx` component, which handles simultaneously:

- High-frequency WebSocket message receipt (audio transcript updates)
- 3D WebGL render loop (60fps avatar animation)
- Monaco Editor state synchronisation
- Proctoring event monitoring

Aggressive use of `useMemo` with precisely specified dependency arrays prevents unnecessary re-renders from cascading into the WebGL render loop and dropping avatar animation frame rates.

---

## 6.4 Backend Microservices Architecture

[INSERT BACKEND ARCHITECTURE DIAGRAM]

*Figure 6.3 — Backend Microservices Architecture: FastAPI Gateway + 20+ Service Modules*

### 6.4.1 FastAPI Gateway

`Main.py` serves as the central entry point and router for the entire backend system. Its architectural responsibilities include:

- **API Router Registration**: All FastAPI APIRouter instances from the service modules are registered in `Main.py`.
- **WebSocket Endpoint**: The `/ws/stt` WebSocket endpoint is implemented directly in `Main.py` as the primary real-time communication channel for the interview engine.
- **Middleware Stack**: CORS middleware is configured with explicit allowed origins to prevent cross-origin API abuse. Pydantic request validation is applied to all REST endpoints.
- **Database Session Management**: SQLAlchemy session lifecycle (creation, commit, rollback, close) is managed at the gateway level using FastAPI's dependency injection.

### 6.4.2 Asynchronous Architecture

The entire backend operates on Python's **asyncio** event loop, enabled by FastAPI's async-first design philosophy. This enables:

- **Non-blocking WebSocket handling**: Multiple concurrent WebSocket connections (interview sessions) are managed on a single event loop thread without blocking.
- **Concurrent external API calls**: Multiple AI service calls (STT, LLM evaluation, TTS) can be awaited concurrently within a single interview processing cycle.
- **Database I/O non-blocking**: SQLAlchemy async sessions (when configured) prevent database operations from stalling the event loop.

### 6.4.3 Interview Processing Pipeline

The sequence of processing events for a single candidate audio chunk during a live interview is as follows:

```
Candidate Microphone Audio (500ms chunk, WebM format)
       │
       ▼
WebSocket /ws/stt Receive Buffer (15MB hard limit enforced)
       │
       ▼
whisper_service.py → Groq API (Whisper) → Transcript Text
       │
       ▼
interview_memory.py → Conversation History Context Builder
       │
       ▼
prompt_engine.py → Role-conditioned Prompt Construction
       │
       ▼
ai_orchestrator.py → openai_service.py (GPT-4o) / gemini_service.py (Gemini)
       │
       ▼
LLM Response Text (Next Question / Evaluation / Follow-Up)
       │
       ▼
interview_scoring.py → KeywordEvaluation → QuestionEvaluation (incremental)
       │
       ▼
tts_service.py → ElevenLabs API → Audio Stream Buffer (no disk write)
       │
       ▼
WebSocket Audio Frame → Frontend → HTML5 Audio Context → Candidate Speaker
       │
       ▼
useAvatarLipSync.js → Web Audio API Frequency Analysis → Morph Target Activation
```

This pipeline executes for each candidate response turn, maintaining a conversational tempo that approaches natural dialogue when network conditions are nominal.

### 6.4.4 Circuit Breaker Implementation

`circuit_breaker.py` implements the circuit breaker design pattern with three states:

- **CLOSED (Normal)**: API calls proceed normally; failure count monitored.
- **OPEN (Fault Mode)**: After N consecutive failures, circuit "opens" and immediately returns a fallback response (graceful degradation — interview continues with a default question or error message).
- **HALF-OPEN (Recovery Test)**: After a timeout period, a single probe request is sent; if successful, circuit resets to CLOSED.

This pattern ensures that an ElevenLabs outage, for example, does not cause the entire interview session to crash — instead, the system gracefully falls back to a text-based interaction mode.

---

## 6.5 Database Architecture

[INSERT DATABASE ER DIAGRAM]

*Figure 6.4 — Database Entity-Relationship Diagram: 15-Table Normalised SQLite Schema*

The database layer employs a highly normalised relational schema designed to:

- Minimise data redundancy through 3NF normalisation.
- Enable rapid report generation through the `UnifiedInterviewData` denormalised aggregate table.
- Support concurrent reads during high-load periods via SQLite WAL mode.
- Provide a complete audit trail through `ConversationHistory` and `AuditLog` entities.

Full database design details, including entity descriptions, attribute specifications, and relationship definitions, are presented in Chapter 8.

---

## 6.6 Deployment Architecture

[INSERT DEPLOYMENT DIAGRAM]

*Figure 6.5 — Deployment Architecture: Single-Node Development / Multi-Node Production*

### 6.6.1 Development Deployment (Current)

The current deployment configuration operates on a single-node architecture:

- **Frontend**: Served by Vite development server (port 5173) or Nginx static serving in production mode.
- **Backend**: FastAPI application running under Uvicorn ASGI server (port 8000).
- **Database**: SQLite file (`database.db`) on the same server node as the backend.
- **External Services**: Outbound HTTPS connections to Groq, OpenAI, ElevenLabs, and Google Gemini APIs.

### 6.6.2 Production Deployment Pathway

The architecture is explicitly designed to facilitate migration to a cloud-native production deployment without codebase modification:

- **Frontend**: Static build (`npm run build`) deployed to CDN (AWS CloudFront / Azure CDN).
- **Backend**: Docker containerised FastAPI services behind a load balancer (AWS ALB / Nginx).
- **Database**: Migration from SQLite to **PostgreSQL** (AWS RDS / Cloud SQL) for multi-node concurrency.
- **Session Cache**: **Redis** for WebSocket session state management and LLM context caching.
- **Orchestration**: **Kubernetes** for container lifecycle management, auto-scaling, and health monitoring.

---

## 6.7 Communication Protocols

### 6.7.1 REST (HTTP/HTTPS)

All CRUD operations between the frontend and backend — candidate registration, role selection, question bank management, report retrieval — use standard HTTP/1.1 REST APIs with JSON payloads. All REST endpoints are documented via FastAPI's auto-generated OpenAPI/Swagger specification at `/docs`.

### 6.7.2 WebSocket (WSS)

The live interview audio stream operates over **WebSocket Secure (WSS)**, providing:

- **Full-duplex communication**: Simultaneous transmission of audio chunks (client → server) and receipt of transcript updates and AI audio responses (server → client).
- **Low overhead**: WebSocket frames have minimal protocol overhead compared to repeated HTTP polling, critical for maintaining sub-second audio chunk delivery.
- **Persistent connection**: The WebSocket connection persists for the duration of the interview session, eliminating connection establishment latency between audio chunks.

### 6.7.3 WebGL

The 3D avatar rendering pipeline uses **WebGL 2.0** via the Three.js abstraction layer (React Three Fiber), operating within the browser's GPU pipeline. Avatar geometry, textures, and animation data are transmitted once at session load; only per-frame animation state (morph target weights) is computed in JavaScript and applied via WebGL calls at 60fps.

---

## 6.8 Scalability Design

The platform's scalability architecture is designed around the principle that **the FastAPI service layer is stateless** (with the exception of the SQLite database connection), enabling horizontal scaling of backend service instances:

- Adding additional backend instances behind a load balancer linearly increases WebSocket connection capacity.
- The circuit breaker pattern ensures that external API rate limits affect only the specific session that triggered the limit, not the entire system.
- The SQLite WAL mode supports concurrent reads from multiple backend instances, though migration to PostgreSQL is recommended beyond 10–20 concurrent sessions.
- React's client-side rendering ensures that frontend load is entirely distributed across candidate browsers — no server-side rendering burden.

---

*End of Chapter 6. Proceed to Chapter 7 — Technology Stack.*
