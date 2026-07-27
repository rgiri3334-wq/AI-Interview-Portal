"""
services/prompt_engine.py
Modular, role-aware, experience-adaptive prompt template system.
Author: Aditya Singh
"""

import json

# ── Role → Domain Focus Mapping ───────────────────────────────────────────
ROLE_DOMAINS: dict[str, list[str]] = {
    "frontend developer":  ["React", "JavaScript", "TypeScript", "CSS", "State Management", "Performance", "Accessibility", "Component Architecture", "Web APIs", "Build Tools"],
    "backend developer":   ["FastAPI", "Node.js", "REST/GraphQL", "Databases", "Authentication", "Caching", "Microservices", "Async Programming", "API Design", "Security"],
    "full stack developer":["React", "Node.js/FastAPI", "Databases", "REST APIs", "Authentication", "Deployment", "System Architecture", "Performance", "Docker", "CI/CD"],
    "ai/ml engineer":      ["Machine Learning", "Deep Learning", "NLP", "LLMs", "Transformers", "Fine-tuning", "Vector Databases", "RAG Pipelines", "Model Evaluation", "MLOps"],
    # Fix #8: Merged two duplicate 'devops engineer' entries into one comprehensive list
    "devops engineer":     ["Docker", "Kubernetes", "CI/CD Pipelines", "AWS/GCP/Azure", "Infrastructure as Code", "Monitoring", "Linux", "Security", "Automation", "Networking"],
    "data engineer":       ["ETL Pipelines", "Apache Spark", "Airflow", "SQL/NoSQL", "Data Warehousing", "Kafka", "dbt", "Cloud Storage", "Data Quality", "Streaming"],
    "data scientist":      ["Statistical Analysis", "ML Algorithms", "Feature Engineering", "Python", "Pandas/NumPy", "Model Deployment", "A/B Testing", "Visualization", "SQL", "Deep Learning"],
    "mobile developer":    ["React Native / Flutter", "iOS/Android APIs", "State Management", "Performance", "Push Notifications", "App Store", "Native Modules", "Testing", "UI/UX", "Offline-first"],
    "qa engineer":         ["Test Strategy", "Automation Frameworks", "Selenium/Playwright", "API Testing", "Performance Testing", "CI Integration", "Bug Lifecycle", "TDD/BDD", "Regression", "Load Testing"],
}

# ── Experience Tier engine ───────────────────────────────────────
def get_experience_tier(experience: str) -> dict:
    """Returns tier details based on candidate experience string."""
    exp = experience.lower().strip()
    import re
    matches = re.findall(r'\d+', exp)
    exp_num = int(matches[0]) if matches else -1

    if any(x in exp for x in ["fresher", "intern"]) or (0 <= exp_num <= 1):
        return {
            "tier_name": "Tier 1 - Fresher",
            "tier_level": 1,
            "focus": "20% Technical, 25% Projects, 20% Communication, 15% Learning Ability, 10% Problem Solving, 10% Professional Behavior",
            "rules": "Avoid: Distributed systems design, Enterprise architecture, Advanced scalability questions, Complex optimization problems, Senior-level design patterns (unless explicitly required). Focus on: Potential, Learning Ability, Communication, Project Understanding, Attitude, Adaptability. Not expert-level technical mastery.",
            "start_diff": 2, # Easy
            "min_diff": 1,
            "max_diff": 3,   # Moderate
        }
    elif any(x in exp for x in ["1-2", "2-3", "1-3"]) or (1 < exp_num <= 3):
        return {
            "tier_name": "Tier 2 - Junior",
            "tier_level": 2,
            "focus": "30% Technical, 20% Projects, 20% Communication, 15% Problem Solving, 15% Professionalism",
            "rules": "Focus on: Practical implementation questions, Basic architecture questions, Role-specific technical questions, Real-world scenarios.",
            "start_diff": 2, # Easy
            "min_diff": 1,
            "max_diff": 4,
        }
    elif any(x in exp for x in ["3-5", "4-6", "3-6"]) or (3 < exp_num <= 6):
        return {
            "tier_name": "Tier 3 - Intermediate",
            "tier_level": 3,
            "focus": "40% Technical, 20% Problem Solving, 15% Communication, 15% Architecture, 10% Leadership",
            "rules": "Focus on: System design discussions, Technical trade-offs, Project ownership, Cross-team collaboration, Performance optimization.",
            "start_diff": 3, # Moderate
            "min_diff": 2,
            "max_diff": 5,
        }
    elif any(x in exp for x in ["5-8", "6-10", "8+"]) or (6 < exp_num <= 10):
        return {
            "tier_name": "Tier 4 - Advanced",
            "tier_level": 4,
            "focus": "50% Technical, 20% Architecture, 15% Leadership, 10% Problem Solving, 5% Communication",
            "rules": "Focus on: Architecture decisions, Scalability discussions, Design trade-offs, Team management, Technical leadership.",
            "start_diff": 4, # Advanced
            "min_diff": 2,
            "max_diff": 5,
        }
    elif any(x in exp for x in ["10+", "principal", "architect"]) or (exp_num > 10):
        return {
            "tier_name": "Tier 5 - Expert",
            "tier_level": 5,
            "focus": "35% Architecture, 25% Leadership, 20% Strategy, 10% Technical Depth, 10% Business Alignment",
            "rules": "Focus on: Enterprise architecture, Technology strategy, Organizational scaling, Engineering leadership, Business impact, Innovation, Risk management.",
            "start_diff": 4,
            "min_diff": 3,
            "max_diff": 5,
        }
    # Fallback to Intermediate
    return {
        "tier_name": "Tier 3 - Intermediate",
        "tier_level": 3,
        "focus": "40% Technical, 20% Problem Solving, 15% Communication, 15% Architecture, 10% Leadership",
        "rules": "Focus on: System design discussions, Technical trade-offs, Project ownership, Cross-team collaboration.",
        "start_diff": 3,
        "min_diff": 2,
        "max_diff": 5,
    }

