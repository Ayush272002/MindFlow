"""Question Agent Implementation"""

from typing import Any
from ..agent_types import QuestionAgentInput, QuestionAgentOutput
from ..agent_instructions import QUESTION_AGENT_INSTRUCTIONS

def handle_question(
    model: Any,
    input_data: QuestionAgentInput,
    call_agent: callable
) -> QuestionAgentOutput:
    """Handle question generation."""
    
    result = call_agent(
        QUESTION_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return QuestionAgentOutput(
        question=result.get('question', 'What do you know about this topic?'),
        type=result.get('type', 'MCQ'),
        options=result.get('options', []),
        correct_answer=result.get('correct_answer', '')
    ) 