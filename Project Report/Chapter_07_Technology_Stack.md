# CHAPTER 7
# TECHNOLOGY STACK

============================================================
7. TECHNOLOGY STACK
============================================================

---

## 7.1 Technology Selection Criteria

The technology selection process for the Sterling AI Recruitment Engine was governed by six primary evaluation criteria:

1. **Performance**: The technology must support the latency requirements of real-time audio streaming and AI response generation.
2. **Ecosystem Maturity**: The technology must have a stable, well-documented API with active community support.
3. **Integration Compatibility**: The technology must integrate cleanly with other selected components.
4. **Development Velocity**: The technology must enable rapid feature development within the project timeline.
5. **Deployment Simplicity**: The technology must support simple self-hosted deployment on modest hardware.
6. **Open Standards**: Preference for open-source technologies to avoid proprietary vendor lock-in.

---

## 7.2 Frontend Technologies

### 7.2.1 React 18

**Role**: Primary UI framework for component-based frontend development.

React 18 was selected as the frontend framework for the platform, leveraging its concurrent rendering capabilities, mature ecosystem, and the extensive custom hook composition model that is central to the platform's audio and avatar management architecture. Key React 18 features employed:

- **Concurrent Mode**: Enables interruptible rendering, preventing audio stream handling from being blocked by 3D re-renders.
- **`useMemo` and `useCallback`**: Heavily employed in `LiveInterview.jsx` to memoize complex computations and prevent cascading re-renders triggered by high-frequency WebSocket updates.
- **`useRef`**: Used for maintaining references to WebSocket connections, audio contexts, and 3D mesh objects without triggering re-renders.

### 7.2.2 Vite

**Role**: Frontend build tool and development server.

Vite was selected over Create React App for three critical performance advantages:

- **Native ES Module serving**: Eliminates the bundle compilation step during development, enabling near-instantaneous hot module replacement.
- **Rollup-based production bundling**: Produces optimised, tree-shaken production bundles with superior chunk splitting.
- **Plugin ecosystem**: Native support for React JSX, TypeScript, and WebGL asset importing.

### 7.2.3 Tailwind CSS

**Role**: Utility-first CSS framework for layout and styling.

Tailwind CSS provides the foundational layout system for the platform, with custom Z-axis glassmorphism effects — defined in `index.css` — layered on top of Tailwind's utility classes to achieve the premium dark-mode aesthetics that define the Sterling brand identity in the platform. The glassmorphism design language (frosted glass panels, ambient glow effects, depth-layered shadows) is implemented through custom CSS properties extended from the Tailwind configuration.

### 7.2.4 Monaco Editor

**Role**: Integrated code editor for candidate code submission.

Monaco Editor — the same codebase powering Visual Studio Code — provides a professional, syntax-highlighted, IntelliSense-capable code editing experience within the interview environment. The `useCodeWorkspace.js` hook synchronises the Monaco Editor instance state with a React ref, enabling code content to be extracted and transmitted to the backend as part of the WebSocket audio context payload. This allows the LLM to "see" and evaluate the code the candidate is writing simultaneously with evaluating their verbal responses.

### 7.2.5 React Three Fiber / Three.js / WebGL

**Role**: 3D avatar rendering engine.

React Three Fiber (R3F) provides a declarative, React-idiomatic interface to the Three.js 3D graphics library, which itself abstracts WebGL's low-level API. The avatar rendering pipeline in `Avatar3D.jsx` and `AvatarRig.jsx` leverages:

- **glTF/GLB format**: The 3D avatar model is loaded in the industry-standard glTF format, supporting rigged skeletal animation and morph targets.
- **Morph targets**: Facial morph targets represent the key viseme mouth shapes, driven dynamically by `useAvatarLipSync.js` based on audio frequency analysis.
- **Performance optimisation**: Geometry and texture data are loaded once and cached; only per-frame morph target weight updates are computed at runtime.

---

## 7.3 Backend Technologies

### 7.3.1 FastAPI (Python)

**Role**: Primary web framework for the backend API gateway and WebSocket server.

FastAPI was selected as the backend framework based on three decisive technical advantages:

- **Native asyncio support**: FastAPI's async request handlers and WebSocket support operate natively on Python's asyncio event loop, enabling non-blocking concurrent handling of multiple simultaneous interview sessions.
- **Automatic OpenAPI documentation**: FastAPI auto-generates Swagger/OpenAPI documentation from Python type annotations, facilitating API testing and frontend integration.
- **Pydantic integration**: All request/response models are defined as Pydantic schemas, providing automatic input validation, serialisation, and detailed error messages.