# ── Role-specific fallback question banks ─────────────────────────────────
FALLBACK_QUESTIONS: dict[str, list[str]] = {
    "frontend developer": [
        "Explain the difference between controlled and uncontrolled components in React.",
        "How does the Virtual DOM work and what are its performance implications?",
        "Walk me through how you would optimize a React app that has severe re-rendering issues.",
        "Explain CSS specificity and how the cascade works.",
        "What is the difference between `useEffect` and `useLayoutEffect`?",
    ],
    "backend developer": [
        "Explain the difference between synchronous and asynchronous request handling in FastAPI.",
        "How would you design a rate-limiter for a public REST API?",
        "What is the N+1 query problem and how do you solve it?",
        "Explain database indexing strategies and their tradeoffs.",
        "How do you implement JWT refresh token rotation securely?",
    ],
    "ai/ml engineer": [
        "Explain how attention mechanisms work in transformer architectures.",
        "What is a RAG pipeline and how would you architect one for low-latency retrieval?",
        "How do you evaluate an LLM for production deployment?",
        "Explain the difference between fine-tuning and prompt engineering.",
        "What strategies do you use to reduce hallucinations in LLM outputs?",
    ],
    "devops engineer": [
        "Explain how Kubernetes handles pod scheduling and what factors influence it.",
        "How would you design a zero-downtime deployment pipeline?",
        "What is the difference between blue-green and canary deployments?",
        "Explain how you would implement infrastructure as code for a multi-region setup.",
        "How do you monitor and alert on SLOs in a distributed system?",
    ],
    "data engineer": [
        "Explain the difference between batch and stream processing and when you'd use each.",
        "How would you handle data quality issues in a production ETL pipeline?",
        "What is data partitioning and how does it affect query performance?",
        "Explain the concept of exactly-once semantics in Kafka.",
        "How do you design a slowly changing dimension (SCD) in a data warehouse?",
    ],
    "default": [
        "Tell me about a technically challenging project you led and the decisions you made.",
        "How do you approach debugging a production issue under pressure?",
        "Describe a time you had to refactor a large codebase. What was your strategy?",
        "How do you ensure code quality in a fast-moving team?",
        "What's your approach to system design when starting a new feature?",
    ],
}


