# CHAPTER 3
# LITERATURE REVIEW

============================================================
3. LITERATURE REVIEW
============================================================

---

## 3.1 Introduction

The Sterling Intelligent Interview & Candidate Assessment Platform synthesises advances from several distinct and rapidly evolving research domains: Artificial Intelligence applied to human resource management, automatic speech recognition, neural text-to-speech synthesis, three-dimensional avatar systems for human-computer interaction, Natural Language Processing for document analysis, computer vision-based proctoring systems, and Large Language Models for open-domain evaluation. This chapter presents a structured review of the academic and industrial literature underpinning each of these domains, identifies the state of the art in relevant prior work, and articulates the specific research gaps and practical limitations that motivated the design decisions embodied in this platform.

The literature review is organised thematically across ten sections, each addressing a foundational capability of the implemented system. A comparative summary matrix is presented at the conclusion of the chapter to consolidate findings.

---

## 3.2 Artificial Intelligence in Recruitment and Human Resource Management

### 3.2.1 Early AI-Assisted Recruitment Systems

The application of computational intelligence to recruitment processes has a documented history extending over three decades. Early expert systems in the 1990s — such as those described by Beckers and Bsat (2002) in their survey of HR information system adoption — employed rule-based logic to filter candidate databases against predefined criteria. These systems were fundamentally static: they could apply only the rules explicitly programmed by domain experts and could not learn from historical hiring outcomes or adapt to novel candidate profiles.

The transition from rule-based expert systems to machine learning-driven approaches was catalysed by the explosion of digital resume databases in the early 2000s and the availability of large-scale training datasets from online job platforms. Faliagka et al. (2012) demonstrated that machine learning classifiers — specifically, Support Vector Machines and Naïve Bayes models — could achieve statistically significant accuracy in predicting candidate suitability scores from structured resume data. However, these approaches remained dependent on manually engineered feature representations, limiting their ability to capture the semantic richness of candidate profiles.

### 3.2.2 Deep Learning and NLP-Driven Recruitment

The advent of deep learning and transformer-based language models fundamentally transformed the computational recruitment landscape. Harber (2019) demonstrated that BERT-based representations of job descriptions and resume text outperformed traditional TF-IDF bag-of-words approaches in candidate-role matching tasks, achieving significant improvements in both precision and recall for relevant candidate identification. Subsequent work by González-Carvajal and Garrido-Merchan (2021) extended this approach to zero-shot learning settings, demonstrating that Large Language Models could evaluate candidate suitability for novel role types without role-specific fine-tuning data.

The AI-driven interview domain itself has attracted substantial research interest. Naim et al. (2018) pioneered the use of multimodal machine learning — combining audio, video, and text modalities — to predict interview performance ratings, demonstrating that automated systems could correlate well with human rater scores. However, their system operated in a post-hoc evaluation mode (analysing recorded interviews) rather than conducting live, adaptive interviews — a fundamental distinction from the real-time conversational AI approach implemented in the Sterling platform.

### 3.2.3 Conversational AI Interviewers

The specific challenge of building conversational AI systems capable of conducting coherent, contextually adaptive technical interviews represents a more recent and substantially more difficult research problem. Koenecke et al. (2020) identified significant accuracy disparities in speech recognition systems across demographic groups, a finding with important implications for AI interview system fairness. More directly relevant, systems such as HireVue's AI interview analysis platform (commercialised from approximately 2014 onwards) and Unilever's widely reported AI screening programme (implemented 2019–2020) demonstrated the commercial viability of AI-assisted candidate evaluation at enterprise scale, though both operated primarily on video analysis of pre-recorded responses rather than live conversational interaction.

The Sterling platform's implementation of a truly conversational, real-time AI interviewer — where the LLM receives and processes live transcribed candidate speech and generates contextually appropriate follow-up questions — represents an advance beyond the pre-recorded response evaluation paradigm that characterises most commercially deployed AI interview systems.

---

