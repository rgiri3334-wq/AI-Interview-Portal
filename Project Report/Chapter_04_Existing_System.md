# CHAPTER 4
# EXISTING SYSTEM ANALYSIS

============================================================
4. EXISTING SYSTEM ANALYSIS
============================================================

---

## 4.1 Overview of Traditional Recruitment at Sterling E-Mobility

Prior to the development of the Sterling Intelligent Interview & Candidate Assessment Platform, the technical hiring process at Sterling E-Mobility Solutions Limited followed the conventional multi-stage human-driven recruitment pipeline standard across the Indian automotive and technology industry. Understanding this baseline process — its structure, its inefficiencies, and its specific failure modes in the context of SEM's operational requirements — is essential for appreciating the design rationale of the proposed AI-driven solution.

The traditional recruitment process at SEM consisted of five distinct sequential stages, each requiring significant human involvement and generating its own category of delay, variability, and resource consumption:

---

## 4.2 Manual Interview Process Flow

### Stage 1: Job Requisition and Advertisement

The recruitment cycle commenced with a formal job requisition from a department head — for example, the Head of R&D or the COO — specifying the required role (e.g., "Embedded Software Engineer — MCU Firmware"), the department (e.g., Engineering — Faridabad), and the technical competency requirements. This requisition was then posted across multiple channels: LinkedIn, Naukri, company career page, and engineering college placement cells.

**Time Consumed**: 3–7 business days for requisition approval, job description authoring, and posting.

### Stage 2: Resume Collection and Manual Screening

Over a period of days to weeks, resumes arrived from multiple channels in heterogeneous formats. The HR team manually reviewed each resume, applying subjective criteria to determine whether the candidate warranted advancement to the interview stage. For technical roles, the HR reviewer frequently lacked domain expertise to evaluate the technical depth of listed skills — resulting in either over-filtering (rejecting technically qualified candidates whose resumes lacked polish) or under-filtering (advancing unqualified candidates who presented skills convincingly on paper).

**Time Consumed**: 1–3 weeks for resume collection phase; 15–30 minutes of HR time per resume reviewed manually.
**Failure Mode**: Inconsistent screening; subject-matter expertise gap between HR reviewer and technical role requirements.

### Stage 3: Initial Technical Screening

Candidates who passed the manual resume review were invited for a technical telephonic or video screening interview, typically conducted by a senior engineer from the relevant department. This engineer would assess the candidate's foundational technical knowledge through a series of verbally posed questions over 30–60 minutes.

**Time Consumed**: 30–60 minutes of a senior engineer's time per candidate; additional scheduling coordination time of 15–30 minutes per interview.
**Failure Mode**: Heavy dependency on senior engineer availability; interviewer question selection varies; no standardised scoring mechanism; scheduling delays of 3–7 days per candidate; interviewer subjectivity.

### Stage 4: Technical Panel Interview

Candidates who performed satisfactorily in the initial screening were advanced to a technical panel interview, typically involving 2–3 engineers including a domain specialist and a team lead or manager. This interview was deeper in technical content and included problem-solving exercises, technical design discussions, and role-specific scenario analysis.

**Time Consumed**: 60–90 minutes of 2–3 engineers' collective time per candidate; significant scheduling coordination overhead.
**Failure Mode**: Highest engineering resource cost per candidate; candidates reaching this stage who should have been filtered earlier represent the most expensive screening inefficiency.

### Stage 5: HR and Managerial Round, Offer Generation

Technically qualified candidates were advanced to a final HR round covering compensation expectations, background verification, and offer negotiation, followed by formal offer letter generation and onboarding.

---

## 4.3 Quantified Cost of Traditional Process

**Table 4.1 — Traditional Recruitment: Resource Consumption per Hire**

| Stage | Human Resource | Time per Candidate | Estimated Cost (Engineering Hour @ ₹1,500/hr) |
|---|---|---|---|
| Resume Manual Screening | HR Professional | 20 minutes | ₹500 (HR cost) |
| Technical Phone Screen | Senior Engineer | 45 minutes average | ₹1,125 |
| Panel Interview | 2× Engineers (combined) | 90 minutes (2 engineers) | ₹4,500 |
| Coordination & Admin overhead | HR Professional | 30 minutes total | ₹750 |
| **Total per Screened Candidate** | — | ~3.5 hours engineering time | **~₹6,875 per candidate** |

For a typical hiring cycle requiring screening of 20–30 candidates to identify 1–2 qualified hires, the total engineering time cost per hire is estimated at **₹1.0–₹2.1 lakhs in engineering opportunity cost** — time that senior engineers are diverted away from product development, OEM support, and strategic projects.

