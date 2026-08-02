"""
services/resume_engine.py
=============================================================================
Sterling AI — Advanced Resume Intelligence Engine v3.0
=============================================================================
Architect: Aditya Singh
Features:
  - 6-Category weighted scoring model (0-100, dynamic, never hardcoded)
  - Role-specific keyword intelligence matrix (20+ roles)
  - AI-powered deep analysis via Gemini 2.0 Flash
  - Local NLP fallback with full scoring categories
  - Score range: 0-100, varies meaningfully based on actual resume quality
=============================================================================
"""
import os
import logging
import json
import re
from typing import Optional

logger = logging.getLogger("ResumeEngine")

try:
    from google import genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# ── Fix: Correct model constant name ───────────────────────────────────────
GEMINI_MODEL = "gemini-2.0-flash"  # Previously defined as AI_MODEL, causing NameError


def _get_client():
    if not GENAI_AVAILABLE:
        raise RuntimeError("google-genai not installed.")
    key = os.getenv("AI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_gemini_api_key_here":
        raise RuntimeError("AI_API_KEY not set.")
    return genai.Client(api_key=key)


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from AI Engine's response."""
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r'\{[\s\S]+\}', text)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}


# ── Role-Specific Intelligence Matrix ──────────────────────────────────────
# Each entry: list of (keyword, weight) tuples where weight reflects importance
# This matrix is used by both the AI prompt AND the local fallback scorer

