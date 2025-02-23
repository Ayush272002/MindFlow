"""Main service class that handles all AI agent interactions."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from .agent_types import (
    SafetyStatus,
    LearningState,
    AgentClassifierInput,
    AgentClassifierOutput,
    SafetyAgentInput,
    SafetyAgentOutput,
    QuestionAgentInput,
    QuestionAgentOutput,
    AnswerEvalAgentInput,
    AnswerEvalAgentOutput,
    InteractiveAgentInput,
    InteractiveAgentOutput,
    SummaryConsolidationAgentInput,
    SummaryConsolidationAgentOutput,
    ExplorationAgentOutput,
    ExplorationAgentInput,
    DeepDiveAgentInput,
    DeepDiveAgentOutput,
    FlashcardAgentInput,
    FlashcardAgentOutput,
    CheatsheetAgentInput,
    CheatsheetAgentOutput,
    MermaidAgentInput,
    MermaidAgentOutput,
    ConfigAgentInput,
    ConfigAgentOutput
)

from .implementations import (
    handle_exploration,
    handle_interactive,
    handle_question,
    handle_answer_eval,
    handle_classification,
    handle_safety,
    handle_summary,
    handle_deep_dive,
    handle_flashcard,
    handle_cheatsheet,
    handle_mermaid,
    handle_config
)

class AgentService:
    """Service class that manages all AI agent interactions."""

    def __init__(self, api_key: str):
        """Initialize the agent service with API key."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.learning_state = self._initialize_learning_state()

    def _initialize_learning_state(self) -> LearningState:
        """Initialize a new learning state."""
        return LearningState(
            current_topic="",
            active_subtopic="",
            learning_path=[],
            progress={
                "completed_subtopics": [],
                "mastered_concepts": [],
                "needs_review": []
            },
            session_history=[]
        )

    def _add_to_session_history(self, entry: Dict[str, Any]) -> None:
        """Add an entry to the session history."""
        if not isinstance(entry, dict) or 'type' not in entry or 'content' not in entry:
            raise ValueError("Invalid session history entry format")
        
        entry['timestamp'] = datetime.now().isoformat()
        self.learning_state.session_history.append(entry)

    def _handle_answer_evaluation(self, topic: str) -> None:
        self.learning_state.awaiting_answer = False
        answer_eval_input = AnswerEvalAgentInput("", self.learning_state.active_subtopic, self.learning_state.current_topic, self.learning_state.last_question, topic)
        answer_eval = handle_answer_eval(self.model, answer_eval_input, self._call_agent)
        return {
            "is_correct": answer_eval.is_correct,
            "feedback": answer_eval.feedback            
        }

    def _call_agent(self, instructions: str, input_data: Any) -> Any:
        """Handle communication with the AI model."""
        print('\n=== Agent Call ===')
        print('Instructions:', instructions.split('\n')[0])
        print('Input:', json.dumps(getattr(input_data, "to_dict", lambda: input_data)(), indent=2))

        try:
            chat = self.model.start_chat(history=[
                {
                    'role': 'user',
                    'parts': [{'text': instructions}]
                },
                {
                    'role': 'model',
                    'parts': [{'text': 'I understand my role and instructions. Ready to process input.'}]
                }
            ])

            result = chat.send_message(json.dumps({
                **(input_data if isinstance(input_data, dict) else input_data.to_dict()),
                'response_format': 'json',
                'format_instructions': 'Return only valid JSON without any markdown formatting or additional text.'
            }))

            response = result.text
            print('Raw response:', response)

            try:
                # Clean the response text to ensure it's valid JSON
                # Remove any markdown formatting or text outside of JSON
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    clean_response = response[json_start:json_end]
                    parsed_response = json.loads(clean_response, strict=False)
                else:
                    # If no JSON found, try to extract useful information
                    # and format it as a response
                    return {
                        'status': SafetyStatus.SAFE,
                        'explanation': response.strip(),
                        'subtopics': [],
                        'prerequisites': [],
                        'summary': ''
                    }
                
                # Only check for safety phrases in non-safety agent responses
                if not isinstance(input_data, SafetyAgentInput):
                    # Check for safety-related phrases in the response content
                    response_text = json.dumps(parsed_response, ensure_ascii=False).lower()
                    moderation_phrases = [
                        'cannot help',
                        'inappropriate',
                        'harmful',
                        'unacceptable',
                        "i'm sorry",
                        'i am sorry',
                        'i apologize',
                        'not appropriate',
                        'racism'
                    ]
                    
                    if any(phrase in response_text for phrase in moderation_phrases):
                        return {
                            'status': SafetyStatus.INAPPROPRIATE,
                            'explanation': "I apologize, but I cannot generate that type of content. Let's focus on something else."
                        }

                return parsed_response

            except json.JSONDecodeError as e:
                print(f'Error parsing JSON response: {e}')
                # Return a formatted response even if JSON parsing fails
                return {
                    'status': SafetyStatus.SAFE,
                    'explanation': response.strip(),
                    'subtopics': [],
                    'prerequisites': [],
                    'summary': ''
                }

        except Exception as e:
            print(f'Error in agent call: {e}')
            if 'SAFETY' in str(e):
                return {
                    'status': SafetyStatus.INAPPROPRIATE,
                    'explanation': "I apologize, but I cannot generate that type of content. Let's focus on something else."
                }
            return {
                'status': SafetyStatus.SAFE,
                'explanation': 'I encountered an error processing your request. Could you please rephrase it?',
                'subtopics': [],
                'prerequisites': [],
                'summary': ''
            }

    def run_safety_check(self, input_text: str) -> SafetyAgentOutput:
        """Run a safety check on user input."""
        print('\n=== Running Safety Check ===')
        print('Input:', input_text)
        print('Session history length:', len(self.learning_state.session_history))

        safety_input = SafetyAgentInput(
            user_input=input_text,
            latest_context_summary='\n'.join(
                entry['content'] for entry in self.learning_state.session_history
            )
        )

        return handle_safety(self.model, safety_input, self._call_agent)

    def start_new_topic(self, topic: str, user_background: Optional[str] = None, current_topic: Optional[str] = None, active_subtopic: Optional[str] = None, session_history: Optional[List[str]] = None) -> ExplorationAgentOutput:
        """Begin a new learning topic."""
        print('\n=== Starting Agent Pipeline ===')
        print('Input:', topic)
        
        self.learning_state.current_topic = current_topic if current_topic != None else topic
        self.learning_state.active_subtopic = active_subtopic if active_subtopic != None else topic
        self.learning_state.session_history = session_history if session_history != None else []

        # Run safety check first
        safety_check = self.run_safety_check(topic)
        if safety_check.status != SafetyStatus.SAFE:
            return ExplorationAgentOutput(
                status=safety_check.status,
                explanation=safety_check.explanation,
                subtopics=[],
                prerequisites=[],
                summary=safety_check.explanation
            )

        # Use agent classifier
        classifier_input = AgentClassifierInput(
            user_input=topic,
            available_agents=[
                {'name': 'exploration', 'description': 'Explores new topics'},
                {'name': 'interactive', 'description': 'Handles questions and answers'},
                {'name': 'question', 'description': 'Generates quiz questions'},
                {'name': 'answerEval', 'description': 'Evaluates answers to questions'},
                {'name': 'deepDive', 'description': 'Provides detailed concept breakdowns'},
                {'name': 'flashcard', 'description': 'Creates study flashcards'},
                {'name': 'cheatsheet', 'description': 'Generates quick reference guides'},
                {'name': 'mermaid', 'description': 'Creates visual diagrams'},
                {'name': 'config', 'description': 'Handles system configuration'}
            ],
            latest_context_summary='\n'.join(
                entry['content'] for entry in self.learning_state.session_history
            )
        )

        classification = handle_classification(self.model, classifier_input, self._call_agent)

        # Handle based on classification
        if self.learning_state.awaiting_answer and self.learning_state.last_question:
            return self._handle_answer_evaluation(topic)
        
        # Create input data for the selected agent
        context_summary = '\n'.join(
            entry['content'] for entry in self.learning_state.session_history
        )

        match classification.next_agent:
            case 'exploration':
                input_data = ExplorationAgentInput(
                    user_prompt=topic,
                    latest_context_summary=context_summary
                )
                return handle_exploration(self.model, input_data, self._call_agent)

            case 'interactive':
                input_data = InteractiveAgentInput(
                    user_input=topic,
                    latest_context_summary=context_summary
                )
                response = handle_interactive(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.response,
                    subtopics=[],
                    prerequisites=[],
                    summary=response.response
                )

            case 'question':
                input_data = QuestionAgentInput(
                    subtopic=self.learning_state.active_subtopic,
                    broader_topic=self.learning_state.current_topic,
                    latest_context_summary=context_summary
                )
                response = handle_question(self.model, input_data, self._call_agent)
                self.learning_state.last_question = response.question
                self.learning_state.last_question_type = response.type
                self.learning_state.awaiting_answer = True
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.question,
                    subtopics=response.options if response.type == 'MCQ' else [],
                    prerequisites=[],
                    summary=response.question
                )

            case 'deepDive':
                input_data = DeepDiveAgentInput(
                    subtopic=self.learning_state.active_subtopic,
                    broader_topic=self.learning_state.current_topic,
                    latest_context_summary=context_summary
                )
                response = handle_deep_dive(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.breakdown,
                    subtopics=[],
                    prerequisites=[],
                    summary=response.breakdown
                )

            case 'flashcard':
                input_data = FlashcardAgentInput(
                    broader_topic=self.learning_state.current_topic,
                    subtopic=self.learning_state.active_subtopic,
                    latest_context_summary=context_summary
                )
                response = handle_flashcard(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation="Here are your study flashcards\n\n" + response.csv_content,
                    subtopics=[],
                    prerequisites=[],
                    summary=context_summary
                )

            case 'cheatsheet':
                input_data = CheatsheetAgentInput(
                    broader_topic=self.learning_state.current_topic,
                    subtopic=self.learning_state.active_subtopic,
                    latest_context_summary=context_summary
                )
                response = handle_cheatsheet(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.content,
                    subtopics=[],
                    prerequisites=[],
                    summary=response.content
                )

            case 'mermaid':
                input_data = MermaidAgentInput(
                    broader_topic=self.learning_state.current_topic,
                    subtopic=self.learning_state.active_subtopic,
                    available_diagram_types=["graph", "flowchart", "sequence", "class", "state"],
                    latest_context_summary=context_summary
                )
                response = handle_mermaid(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.mermaid_code,
                    subtopics=[],
                    prerequisites=[],
                    summary=context_summary
                )

            case 'config':
                input_data = ConfigAgentInput(
                    user_input=topic,
                    latest_context_summary=context_summary
                )
                response = handle_config(self.model, input_data, self._call_agent)
                return ExplorationAgentOutput(
                    status=SafetyStatus.SAFE,
                    explanation=response.prompt_addition,
                    subtopics=[],
                    prerequisites=[],
                    summary=response.prompt_addition
                )

            case _:
                # Default to exploration for unknown agents
                input_data = ExplorationAgentInput(
                    user_prompt=topic,
                    latest_context_summary=context_summary
                )
                return handle_exploration(self.model, input_data, self._call_agent)

    def get_session_summary(self) -> SummaryConsolidationAgentOutput:
        """Generate a summary of the learning session."""
        input_data = SummaryConsolidationAgentInput(
            latest_context_summary='\n'.join(
                entry['content'] for entry in self.learning_state.session_history
            ),
            last_agent_input=None,
            last_agent_output=None
        )

        return handle_summary(self.model, input_data, self._call_agent) 