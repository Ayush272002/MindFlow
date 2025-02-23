"""Deep Dive Agent Implementation"""

from typing import Any
from ..agent_types import DeepDiveAgentInput, DeepDiveAgentOutput
from ..agent_instructions import DEEP_DIVE_AGENT_INSTRUCTIONS

def handle_deep_dive(
    model: Any,
    input_data: DeepDiveAgentInput,
    call_agent: callable
) -> DeepDiveAgentOutput:
    """Handle deep dive into concepts."""
    
    result = call_agent(
        DEEP_DIVE_AGENT_INSTRUCTIONS,
        input_data
    )
    
    return DeepDiveAgentOutput(
        breakdown=result.get('breakdown', 'Let me explain this concept in detail.'),
        mermaid_diagram=result.get('mermaid_diagram', ''),
        analogy=result.get('analogy', ''),
        code_example=result.get('code_example')
    ) 