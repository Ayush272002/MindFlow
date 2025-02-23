"""Answer Evaluation Agent Implementation"""

from typing import Any
from ..agent_types import AnswerEvalAgentInput, AnswerEvalAgentOutput
from ..agent_instructions import ANSWER_EVAL_AGENT_INSTRUCTIONS

def handle_answer_eval(
    model: Any,
    input_data: AnswerEvalAgentInput,
    call_agent: callable
) -> AnswerEvalAgentOutput:
    """Handle answer evaluation."""
    
    result = call_agent(
        ANSWER_EVAL_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return AnswerEvalAgentOutput(
        is_correct=result.get('is_correct', False),
        feedback=result.get('feedback', 'Let me help you understand this better.')
    ) 