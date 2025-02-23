"""Config Agent Implementation"""

from typing import Any
from ..agent_types import ConfigAgentInput, ConfigAgentOutput
from ..agent_instructions import CONFIG_AGENT_INSTRUCTIONS

def handle_config(
    model: Any,
    input_data: ConfigAgentInput,
    call_agent: callable
) -> ConfigAgentOutput:
    """Handle configuration requests."""
    
    result = call_agent(
        CONFIG_AGENT_INSTRUCTIONS,
        input_data
    )
    
    # Ensure the response matches expected format
    return ConfigAgentOutput(
        prompt_addition=result.get('prompt_addition', 'Configuration updated successfully.')
    ) 