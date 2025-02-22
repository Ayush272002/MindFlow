import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  EXPLORATION_AGENT_INSTRUCTIONS,
  DEEP_DIVE_AGENT_INSTRUCTIONS,
  INTERACTIVE_AGENT_INSTRUCTIONS,
  QUESTION_AGENT_INSTRUCTIONS,
  ANSWER_EVAL_AGENT_INSTRUCTIONS,
  AGENT_CLASSIFIER_INSTRUCTIONS,
  CONFIG_AGENT_INSTRUCTIONS,
  SAFETY_AGENT_INSTRUCTIONS,
  FLASHCARD_AGENT_INSTRUCTIONS,
  CHEATSHEET_AGENT_INSTRUCTIONS,
  MERMAID_AGENT_INSTRUCTIONS,
  SUMMARY_CONSOLIDATION_AGENT_INSTRUCTIONS
} from '../data/agents';

import { getLocationBasedResources } from '../data/crisisResources';
import { SafetyStatus } from '../types/newAgents';

import type {
  ExplorationAgentInput,
  ExplorationAgentOutput,
  DeepDiveAgentInput,
  DeepDiveAgentOutput,
  InteractiveAgentInput,
  InteractiveAgentOutput,
  QuestionAgentInput,
  QuestionAgentOutput,
  AnswerEvalAgentInput,
  AnswerEvalAgentOutput,
  AgentClassifierInput,
  AgentClassifierOutput,
  ConfigAgentInput,
  ConfigAgentOutput,
  SafetyAgentInput,
  SafetyAgentOutput,
  FlashcardAgentInput,
  FlashcardAgentOutput,
  CheatsheetAgentInput,
  CheatsheetAgentOutput,
  MermaidAgentInput,
  MermaidAgentOutput,
  SummaryConsolidationAgentInput,
  SummaryConsolidationAgentOutput
} from '../types/newAgents';

interface LearningState {
  currentTopic: string;
  activeSubtopic: string;
  learningPath: string[];
  progress: {
    completedSubtopics: string[];
    masteredConcepts: string[];
    needsReview: string[];
  };
  sessionHistory: SessionHistoryEntry[];
  difficulty: string;
  lastQuizScore?: number;
  lastQuizAnswer?: string;
}

interface SessionHistoryEntry {
  timestamp: string;
  type: 'explanation' | 'quiz' | 'feedback' | 'summary';
  content: string;
  outcome?: string;
}

