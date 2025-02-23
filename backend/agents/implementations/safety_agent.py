"""Safety Agent Implementation"""

from typing import Any
from ..agent_types import SafetyAgentInput, SafetyAgentOutput, SafetyStatus
from ..agent_instructions import SAFETY_AGENT_INSTRUCTIONS

def handle_safety(
    model: Any,
    input_data: SafetyAgentInput,
    call_agent: callable
) -> SafetyAgentOutput:
    """Handle safety checks on user input."""
    
    result = call_agent(
        SAFETY_AGENT_INSTRUCTIONS,
        input_data
    )

    try:
        status = SafetyStatus(result.get('status', 'SAFE').upper())
    except ValueError:
        status = SafetyStatus.SAFE

    return SafetyAgentOutput(
        status=status,
        explanation=result.get('explanation', 'Content appears to be safe and appropriate.')
    ) 