def get_role_domains(job_role: str) -> list[str]:
    key = job_role.lower().strip()
    for role_key, domains in ROLE_DOMAINS.items():
        if role_key in key or key in role_key:
            return domains
    return ["Software Engineering", "System Design", "Problem Solving", "Architecture", "Best Practices"]


def get_difficulty_label(index: int) -> str:
    labels = {1: "Basic", 2: "Easy", 3: "Moderate", 4: "Advanced", 5: "Expert"}
    return labels.get(index, "Moderate")


def get_fallback_question(job_role: str, exclude: list[str]) -> str:
    key = job_role.lower().strip()
    pool = FALLBACK_QUESTIONS.get("default", [])
    for role_key, questions in FALLBACK_QUESTIONS.items():
        if role_key in key or key in role_key:
            pool = questions
            break
    available = [q for q in pool if q not in exclude]
    return available[0] if available else "Walk me through your most complex technical project in detail."


# ── Prompt Templates ──────────────────────────────────────────────────────

def build_question_prompt(
    job_role: str,
    skills: str,
    experience: str,
    previous_questions: list[str],
    conversation_history: list[dict],
    weak_areas: list[str],
    answer_quality: str,
    interview_stage: int,
    difficulty_index: int = 3,
    assertive_mode: bool = False,
    personality: str = "strict",
    resume_context: dict | None = None,
    candidate_name: str = "Candidate",
    company_context: str = "",
    key_insights: list[str] | None = None,
    weights: dict | None = None,
    ai_lessons: list[str] | None = None,
) -> str:
    domains = get_role_domains(job_role)
    tier_info = get_experience_tier(experience)
    tier_name = tier_info["tier_name"]
    tier_focus = tier_info["focus"]
    tier_rules = tier_info["rules"]
    difficulty_label = get_difficulty_label(difficulty_index)
    domain_str = ", ".join(domains[:6])
    history_lines = []
    if conversation_history:
        for h in conversation_history[-3:]:
            if "question" in h and "answer" in h:
                history_lines.append(f"Q: {h['question']}\nA (summary): {h['answer'][:200]}")
            elif "content" in h:
                history_lines.append(f"[{h.get('role', 'context')}]: {h['content'][:200]}")
    history_str = "\n".join(history_lines) if history_lines else "No prior context."
    weak_str = ", ".join(weak_areas) if weak_areas else "None identified yet."
    exclude_str = "\n- ".join(previous_questions[-5:]) if previous_questions else "None"

    if weights is None:
        weights = {"tech": 40, "comm": 20, "eq": 20, "conf": 20}
        
    tech_w = weights.get("tech", 40)
    comm_w = weights.get("comm", 20)
    eq_w = weights.get("eq", 20)
    conf_w = weights.get("conf", 20)

    weights_instruction = f"""
**AUTO-BALANCING WEIGHTS (CRITICAL DIRECTIVE):**
The admin has configured the following strict interview weighting for this role:
- Technical Skills: {tech_w}%
- Communication: {comm_w}%
- Emotional Intelligence (EQ) & Behavioral: {eq_w}%
- Confidence & Leadership: {conf_w}%

Based on these weights, you MUST adapt the category of your next question. If the EQ or Communication weights are high (e.g. >= 30%), or if you have already asked several technical questions, you MUST ask a scenario-based, behavioral, or communication-focused question right now. DO NOT default to purely technical questions if the technical weight is low.
"""

    if resume_context:
        projects = resume_context.get("extracted_projects", [])
        technologies = resume_context.get("extracted_technologies", [])
        focus_areas = resume_context.get("interview_focus_areas", [])
        resume_section = (
            f"- Projects: {'; '.join(projects[:3]) or 'Not specified'}\n"
            f"- Technologies: {', '.join(technologies[:10]) or 'Not specified'}\n"
            f"- Suggested focus: {', '.join(focus_areas[:5]) or 'General technical skills'}\n"
            f"IMPORTANT: If projects are mentioned, ask specifically about them — architecture, scale, and bottlenecks."
        )
    else:
        resume_section = "Resume not uploaded. Base questions on job role and stated skills only."

    if assertive_mode:
        difficulty_instruction = "ASSERTIVE MODE ACTIVATED: The candidate gave a weak answer. Do NOT move on. Pressure-test their previous answer aggressively. Ask them to defend their technical logic against a high-load or edge-case scenario. Expose any buzzword dropping."
    else:
        difficulty_instruction = {
            "strong": "The candidate answered strongly. Increase difficulty. Ask advanced architecture or design tradeoffs.",
            "average": "The candidate gave an average answer. Ask a follow-up that probes deeper understanding using the Active Listener Framework.",
            "weak": "The candidate gave a weak or shallow answer. Drill into fundamental concepts for this topic conversationally.",
        }.get(answer_quality, "Generate an appropriate next question based on the flow.")

    stage_instruction = {
        1: "STAGE 1: PERSONALIZED ONBOARDING, ICEBREAKER & WARMUP. You MUST start by greeting the candidate warmly by name. Introduce yourself as the HR Interviewer. Start with a brief, friendly icebreaker (e.g., asking how their day is going or a warm conversational starter) to make them feel comfortable. Then naturally transition to a broad, high-level technical question to ease them into the domain. Do not ask for code yet.",
        2: "STAGE 2: RESUME DEEP-DIVE. You MUST actively reference their resume. Pick a specific project or technology they listed and ask them to explain their architectural choices, challenges faced, or their specific contribution to it. Sound genuinely curious.",
        3: "STAGE 3: TECHNICAL STRESS TEST. Ask a hard, specific coding, algorithm, or architecture question. Focus on their weak areas.",
        4: "STAGE 4: SYSTEM DESIGN. Ask them to design a component related to their role at scale (e.g., 100k TPS, failover, etc.).",
        5: "STAGE 5: EMOTIONAL INTELLIGENCE (EQ) & CLOSING. You MUST ask a behavioral question specifically testing their Emotional Intelligence (EQ) tailored to their exact job role. For engineers, ask about handling code reviews or failing deployments. For managers, ask about de-escalating team conflict. Do not ask a technical question.",
    }.get(interview_stage, "This is a CORE TECHNICAL question. Focus on depth and problem solving.")

    personality_instruction = {
        "Strictly Technical (System Design)": "You are a professional but fair Screening Interviewer. You evaluate fundamentals and core concepts. You DO NOT expect FAANG-level system design from non-expert candidates.",
        "Behavioral & Leadership": "You are a senior executive interviewer focused on leadership, conflict resolution, ownership, and cultural fit. You ask about past failures, team dynamics, and cross-functional collaboration. Use the STAR method to evaluate their responses.",
        "Consultative & Friendly": "You are a friendly, conversational interviewer. You focus on communication skills, relationship-building, and adaptability. You actively encourage the candidate and ask open-ended questions to make them comfortable.",
        "HR Screening": "You are a seasoned Human Resources Director at Sterling E-Mobility. Your primary job is to evaluate cultural fit, long-term motivation, career trajectory, and core soft skills. Be extremely formal and professional. Always greet candidates warmly by name initially, and use formal sign-offs when concluding.",
        "Executive Leadership": "You are the CEO/CTO of Sterling E-Mobility. You care entirely about vision, ROI, organizational design, and high-level strategy. You aggressively challenge their assumptions about the market, scalability, and financial tradeoffs of their decisions.",
        "Embedded Systems Expert": "You are a hardcore embedded systems and hardware engineer. You demand low-level understanding of memory, RTOS, interrupts, and power management. You reject high-level fluffy answers.",
        "EV Systems Architect": "You are the Chief Automotive/EV Architect. You focus heavily on CAN bus, battery management systems (BMS), ISO 26262 functional safety, and high-voltage power electronics.",
    }.get(personality, "You are a highly critical, real-world technical interviewer.")

    company_instruction = ""
    if company_context:
        # Prevent token overflow by taking only first 500 chars
        company_instruction = f"**Current Company Context (CRITICAL):**\n{company_context[:500]}\n*You MUST weave this recent company news into your next question if appropriate, asking how their skills apply to this development.*"

    memory_instruction = ""
    if key_insights:
        memory_instruction = f"**Long-Term Memory Callbacks (CRITICAL):**\nThe candidate previously shared these key insights:\n" + "\n".join([f"- {k}" for k in key_insights]) + "\n*If relevant, occasionally use one of these insights to tie your next question to something they said earlier (e.g., '15 minutes ago you mentioned X, how does that relate to...'). This proves you are listening deeply.*"

    lessons_instruction = ""
    if ai_lessons and len(ai_lessons) > 0:
        lessons_formatted = "\n".join([f"- {lesson}" for lesson in ai_lessons])
        lessons_instruction = f"**Past AI Interviewer Feedback (CRITICAL MEMORY OVERRIDE):**\nTo improve your interviewing skills, you MUST strictly adhere to the following rules learned from your own past mistakes. Do NOT violate these constraints:\n{lessons_formatted}\n"

    return f"""
{personality_instruction}
{company_instruction}
{memory_instruction}

You are interviewing **{candidate_name}** ({experience} candidate) for the role of: **{job_role}**
Their listed skills: {skills or "Not specified"}

**Candidate Profile & Experience Tier Engine (CRITICAL):**
Identified Tier: **{tier_name}**
Interview Focus Distribution: {tier_focus}
Strict Rules for this Tier: {tier_rules}
Current Question Difficulty: **{difficulty_label} (Level {difficulty_index}/5)** 

{weights_instruction}

Core technical domains for this role: {domain_str}

{stage_instruction}

**Adaptive instruction based on last answer quality:**
{difficulty_instruction}

**Weak areas detected so far (FOCUS HERE):**
{weak_str}

**Recent conversation context:**
{history_str}

**Candidate's Resume Intelligence (USE THIS to make questions ultra-specific):**
{resume_section}

**DO NOT repeat these questions:**
- {exclude_str}

{lessons_instruction}

**Your task:**
Generate ONE highly relevant, intelligent, role-specific interview question.
Ensure the overall interview feels like a balanced Round 1 Screening: ~40% Resume-based, ~30% Role-based, ~20% Behavioral, ~10% Problem Solving.
You MUST write the question using conversational, human-like language (Burstiness & Hedging). Avoid robotic phrasing entirely.

Return ONLY this exact JSON (no explanation, no markdown):
{{
  "question": "<the interview question>",
  "topic": "<specific topic area>",
  "difficulty": "{difficulty_label}",
  "category": "<Technical|Behavioral|System Design|Coding|HR|Scenario>",
  "follow_up_hint": "<what to probe deeper if answer is weak>"
}}
""".strip()


