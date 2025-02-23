"""Agent Classifier Implementation"""

from typing import Any
from ..agent_types import AgentClassifierInput, AgentClassifierOutput
from ..agent_instructions import AGENT_CLASSIFIER_INSTRUCTIONS

def handle_classification(
    model: Any,
    input_data: AgentClassifierInput,
    call_agent: callable
) -> AgentClassifierOutput:
    """Handle agent classification for user input."""
    
    result = call_agent(
        AGENT_CLASSIFIER_INSTRUCTIONS,
        input_data
    )
    
    # Get the next agent, defaulting to interactive if not found
    next_agent = result.get('next_agent', 'interactive')
    
    # Validate the agent name against available agents
    available_agents = [agent['name'] for agent in input_data.available_agents]
    if next_agent not in available_agents:
        next_agent = 'interactive'
    
    # Ensure the response matches expected format
    return AgentClassifierOutput(
        next_agent=next_agent
    ) 