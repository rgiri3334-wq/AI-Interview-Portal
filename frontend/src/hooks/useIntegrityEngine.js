/**
 * useIntegrityEngine.js — Phase 1 Upgrade
 *
 * Implements the 35/25/20/15/5 Integrity Triage Matrix.
 * 
 * Usage:
 *   const { recordSignal, computeFinal, integrityScore } = useIntegrityEngine();
 */
import { useRef, useState, useCallback } from 'react';

// ── Signal weights grouped by Matrix Category ──────────────────────
const SIGNAL_WEIGHTS = {
  // Environment (5%)
  tab_switch_1st:          { cat: 'env', val: 0 },
  tab_switch_2nd:          { cat: 'env', val: 50 },
  tab_switch_3rd_plus:     { cat: 'env', val: 100 },
  devtools_detected:       { cat: 'env', val: 100 },
  
  // Authenticity (15%)
  gpt_syntax_confirmed:    { cat: 'auth', val: 50 },
  gpt_syntax_suspected:    { cat: 'auth', val: 0 },
  resume_challenge_fail_1: { cat: 'auth', val: 0 },
  resume_challenge_fail_2: { cat: 'auth', val: 40 },
  zero_filler_words:       { cat: 'auth', val: 20 },
  perfect_structure_every: { cat: 'auth', val: 30 },
  abnormally_fast_wpm:     { cat: 'auth', val: 30 },
  vocabulary_shift:        { cat: 'auth', val: 25 },
  gpt_challenge_cleared:   { cat: 'auth', val: 0 },
  resume_challenge_cleared:{ cat: 'auth', val: 0 },
  
  // Posture (35%)
  posture_warning:         { cat: 'posture', val: 15 },
  posture_critical:        { cat: 'posture', val: 40 },
  
  // Movement (25%)
  movement_warning:        { cat: 'movement', val: 15 },
  seat_abandonment:        { cat: 'movement', val: 60 },
  multiple_people:         { cat: 'movement', val: 100 },
  
  // Eye Tracking (20%)
  off_screen_gaze:         { cat: 'eye', val: 15 },
  continuous_off_screen:   { cat: 'eye', val: 50 },
};

