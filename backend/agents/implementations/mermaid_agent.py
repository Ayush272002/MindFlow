"""Mermaid Agent Implementation"""

from typing import Any
from ..agent_types import MermaidAgentInput, MermaidAgentOutput
from ..agent_instructions import MERMAID_AGENT_INSTRUCTIONS

def handle_mermaid(
    model: Any,
    input_data: MermaidAgentInput,
    call_agent: callable
) -> MermaidAgentOutput:
    """Handle Mermaid diagram generation."""
    
    result = call_agent(
        MERMAID_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return MermaidAgentOutput(
        mermaid_code=result.get('mermaid_code', 'graph TD\nA[Topic] --> B[Subtopic]')
    ) 