ROLE_SKILL_MATRIX = {
    # ── Engineering ──────────────────────────────────────────────────────
    "Software Engineer": {
        "core_skills": ["Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "Rust"],
        "frameworks": ["Spring", "Django", "FastAPI", "React", "Node.js", "Express"],
        "tools": ["Git", "Docker", "Kubernetes", "CI/CD", "REST API", "Microservices"],
        "keywords": ["algorithms", "data structures", "system design", "scalability", "OOP"],
        "experience_required": 2,
        "education_bonus_fields": ["Computer Science", "Software Engineering", "IT"],
    },
    "Frontend Developer": {
        "core_skills": ["React", "Vue", "Angular", "JavaScript", "TypeScript", "CSS", "HTML"],
        "frameworks": ["Next.js", "Vite", "Tailwind", "Redux", "GraphQL"],
        "tools": ["Webpack", "Figma", "Git", "Jest", "Cypress"],
        "keywords": ["responsive design", "SPA", "performance optimization", "UX", "accessibility"],
        "experience_required": 2,
        "education_bonus_fields": ["Computer Science", "Web Development", "Design"],
    },
    "Backend Developer": {
        "core_skills": ["Python", "Java", "Go", "Node.js", "C#", "PHP", "SQL"],
        "frameworks": ["FastAPI", "Django", "Spring Boot", "Express", "Laravel"],
        "tools": ["PostgreSQL", "MySQL", "Redis", "Docker", "Kafka", "RabbitMQ"],
        "keywords": ["REST", "microservices", "database design", "API design", "authentication"],
        "experience_required": 2,
        "education_bonus_fields": ["Computer Science", "Software Engineering"],
    },
    "DevOps Engineer": {
        "core_skills": ["Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions"],
        "frameworks": ["AWS", "GCP", "Azure", "Helm", "ArgoCD"],
        "tools": ["Linux", "Bash", "Python", "Prometheus", "Grafana", "ELK Stack"],
        "keywords": ["CI/CD", "infrastructure as code", "SRE", "monitoring", "cloud", "automation"],
        "experience_required": 3,
        "education_bonus_fields": ["Computer Science", "IT", "Systems Engineering"],
    },
    "Data Scientist": {
        "core_skills": ["Python", "R", "SQL", "TensorFlow", "PyTorch", "Scikit-learn"],
        "frameworks": ["Pandas", "NumPy", "Matplotlib", "Jupyter", "Spark"],
        "tools": ["Tableau", "Power BI", "BigQuery", "Databricks", "Airflow"],
        "keywords": ["machine learning", "statistical analysis", "data visualization", "A/B testing", "NLP", "deep learning"],
        "experience_required": 2,
        "education_bonus_fields": ["Data Science", "Statistics", "Mathematics", "Computer Science"],
    },
    "AI/ML Engineer": {
        "core_skills": ["Python", "TensorFlow", "PyTorch", "scikit-learn", "Keras", "HuggingFace"],
        "frameworks": ["LangChain", "FastAPI", "MLflow", "Kubeflow", "Ray"],
        "tools": ["CUDA", "GPU", "Docker", "Git", "Jupyter", "Weights & Biases"],
        "keywords": ["LLM", "NLP", "computer vision", "model training", "inference", "fine-tuning", "RAG", "transformer"],
        "experience_required": 2,
        "education_bonus_fields": ["Computer Science", "AI", "Machine Learning", "Mathematics"],
    },
    "Embedded Systems Engineer": {
        "core_skills": ["C", "C++", "Assembly", "RTOS", "FreeRTOS", "Bare Metal"],
        "frameworks": ["STM32", "Arduino", "ESP32", "UART", "SPI", "I2C", "CAN"],
        "tools": ["Keil", "IAR", "JTAG", "Oscilloscope", "Logic Analyzer", "Git"],
        "keywords": ["microcontroller", "firmware", "interrupt", "DMA", "peripherals", "real-time", "low-power"],
        "experience_required": 2,
        "education_bonus_fields": ["Electronics", "Electrical Engineering", "Computer Engineering"],
    },
    "BMS Engineer": {
        "core_skills": ["Battery Management", "SoC estimation", "Kalman Filter", "C", "C++", "MATLAB"],
        "frameworks": ["CAN protocol", "BMS algorithms", "Simulink", "LTC6804", "AFE"],
        "tools": ["CANalyzer", "MATLAB", "Simulink", "Oscilloscope"],
        "keywords": ["state of charge", "state of health", "cell balancing", "thermal management", "lithium-ion"],
        "experience_required": 2,
        "education_bonus_fields": ["Electrical Engineering", "Electronics", "Energy Systems"],
    },
    "Motor Control Engineer": {
        "core_skills": ["FOC", "BLDC", "PMSM", "DSP", "C", "C++", "MATLAB"],
        "frameworks": ["Space Vector PWM", "Field Oriented Control", "Simulink", "TI C2000"],
        "tools": ["MATLAB", "Simulink", "Oscilloscope", "Motor drives", "CANalyzer"],
        "keywords": ["torque control", "speed control", "Clarke transform", "Park transform", "inverter", "IGBT"],
        "experience_required": 2,
        "education_bonus_fields": ["Electrical Engineering", "Power Electronics"],
    },
    "Power Electronics Engineer": {
        "core_skills": ["MOSFET", "IGBT", "DC-DC converter", "inverter", "PCB design", "MATLAB"],
        "frameworks": ["LTSpice", "Altium", "PLECS", "Simulink"],
        "tools": ["Oscilloscope", "Power analyzer", "MATLAB", "Altium Designer"],
        "keywords": ["switching frequency", "duty cycle", "EMI", "thermal management", "efficiency", "bidirectional"],
        "experience_required": 2,
        "education_bonus_fields": ["Electrical Engineering", "Power Systems", "Electronics"],
    },
    # ── HR ───────────────────────────────────────────────────────────────
    "HR Specialist": {
        "core_skills": ["Recruitment", "Onboarding", "HRIS", "Employee Relations", "Compliance"],
        "frameworks": ["SAP HR", "Workday", "BambooHR", "Taleo", "Greenhouse"],
        "tools": ["Excel", "LinkedIn Recruiter", "ATS", "HRMS", "MS Office"],
        "keywords": ["talent acquisition", "performance management", "payroll", "L&D", "HR policies", "compliance"],
        "experience_required": 1,
        "education_bonus_fields": ["Human Resources", "Business Administration", "Psychology"],
    },
    "Talent Acquisition Specialist": {
        "core_skills": ["Sourcing", "Boolean Search", "Interviewing", "Offer Management", "ATS"],
        "frameworks": ["Greenhouse", "Lever", "Workday", "LinkedIn Recruiter"],
        "tools": ["LinkedIn", "Indeed", "Naukri", "Boolean search", "Excel"],
        "keywords": ["passive candidates", "employer branding", "talent pipeline", "time-to-fill", "quality of hire"],
        "experience_required": 1,
        "education_bonus_fields": ["Human Resources", "Business", "Psychology"],
    },
    "HR Manager": {
        "core_skills": ["HR Strategy", "Team Leadership", "Policy Development", "Compliance", "Budgeting"],
        "frameworks": ["SAP", "Workday", "Performance Management Systems"],
        "tools": ["HRMS", "Excel", "SuccessFactors", "MS Office"],
        "keywords": ["organizational development", "change management", "employee engagement", "succession planning", "labor law"],
        "experience_required": 5,
        "education_bonus_fields": ["Human Resources", "Business Administration", "Organizational Psychology"],
    },
    # ── IT ───────────────────────────────────────────────────────────────
    "Cybersecurity Analyst": {
        "core_skills": ["SIEM", "SOC", "Penetration Testing", "Incident Response", "Threat Hunting"],
        "frameworks": ["Splunk", "QRadar", "CrowdStrike", "Palo Alto", "Nessus"],
        "tools": ["Wireshark", "Nmap", "Metasploit", "OSINT tools", "Linux"],
        "keywords": ["vulnerability assessment", "zero trust", "MITRE ATT&CK", "forensics", "malware analysis", "SIEM"],
        "experience_required": 2,
        "education_bonus_fields": ["Cybersecurity", "Computer Science", "IT", "Network Engineering"],
    },
    "System Administrator": {
        "core_skills": ["Windows Server", "Linux", "Active Directory", "VMware", "Networking"],
        "frameworks": ["PowerShell", "Ansible", "Azure AD", "Group Policy"],
        "tools": ["Hyper-V", "VMware ESXi", "pfSense", "Nagios", "Zabbix"],
        "keywords": ["patch management", "user management", "DNS", "DHCP", "backup", "disaster recovery", "cloud"],
        "experience_required": 2,
        "education_bonus_fields": ["IT", "Computer Science", "Network Engineering"],
    },
    # ── Finance ──────────────────────────────────────────────────────────
    "Financial Analyst": {
        "core_skills": ["Financial Modeling", "Excel", "Valuation", "DCF", "SQL", "Python"],
        "frameworks": ["Bloomberg", "FactSet", "SAP", "Oracle Financials"],
        "tools": ["Excel", "PowerPoint", "Python", "R", "Tableau"],
        "keywords": ["WACC", "NPV", "IRR", "financial statements", "ratio analysis", "forecasting", "variance analysis"],
        "experience_required": 2,
        "education_bonus_fields": ["Finance", "Accounting", "Economics", "MBA"],
    },
    # ── Sales ─────────────────────────────────────────────────────────────
    "Sales Executive": {
        "core_skills": ["B2B Sales", "Lead Generation", "CRM", "Negotiation", "Prospecting"],
        "frameworks": ["Salesforce", "HubSpot", "BANT", "MEDDIC"],
        "tools": ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Outreach"],
        "keywords": ["pipeline", "quota", "revenue target", "deal closing", "customer success", "upselling"],
        "experience_required": 1,
        "education_bonus_fields": ["Business", "Marketing", "MBA", "Commerce"],
    },
    # ── Marketing ─────────────────────────────────────────────────────────
    "Marketing Specialist": {
        "core_skills": ["Digital Marketing", "SEO", "SEM", "Content Marketing", "Social Media", "Analytics"],
        "frameworks": ["Google Analytics", "HubSpot", "Mailchimp", "Meta Ads", "Google Ads"],
        "tools": ["Canva", "Figma", "Hootsuite", "Semrush", "Ahrefs"],
        "keywords": ["conversion rate", "ROI", "A/B testing", "brand awareness", "CTR", "email marketing"],
        "experience_required": 1,
        "education_bonus_fields": ["Marketing", "Communications", "Business", "MBA"],
    },
    # ── Customer Support ─────────────────────────────────────────────────
    "Customer Success Manager": {
        "core_skills": ["Client Management", "Onboarding", "CRM", "Upselling", "SLA Management"],
        "frameworks": ["Salesforce", "Zendesk", "Gainsight", "HubSpot", "ChurnZero"],
        "tools": ["Excel", "CRM tools", "Intercom", "Freshdesk"],
        "keywords": ["NPS", "churn reduction", "QBR", "health score", "retention", "expansion revenue", "product adoption"],
        "experience_required": 2,
        "education_bonus_fields": ["Business", "Communications", "Marketing"],
    },
    # ── Operations ───────────────────────────────────────────────────────
    "Operations Manager": {
        "core_skills": ["Process Improvement", "Six Sigma", "Supply Chain", "Team Leadership", "ERP"],
        "frameworks": ["Lean", "Six Sigma", "SCOR", "SAP", "Oracle ERP"],
        "tools": ["Excel", "Tableau", "SAP", "MS Project", "JIRA"],
        "keywords": ["KPI", "bottleneck", "throughput", "capacity planning", "cost reduction", "efficiency"],
        "experience_required": 5,
        "education_bonus_fields": ["Operations Management", "Business Administration", "Industrial Engineering", "MBA"],
    },
}


def _get_role_matrix(job_role: str) -> dict:
    """Get the skill matrix for a job role, with fuzzy matching fallback."""
    # Exact match
    if job_role in ROLE_SKILL_MATRIX:
        return ROLE_SKILL_MATRIX[job_role]
    # Fuzzy match
    role_lower = job_role.lower()
    for key, val in ROLE_SKILL_MATRIX.items():
        if key.lower() in role_lower or role_lower in key.lower():
            return val
    # Generic fallback matrix
    return {
        "core_skills": ["Communication", "Problem Solving", "Teamwork", "Leadership", "Analysis"],
        "frameworks": [],
        "tools": ["Microsoft Office", "Excel", "Git"],
        "keywords": ["collaboration", "project management", "attention to detail"],
        "experience_required": 2,
        "education_bonus_fields": ["Business", "Engineering", "Science"],
    }


def _local_score_resume(resume_text: str, job_role: str) -> dict:
    """
    6-Category local resume scoring engine.
    Scores range 0-100, weighted dynamically, never hardcoded.
    """
    if not resume_text or not resume_text.strip():
        return {
            "candidate_name": "",
            "extracted_skills": [],
            "missing_skills": [],
            "extracted_projects": [],
            "extracted_technologies": [],
            "experience_years": 0,
            "education": "No resume provided",
            "certifications": [],
            "career_progression": "N/A",
            "resume_score": 0,
            "skill_match_percentage": 0,
            "category_scores": {},
            "strengths": [],
            "red_flags": ["No resume provided"],
            "shortlist_recommendation": "REVIEW",
            "shortlist_reason": "No resume provided for evaluation.",
            "interview_focus_areas": ["General technical assessment", "Problem solving approach"],
            "resume_quality": "N/A",
        }

    text_lower = resume_text.lower()
    matrix = _get_role_matrix(job_role)

    # ── Category 1: Skills Match (30%) ─────────────────────────────────
    all_role_skills = (
        matrix.get("core_skills", []) +
        matrix.get("frameworks", []) +
        matrix.get("tools", [])
    )
    matched_skills = []
    missing_skills = []
    for skill in all_role_skills:
        if skill.lower() in text_lower:
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)

    skill_pct = len(matched_skills) / max(len(all_role_skills), 1)
    # Core skills carry 2x weight
    core_matched = sum(1 for s in matrix.get("core_skills", []) if s.lower() in text_lower)
    core_pct = core_matched / max(len(matrix.get("core_skills", [])), 1)
    skill_score = min(100, int((skill_pct * 0.5 + core_pct * 0.5) * 100))

    # ── Category 2: Experience Match (20%) ─────────────────────────────
    exp_years = 0
    exp_patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)',
        r'(?:experience|exp)\s*(?:of\s+)?(\d+)\+?\s*(?:years?|yrs?)',
    ]
    for pat in exp_patterns:
        matches = re.findall(pat, text_lower)
        if matches:
            try:
                exp_years = max(exp_years, max(int(m) for m in matches))
            except ValueError:
                pass

    required_exp = matrix.get("experience_required", 2)
    if exp_years >= required_exp * 1.5:
        exp_score = 95
    elif exp_years >= required_exp:
        exp_score = 80
    elif exp_years >= required_exp * 0.5:
        exp_score = 55
    elif exp_years > 0:
        exp_score = 35
    else:
        # No explicit years found — check for "fresher", "entry level" signals
        if any(w in text_lower for w in ['fresher', 'entry level', 'graduate', 'intern']):
            exp_score = 25 if required_exp <= 1 else 15
        else:
            exp_score = 40  # Unknown experience

    # ── Category 3: Education Match (10%) ──────────────────────────────
    edu_score = 50  # Default
    bonus_fields = matrix.get("education_bonus_fields", [])
    if any(f.lower() in text_lower for f in bonus_fields):
        edu_score = 85
    if any(d in text_lower for d in ['phd', 'doctorate', 'm.tech', 'mtech', 'ms ', 'msc ', 'mba']):
        edu_score = min(100, edu_score + 15)
    elif any(d in text_lower for d in ['b.tech', 'btech', 'b.e', 'b.sc', 'bsc', 'bachelor']):
        edu_score = min(100, edu_score + 5)

    # ── Category 4: Keyword Relevance (15%) ────────────────────────────
    keywords = matrix.get("keywords", [])
    matched_keywords = [k for k in keywords if k.lower() in text_lower]
    keyword_score = int((len(matched_keywords) / max(len(keywords), 1)) * 100)

    # ── Category 5: Project Quality (15%) ──────────────────────────────
    # Detect project section + complexity indicators
    project_indicators = [
        'developed', 'built', 'designed', 'implemented', 'architected',
        'led', 'managed', 'deployed', 'optimized', 'created', 'launched',
    ]
    complexity_indicators = ['million', 'billion', 'users', 'scale', 'enterprise', 'production', 'team']
    tech_depth_indicators = [
        'microservices', 'kubernetes', 'machine learning', 'real-time',
        'distributed', 'cloud', 'api', 'database', 'neural network', 'model'
    ]

    proj_count = sum(1 for w in project_indicators if w in text_lower)
    complexity_count = sum(1 for w in complexity_indicators if w in text_lower)
    tech_depth = sum(1 for w in tech_depth_indicators if w in text_lower)

    # Has project section?
    has_projects = any(h in text_lower for h in ['project', 'portfolio', 'github', 'gitlab'])
    project_score = 30  # Baseline
    if has_projects:
        project_score += 20
    project_score += min(25, proj_count * 5)
    project_score += min(15, complexity_count * 5)
    project_score += min(10, tech_depth * 2)
    project_score = min(100, project_score)

    # ── Category 6: Resume Quality (10%) ───────────────────────────────
    quality_score = 50  # Baseline
    # Has contact info
    if re.search(r'[\w.]+@[\w.]+\.\w+', text_lower):
        quality_score += 10
    # Has quantifiable achievements
    if re.search(r'\d+%|\d+x|\$\d+|\d+\s*(users?|customers?|clients?)', text_lower):
        quality_score += 15
    # Has proper sections
    sections = ['experience', 'education', 'skills', 'projects', 'summary', 'objective']
    quality_score += min(20, sum(5 for s in sections if s in text_lower))
    # Penalize very short resumes
    word_count = len(resume_text.split())
    if word_count < 100:
        quality_score -= 20
    elif word_count > 400:
        quality_score += 5
    quality_score = min(100, max(0, quality_score))

    # ── Final Weighted Score ────────────────────────────────────────────
    final_score = (
        skill_score     * 0.30 +
        exp_score       * 0.20 +
        edu_score       * 0.10 +
        keyword_score   * 0.15 +
        project_score   * 0.15 +
        quality_score   * 0.10
    )
    final_score = round(final_score)
    final_score = max(10, min(98, final_score))  # Clamp: 10–98

    # ── Recommendation Logic ────────────────────────────────────────────
    if final_score >= 75:
        recommendation = "SHORTLIST"
        reason = f"Strong match for {job_role}. Skills coverage {skill_score}%, relevant experience detected."
    elif final_score >= 55:
        recommendation = "REVIEW"
        reason = f"Partial match for {job_role}. Some key skills present but gaps exist."
    else:
        recommendation = "REJECT"
        reason = f"Weak match for {job_role}. Core skills and experience requirements not met."

    resume_quality = "Excellent" if quality_score >= 80 else "Good" if quality_score >= 60 else "Average" if quality_score >= 40 else "Poor"

    # Basic extraction for fallback
    edu_text = "Education details parsed locally."
    edu_match = re.search(r'(?i)\b(?:education|academic background|academics)\b\s*[\:\-]?\s*(.*?)(?=\b(?:experience|skills|projects|summary|objective|certifications)\b|$)', resume_text, re.DOTALL)
    if edu_match and len(edu_match.group(1).strip()) > 10:
        edu_text = edu_match.group(1).strip()[:200].replace('\n', ' ')

    proj_text = ["Projects parsed locally."]
    proj_match = re.search(r'(?i)\b(?:projects|portfolio|personal projects)\b\s*[\:\-]?\s*(.*?)(?=\b(?:experience|education|skills|summary|objective|certifications)\b|$)', resume_text, re.DOTALL)
    if proj_match and len(proj_match.group(1).strip()) > 10:
        proj_text = [proj_match.group(1).strip()[:300].replace('\n', ' ')]

    return {
        "candidate_name": "",
        "extracted_skills": matched_skills[:15] if matched_skills else ["General Skills"],
        "missing_skills": missing_skills[:10],
        "extracted_projects": proj_text,
        "extracted_technologies": matched_skills,
        "experience_years": exp_years,
        "education": edu_text,
        "certifications": [],
        "career_progression": "Analyzed by local engine",
        "resume_score": final_score,
        "skill_match_percentage": skill_score,
        "category_scores": {
            "skills_match": skill_score,
            "experience_match": exp_score,
            "education_match": edu_score,
            "keyword_relevance": keyword_score,
            "project_quality": project_score,
            "resume_quality_score": quality_score,
        },
        "strengths": (
            [f"Strong skills coverage: {', '.join(matched_skills[:3])}"] if matched_skills else []
        ) + (
            [f"{exp_years}+ years of relevant experience"] if exp_years > 0 else []
        ) + (
            [f"Resume quality: {resume_quality}"] if quality_score >= 60 else []
        ),
        "red_flags": (
            [f"Missing key skills: {', '.join(missing_skills[:3])}"] if len(missing_skills) > len(matched_skills) else []
        ) + (
            [f"Experience gap: {exp_years} years vs {required_exp} required"] if exp_years < required_exp * 0.5 else []
        ),
        "shortlist_recommendation": recommendation,
        "shortlist_reason": reason,
        "interview_focus_areas": (
            [f"Probe depth of {s} experience" for s in matched_skills[:2]] +
            [f"Assess understanding of {k}" for k in matched_keywords[:2]]
        ) or ["General technical assessment", "Problem solving approach"],
        "resume_quality": resume_quality,
    }


