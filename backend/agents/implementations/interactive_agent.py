"""Interactive Agent Implementation"""

from typing import Any
from ..agent_types import InteractiveAgentInput, InteractiveAgentOutput
from ..agent_instructions import INTERACTIVE_AGENT_INSTRUCTIONS

def handle_interactive(
    model: Any,
    input_data: InteractiveAgentInput,
    call_agent: callable
) -> InteractiveAgentOutput:
    """Handle interactive dialogue with the user."""
    
    result = call_agent(
        INTERACTIVE_AGENT_INSTRUCTIONS,
        input_data
    )

    return InteractiveAgentOutput(
        response=result.get('response', 'I understand. Let me help you with that.')
    ) 