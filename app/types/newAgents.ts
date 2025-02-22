export interface BaseAgentInput {
  latestContextSummary: string;
}

export interface ExplorationAgentInput extends BaseAgentInput {
  userPrompt: string;
}

export interface ExplorationAgentOutput {
  subtopics?: string[];
  broaderTopic?: string;
  prerequisites?: string[];
  summary?: string;
  status?: SafetyStatus;
  explanation?: string;
}

export interface DeepDiveAgentInput extends BaseAgentInput {
  subtopic: string;
  broaderTopic: string;
}

export interface DeepDiveAgentOutput {
  breakdown: string;
  mermaidDiagram?: string;
  analogy?: string;
  codeExample?: string;
}

export interface InteractiveAgentInput extends BaseAgentInput {
  userInput: string;
}

export interface InteractiveAgentOutput {
  response: string;
}

export type QuestionType = 'MCQ' | 'inputQ';

export interface QuestionAgentInput extends BaseAgentInput {
  subtopic: string;
  broaderTopic: string;
}

export interface QuestionAgentOutput {
  question: string;
  type: QuestionType;
  options?: string[]; // For MCQ type
  correctAnswer: string;
}

export interface AnswerEvalAgentInput extends BaseAgentInput {
  subtopic: string;
  broaderTopic: string;
  questionAsked: string;
  userQuestionAnswer: string;
}

export interface AnswerEvalAgentOutput {
  isCorrect: boolean;
  feedback: string;
}

export interface AgentClassifierInput extends BaseAgentInput {
  userInput: string;
  availableAgents: {
    name: string;
    description: string;
  }[];
}

export interface AgentClassifierOutput {
  nextAgent: string;
}

export interface ConfigAgentInput {
  userInput: string;
}

export interface ConfigAgentOutput {
  promptAddition: string;
}

export interface SafetyAgentInput extends BaseAgentInput {
  userInput: string;
}

export enum SafetyStatus {
  SAFE = 'SAFE',
  NEEDS_HELP = 'NEEDS_HELP',
  DANGEROUS = 'DANGEROUS',
  INAPPROPRIATE = 'INAPPROPRIATE'
}

export interface SafetyAgentOutput {
  status: SafetyStatus;
  explanation: string;
}

export interface FlashcardAgentInput extends BaseAgentInput {
  broaderTopic: string;
  subtopic?: string;
}

export interface FlashcardAgentOutput {
  csvContent: string; // CSV format without header row
}

export interface CheatsheetAgentInput extends BaseAgentInput {
  broaderTopic: string;
  subtopic?: string;
}

export interface CheatsheetAgentOutput {
  content: string;
}

export interface MermaidAgentInput extends BaseAgentInput {
  broaderTopic: string;
  subtopic?: string;
  availableDiagramTypes: string[];
}

export interface MermaidAgentOutput {
  mermaidCode: string;
}

export interface SummaryConsolidationAgentInput extends BaseAgentInput {
  lastAgentInput: any;
  lastAgentOutput: any;
}

export interface SummaryConsolidationAgentOutput {
  updatedContextSummary: string;
} 