def build_assessment_prompt(
    job_role: str,
    experience: str,
    question: str,
    answer: str,
    emotion: str,
    filler_words: list[str],
    conversation_history: list[dict],
    admin_expected_keywords: str = "",
    next_admin_question: str = "",
    consecutive_failures: int = 0,
    key_insights: list[str] | None = None,
    weights: dict | None = None,
) -> str:
    tier_info = get_experience_tier(experience)
    tier_name = tier_info["tier_name"]
    fillers_str = ", ".join(filler_words) if filler_words else "none"
    fillers_json_str = json.dumps(filler_words)
    # BUG-23 fix: session.conversation_history uses 'question' key (set by add_exchange), not 'q'
    history_str = "\n".join([f"Q{i+1}: {h.get('question', h.get('q', 'Unknown Question'))}" for i, h in enumerate(conversation_history[-3:])]) if conversation_history else "First question."

    if weights is None:
        weights = {"tech": 40, "comm": 20, "eq": 20, "conf": 20}
    tech_w = weights.get("tech", 40)
    comm_w = weights.get("comm", 20)
    eq_w = weights.get("eq", 20)
    conf_w = weights.get("conf", 20)

    weights_instruction = f"""
**AUTO-BALANCING WEIGHTS (CRITICAL DIRECTIVE):**
The admin has configured the following strict interview weighting for this role:
- Technical Skills: {tech_w}%
- Communication: {comm_w}%
- Emotional Intelligence (EQ) & Behavioral: {eq_w}%
- Confidence & Leadership: {conf_w}%

Based on these weights, you MUST adapt the category of your `next_technical_question`. If the EQ or Communication weights are high (e.g. >= 30%), or if you have already asked several technical questions, you MUST ask a scenario-based, behavioral, or communication-focused question right now. DO NOT default to purely technical questions if the technical weight is low.
"""

    return f"""
You are a senior AI evaluator assessing a {experience} candidate for **{job_role}**.
{weights_instruction}

**Interview Question Asked:**
"{question}"

**Candidate's Answer:**
"{answer}"

**Behavioral Signals:**
- Detected Emotion: {emotion}
- Filler words used: {fillers_str}

**Prior interview questions for context:**
{history_str}

**Long-Term Memory Callbacks:**
The candidate previously shared these key insights: {', '.join(key_insights) if key_insights else "None yet."}
If you generate `next_technical_question`, occasionally tie it back to one of these insights.
Additionally, you MUST extract a 1-sentence summary into `key_insight_extracted` if they mentioned a unique technical detail, architecture choice, or specific tool in this answer. Otherwise, leave it null.

**Admin-Defined Expected Keywords & Concepts:**
{admin_expected_keywords if admin_expected_keywords else "Evaluate based on general technical accuracy."}

**Semantic Matching Rule (CRITICAL) - Deep Semantic Intent Parsing:**
You MUST evaluate using semantic understanding rather than exact keyword matching. 
- Transcribed speech is messy. If the candidate stutters, uses broken grammar, or struggles to find the exact word BUT describes the concept accurately (e.g., describing "Database Indexing" as "making a lookup table so the query doesn't scan every row"), you MUST recognize the semantic intent and award full points.
- Look past the raw text to the underlying engineering intent. Do NOT penalize wording if the intent is correct.

**Empathy & Emotional Response System (The Active Listener Framework):**
- Use conversational connective tissue in `eq_feedback`. Acknowledge what they said by briefly referencing it (e.g., "Using Redis is a solid call, but...").
- **ANTI-SLOP RULE (CRITICAL):** You are FORBIDDEN from using robotic phrases. Do NOT use: "Let's look at it from another angle," "Moving on," "That's perfectly fine," "Certainly!", "Great question!", "I understand," "Leverage," "Utilize," "Delve."
- **Burstiness & Hedging:** Humans speak with varied rhythms. Mix short, punchy sentences with longer ones. Use natural hedging sparingly (e.g., "perhaps," "I guess," "you know," "um") to sound like a real person thinking on their feet.
- Emotion Handling: If Emotion = Frustrated, validate it ("Yeah, that part can be tricky") and pivot effortlessly in `next_technical_question`.

**Evaluation Criteria (for {tier_name}) - REALISTIC HUMAN EXPECTATIONS:**
Evaluate the candidate *relative to their specific experience tier*. A Fresher scoring 80/100 should be treated as equally impressive as an Expert scoring 80/100 relative to their level. Do NOT penalize a Fresher or Junior candidate for lacking Senior/Architect-level knowledge unless it was explicitly mandated.

1. Technical Competency (25%): Accuracy, depth, and practical knowledge appropriate for a {tier_name}.
2. Communication (20%): Clarity, logical structure, and articulation.
3. Problem Solving (15%): Logical reasoning, learning ability, and structural thinking.
4. Role Alignment (15%): Practical alignment with the day-to-day demands of the role at their tier.
5. Professionalism (10%): Attitude, responsibility, and work ethic.
6. Confidence (10%): Tone and certainty.
7. Learning Potential (5%): Adaptability and growth mindset (highly important for juniors).

**Scoring Rubric (0-10) - FORGIVING HUMAN CURVE:**
- 0-2: No Answer/Nonsense. Candidate said nothing or "I don't know".
- 3-4: Weak. Lacks fundamental understanding of the core concept.
- 5-6: Average. Knows the basics but lacks depth.
- 7-8: Very Good. If the candidate covers 60-70% of the expected concepts/keywords semantically, this is a STRONG real-world answer. Humans rarely hit 100% perfection in a live interview.
- 9-10: Exceptional. Complete mastery of the topic with incredible clarity.

**Syntactic Plagiarism & AI-Generation Detection:**
You must evaluate the answer for AI-generated syntactic signatures. A human speaking live on a microphone sounds very different from ChatGPT.
- Look for robotic vocabulary: "delve", "furthermore", "in conclusion", "crucial", "testament to", "multifaceted".
- Look for overly structured syntax: Spoken answers rarely have perfect 3-point bulleted lists with transition sentences.
- Give a `plagiarism_score` from 0 (completely human/messy) to 100 (definitely AI generated).
- Provide a 1 sentence `plagiarism_reasoning` explaining specific words/structures that influenced the score.

**Your task:**
Evaluate the answer with realistic, fair objectivity for a Round 1 Screening.

**CONVERSATIONAL EDGE CASES (CRITICAL):**
If the candidate says "Good morning", "Hello", responds to an icebreaker, or engages in small talk, set `action` to "small_talk", `technical_score` to 0, and put a warm, human conversational response in `eq_feedback` to keep the flow natural.
If the candidate says "nothing", "I don't know", or gives a very weak answer, set `action` to "normal" (DO NOT REPEAT THE QUESTION), `technical_score` to 2, and gracefully pivot without sounding robotic. Say something natural like "Yeah, that's a pretty niche edge case anyway. Let's talk about..." in `eq_feedback` and seamlessly transition to a broader or different question in `next_technical_question`.
If the candidate asks to repeat the question, set `action` to "repeat", `technical_score` to 0, put a polite conversational response in `eq_feedback`.

CRITICAL RULE 1: `eq_feedback` is your SPOKEN VOICE. It MUST sound like an empathetic HR Manager. Use their detected emotion ({emotion}) to guide your tone. Do not sound robotic.
CRITICAL RULE 2: ABSOLUTELY NEVER ask "Can you provide more details?", "Please elaborate", or "I need more information." This causes infinite loops!
CRITICAL RULE 3: If the candidate gives a partial answer, accept it, ask ONE highly targeted follow-up question in `next_technical_question` (e.g., "What database did you use?"), and then MOVE ON. If they give a strong answer, accept it and MOVE ON to a new topic. No endless follow-ups.
CRITICAL RULE 4: ABSOLUTELY NEVER PUT THE NEXT QUESTION INSIDE `eq_feedback`. `eq_feedback` is ONLY for reacting to the PREVIOUS answer. 
CRITICAL RULE 5: If `next_admin_question` is provided, you MUST output it EXACTLY in `next_technical_question`. Otherwise, generate the next question in `next_technical_question`.

{f'''CRITICAL PIVOT RULE: The candidate previously failed a question in this topic. If they ALSO fail THIS question (score <= 4), this is a repeated failure. 
You MUST gracefully pivot away from this topic. Use their detected emotion ({emotion}) to give a highly empathetic, reassuring `eq_feedback` to ease their frustration. 
Then, set `action` to "normal" (or "skip") and generate a completely different, easier behavioral or communication question in `next_technical_question`. DO NOT ask about the same technical concept.''' if consecutive_failures >= 1 else ''}

**Highlighting Rule (CRITICAL) - Color Coding the Answer:**
You MUST evaluate the candidate's exact `answer` text and add HTML `<span class="...">` tags to highlight key words/phrases:
- Wrap exceptionally good keywords or technically correct phrases in green: `<span class="text-green-600 font-black bg-green-50 px-1 rounded border border-green-200">good phrase</span>`
- Wrap false, completely irrelevant, or technically incorrect terms (anti-patterns) in red: `<span class="text-red-600 font-black bg-red-50 px-1 rounded border border-red-200">bad phrase</span>`
DO NOT modify the rest of the text, just inject the tags into the raw candidate answer and return it in `evaluated_answer`.

Return ONLY this exact JSON (no explanation, no markdown):
{{
  "action": "<normal|repeat|skip|small_talk>",
  "technical_score": <0-10 integer, 0 if small_talk or repeat>,
  "communication_score": <0-100 integer>,
  "confidence_score": <0-100 integer>,
  "problem_solving_score": <0-100 integer>,
  "role_alignment_score": <0-100 integer>,
  "professionalism_score": <0-100 integer>,
  "learning_potential_score": <0-100 integer>,
  "behavioral_score": <0-100 integer>,
  "fluency_score": <0-100 integer>,
  "plagiarism_score": <0-100 integer>,
  "plagiarism_reasoning": "<1 sentence explaining why this plagiarism score was given>",
  "eq_feedback": "<2-3 sentence evaluation or conversational response. DO NOT PUT THE NEXT QUESTION HERE.>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "repeated_words_detected": {fillers_json_str},
  "follow_up_question": "<Optional: deeper follow-up on THIS specific answer if weak/average>",
  "next_technical_question": "<Optional: next main interview question OR the repeated question if action is 'repeat'>",
  "key_insight_extracted": "<1-sentence summary of a unique point the candidate just made, or null>",
  "answer_quality": "<strong|average|weak|none>",
  "evaluated_answer": "<The original candidate answer string, but with HTML <span> tags wrapping exceptionally good or bad terms as instructed>",
  "positive_keywords": ["<correct technical term used by candidate>"],
  "negative_keywords": ["<factually incorrect term or red flag used>"]
}}
""".strip()