FastAPI's performance benchmarks on standard web framework benchmarks (TechEmpower) consistently place it among the top three Python frameworks for throughput and latency — a critical consideration for the WebSocket audio streaming use case.

### 7.3.2 Python 3.x

**Role**: Primary backend programming language.

Python was selected for the backend due to its unparalleled ecosystem for AI/ML library integration (`openai`, `google-generativeai`, `groq`, `elevenlabs`, `pypdf`, `pydantic`), its expressive syntax for implementing complex prompt engineering logic in `prompt_engine.py`, and its asyncio concurrency model.

### 7.3.3 Uvicorn ASGI Server

**Role**: Production ASGI server for FastAPI deployment.

Uvicorn implements the ASGI (Asynchronous Server Gateway Interface) specification, enabling FastAPI's async capabilities to be served over standard HTTP/HTTPS and WebSocket protocols. Uvicorn's event loop integration with `asyncio` and its low-overhead implementation make it the standard production server for FastAPI applications.

---

## 7.4 Database Technologies

### 7.4.1 SQLite with WAL Mode

**Role**: Primary relational database engine.

SQLite was selected as the database engine for the platform's current deployment version based on:

- **Zero-configuration deployment**: No database server process; the database is a single file (`database.db`) on the filesystem.
- **WAL (Write-Ahead Logging) Mode**: Configured via `PRAGMA journal_mode=WAL`, WAL mode enables concurrent readers and a single writer without database-level locking, resolving the concurrency issues encountered in the initial monolithic version.
- **Low hardware footprint**: SQLite's in-process operation model minimises memory and CPU overhead, enabling full-stack deployment on i3-class hardware.

### 7.4.2 SQLAlchemy ORM

**Role**: Object-Relational Mapping layer for database access.

SQLAlchemy provides the ORM layer between the Python service modules and the SQLite database. Its key contributions to the platform include:

- **Model-driven schema definition**: All 15 database entities are defined as Python classes in `database/models.py`, enabling schema generation, migration management, and type-safe query construction.
- **Parameterised queries**: SQLAlchemy's query builder generates parameterised SQL statements by default, completely eliminating SQL injection attack vectors.
- **Session management**: SQLAlchemy's session lifecycle management (commit, rollback, close) is integrated into FastAPI's dependency injection system.

---

## 7.5 AI and LLM Layer

### 7.5.1 OpenAI GPT-4o

**Role**: Primary Large Language Model for interview evaluation, question generation, and response reasoning.

GPT-4o was selected as the primary evaluation LLM based on:

- **Multi-modal capability**: GPT-4o's ability to reason simultaneously about textual interview responses and code submissions enables the unified evaluation of candidate performance across both modalities.
- **Low latency**: GPT-4o's optimised inference pipeline delivers faster time-to-first-token compared to earlier GPT-4 variants.
- **Instruction following**: GPT-4o's superior instruction-following capability enables complex prompt engineering constructs in `prompt_engine.py` to be reliably executed.

### 7.5.2 Google Gemini

**Role**: Secondary LLM (supplementary evaluation and fallback).

Google Gemini is integrated via `gemini_service.py` as a secondary evaluation model, employed in cross-validation scenarios and as the fallback evaluation engine when OpenAI API rate limits are encountered. The circuit breaker in `circuit_breaker.py` manages the automatic switchover between primary (OpenAI) and fallback (Gemini) evaluation paths.

---

## 7.6 Speech Layer Technologies

### 7.6.1 Groq API — Whisper

**Role**: Ultra-low latency Speech-to-Text (STT) for live interview audio.

The Groq API provides access to OpenAI's Whisper large-v3 model served on Groq's Language Processing Unit (LPU) hardware, achieving inference throughput significantly superior to GPU-based serving. The `whisper_service.py` service receives 500ms WebM audio blobs from the WebSocket stream, transmits them to the Groq API, and returns transcript text in under one second for standard speech — maintaining the conversational tempo required for a credible AI interview experience.

### 7.6.2 ElevenLabs API

**Role**: Neural Text-to-Speech (TTS) synthesis and streaming for AI Avatar voice.

ElevenLabs provides state-of-the-art neural TTS with streaming audio generation. The critical implementation detail in `tts_service.py` is the **direct buffer streaming**: instead of writing the ElevenLabs audio response to disk and serving the resulting file, the audio buffer is streamed directly to the frontend's WebSocket channel and played via the HTML5 `AudioContext` API. This eliminates disk I/O from the TTS critical path, reducing end-to-end latency by an estimated 200–500ms per response.

