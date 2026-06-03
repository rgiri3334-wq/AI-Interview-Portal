# AI-Powered Virtual Interview Platform - Project Capsule

> [!IMPORTANT]
> **MASTER CONTEXT FILE** 
> This document serves as the master architectural blueprint, technical memory, and developer handbook for the AI Virtual Interview Platform. Future AI assistants and human developers should read this capsule before modifying or extending the system.

---

## 1. Executive Summary

The AI Virtual Interview Platform is an enterprise-grade, web-based system designed to automate and augment technical hiring through AI-driven candidate assessment. The platform features a highly polished, futuristic, SEM (Sterling E Mobility) inspired UI, seamlessly integrating modern frontend technologies (React/Vite, TailwindCSS, Monaco Editor) with a robust Python backend (FastAPI). 

The system handles live video/audio tracking, dynamically generates interview questions using OpenAI/Gemini, evaluates candidate responses natively, parses code in real-time, streams TTS (Text-to-Speech) using ElevenLabs, and tracks behavioral telemetry.

## 2. Project Overview

- **Project Name:** Sterling AI Recruitment Engine
- **Objective:** To conduct automated AI-based technical interviews that dynamically adapt to a candidate's profile, evaluate their technical proficiency (both spoken and coded), and track behavioral intelligence.
- **Target Users:** Technical hiring managers, HR professionals, and job candidates.
- **Core Features:** Candidate registration, live real-time conversational AI, real-time code execution environment, audio streaming, WebGL-optimized behavioral tracking, live speech-to-text transcription via Whisper, and post-interview HR reporting.
- **Technical Vision:** A decoupled architecture utilizing high-speed WebSockets for bidirectional low-latency audio transmission and microservice-oriented Python processing.

---

## 3. Complete System Architecture

The platform has successfully transitioned from a monolithic prototype to a fully decoupled, production-ready microservices architecture comprising ~70 files.

### Component Architecture
*   **Client (Frontend):** React (Vite) application managing the presentation layer, WebSocket connections, WebRTC media streams, and local state management for Monaco Editor.
*   **API Gateway/Server (Backend):** FastAPI application (`Main.py`) handling all HTTP requests, business logic, WebSocket streaming endpoints, and routing to AI services.
*   **AI Service Layer (`/services`):** 20+ specialized microservices orchestrating integrations with Groq (Whisper), OpenAI (GPT-4o), ElevenLabs (TTS), and Gemini.
*   **Database:** SQLite database (`database.db`) for persistent storage of candidates, resumes, and interview metrics.

### Real-Time Pipeline
1. **Audio Capture:** Frontend captures 500ms audio chunks via `useWebSocketSTT.js` and streams them to the `/ws/stt` backend endpoint.
2. **Transcription:** Backend decodes the WebM blob and calls Groq Whisper for near-instant Speech-to-Text.
3. **Assessment:** Upon silence detection, the transcript and candidate's Monaco code are sent to `openai_service.py` to evaluate the answer and generate the next response.
4. **Voice Generation:** The backend calls `tts_service.py` (ElevenLabs) to synthesize speech and streams the audio buffer directly to `useAudioStream.js` on the frontend for immediate playback.

---

## 4. Frontend Documentation

### Architecture
- **Framework:** React 18 powered by Vite.
- **Routing:** React Router v7 (`react-router-dom`).
- **Styling:** Tailwind CSS combined with `index.css` for custom SEM-inspired Z-axis glassmorphism.
- **Key Hooks:** `useAudioRecorder.js`, `useVAD.js`, `useWebSocketSTT.js`, `useCodeWorkspace.js`. (Note: Resource-heavy local WebGL inference was deliberately mocked via `useHumanBehavior.js` to ensure optimal performance on i3 processors).

### Key Pages
- `LiveInterview.jsx`: The core engine. Manages WebSockets, Monaco code editor, Webcam feeds, and AI responses. Heavily optimized with `React.useMemo` to prevent render loops.
- `Dashboard.jsx`: HR view for system analytics.
- `CandidateDetails.jsx`: Recruiter view into a candidate's specific metrics.
- `Report.jsx`: Post-interview candidate summary view.
- `Login.jsx`: Enterprise gateway for HR.

---

## 5. Backend Documentation

### Architecture
- **Framework:** FastAPI / Python 3.x.
- **Entry:** `Main.py` (Router and API gateway).
- **Domain Services:** Separated strictly into the `/services` directory (e.g., `openai_service.py`, `prompt_engine.py`, `resume_engine.py`, `ranking_engine.py`).

### Critical Optimizations Achieved
- **Memory Safety:** The WebSocket STT buffer is protected by a 15MB hard-limit to prevent Out-Of-Memory (OOM) crashes on idle connections.
- **Context Injection:** Code submissions from the Monaco Editor are strictly bundled with the spoken transcript *before* LLM evaluation to ensure candidates are accurately graded on their written code.
- **Conversational Edge Cases:** The `prompt_engine.py` handles "small talk" natively, preventing the AI from looping on greetings.
- **Async Execution:** Heavy DB I/O and network requests are decoupled from the main thread where possible.

---

## 6. Integrations & Models

- **Primary Reasoning (LLM):** OpenAI (GPT-4o) and Gemini for adaptive question generation and technical evaluation.
- **Speech-to-Text (STT):** Groq API utilizing Whisper for ultra-fast transcription.
- **Text-to-Speech (TTS):** ElevenLabs API via direct `/api/tts` streaming buffers to eliminate latency.
- **Resume Parsing:** AI-driven PDF extraction and scoring inside `resume_engine.py`.

---

## 7. Current Strengths & Eradicated Debt

1. **Monolithic Backend Resolved:** The massive 1000+ line legacy codebase was successfully modularized into 20+ pristine microservices.
2. **CPU Overloads Resolved:** Local heavy AI models (Human.js WebGL) were mocked to ensure the platform operates smoothly on lower-end devices.
3. **Memory Leaks Patched:** Media track accumulation during audio recording was patched, preserving RAM over long sessions.
4. **True Streaming:** Removed manual wait delays for AI voice generation, replacing it with native HTML5 audio streaming.

---

## 8. AI Continuation Instructions

When resuming development on this project, future AI assistants must:
1. **Acknowledge this Capsule:** This system is highly complex. Read this document before suggesting changes.
2. **Respect the Microservice Boundaries:** Do not add heavy logic directly to `Main.py`. Use the `/services` folder.
3. **Maintain Optimizations:** Do not re-introduce heavy WebGL tracking or tight React render loops inside `LiveInterview.jsx` without the explicit consent of the USER.
4. **Aesthetics are Paramount:** All UI changes must adhere to the high-end, premium, dark-mode glassmorphism design system.
