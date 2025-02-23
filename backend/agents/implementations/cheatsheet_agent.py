"""Cheatsheet Agent Implementation"""

from typing import Any
from ..agent_types import CheatsheetAgentInput, CheatsheetAgentOutput
from ..agent_instructions import CHEATSHEET_AGENT_INSTRUCTIONS

def handle_cheatsheet(
    model: Any,
    input_data: CheatsheetAgentInput,
    call_agent: callable
) -> CheatsheetAgentOutput:
    """Handle cheatsheet generation."""
    
    result = call_agent(
        CHEATSHEET_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return CheatsheetAgentOutput(
        content=result.get('content', 'Quick Reference Guide:\n- Key points will be listed here')
    ) 