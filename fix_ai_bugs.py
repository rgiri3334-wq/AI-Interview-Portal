import re

# 1. Patch prompt_engine.py
path_pe = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\services\prompt_engine.py'
with open(path_pe, 'r', encoding='utf-8') as f:
    pe_content = f.read()

# Add strict check for nonsense
nonsense_rule = """
CRITICAL RULE 2: If the candidate gives a BAD, WRONG, NONSENSE, or "I don't know" answer, you MUST give a low `technical_score` (0-4) and you MUST NOT validate it. You MUST challenge them politely but firmly in `eq_feedback`.
"""
strict_nonsense_rule = """
CRITICAL RULE 2: If the candidate gives a BAD, WRONG, NONSENSE, gibberish, single words, or "I don't know" answer, you MUST set `action` to "repeat", `technical_score` to 0, and you MUST NOT validate it. You MUST challenge them politely but firmly in `eq_feedback` to provide a real answer.
"""
pe_content = pe_content.replace(nonsense_rule, strict_nonsense_rule)

with open(path_pe, 'w', encoding='utf-8') as f:
    f.write(pe_content)

# 2. Patch gemini_service.py
path_gs = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\services\gemini_service.py'
with open(path_gs, 'r', encoding='utf-8') as f:
    gs_content = f.read()

# Fix admin question logic (remove 2 <= index <= 7 constraint)
admin_logic_old = """    # Questions 3-8 (index 2-7): Admin Hardcoded Questions (5-6 questions)
    # Questions 9-10 (index 8, 9): AI EQ & Personality Test
    admin_next_q = None
    if 2 <= session.question_index <= 7:
        admin_next_q = potential_admin_q

    if admin_next_q:"""
    
admin_logic_new = """    # Questions 9-10 (index 8, 9): AI EQ & Personality Test
    admin_next_q = potential_admin_q if potential_admin_q else None

    if admin_next_q:"""
gs_content = gs_content.replace(admin_logic_old, admin_logic_new)

# Fix AI stuck after greeting loop
greet_trap_old = 'if len(session.conversation_history) <= 1 and next_q and "welcome to Sterling" in next_q:'
greet_trap_new = 'if len(session.conversation_history) <= 1 and next_q and ("welcome to" in next_q.lower() or "greeting" in next_q.lower()):'
gs_content = gs_content.replace(greet_trap_old, greet_trap_new)

# Fix Scoring Inflation
score_calc_old = """    # Compute advanced multidimensional scores
    fluency_score = calculate_speech_fluency(wpm, len(filler_words), len(answer.split()))
    llm_confidence = result.get("confidence_score", 60)
    final_confidence = compute_overall_confidence(fluency_score, emotion, llm_confidence)
    
    # In a real system, behavioral/facial come from dedicated CV pipelines; we simulate based on emotion
    facial_score = {"Confident": 90, "Focused": 85, "Neutral": 70, "Happy": 85, "Nervous": 40}.get(emotion, 60)
    behavioral_score = result.get("communication_score", 60) * 0.8 + final_confidence * 0.2

    metrics = {
        "technical_score": result["technical_score"] * 10, # Convert 0-10 to 0-100
        "communication_score": result.get("communication_score", 60),
        "confidence_score": final_confidence,
        "behavioral_score": behavioral_score,"""

score_calc_new = """    # Compute advanced multidimensional scores
    fluency_score = calculate_speech_fluency(wpm, len(filler_words), len(answer.split()))
    
    # Fix C-03: Tank scores on bad answers/skips
    if action == "skip" or action == "repeat" or result["technical_score"] < 3:
        result["confidence_score"] = 20
        result["communication_score"] = 20

    llm_confidence = result.get("confidence_score", 60)
    final_confidence = compute_overall_confidence(fluency_score, emotion, llm_confidence)
    
    # In a real system, behavioral/facial come from dedicated CV pipelines; we simulate based on emotion
    facial_score = {"Confident": 90, "Focused": 85, "Neutral": 70, "Happy": 85, "Nervous": 40}.get(emotion, 60)
    behavioral_score = result.get("communication_score", 60) * 0.8 + final_confidence * 0.2

    metrics = {
        "technical_score": result["technical_score"] * 10, # Convert 0-10 to 0-100
        "communication_score": result.get("communication_score", 60),
        "confidence_score": final_confidence,
        "behavioral_score": behavioral_score,"""

gs_content = gs_content.replace(score_calc_old, score_calc_new)

# Fix AI Duplication of questions
# Need to fuzzy match / prevent exact string matches
dupe_old = """    # Track asked question immediately to prevent repeats in edge cases
    if result["question"] not in session.asked_questions:
        session.asked_questions.append(result["question"])
    return result"""

dupe_new = """    # Track asked question immediately to prevent repeats in edge cases
    q_str = result["question"].lower()
    is_dupe = any(q_str in asked.lower() or asked.lower() in q_str for asked in session.asked_questions)
    if not is_dupe:
        session.asked_questions.append(result["question"])
    return result"""

gs_content = gs_content.replace(dupe_old, dupe_new)

with open(path_gs, 'w', encoding='utf-8') as f:
    f.write(gs_content)

print("Backend AI bugs patched.")