---

## 7.7 Authentication and Security Technologies

### 7.7.1 JWT (JSON Web Tokens)

**Role**: Stateless session management for authenticated API endpoints.

JWT-based authentication enables stateless, horizontally scalable session management. Upon successful login, the server issues a signed JWT containing the user's identity and role claims. Subsequent API requests include the JWT in the Authorization header, which the FastAPI middleware validates cryptographically without requiring a database round-trip.

### 7.7.2 Bcrypt

**Role**: Password hashing algorithm.

Candidate passwords are stored as bcrypt hashes in the `password_hash` field of the `Candidate` table. Bcrypt's adaptive cost factor (configurable work factor) ensures that brute-force attacks remain computationally prohibitive even as hardware performance improves.

### 7.7.3 Pydantic v2

**Role**: Runtime data validation for all FastAPI request/response schemas.

Pydantic's model-based validation ensures that all data entering the backend — candidate registration payloads, interview session parameters, question bank entries — is validated against strict type definitions and constraint rules before processing. Invalid inputs are rejected with descriptive error responses before reaching service logic.

---

## 7.8 Technology Stack Justification Matrix

**Table 7.1 — Technology Stack with Justification**

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Frontend Framework | React | 18.x | Concurrent rendering; rich hook ecosystem; 3D integration |
| Build Tool | Vite | 5.x | ESM native serving; fastest HMR; optimised production builds |
| CSS Framework | Tailwind CSS + Custom CSS | 3.x | Utility-first layout + custom glassmorphism design system |
| Code Editor | Monaco Editor | Latest | VS Code quality; syntax highlighting; IntelliSense |
| 3D Rendering | React Three Fiber / Three.js | Latest | React-idiomatic WebGL; morph target support |
| Backend Framework | FastAPI | 0.11x | Native async; auto-docs; Pydantic integration |
| Language | Python | 3.12 | AI/ML ecosystem; asyncio; readability |
| ASGI Server | Uvicorn | 0.x | Low-overhead ASGI for FastAPI |
| Database | SQLite (WAL) | 3.x | Zero-config; WAL concurrency; i3 compatible |
| ORM | SQLAlchemy | 2.x | Type-safe queries; parameterised SQL; session management |
| Primary LLM | OpenAI GPT-4o | API | Best-in-class reasoning; multi-modal; low latency |
| Fallback LLM | Google Gemini | API | Fallback evaluation; cost optimisation |
| STT | Groq (Whisper) | API | Sub-second transcription via LPU inference |
| TTS | ElevenLabs | API | Near-human naturalness; streaming buffer support |
| Auth | JWT + Bcrypt | — | Stateless; horizontally scalable; secure password storage |
| Validation | Pydantic v2 | 2.x | Runtime type validation; automatic schema generation |

---

## 7.9 API Services Inventory

**Table 7.2 — Backend API Services Inventory**

| Endpoint Pattern | Method | Service Module | Function |
|---|---|---|---|
| `/api/register` | POST | `auth_service.py` | Candidate registration |
| `/api/login` | POST | `auth_service.py` | JWT issuance |
| `/api/resume/upload` | POST | `resume_engine.py` | PDF upload and parsing |
| `/api/roles` | GET | `role_service.py` | Available job roles listing |
| `/api/interview/start` | POST | `interview_service.py` | Session initialisation |
| `/ws/stt` | WS | `Main.py` | Real-time audio WebSocket stream |
| `/api/interview/end` | POST | `interview_service.py` | Session termination |
| `/api/report/:id` | GET | `ranking_engine.py` | Final report retrieval |
| `/api/admin/departments` | CRUD | `admin_service.py` | Department management |
| `/api/admin/roles` | CRUD | `admin_service.py` | Role configuration |
| `/api/admin/questions` | CRUD | `admin_service.py` | Question bank management |
| `/api/admin/import-csv` | POST | `admin_service.py` | Bulk question import |
| `/api/admin/candidates` | GET | `admin_service.py` | Candidate pipeline view |
| `/api/admin/analytics` | GET | `admin_service.py` | Dashboard metrics aggregation |
| `/api/admin/decision/:id` | PATCH | `admin_service.py` | Manual hiring decision override |

---

*End of Chapter 7. Proceed to Chapter 8 — Database Design.*