## 3.3 Automatic Speech Recognition

### 3.3.1 Evolution of ASR Technology

Automatic Speech Recognition (ASR) has undergone a transformative evolution from Hidden Markov Model (HMM)-based statistical approaches — which dominated the field from the 1980s through the 2010s — to end-to-end deep learning systems that have dramatically narrowed the gap with human speech recognition accuracy. The development of sequence-to-sequence models (Cho et al., 2014) and attention mechanisms (Bahdanau et al., 2015) enabled the first generation of neural ASR systems to significantly outperform HMM baselines on standard benchmarks.

### 3.3.2 OpenAI Whisper

The most significant development in ASR technology relevant to this project is OpenAI's **Whisper** model, introduced by Radford et al. (2022) in the paper *"Robust Speech Recognition via Large-Scale Weak Supervision."* Whisper was trained on 680,000 hours of multilingual and multitask speech data collected from the internet, resulting in a model that demonstrates exceptional robustness to accent variation, background noise, domain-specific vocabulary (including technical terms relevant to EV engineering), and code-switching between languages.

Critically for the Sterling platform's use case, Whisper achieves near-human transcription accuracy for English technical speech without requiring domain-specific fine-tuning — enabling accurate transcription of interview responses that may include EV-specific terminology such as "field-oriented control," "PMSM," "CAN-BUS protocol," and "silicon carbide switching devices."

### 3.3.3 Groq API and Ultra-Low Latency Inference

The Sterling platform deploys Whisper via the **Groq API**, leveraging Groq's Language Processing Unit (LPU) hardware architecture, which is specifically optimised for sequential, memory-bandwidth-intensive inference tasks characteristic of transformer models. Groq's LPU architecture achieves inference throughput that is typically one to two orders of magnitude higher than GPU-based serving for transformer models of Whisper's scale, enabling **sub-second speech transcription latency** — a critical requirement for maintaining the conversational fluidity of the AI interview experience.

This technology choice is validated by published Groq benchmarks demonstrating throughput exceeding 700 tokens per second for Whisper-large-v3, compared to approximately 15–30 tokens per second on standard GPU instances — a performance differential that directly determines whether the interview experience feels conversational or awkward to candidates.

---

## 3.4 Neural Text-to-Speech Synthesis

### 3.4.1 Historical Development of TTS

Text-to-Speech synthesis has evolved from formant synthesis systems of the 1960s and 1970s — which produced recognisably synthetic, robotic speech — through concatenative synthesis approaches of the 1990s and 2000s, which stitched together recorded phoneme units, to the contemporary era of neural parametric synthesis that produces speech of near-human naturalness.

The watershed development in neural TTS was Google's WaveNet (van den Oord et al., 2016), a deep autoregressive generative model of audio waveforms that produced significantly more natural-sounding speech than any preceding system. Subsequent work, including Google's Tacotron 2 (Shen et al., 2018) and Microsoft's FastSpeech 2 (Ren et al., 2021), progressively reduced inference latency while maintaining or improving naturalness — addressing the practical deployment challenge of generating speech in real time.

### 3.4.2 ElevenLabs Voice Synthesis

The Sterling platform employs **ElevenLabs** for Text-to-Speech synthesis, selected for its state-of-the-art voice naturalness, emotional expressiveness, and, critically, its streaming API that enables **true real-time audio generation**. ElevenLabs' underlying architecture employs diffusion-based and latent space voice synthesis techniques that achieve Mean Opinion Scores (MOS) consistently above 4.0 on naturalness evaluation benchmarks — approaching the MOS of 4.5 typically attributed to high-quality human reference speech.

A critical implementation decision in the Sterling platform is the **elimination of disk I/O in the TTS pipeline**: the ElevenLabs API stream is directly buffered to the frontend's HTML5 Audio context without intermediate file system writes. This architectural choice, described in detail in Chapter 9, eliminates a significant source of latency that would otherwise disrupt the conversational tempo of the AI interview.

