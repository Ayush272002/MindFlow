export interface TopicMapperResponse {
  overview: string;
  prerequisites: string[];
  subtopics: {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
  }[];
  suggestedPath: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: Difficulty;
}

export interface ExplainerResponse {
  content: string;
  examples: string[];
  visualDescriptions?: string[];
  practiceExercises?: string[];
}

export interface FeedbackResponse {
  simplifiedExplanation?: string;
  alternativeApproach?: string;
  misconceptionsClarification?: string;
  nextStepsSuggestion: string;
}

export interface RetentionResponse {
  flashcards: Array<{
    front: string;
    back: string;
  }>;
  conceptMap: string;
  keyTakeaways: string[];
}

export interface SummarizerResponse {
  summary: string;
  keyPoints: string[];
  struggledAreas: string[];
  successAreas: string[];
  recommendedNextSteps: string[];
}

export interface SessionHistoryEntry {
  timestamp: string;
  type: 'explanation' | 'quiz' | 'feedback' | 'summary';
  content: string;
  outcome?: string;
}

export interface LearningState {
  currentTopic: string;
  activeSubtopic: string;
  learningPath: string[];
  progress: {
    completedSubtopics: string[];
    masteredConcepts: string[];
    needsReview: string[];
  };
  sessionHistory: SessionHistoryEntry[];
  difficulty: Difficulty;
  lastQuizScore?: number;
  lastQuizAnswer?: string;
}

export interface OrchestratorResponse {
  action: 'start' | 'explain' | 'quiz' | 'feedback' | 'summarize' | 'complete';
  agentCalls: string[];
  userPrompt: string;
  stateUpdate: {
    type: 'progress' | 'difficulty' | 'topic' | 'subtopic';
    changes: any[];
  };
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TopicMapperInput {
  topic: string;
  userBackground?: string;
  timeConstraints?: string;
}

export interface ExplainerInput {
  subtopic: string;
  userLevel: Difficulty;
  previousFeedback?: string;
  context?: {
    mainTopic: string;
    currentPath: string[];
    previousExplanations: string[];
  };
}

export interface QuizMasterInput {
  subtopic: string;
  userPerformance: number;
  difficulty: Difficulty;
  context?: {
    topic: string;
    explanation?: string;
    learningPath?: string[];
    currentProgress?: {
      completedSubtopics: string[];
      masteredConcepts: string[];
    };
  };
}

export interface FeedbackInput {
  concept: string;
  userAnswer: string;
  correctAnswer: string;
  context?: {
    topic: string;
    subtopic: string;
    previousExplanations: string[];
    progress: {
      completedSubtopics: string[];
      masteredConcepts: string[];
    };
  };
}

export interface RetentionInput {
  concepts: string[];
  relationships: string[];
  userProgress: {
    [conceptId: string]: number;
  };
}

export interface SummarizerInput {
  sessionData: {
    topic: string;
    coveredSubtopics: string[];
    userResponses: string[];
    quizResults: {
      questionId: string;
      correct: boolean;
    }[];
  };
}

export enum SafetyCheck {
  SAFE = 'SAFE',                    // Content is safe to process
  NEEDS_HELP = 'NEEDS_HELP',        // User might need external help/support
  DANGEROUS = 'DANGEROUS',          // Content is dangerous/harmful
  INAPPROPRIATE = 'INAPPROPRIATE'    // Content is inappropriate but not dangerous
}

export interface SafetyAgentResponse {
  status: SafetyCheck;
  explanation: string;              // Brief explanation of why this status was chosen
  suggestedResources?: string[];    // Optional resources for NEEDS_HELP status
  supportiveMessage?: string;       // Optional supportive message for NEEDS_HELP status
}

export interface SafetyAgentInput {
  content: string;
  context?: string;                 // Optional context about the user or conversation
} 