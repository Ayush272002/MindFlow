from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, asdict

class SafetyStatus(str, Enum):
    SAFE = "SAFE"
    NEEDS_HELP = "NEEDS_HELP"
    DANGEROUS = "DANGEROUS"
    INAPPROPRIATE = "INAPPROPRIATE"

@dataclass
class BaseAgentInput:
    latest_context_summary: str

    def to_dict(self):
        return asdict(self)

@dataclass
class ExplorationAgentInput(BaseAgentInput):
    user_prompt: str

    def to_dict(self):
        return asdict(self)

@dataclass
class ExplorationAgentOutput:
    status: SafetyStatus
    explanation: str
    subtopics: List[str]
    prerequisites: List[str]
    summary: str

    def to_dict(self):
        return {
            "status": self.status.value,
            "explanation": self.explanation,
            "subtopics": self.subtopics,
            "prerequisites": self.prerequisites,
            "summary": self.summary
        }

@dataclass
class InteractiveAgentInput(BaseAgentInput):
    user_input: str

    def to_dict(self):
        return asdict(self)

@dataclass
class InteractiveAgentOutput:
    response: str

    def to_dict(self):
        return asdict(self)

@dataclass
class QuestionAgentInput(BaseAgentInput):
    subtopic: str
    broader_topic: str

    def to_dict(self):
        return asdict(self)

@dataclass
class QuestionAgentOutput:
    question: str
    type: str
    options: Optional[List[str]]
    correct_answer: str

    def to_dict(self):
        return asdict(self)

@dataclass
class AnswerEvalAgentInput(BaseAgentInput):
    subtopic: str
    broader_topic: str
    question_asked: str
    user_question_answer: str

    def to_dict(self):
        return asdict(self)

@dataclass
class AnswerEvalAgentOutput:
    is_correct: bool
    feedback: str

    def to_dict(self):
        return asdict(self)

@dataclass
class AgentClassifierInput(BaseAgentInput):
    user_input: str
    available_agents: List[Dict[str, str]]

    def to_dict(self):
        return asdict(self)

@dataclass
class AgentClassifierOutput:
    next_agent: str

    def to_dict(self):
        return asdict(self)

@dataclass
class SafetyAgentInput(BaseAgentInput):
    user_input: str

    def to_dict(self):
        return asdict(self)

@dataclass
class SafetyAgentOutput:
    status: SafetyStatus
    explanation: str

    def to_dict(self):
        return {
            "status": self.status.value,
            "explanation": self.explanation
        }

@dataclass
class SummaryConsolidationAgentInput(BaseAgentInput):
    last_agent_input: Any
    last_agent_output: Any

    def to_dict(self):
        return asdict(self)

@dataclass
class SummaryConsolidationAgentOutput:
    summary: str
    key_points: List[str]
    recommendations: List[str]

    def to_dict(self):
        return asdict(self)

@dataclass
class DeepDiveAgentInput(BaseAgentInput):
    subtopic: str
    broader_topic: str

    def to_dict(self):
        return asdict(self)

@dataclass
class DeepDiveAgentOutput:
    breakdown: str
    mermaid_diagram: str
    analogy: str
    code_example: Optional[str]

    def to_dict(self):
        return asdict(self)

@dataclass
class FlashcardAgentInput(BaseAgentInput):
    broader_topic: str
    subtopic: Optional[str]

    def to_dict(self):
        return asdict(self)

@dataclass
class FlashcardAgentOutput:
    csv_content: str

    def to_dict(self):
        return asdict(self)

@dataclass
class CheatsheetAgentInput(BaseAgentInput):
    broader_topic: str
    subtopic: Optional[str]

    def to_dict(self):
        return asdict(self)

@dataclass
class CheatsheetAgentOutput:
    content: str

    def to_dict(self):
        return asdict(self)

@dataclass
class MermaidAgentInput(BaseAgentInput):
    broader_topic: str
    subtopic: Optional[str]
    available_diagram_types: List[str]

    def to_dict(self):
        return asdict(self)

@dataclass
class MermaidAgentOutput:
    mermaid_code: str

    def to_dict(self):
        return asdict(self)

@dataclass
class ConfigAgentInput(BaseAgentInput):
    user_input: str

    def to_dict(self):
        return asdict(self)

@dataclass
class ConfigAgentOutput:
    prompt_addition: str

    def to_dict(self):
        return asdict(self)

@dataclass
class LearningState:
    current_topic: str
    active_subtopic: str
    learning_path: List[str]
    progress: Dict[str, List[str]]
    session_history: List[Dict[str, Any]]
    last_quiz_score: Optional[float] = None
    last_quiz_answer: Optional[str] = None
    last_question: Optional[str] = None
    last_question_type: Optional[str] = None
    awaiting_answer: bool = False

    def to_dict(self):
        return asdict(self) 