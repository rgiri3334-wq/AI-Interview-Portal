"""
services/conversation_manager.py
Orchestrates the Live AI Interviewer personality, interruptions, and turn-taking.
Author: Aditya Singh
"""
import logging

logger = logging.getLogger("ConversationManager")

class ConversationManager:
    """Manages the dialogue flow and AI state machine."""
    
    def __init__(self):
        pass

    def determine_interruption(self, partial_transcript: str) -> bool:
        """Analyze live transcript to decide if the AI should interject."""
        # If candidate goes off-topic for 30s, trigger interruption.
        return False
