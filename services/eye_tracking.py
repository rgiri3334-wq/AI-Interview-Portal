"""
services/eye_tracking.py
Computes eye-tracking score from frontend proctoring signals.

The raw gaze detection runs in the browser via MediaPipe FaceLandmarker
(hooks/useHumanBehavior.js). This module converts the signal counts
into a 0-100 score for the final report.

Author: Aditya Singh
"""
import logging

logger = logging.getLogger("EyeTracking")


def compute_eye_contact_score(
    look_away_count: int = 0,
    off_screen_signals: int = 0,
    continuous_off_screen_signals: int = 0,
    interview_duration_seconds: int = 600,
) -> float:
    """
    Calculate eye contact score (0-100) from frontend proctoring signals.

    Args:
        look_away_count: Number of times candidate looked away (from metricsRef)
        off_screen_signals: Number of 'off_screen_gaze' integrity signals fired
        continuous_off_screen_signals: Number of 'continuous_off_screen' signals
        interview_duration_seconds: Total interview duration for normalization

    Returns:
        Eye contact score from 0.0 to 100.0
    """
    base_score = 100.0

    # Mild penalty per look-away (natural to look away sometimes)
    base_score -= min(look_away_count * 2.0, 30.0)

    # Moderate penalty for off-screen gaze signals (fired by integrity engine)
    base_score -= min(off_screen_signals * 5.0, 25.0)

    # Heavy penalty for sustained off-screen (strong cheating signal)
    base_score -= min(continuous_off_screen_signals * 10.0, 30.0)

    return round(max(0.0, min(100.0, base_score)), 1)


def process_eye_contact(frame_data: bytes) -> float:
    """
    Legacy placeholder — retained for API compatibility.
    In the current architecture, eye tracking runs in the browser
    via MediaPipe FaceLandmarker (hooks/useHumanBehavior.js).
    Use compute_eye_contact_score() instead.
    """
    return 85.0
