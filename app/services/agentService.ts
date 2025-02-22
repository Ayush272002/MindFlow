import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  TOPIC_MAPPER_INSTRUCTIONS,
  EXPLAINER_INSTRUCTIONS,
  QUIZ_MASTER_INSTRUCTIONS,
  FEEDBACK_INSTRUCTIONS,
  RETENTION_INSTRUCTIONS,
  SUMMARIZER_INSTRUCTIONS,
  ORCHESTRATOR_INSTRUCTIONS,
  SAFETY_AGENT_INSTRUCTIONS
} from '../data/agents';

import { getLocationBasedResources } from '../data/crisisResources';
import { SafetyCheck } from '../types/agents';

import type {
  TopicMapperResponse,
  ExplainerResponse,
  QuizQuestion,
  FeedbackResponse,
  RetentionResponse,
  SummarizerResponse,
  OrchestratorResponse,
  LearningState,
  TopicMapperInput,
  ExplainerInput,
  QuizMasterInput,
  FeedbackInput,
  RetentionInput,
  SummarizerInput,
  SessionHistoryEntry,
  SafetyAgentResponse,
  SafetyAgentInput
} from '../types/agents';

// Main service class that handles all AI agent interactions
export class AgentService {
  private genAI: any;
  private model: any;
  private learningState: LearningState;
  private userIp?: string;

  constructor(apiKey: string, userIp?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.learningState = this.initializeLearningState();
    this.userIp = userIp;
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
      const prompt = `${instructions}\n\nINPUT:\n${JSON.stringify(input, null, 2)}`;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        return JSON.parse(response.text());
      }
      
