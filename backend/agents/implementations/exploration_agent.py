"""Exploration Agent Implementation"""

from typing import Any, Dict
from ..agent_types import ExplorationAgentInput, ExplorationAgentOutput, SafetyStatus
from ..agent_instructions import EXPLORATION_AGENT_INSTRUCTIONS

def handle_exploration(
    model: Any,
    input_data: ExplorationAgentInput,
    call_agent: callable
) -> ExplorationAgentOutput:
    """Handle exploration of new topics."""
    
    result = call_agent(
        EXPLORATION_AGENT_INSTRUCTIONS,
        input_data
    )

    return ExplorationAgentOutput(
        status=SafetyStatus.SAFE,
        explanation=result.get('explanation', 'Let me help you explore this topic.'),
        subtopics=result.get('subtopics', []),
        prerequisites=result.get('prerequisites', []),
        summary=result.get('summary', '')
    ) 