---

## 4.4 Existing Commercial Tool Assessment

In addition to its internal manual process, SEM's HR team evaluated several commercially available platforms prior to the decision to develop a proprietary solution. The following assessment documents the limitations encountered:

### 4.4.1 General Video Interview Platforms (HireVue, Spark Hire)

These platforms enable candidates to record video responses to pre-set questions for asynchronous review by hiring managers. While eliminating scheduling dependency, they:

- Do not conduct live, adaptive interviews — candidates respond to fixed questions with no follow-up.
- Do not evaluate technical code submissions.
- Do not include resume scoring integration.
- Require significant manual review time by engineers to evaluate recorded responses.
- Carry substantial per-hire licensing costs that are prohibitive at SEM's hiring volumes.

### 4.4.2 Online Coding Assessment Platforms (HackerRank, Codility)

These platforms provide standardised coding challenge environments for programming-specific assessment. However, they:

- Do not integrate verbal communication assessment.
- Do not conduct structured conversational technical interviews.
- Do not include resume screening capabilities.
- Are designed for software/IT roles and lack the EV domain specificity required for SEM's engineering assessment needs.
- Cannot be configured with SEM-specific question banks reflecting proprietary knowledge requirements (MCU architecture, power electronics, embedded protocols).

### 4.4.3 AI Resume Screening Tools (Eightfold AI, Beamery)

AI-powered ATS (Applicant Tracking Systems) with machine learning-based resume matching provide automated initial screening. Limitations include:

- High implementation and integration costs.
- Requirement for extensive historical hire data to train role-specific matching models — data SEM does not possess in sufficient volume.
- No interview capability; only resume-stage screening.
- No customisation for domain-specific technical vocabulary.

---

## 4.5 Documented Pain Points Specific to Sterling E-Mobility

Based on the foregoing analysis, the following specific pain points were identified as direct drivers of the proposed system's development:

1. **Zero standardisation in evaluation**: No two interviewers at SEM asked identical questions or applied identical grading criteria, making it impossible to compare candidates evaluated by different engineers.

2. **No structured scoring output**: The traditional process produced only qualitative notes — "technically sound," "communication could be better," "may be a fit" — with no numerical scores comparable across candidates or roles.

3. **Resume screening gap**: The HR team, while experienced in general recruitment, lacked the embedded systems and power electronics domain expertise to meaningfully evaluate the technical depth claimed in candidate resumes.

4. **Engineering capacity drain**: At periods of peak hiring (post-OEM contract wins, expansion into OBC/DC-DC manufacturing), the interview load on senior engineers at the Faridabad plant and Bengaluru technical centre was reported to disrupt project timelines.

5. **Candidate experience quality**: The telephonic and generic video interview formats did not reflect SEM's premium technology brand identity — the same company that manufactures components for India's leading EV OEMs was conducting candidate assessment through the same mechanisms as any generic manufacturing company.

6. **Absence of data analytics**: No data was systematically collected on candidate performance distributions, common skill gaps, or hiring funnel efficiency — preventing data-driven improvement of the recruitment process over time.

---

## 4.6 Feasibility Study for the Proposed Solution

### 4.6.1 Technical Feasibility

The maturity of the enabling technologies — FastAPI for high-performance async web services, React with Vite for modern frontend development, Groq Whisper for ultra-low latency ASR, ElevenLabs for neural TTS, React Three Fiber for WebGL avatar rendering, and GPT-4o/Gemini for LLM evaluation — collectively establish that all technical building blocks required for the proposed system are available as production-ready, well-documented APIs and frameworks. The technical feasibility of the system is therefore confirmed.

### 4.6.2 Operational Feasibility

The proposed system is designed to operate on the existing web infrastructure at Sterling E-Mobility, requiring only a Python 3.x server environment, a modern web browser for candidates, and outbound internet connectivity to the external AI APIs. The system's low hardware footprint — functional on i3-class server hardware with SQLite — minimises operational deployment requirements. Operational feasibility is confirmed.

### 4.6.3 Economic Feasibility

The economic case for the system rests on a straightforward comparison: the per-candidate cost of the traditional process (approximately ₹6,875 in engineering opportunity cost, as estimated in Table 4.1) versus the near-zero marginal cost per AI-screened candidate. The payback period for the development investment in the Sterling AI Recruitment Engine — estimated at the equivalent of 15–20 full traditional screening cycles — is achievable within a single quarter of operation at SEM's hiring volumes. Economic feasibility is confirmed.

---

*End of Chapter 4. Proceed to Chapter 5 — Proposed System.*