---

## 3.5 Three-Dimensional Avatar Systems in Human-Computer Interaction

### 3.5.1 Embodied Conversational Agents

The use of animated, three-dimensional avatar representations for virtual interviewers falls within the broader research domain of Embodied Conversational Agents (ECAs). Research by Cassell et al. (2000) established that users engage more naturally and disclose more information to conversational interfaces that incorporate human-like visual representation, gesturing, and facial expression — even when the avatar's visual quality is significantly below photorealism.

Subsequent research by Krämer and Bente (2010) demonstrated that the presence of an anthropomorphic avatar increases candidate engagement and perceived fairness in automated interview settings, suggesting that the investment in avatar technology is not merely cosmetic but serves a functional role in interview quality and candidate experience outcomes.

### 3.5.2 WebGL and Real-Time 3D Rendering in Browsers

The technical implementation of high-quality 3D avatar rendering within a web browser — without plugin dependencies — became feasible with the standardisation and widespread adoption of the **WebGL** API (web-based OpenGL ES). The subsequent development of **React Three Fiber** — a React renderer for the Three.js WebGL library — enabled component-based development paradigms to be applied to 3D scene management, significantly reducing the development complexity of integrating 3D avatar rendering within a React-based single-page application.

### 3.5.3 Viseme Mapping and Lip Synchronisation

Real-time lip synchronisation between audio output and a 3D avatar face model presents a non-trivial signal processing challenge. The established approach, employed in the Sterling platform, maps incoming audio frequency data to **viseme targets** — standardised phoneme mouth shapes represented as morph targets on the 3D mesh. The `useAvatarLipSync.js` hook in the platform performs frequency-domain analysis of the audio stream using the Web Audio API and maps energy in speech-frequency bands to corresponding morph target activation values, producing the visual impression of synchronised lip movement without requiring true phoneme-level recognition.

---

## 3.6 NLP-Based Resume Parsing and Screening

### 3.6.1 Information Extraction from Resumes

Resume parsing — the automatic extraction of structured information from unstructured resume documents — is a well-studied problem in the information extraction literature. Early approaches employed regular expression-based rule systems and Named Entity Recognition (NER) models trained on labelled resume corpora (Hou et al., 2018). These approaches achieved acceptable accuracy for standard resume sections (education, work experience, contact information) but performed poorly on domain-specific skill extraction, particularly for emerging technology domains.

### 3.6.2 Skill Extraction and Role Matching

More recent approaches employ contextual word embeddings from models such as BERT or RoBERTa to perform skill span extraction with improved accuracy over rule-based systems (Shi et al., 2020). The Sterling platform's `resume_engine.py` implements a hybrid approach: structured text extraction from PDF documents via library parsing, followed by NLP-based skill detection that matches extracted text against a domain-specific skill lexicon aligned to Sterling E-Mobility's technical requirements (EV powertrain, embedded systems, power electronics), and finally a scoring function that computes a `resume_score` representing the candidate's alignment with the applied role's requirements.

The platform also implements an experience estimation algorithm that identifies temporal markers in resume text to calculate approximate Years of Experience (YOE) — a critical pre-screening metric for senior technical roles.

---

## 3.7 Online Proctoring Systems

### 3.7.1 Technology Overview

Online proctoring — the use of automated computer vision and behavioural analysis to monitor assessment integrity during remote examinations — has experienced explosive growth since the COVID-19 pandemic accelerated the transition to remote assessment. Existing commercial proctoring solutions, including Proctorio, Respondus Monitor, and ExamSoft, employ combinations of face detection, eye tracking, keystroke analysis, screen recording, and audio monitoring to identify potential academic integrity violations.

### 3.7.2 Browser-Native Proctoring

The Sterling platform's proctoring module, implemented across `eye_tracking.py` (backend), `behavior_analysis.py` (backend), and `useHumanBehavior.js` (frontend), employs a browser-native approach that operates without requiring a separate application installation. The module monitors:

- **Face Presence and Position**: Leveraging browser-accessible camera feeds to detect when a candidate's face is outside the frame — indicating potential consultation of unauthorised materials or assistance from a third party.
- **Tab Switching Detection**: Listening for DOM `visibilitychange` events to detect when the candidate switches away from the interview tab.
- **Focus Events**: Monitoring `blur` and `focus` events on the browser window to detect switching to other applications.
- **Cursor Movement Patterns**: Tracking cursor position anomalies that may indicate interaction with off-screen assistance.

A key design decision in the platform is the deliberate mocking of computationally intensive client-side WebGL inference (in `useHumanBehavior.js`) to ensure compatibility with lower-specification client devices (Intel Core i3 and equivalent), with heavier behavioural analysis delegated to the backend. This represents a pragmatic trade-off between proctoring thoroughness and platform accessibility — consistent with accessibility principles discussed by Proctoring Research Foundation reports (2023).

---

## 3.8 Large Language Models in Open-Domain Evaluation

### 3.8.1 LLM Capabilities for Assessment

The emergence of Large Language Models — particularly OpenAI's GPT series and Google's Gemini/PaLM series — has introduced a qualitatively new capability for automated text evaluation: the ability to assess free-form candidate responses against complex, multidimensional criteria without requiring manually labelled training examples for each evaluation task.

Brown et al. (2020), in the landmark GPT-3 paper, demonstrated that LLMs with sufficient parameter scale could perform sophisticated reasoning tasks in few-shot or zero-shot settings. Subsequent work specifically applying LLMs to automated essay scoring, interview response evaluation, and competency assessment has confirmed that GPT-4 class models achieve inter-rater reliability with human expert evaluators that approaches or matches the inter-rater reliability among human experts themselves (Mizumoto & Eguchi, 2023).

### 3.8.2 Prompt Engineering for Interview Evaluation

The Sterling platform employs `prompt_engine.py` to implement a sophisticated prompt engineering framework that constrains and directs LLM evaluation behaviour. Key techniques employed include:

- **Role conditioning**: Explicit system-level role assignment ("You are the Sterling Assessment Engine, conducting a technical interview for a [role] position at Sterling E-Mobility") to establish evaluation context and persona.
- **Criteria specification**: Explicit enumeration of evaluation dimensions (technical accuracy, keyword coverage, depth of explanation, communication clarity) with weighted importance.
- **Output structuring**: Instructions for structured JSON-format evaluation output to ensure machine-parsable evaluation results.
- **Hallucination prevention**: Negative constraints ("Do not invent technical facts; if a candidate's response is ambiguous, request clarification") to reduce confabulation in evaluation outputs.
- **Small talk handling**: Specific instructions for handling non-technical candidate utterances (greetings, expressions of nervousness) gracefully without disrupting the interview flow.

---

## 3.9 Review of Existing Commercial Platforms

Several commercial platforms address portions of the problem space targeted by the Sterling platform. The following comparative analysis situates the Sterling system within the commercial landscape:

**Table 3.1 — Comparative Analysis: Existing Platforms vs Sterling AI Recruitment Engine**

| Feature | HireVue | Mya (Conversational AI) | Pymetrics | Interviewer.AI | Sterling AI Recruitment Engine |
|---|---|---|---|---|---|
| Interview Mode | Pre-recorded video | Chatbot (text) | Game-based | AI video analysis | Live conversational voice + code |
| Real-time Conversation | ❌ | Limited | ❌ | ❌ | ✅ Full duplex audio |
| Code Evaluation | ❌ | ❌ | ❌ | ❌ | ✅ Monaco Editor + LLM review |
| 3D Avatar | ❌ | ❌ | ❌ | ❌ | ✅ WebGL with lip-sync |
| Resume Parsing | ❌ (partner tools) | Basic | ❌ | Partial | ✅ NLP-based with role scoring |
| Proctoring | ❌ | ❌ | ❌ | Partial | ✅ Face + tab + focus detection |
| Dynamic Difficulty | ❌ | ❌ | ❌ | ❌ | ✅ LLM-driven adaptive questioning |
| On-premise/Private | Limited | No | No | No | ✅ Self-hosted |
| Custom Role Config | Limited | Partial | No | Limited | ✅ Full per-role/department config |
| Open Source Stack | Proprietary | Proprietary | Proprietary | Proprietary | Open-source (React, FastAPI, SQLite) |