      catch (parseError) {
        throw new Error('PARSE_ERROR');
      }
    }
    
    catch (error: any) {
      // Special handling for safety-related errors
      if (error.message?.includes('SAFETY') || error.message === 'PARSE_ERROR') {
        return {
          status: SafetyCheck.NEEDS_HELP,
          explanation: "Support resources available"
        };
      }
      throw error;
    }
  }

  // Adds a new entry to session history with timestamp
  private addToSessionHistory(entry: SessionHistoryEntry) {
    this.learningState.sessionHistory.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
  }

  // Begins a new learning topic
  async startNewTopic(topic: string, userBackground?: string): Promise<OrchestratorResponse> {
    const topicMapperInput: TopicMapperInput = {
      topic,
      userBackground
    };
    
    // Get the learning path from topic mapper
    const topicMap = await this.callAgent(
      TOPIC_MAPPER_INSTRUCTIONS,
      topicMapperInput
    ) as TopicMapperResponse;

    // Reset and update learning state
    this.learningState = {
      ...this.initializeLearningState(),
      currentTopic: topic,
      learningPath: topicMap.suggestedPath
    };

    // Add to session history
    this.addToSessionHistory({
      type: 'explanation',
      content: topicMap.overview,
      timestamp: new Date().toISOString()
    });

    // Get initial orchestrator response / learning plan
    return await this.callAgent(
      ORCHESTRATOR_INSTRUCTIONS,
      {
        action: 'start',
        topicMap,
        learningState: this.learningState
      }
    ) as OrchestratorResponse;
  }

  // Gets explanation for a subtopic
  async getExplanation(subtopic: string): Promise<ExplainerResponse> {
    const input: ExplainerInput = {
      subtopic,
      userLevel: this.learningState.difficulty,
      previousFeedback: this.learningState.sessionHistory
        .filter(h => h.type === 'feedback')
        .map(h => h.content)
        .join('\n')
    };

    const explanation = await this.callAgent(
      EXPLAINER_INSTRUCTIONS,
      input
    ) as ExplainerResponse;

    this.addToSessionHistory({
      type: 'explanation',
      content: explanation.content,
      timestamp: new Date().toISOString()
    });

    return explanation;
  }

  // Generates a quiz question for given subtopic
  async getQuizQuestion(subtopic: string): Promise<QuizQuestion> {
    const input: QuizMasterInput = {
      subtopic,
      userPerformance: this.learningState.lastQuizScore || 0,
      difficulty: this.learningState.difficulty
    };

    return await this.callAgent(
      QUIZ_MASTER_INSTRUCTIONS,
      input
    ) as QuizQuestion;
  }

  // Provides feedback on user's answer
  async getFeedback(concept: string, userAnswer: string, correctAnswer: string): Promise<FeedbackResponse> {
    const input: FeedbackInput = {
      concept,
      userAnswer,
      correctAnswer,
      previousExplanations: this.learningState.sessionHistory
        .filter(h => h.type === 'explanation')
        .map(h => h.content)
    };

    const feedback = await this.callAgent(
      FEEDBACK_INSTRUCTIONS,
      input
    ) as FeedbackResponse;

    this.addToSessionHistory({
      type: 'feedback',
      content: feedback.simplifiedExplanation || '',
      timestamp: new Date().toISOString()
    });

    return feedback;
  }

  // Generates a summary of the learning session
  async getSessionSummary(): Promise<SummarizerResponse> {
    const sessionData = {
      topic: this.learningState.currentTopic,
      coveredSubtopics: this.learningState.progress.completedSubtopics,
      userResponses: this.learningState.sessionHistory
        .filter(h => h.type === 'quiz')
        .map(h => h.content),
      quizResults: this.learningState.sessionHistory
        .filter(h => h.type === 'quiz')
        .map(h => ({
          questionId: h.content,
          correct: h.outcome === 'correct'
        }))
    };

    const summary = await this.callAgent(
      SUMMARIZER_INSTRUCTIONS,
      { sessionData }
    ) as SummarizerResponse;

    this.addToSessionHistory({
      type: 'summary',
      content: summary.summary,
      timestamp: new Date().toISOString()
    });

    return summary;
  }

  // Creates memory aids for better concept retention
  async getRetentionAids(concepts: string[]): Promise<RetentionResponse> {
    const input: RetentionInput = {
      concepts,
      relationships: this.learningState.sessionHistory
        .filter(h => h.type === 'explanation')
        .map(h => h.content),
      userProgress: concepts.reduce((acc, concept) => ({
        ...acc,
        [concept]: this.learningState.progress.masteredConcepts.includes(concept) ? 1 : 0
      }), {})
    };

    return await this.callAgent(
      RETENTION_INSTRUCTIONS,
      input
    ) as RetentionResponse;
  }

  // Checks content for safety concerns and provides resources if needed
  async checkContentSafety(content: string, context?: string): Promise<SafetyAgentResponse> {
    try {
      const input: SafetyAgentInput = { content, context };
      console.log('Safety Agent Input:', { content, context, inputObject: input });

      const safetyCheck = await this.callAgent(
        SAFETY_AGENT_INSTRUCTIONS,
        input
      ) as SafetyAgentResponse;

      console.log('Safety Check Status:', safetyCheck.status);

      if (safetyCheck.status === SafetyCheck.NEEDS_HELP) {
        console.log('User IP:', this.userIp);
        const resources = await getLocationBasedResources(this.userIp);
        console.log('Location resources:', resources);
        
        // Create a supportive message with crisis resources
        const supportMessage = this.createCrisisResourcesMessage(resources);

        return {
          status: SafetyCheck.NEEDS_HELP,
          explanation: "Support resources available",
          suggestedResources: [
            ...resources.phone,
            resources.website
          ].filter((r): r is string => r !== undefined),
          supportiveMessage: supportMessage
        };
      }

      return safetyCheck;

    }
    
    catch (error) {
      console.log('Error in safety check. User IP:', this.userIp);
      const resources = await getLocationBasedResources();
      console.log('Fallback resources:', resources);
      
      return {
        status: SafetyCheck.NEEDS_HELP,
        explanation: "Support resources available",
        suggestedResources: [
          ...resources.phone,
          resources.website
        ].filter((r): r is string => r !== undefined),
        supportiveMessage: this.createCrisisResourcesMessage(resources)
      };
    }
  }

  // Helper function to create crisis resources message
  private createCrisisResourcesMessage(resources: any): string {
    return `
      <div class="crisis-resources">
        <p>You're not alone. Help is available:</p>
        <div class="resource-list">
          ${resources.phone.map((p: string) => `
            <div class="resource-item">
              <span class="emoji">📞</span>
              <a href="tel:${p.replace(/\D/g, '')}" class="resource-link">${p}</a>
            </div>
          `).join('')}
          ${resources.website ? `
            <div class="resource-item">
              <span class="emoji">🌐</span>
              <a href="${resources.website}" target="_blank" rel="noopener noreferrer" class="resource-link">${resources.website}</a>
            </div>
          ` : ''}
        </div>
        <style>
          .crisis-resources {
            margin: 1rem 0;
            padding: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            background-color: #f9fafb;
          }
          .resource-list {
            margin-top: 0.5rem;
          }
          .resource-item {
            margin: 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .emoji {
            display: inline-block;
            width: 1.5rem;
          }
          .resource-link {
            color: #2563eb;
            text-decoration: underline;
          }
          .resource-link:hover {
            color: #1d4ed8;
          }
        </style>
      </div>
    `;
  }

  // Returns a copy of the current learning state
  getLearningState(): LearningState {
    return { ...this.learningState };
  }
}