"""Summary Consolidation Agent Implementation"""

from typing import Any
from ..agent_types import SummaryConsolidationAgentInput, SummaryConsolidationAgentOutput
from ..agent_instructions import SUMMARY_CONSOLIDATION_AGENT_INSTRUCTIONS

def handle_summary(
    model: Any,
    input_data: SummaryConsolidationAgentInput,
    call_agent: callable
) -> SummaryConsolidationAgentOutput:
    """Handle session summary generation."""
    
    result = call_agent(
        SUMMARY_CONSOLIDATION_AGENT_INSTRUCTIONS,
        input_data
    )

    return SummaryConsolidationAgentOutput(
        summary=result.get('summary', 'Session summary will be provided here.'),
        key_points=result.get('key_points', ['Key learning points will be listed here']),
        recommendations=result.get('recommendations', ['Recommendations will be provided here'])
    ) 