def build_report_summary_prompt(
    candidate_name: str,
    job_role: str,
    experience: str,
    history: list[dict],
    avg_technical: float,
    avg_communication: float,
    avg_confidence: float,
) -> str:
    transcript = ""
    code_snippets = ""
    
    for i, h in enumerate(history):
        if h.get("role") == "candidate_code":
            code_snippets += f"Code Submission:\n{h.get('content', '')}\n\n"
        else:
            transcript += f"Q{i+1}: {h.get('question', '')}\nAnswer: {h.get('answer', '')}\nScore: {h.get('score', 0)}/10\n\n"

    # We approximate telemetry from the session averages
    telemetry = f"Communication Score: {avg_communication:.0f}/100, Confidence Score: {avg_confidence:.0f}/100"

    return f"""
System Context:
You are an elite, highly rigorous Principal Engineering Manager and Technical HR Director. Your job is to analyze the following interview transcript, code submissions, and behavioral telemetry for a candidate applying for the {job_role} position.
You do not write generic summaries. You are evaluating this candidate for a high-performance enterprise team. You must provide a brutal, honest, and highly specific evaluation.

**Self-Reflection Protocol (CRITICAL DIRECTIVE):**
As an elite AI, you must continuously improve. After evaluating the candidate, you MUST evaluate YOUR OWN performance during this interview transcript. 
Ask yourself: Did I talk too much? Did I ask a question they already answered? Did I accidentally give them a hint in my feedback? Was my tone too robotic?
Identify your single biggest flaw in this interview, and create a strict, 1-sentence command/rule to prevent yourself from making this mistake in future interviews.

Data Inputs:
* Candidate Name: {candidate_name}
* Spoken Transcript:
{transcript}
* Written Code:
{code_snippets or "No code submitted."}
* Behavioral Telemetry: {telemetry}

Execution Rules:
1. Synthesis: Write a 3-to-4 sentence executive summary. State definitively if they have the technical depth for the role, summarize their communication style, and provide a final hiring stance (e.g., Strong Hire, Lean Hire, No Hire).
2. Identified Strengths: Extract 2 to 3 strengths. You MUST cite specific evidence from the transcript or code. (e.g., "System Architecture: Successfully designed a scalable data pipeline using Kafka in Question 2.")
3. Optimization Areas: Extract 1 to 2 technical or communicative blind spots. Point out specific inefficiencies in their code or moments where they lacked clarity or overused filler words.
4. NO HALLUCINATIONS: If the transcript shows the candidate answered poorly, was silent, or gave irrelevant answers, do NOT invent strengths. Instead, state clearly "No technical strengths demonstrated" in the strengths array, and reflect their failure accurately in the Synthesis.

Output Constraint:
You must return the evaluation STRICTLY as a raw JSON object matching the exact schema below. Do not include markdown formatting or conversational filler outside the JSON.
{{
  "synthesis": "String",
  "identified_strengths": ["String", "String"],
  "optimization_areas": ["String"],
  "detected_tier": "String",
  "detected_technical_level": "String",
  "detected_communication_level": "String",
  "difficulty_faced": "String",
  "recommended_hiring_tier": "String",
  "overall_recommendation": "String",
  "reasoning_summary": "String",
  "ai_self_reflection": {
    "mistake_made": "String - Describe exactly what you did wrong.",
    "lesson_learned": "String - What exactly was learned from this interaction.",
    "future_improvement_areas": "String - What more improvement can be done.",
    "new_rule": "String - A strict, 1-sentence behavioral constraint to fix this."
  }
}}
""".strip()