// Main service class that handles all AI agent interactions
export class AgentService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private learningState: LearningState;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.learningState = this.initializeLearningState();
  }

  // Sets up initial learning state with default values
  private initializeLearningState(): LearningState {
    return {
      currentTopic: '',
      activeSubtopic: '',
      learningPath: [],
      progress: {
        completedSubtopics: [],
        masteredConcepts: [],
        needsReview: []
      },
      sessionHistory: [],
      difficulty: 'beginner'
    };
  }

  // Handles communication with the AI model
  private async callAgent(instructions: string, input: any): Promise<any> {
    try {
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: instructions }]
          },
          {
            role: 'model',
            parts: [{ text: 'I understand my role and instructions. Ready to process input.' }]
          }
        ]
      });

      const result = await chat.sendMessage(JSON.stringify({
        ...input,
        responseFormat: 'json',
        formatInstructions: 'Return only valid JSON without any markdown formatting or additional text.'
      }));
      const response = await result.response;
      const text = response.text();
      
      // Clean the response text to handle potential markdown
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Raw text:', text);
        console.error('Cleaned text:', cleanedText);
        
        // Try to extract JSON from markdown response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Secondary parse error:', e);
          }
        }
        
        throw new Error('PARSE_ERROR');
      }
    } catch (error: any) {
      console.log('\n=== Agent Call Error ===');
      console.log('Error:', error);
      
      if (instructions === EXPLORATION_AGENT_INSTRUCTIONS) {
        const fallback: ExplorationAgentOutput = {
          subtopics: ['Basic Overview'],
          broaderTopic: input.userPrompt,
          prerequisites: [],
          summary: "I apologize, but I encountered an error processing your request. Let's start with the basics."
        };
        return fallback;
      }
      
      if (error.message?.includes('SAFETY') || error.message === 'PARSE_ERROR') {
        const safetyResponse: SafetyAgentOutput = {
          status: SafetyStatus.NEEDS_HELP,
          explanation: "Support resources available"
        };
        return safetyResponse;
      }
      throw error;
    }
  }

  // Adds a new entry to session history with timestamp
  private addToSessionHistory(entry: SessionHistoryEntry) {
    this.learningState.sessionHistory.push(entry);
  }

  // Begins a new learning topic
  async startNewTopic(topic: string, userBackground?: string): Promise<ExplorationAgentOutput> {
    const explorationInput: ExplorationAgentInput = {
      userPrompt: topic,
      latestContextSummary: ''
    };
    
    const exploration = await this.callAgent(
      EXPLORATION_AGENT_INSTRUCTIONS,
      explorationInput
    ) as ExplorationAgentOutput;

    // Reset and update learning state
    this.learningState = {
      ...this.initializeLearningState(),
      currentTopic: topic,
      learningPath: exploration.subtopics
    };

    // Add to session history
    this.addToSessionHistory({
      type: 'explanation',
      content: exploration.summary,
      timestamp: new Date().toISOString()
    });

    return exploration;
  }

  // Gets explanation for a subtopic
  async getExplanation(subtopic: string): Promise<DeepDiveAgentOutput> {
    const input: DeepDiveAgentInput = {
      subtopic,
      broaderTopic: this.learningState.currentTopic,
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n')
    };

    const explanation = await this.callAgent(
      DEEP_DIVE_AGENT_INSTRUCTIONS,
      input
    ) as DeepDiveAgentOutput;

    // Validate the explanation response
    if (!explanation || typeof explanation !== 'object') {
      throw new Error('Invalid explanation response format');
    }

    if (!explanation.breakdown || typeof explanation.breakdown !== 'string') {
      throw new Error('Invalid explanation content format');
    }

    // Format the content to include all components
    const formattedContent = `
# ${subtopic}

${explanation.breakdown}

${explanation.analogy ? '\n## Analogy\n' + explanation.analogy : ''}
${explanation.mermaidDiagram ? '\n## Diagram\n```mermaid\n' + explanation.mermaidDiagram + '\n```' : ''}
${explanation.codeExample ? '\n## Code Example\n```\n' + explanation.codeExample + '\n```' : ''}
    `.trim();

    // Update explanation content with formatted version
    explanation.breakdown = formattedContent;

    this.addToSessionHistory({
      type: 'explanation',
      content: explanation.breakdown,
      timestamp: new Date().toISOString()
    });

    return explanation;
  }

  // Generates a quiz question for given subtopic
  async getQuizQuestion(subtopic: string): Promise<QuestionAgentOutput> {
    const input: QuestionAgentInput = {
      subtopic,
      broaderTopic: this.learningState.currentTopic,
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n')
    };

    const quiz = await this.callAgent(
      QUESTION_AGENT_INSTRUCTIONS,
      input
    ) as QuestionAgentOutput;

    // Validate quiz content
    if (!quiz || typeof quiz !== 'object') {
      throw new Error('Invalid quiz response format');
    }

    if (!quiz.question || typeof quiz.question !== 'string') {
      throw new Error('Invalid quiz question format');
    }

    if (quiz.type === 'MCQ' && (!quiz.options || !Array.isArray(quiz.options) || quiz.options.length === 0)) {
      throw new Error('Invalid quiz options format');
    }

    // Store the correct answer for feedback
    this.learningState.lastQuizAnswer = quiz.correctAnswer;

    return quiz;
  }

  // Provides feedback on user's answer
  async getFeedback(subtopic: string, userAnswer: string): Promise<AnswerEvalAgentOutput> {
    const input: AnswerEvalAgentInput = {
      subtopic,
      broaderTopic: this.learningState.currentTopic,
      questionAsked: this.learningState.sessionHistory
        .filter(h => h.type === 'quiz')
        .map(h => h.content)
        .slice(-1)[0],
      userQuestionAnswer: userAnswer,
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n')
    };

    const feedback = await this.callAgent(
      ANSWER_EVAL_AGENT_INSTRUCTIONS,
      input
    ) as AnswerEvalAgentOutput;

    // Validate feedback response
    if (!feedback || typeof feedback !== 'object') {
      throw new Error('Invalid feedback response format');
    }

    if (typeof feedback.isCorrect !== 'boolean' || !feedback.feedback) {
      throw new Error('Invalid feedback content format');
    }

    this.addToSessionHistory({
      type: 'feedback',
      content: feedback.feedback,
      timestamp: new Date().toISOString()
    });

    // Update learning state
    if (feedback.isCorrect) {
      this.learningState.progress.masteredConcepts.push(subtopic);
    } else {
      this.learningState.progress.needsReview.push(subtopic);
    }

    return feedback;
  }

  // Gets session summary
  async getSessionSummary(): Promise<SummaryConsolidationAgentOutput> {
    const input: SummaryConsolidationAgentInput = {
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n'),
      lastAgentInput: null,
      lastAgentOutput: null
    };

    return await this.callAgent(
      SUMMARY_CONSOLIDATION_AGENT_INSTRUCTIONS,
      input
    ) as SummaryConsolidationAgentOutput;
  }
}