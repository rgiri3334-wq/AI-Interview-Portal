/**
 * useIntegrityEngine.js — Sprint 3 (Client-Side)
 *
 * JavaScript mirror of services/integrity_engine.py.
 * Runs entirely in the browser during the live interview.
 *
 * Usage:
 *   const { recordSignal, computeFinal, integrityScore } = useIntegrityEngine();
 *
 *   // When a proctoring warning fires:
 *   recordSignal('tab_switch');
 *
 *   // At interview end, get the full report for the API:
 *   const integrityReport = computeFinal();
 */
import { useRef, useState, useCallback } from 'react';

// ── Signal weights (mirror of Python SIGNAL_WEIGHTS) ──────────────────────
const SIGNAL_WEIGHTS = {
  tab_switch_1st:          0,
  tab_switch_2nd:          8,
  tab_switch_3rd_plus:    15,
  devtools_detected:      12,
  gpt_syntax_confirmed:   20,
  gpt_syntax_suspected:    0,
  resume_challenge_fail_1: 0,
  resume_challenge_fail_2: 18,
  zero_filler_words:       5,
  perfect_structure_every: 8,
  abnormally_fast_wpm:    10,
  gpt_challenge_cleared:   0,
  resume_challenge_cleared:0,
};

// ── GPT Syntax Patterns (mirror of Python GPT_SYNTAX_PATTERNS) ────────────
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
  const scoreRef = useRef(100);
  const signalsRef = useRef([]);
  const tabSwitchCountRef = useRef(0);
  const gptSuspectedCountRef = useRef(0);
  const resumeFailStreakRef = useRef({});

  // Expose reactive score for UI display
  const [integrityScore, setIntegrityScore] = useState(100);

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

    const deduction = SIGNAL_WEIGHTS[actualKey] ?? 0;
    scoreRef.current = Math.max(0, scoreRef.current - deduction);
    setIntegrityScore(scoreRef.current);

    const entry = {
      signal: actualKey,
      deduction,
      score_after: scoreRef.current,
      note,
      timestamp: ts,
      metadata,
    };
    signalsRef.current.push(entry);

    console.debug(
      `[Integrity] ${actualKey} | -${deduction}pts | Score: ${scoreRef.current}`,
      metadata
    );
    return { deducted: deduction, new_score: scoreRef.current, note };
  }, []);

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

  // ── Confirm GPT challenge result ────────────────────────────────────────
  const confirmGptChallenge = useCallback((passed, score) => {
    if (passed || score >= 5) {
      recordSignal('gpt_challenge_cleared', {
        note: 'Challenge passed. GPT suspicion cleared.',
      });
    } else {
      recordSignal('gpt_syntax_confirmed', {
        note: `Challenge failed (score ${score}/10). GPT use confirmed.`,
      });
    }
  }, [recordSignal]);

  // ── Record resume challenge result ──────────────────────────────────────
  const recordResumeChallenge = useCallback((skillClaim, passed, score) => {
    const streaks = resumeFailStreakRef.current;
    if (!streaks[skillClaim]) streaks[skillClaim] = 0;

    if (passed || score >= 5) {
      streaks[skillClaim] = 0;
      recordSignal('resume_challenge_cleared', {
        note: `Resume claim verified: '${skillClaim.slice(0, 50)}'`,
      });
    } else {
      streaks[skillClaim] += 1;
      const streak = streaks[skillClaim];
      if (streak === 1) {
        recordSignal('resume_challenge_fail_1', {
          note: `First failure on '${skillClaim.slice(0, 50)}'. Grace period.`,
        });
      } else {
        recordSignal('resume_challenge_fail_2', {
          note: `Second consecutive failure on '${skillClaim.slice(0, 50)}'.`,
        });
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
      recordSignal('abnormally_fast_wpm', {
        note: `Average WPM ${avgWpm.toFixed(0)} (>280) — possible script reading.`,
      });
    }
    if (totalFillerWords === 0 && totalAnswers >= 5) {
      recordSignal('zero_filler_words', {
        note: 'Zero filler words detected across all answers.',
      });
    }
    if (totalAnswers >= 4 && roboticStructureCount >= totalAnswers * 0.85) {
      recordSignal('perfect_structure_every', {
        note: `${roboticStructureCount}/${totalAnswers} answers robotically structured.`,
      });
    }
  }, [recordSignal]);

  // ── Compute final verdict ───────────────────────────────────────────────
  const computeFinal = useCallback(() => {
    const score = Math.max(0, Math.min(100, scoreRef.current));

    let verdict, verdict_label, verdict_color, recommendation;
    if (score >= 90) {
      verdict = 'CLEAN'; verdict_label = '✅ Clean'; verdict_color = 'green';
      recommendation = 'No integrity concerns. Proceed to next round.';
    } else if (score >= 70) {
      verdict = 'BORDERLINE'; verdict_label = '🟡 Borderline'; verdict_color = 'yellow';
      recommendation = 'Minor flags detected. Human review recommended.';
    } else if (score >= 50) {
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
      integrity_score: score,
      integrity_verdict: verdict,
      integrity_verdict_label: verdict_label,
      integrity_verdict_color: verdict_color,
      integrity_recommendation: recommendation,
      signal_count: significant.length,
      signal_log: signalsRef.current,
      significant_signals: significant,
      total_tab_switches: tabSwitchCountRef.current,
      gpt_suspected_count: gptSuspectedCountRef.current,
      computed_at: new Date().toISOString(),
      human_override: null,
      human_override_by: null,
      human_override_note: null,
    };
  }, []);

  return {
    integrityScore,        // Live reactive score for UI badge
    recordSignal,          // Record any event
    checkGptSyntax,        // Returns { challenge_required, matched_patterns }
    confirmGptChallenge,   // Call after challenge answer scored
    recordResumeChallenge, // Track resume claim verifications
    checkBehavioral,       // Call at end of interview with aggregate stats
    computeFinal,          // Returns full integrity report dict for API
  };
}