// ── GPT Syntax Patterns ────────────
const GPT_PATTERNS = [
  /\bCertainly[,!]?\b/i,
  /\bAbsolutely[,!]?\b/i,
  /\bGreat question\b/i,
  /\bOf course[,!]?\b/i,
  /\bSure[,!]? here('s| is)\b/i,
  /\bFirstly\b.{0,80}Secondly\b/i,
  /\bIn conclusion\b/i,
  /\bTo summarize\b/i,
  /\bIn summary\b/i,
  /\bIt is worth noting that\b/i,
  /\bIt is important to note that\b/i,
  /\bFurthermore\b.{0,80}Moreover\b/i,
  /\bThere are (three|four|five|several|multiple) (types|ways|approaches|key|main)\b/i,
];

export function useIntegrityEngine() {
  const scoresRef = useRef({
    posture: 100.0,
    movement: 100.0,
    eye: 100.0,
    auth: 100.0,
    env: 100.0,
  });

  const signalsRef = useRef([]);
  const tabSwitchCountRef = useRef(0);
  const gptSuspectedCountRef = useRef(0);
  const resumeFailStreakRef = useRef({});

  const [integrityScore, setIntegrityScore] = useState(100);

  const calculateTotalScore = useCallback(() => {
    const s = scoresRef.current;
    // 35/25/20/15/5 matrix
    const total = 
      (s.posture * 0.35) + 
      (s.movement * 0.25) + 
      (s.eye * 0.20) + 
      (s.auth * 0.15) + 
      (s.env * 0.05);
    return Math.max(0, Math.min(100, Math.round(total)));
  }, []);

  // ── Record a signal ─────────────────────────────────────────────────────
  const recordSignal = useCallback((signalKey, metadata = {}) => {
    const ts = new Date().toISOString();
    let actualKey = signalKey;
    let note = metadata.note || `Signal: ${signalKey}`;

    // Special logic for tab_switch
    if (signalKey === 'tab_switch') {
      tabSwitchCountRef.current += 1;
      const n = tabSwitchCountRef.current;
      if (n === 1) {
        actualKey = 'tab_switch_1st';
        note = 'First tab switch (grace period). No deduction.';
      } else if (n === 2) {
        actualKey = 'tab_switch_2nd';
        note = 'Second tab switch detected.';
      } else {
        actualKey = 'tab_switch_3rd_plus';
        note = `Tab switch #${n} detected.`;
      }
    }

    const weightInfo = SIGNAL_WEIGHTS[actualKey];
    const deduction = weightInfo ? weightInfo.val : 0;
    const cat = weightInfo ? weightInfo.cat : null;

    if (cat && deduction > 0) {
      scoresRef.current[cat] = Math.max(0, scoresRef.current[cat] - deduction);
    }

    const newTotal = calculateTotalScore();
    setIntegrityScore(newTotal);

    const entry = {
      signal: actualKey,
      category: cat || 'unknown',
      deduction,
      score_after: newTotal,
      note,
      timestamp: ts,
      metadata,
    };
    signalsRef.current.push(entry);

    if (deduction > 0) {
      console.warn(
        `[Integrity] ${actualKey} (-${deduction} to ${cat}) | New Total: ${newTotal}`
      );
    }
    return { deducted: deduction, new_score: newTotal, note };
  }, [calculateTotalScore]);

  // ── GPT syntax check ────────────────────────────────────────────────────
  const checkGptSyntax = useCallback((transcript, questionNumber) => {
    if (!transcript || transcript.trim().length < 30) {
      return { challenge_required: false, matched_patterns: [] };
    }
    const matched = GPT_PATTERNS
      .filter((p) => p.test(transcript))
      .map((p) => p.toString().replace(/\/i$/, '').slice(1));

    if (matched.length === 0) {
      return { challenge_required: false, matched_patterns: [] };
    }

    gptSuspectedCountRef.current += 1;
    recordSignal('gpt_syntax_suspected', {
      note: `GPT patterns detected. Challenge fired. Q#${questionNumber}.`,
      patterns: matched,
    });

    return {
      challenge_required: true,
      matched_patterns: matched,
      challenge_prompt:
        'That was interesting — could you walk me through a real example '
        + 'of when you personally applied this? Describe the exact problem '
        + 'and the specific steps you took.',
    };
  }, [recordSignal]);

  const confirmGptChallenge = useCallback((passed, score) => {
    if (passed || score >= 5) {
      recordSignal('gpt_challenge_cleared', { note: 'Challenge passed. GPT suspicion cleared.' });
    } else {
      recordSignal('gpt_syntax_confirmed', { note: `Challenge failed (score ${score}/10). GPT use confirmed.` });
    }
  }, [recordSignal]);

  const recordResumeChallenge = useCallback((skillClaim, passed, score) => {
    const streaks = resumeFailStreakRef.current;
    if (!streaks[skillClaim]) streaks[skillClaim] = 0;

    if (passed || score >= 5) {
      streaks[skillClaim] = 0;
      recordSignal('resume_challenge_cleared', { note: `Resume claim verified: '${skillClaim.slice(0, 50)}'` });
    } else {
      streaks[skillClaim] += 1;
      const streak = streaks[skillClaim];
      if (streak === 1) {
        recordSignal('resume_challenge_fail_1', { note: `First failure on '${skillClaim.slice(0, 50)}'. Grace period.` });
      } else {
        recordSignal('resume_challenge_fail_2', { note: `Second consecutive failure on '${skillClaim.slice(0, 50)}'.` });
      }
    }
  }, [recordSignal]);

  // ── Behavioral checks (called at interview end) ─────────────────────────
  const checkBehavioral = useCallback(({
    avgWpm = 0,
    totalFillerWords = 0,
    roboticStructureCount = 0,
    totalAnswers = 0,
  }) => {
    if (totalAnswers < 3) return;
    
    if (avgWpm > 280) {
      recordSignal('abnormally_fast_wpm', { note: `Average WPM ${avgWpm.toFixed(0)} (>280) — possible script reading.` });
    } else if (avgWpm > 220 && roboticStructureCount >= totalAnswers * 0.7) {
      recordSignal('vocabulary_shift', { note: `High WPM + robotic structure implies pre-written text reading.` });
    }

    if (totalFillerWords === 0 && totalAnswers >= 5) {
      recordSignal('zero_filler_words', { note: 'Zero filler words detected across all answers.' });
    }
    if (totalAnswers >= 4 && roboticStructureCount >= totalAnswers * 0.85) {
      recordSignal('perfect_structure_every', { note: `${roboticStructureCount}/${totalAnswers} answers robotically structured.` });
    }
  }, [recordSignal]);

  // ── Compute final verdict ───────────────────────────────────────────────
  const computeFinal = useCallback(() => {
    const finalTotal = calculateTotalScore();

    let verdict, verdict_label, verdict_color, recommendation;
    if (finalTotal >= 90) {
      verdict = 'CLEAN'; verdict_label = '✅ Clean'; verdict_color = 'green';
      recommendation = 'No integrity concerns. Proceed to next round.';
    } else if (finalTotal >= 70) {
      verdict = 'BORDERLINE'; verdict_label = '🟡 Borderline'; verdict_color = 'yellow';
      recommendation = 'Minor flags detected. Human review recommended.';
    } else if (finalTotal >= 50) {
      verdict = 'FLAGGED'; verdict_label = '🟠 Flagged'; verdict_color = 'orange';
      recommendation = 'Multiple integrity signals. Human review REQUIRED before advancing.';
    } else {
      verdict = 'HIGH_RISK'; verdict_label = '🔴 High Risk'; verdict_color = 'red';
      recommendation = 'Strong evidence of dishonesty. Recruiter must review all signals.';
    }

    const significant = signalsRef.current.filter(
      (s) => s.deduction > 0 && !s.signal.endsWith('_cleared')
    );

    return {
      integrity_score: finalTotal,
      posture_score: scoresRef.current.posture,
      movement_score: scoresRef.current.movement,
      eye_tracking_score: scoresRef.current.eye,
      authenticity_score: scoresRef.current.auth,
      environment_score: scoresRef.current.env,
      integrity_verdict: verdict,
      integrity_verdict_label: verdict_label,
      integrity_verdict_color: verdict_color,
      integrity_recommendation: recommendation,
      signal_count: significant.length,
      signal_log: signalsRef.current,
      significant_signals: significant,
      computed_at: new Date().toISOString(),
    };
  }, [calculateTotalScore]);

  return {
    integrityScore,        
    recordSignal,          
    checkGptSyntax,        
    confirmGptChallenge,   
    recordResumeChallenge, 
    checkBehavioral,       
    computeFinal,          
  };
}