async def parse_and_score_resume(
    resume_text: str,
    job_role: str,
    required_skills: str = "",
    role_keywords: str = "",
    persona: str = ""
) -> dict:
    """
    Use AI Engine to parse resume text and score it against the job role.
    Returns structured candidate profile + a resume_score (0-100).
    Falls back to advanced local 6-category scorer if AI is unavailable.
    """
    if not resume_text or not resume_text.strip():
        return _local_score_resume("", job_role)

    # ── Get role-specific intelligence ───────────────────────────────────
    matrix = _get_role_matrix(job_role)
    role_core_skills = ", ".join(matrix.get("core_skills", []))
    role_frameworks = ", ".join(matrix.get("frameworks", []))
    role_keywords_str = ", ".join(matrix.get("keywords", []))

    prompt = f"""You are a senior technical recruiter and talent acquisition specialist with 15 years of experience at Fortune 500 companies.

Evaluate this resume for a "{job_role}" position with STRICT, REALISTIC scoring.

ROLE INTELLIGENCE:
- Core required skills: {role_core_skills}
- Expected frameworks/tools: {role_frameworks}
- Key domain keywords: {role_keywords_str}
{f'- Additional required skills: {required_skills}' if required_skills else ''}
{f'- Evaluation persona: {persona}' if persona else ''}

SCORING CRITERIA (be strict and vary scores realistically — do NOT default to 50):
1. Skills Match (30%): How well do extracted skills match the role requirements?
   - If less than 30% skill match → score below 40
   - If 50-70% match → score 50-70
   - If 80%+ match → score 75+
2. Experience Match (20%): Years of relevant experience vs required {matrix.get('experience_required', 2)} years
3. Education Match (10%): Degree relevance to role
4. Keyword Relevance (15%): Domain-specific terminology usage
5. Project Quality (15%): Complexity, impact, ownership of projects
6. Resume Quality (10%): Formatting, quantified achievements, structure

RESUME TEXT:
---
{resume_text[:6000]}
---

Return a JSON object with EXACTLY this structure:
{{
  "candidate_name": "extracted full name or empty string",
  "extracted_skills": ["list", "of", "detected", "technical", "skills"],
  "missing_skills": ["key skills required but NOT found in resume"],
  "extracted_projects": ["brief description of each notable project"],
  "extracted_technologies": ["all technologies, frameworks, tools mentioned"],
  "experience_years": <integer: estimated years of relevant experience>,
  "education": "highest degree and field",
  "certifications": ["list of certifications if any"],
  "career_progression": "brief assessment of career growth trajectory",
  "resume_score": <integer 0-100: MUST vary based on actual match quality, NOT default to 50>,
  "skill_match_percentage": <integer 0-100>,
  "category_scores": {{
    "skills_match": <0-100>,
    "experience_match": <0-100>,
    "education_match": <0-100>,
    "keyword_relevance": <0-100>,
    "project_quality": <0-100>,
    "resume_quality_score": <0-100>
  }},
  "strengths": ["top 3 specific resume strengths"],
  "red_flags": ["specific concerns or skill gaps"],
  "shortlist_recommendation": "SHORTLIST" | "REVIEW" | "REJECT",
  "shortlist_reason": "specific explanation with score breakdown",
  "interview_focus_areas": ["specific topics to probe based on this resume and role"],
  "resume_quality": "Excellent" | "Good" | "Average" | "Poor"
}}

CRITICAL RULES:
- resume_score MUST be below 40 if fewer than 30% of core skills match
- resume_score MUST be below 55 if experience is significantly below requirements
- Only give 80+ for genuinely strong, highly relevant candidates
- Be strict and realistic. This will be used for real hiring decisions."""

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,  # Fixed: was GEMINI_MODEL undefined, now correctly defined
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,  # Low temp for consistent, factual scoring
                max_output_tokens=2048,
            ),
        )

        result = _extract_json(response.text or "")
        if result and "resume_score" in result:
            # Validate score is not suspiciously uniform
            score = result.get("resume_score", 50)
            if not (0 <= score <= 100):
                result["resume_score"] = max(10, min(98, score))
            logger.info(
                f"Resume AI scored: {score}/100 | "
                f"Role: {job_role} | "
                f"Recommendation: {result.get('shortlist_recommendation')} | "
                f"Skills matched: {result.get('skill_match_percentage')}%"
            )
            return result
        else:
            logger.error("AI Engine response missing resume_score or invalid JSON. Using local scorer.")

    except Exception as e:
        logger.error(f"Resume AI parsing failed: {e}. Using advanced local scorer.")

    # ── Fallback: Advanced local 6-category scorer ────────────────────────
    return _local_score_resume(resume_text, job_role)


def score_to_status(score: int) -> str:
    """Convert numeric resume score to a candidate status label."""
    if score >= 78:
        return "SHORTLISTED"
    elif score >= 55:
        return "UNDER_REVIEW"
    else:
        return "REJECTED"