The comparative analysis reveals that the Sterling AI Recruitment Engine occupies a unique position in the landscape — combining live conversational voice-based interview capability (absent from all reviewed commercial platforms in their base offerings), integrated code evaluation, 3D avatar presence, and a comprehensive self-hosted architecture on an open-source technology stack.

---

## 3.10 Research Gaps and Motivation

The literature review reveals the following specific gaps and limitations in prior work that motivated the design decisions of the Sterling platform:

1. **Absence of real-time conversational technical interview systems**: Existing AI interview platforms operate on pre-recorded responses or text-based chat. No commercially deployed system conducts live, bidirectional voice-based technical interviews with adaptive questioning driven by LLM reasoning.

2. **Limited technical depth assessment**: Most existing platforms assess behavioural and personality dimensions effectively but lack the ability to evaluate deep technical competency — particularly coding ability — in an integrated interview environment.

3. **Proprietary and inaccessible architectures**: Commercial AI interview platforms are proprietary SaaS products that cannot be customised for domain-specific technical vocabularies, role-specific assessment criteria, or integration with internal HR workflows without substantial licensing cost and vendor dependency.

4. **Latency constraints in speech-AI pipelines**: Prior research has not adequately addressed the engineering challenge of maintaining sub-second end-to-end latency in a complete STT → LLM → TTS pipeline operating within a browser-based interview interface.

5. **Immersive candidate experience gap**: No existing system combines a high-fidelity 3D avatar with premium glassmorphism UI design to deliver the level of immersive visual experience demonstrated to improve candidate engagement and disclosed response quality.

---

## 3.11 Summary and Literature Synthesis

The literature survey presented in this chapter establishes the solid academic and industrial foundations upon which the Sterling Intelligent Interview & Candidate Assessment Platform is built. The convergence of transformer-based speech recognition (Whisper), neural TTS (ElevenLabs), WebGL avatar rendering, LLM-driven evaluation (GPT-4o/Gemini), NLP-based resume parsing, and browser-native proctoring into a unified, self-hosted platform represents a novel and technically significant contribution to the field of AI-augmented recruitment.

**Table 3.2 — Literature Review Summary Matrix**

| Domain | Key References | Technology Used | Gap Addressed |
|---|---|---|---|
| AI in Recruitment | Faliagka et al. (2012); Harber (2019); Naim et al. (2018) | LLM-driven evaluation (GPT-4o, Gemini) | Real-time conversational interview |
| Automatic Speech Recognition | Radford et al. (2022) — Whisper | Groq Whisper API | Sub-second latency STT |
| Neural TTS | van den Oord et al. (2016); Shen et al. (2018) | ElevenLabs streaming API | Zero-disk TTS with streaming |
| 3D Avatar Systems | Cassell et al. (2000); Krämer and Bente (2010) | React Three Fiber, WebGL | Browser-native avatar with lip-sync |
| Resume Parsing | Hou et al. (2018); Shi et al. (2020) | resume_engine.py (NLP + scoring) | Role-specific skill matching and scoring |
| Online Proctoring | Commercial platforms (Proctorio, etc.) | browser events + backend analysis | i3-compatible lightweight proctoring |
| LLM Evaluation | Brown et al. (2020); Mizumoto & Eguchi (2023) | prompt_engine.py, ai_orchestrator.py | Deep technical competency assessment |

---

*End of Chapter 3. Proceed to Chapter 4 — Existing System Analysis.*
