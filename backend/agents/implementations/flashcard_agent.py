"""Flashcard Agent Implementation"""

from typing import Any
from ..agent_types import FlashcardAgentInput, FlashcardAgentOutput
from ..agent_instructions import FLASHCARD_AGENT_INSTRUCTIONS

def handle_flashcard(
    model: Any,
    input_data: FlashcardAgentInput,
    call_agent: callable
) -> FlashcardAgentOutput:
    """Handle flashcard generation."""
    
    result = call_agent(
        FLASHCARD_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return FlashcardAgentOutput(
        csv_content=result.get('csv_content', 'question,answer\nWhat is this topic about?,Basic introduction')
    ) 