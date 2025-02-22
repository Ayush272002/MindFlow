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
  lastQuestion?: string;  // Track the last question asked
  lastQuestionType?: 'quiz' | 'interactive';  // Track the type of question
  awaitingAnswer?: boolean;  // Flag to indicate we're waiting for an answer
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
    console.log('\n=== Agent Call ===');
    console.log('Agent type:', instructions.split('\n')[0]);
    console.log('Input:', JSON.stringify(input, null, 2));

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

      let result;
      try {
        result = await chat.sendMessage(JSON.stringify({
          ...input,
          responseFormat: 'json',
          formatInstructions: 'Return only valid JSON without any markdown formatting or additional text.'
        }));
      } catch (sendError: any) {
        console.error('Send message error:', sendError);
        // Handle safety blocks and other send errors
        if (sendError.message?.includes('SAFETY')) {
          console.log('Response blocked by safety filters');
          return {
            status: SafetyStatus.INAPPROPRIATE,
            explanation: "I apologize, but I cannot generate that type of content. Let's focus on something else.",
            subtopics: [],
            prerequisites: [],
            summary: ""
          };
        }
        throw sendError;
      }

      const response = await result.response;
      const text = response.text();

      console.log('Raw response:', text);

      // Common phrases that indicate a moderation response
      const moderationPhrases = [
        'cannot help',
        'inappropriate',
        'harmful',
        'unacceptable',
        'i\'m sorry',
        'i am sorry',
        'i apologize',
        'not appropriate',
        'racism'
      ];
      
      // First check if it's a plain text response starting with these phrases
      const lowerText = text.toLowerCase();
      if (moderationPhrases.some(phrase => lowerText.startsWith(phrase))) {
        console.log('Detected moderation response from text start');
        return {
          status: SafetyStatus.INAPPROPRIATE,
          explanation: text.trim(),
          subtopics: [],
          prerequisites: [],
          summary: ""
        };
      }
      
      // Clean the response text
      const cleanedText = text
        .replace(/```json\n?|\n?```/g, '')  // Remove code blocks
        .replace(/^[^{]*({.*})[^}]*$/, '$1') // Extract JSON object
        .trim();
      
      console.log('Cleaned response:', cleanedText);
      
      // If the cleaned text starts with "I" or other non-JSON characters, treat it as a moderation response
      if (cleanedText.startsWith('I ') || cleanedText.startsWith('I\'m ') || cleanedText.startsWith('Im ')) {
        console.log('Detected non-JSON response starting with "I"');
        return {
          status: SafetyStatus.INAPPROPRIATE,
          explanation: cleanedText,
          subtopics: [],
          prerequisites: [],
          summary: ""
        };
      }
      
      try {
        console.log('Attempting to parse response as JSON...');
        const parsedResponse = JSON.parse(cleanedText);
        console.log('Successfully parsed JSON response');
        
        // Check if it's an error response
        if (parsedResponse.error) {
          console.log('Detected error in parsed response:', parsedResponse.error);
          return {
            status: SafetyStatus.INAPPROPRIATE,
            explanation: parsedResponse.error,
            subtopics: [],
            prerequisites: [],
            summary: ""
          };
        }
        
        // Check if any field contains moderation phrases
        const responseStr = JSON.stringify(parsedResponse).toLowerCase();
        if (moderationPhrases.some(phrase => responseStr.includes(phrase))) {
          console.log('Detected moderation phrase in parsed response');
          const message = parsedResponse.error || parsedResponse.message || parsedResponse.explanation || 
                         Object.values(parsedResponse).find(v => typeof v === 'string' && moderationPhrases.some(p => v.toLowerCase().includes(p))) ||
                         "I cannot help with that request.";
          return {
            status: SafetyStatus.INAPPROPRIATE,
            explanation: message,
            subtopics: [],
            prerequisites: [],
            summary: ""
          };
        }
        
        // For exploration agent, ensure required fields exist
        if (instructions === EXPLORATION_AGENT_INSTRUCTIONS) {
          console.log('Processing exploration agent response');
          return {
            ...parsedResponse,
            subtopics: parsedResponse.subtopics || ['Basic Overview'],
            prerequisites: parsedResponse.prerequisites || [],
            summary: parsedResponse.summary || "Let's explore this topic.",
            status: SafetyStatus.SAFE
          };
        }

        // For question agent, ensure required fields exist
        if (instructions === QUESTION_AGENT_INSTRUCTIONS) {
          console.log('Processing question agent response');
          return {
            ...parsedResponse,
            question: parsedResponse.question || "What do you understand about this topic?",
            type: parsedResponse.type || "MCQ",
            options: parsedResponse.options || ["I understand it well", "I need more explanation"],
            correctAnswer: parsedResponse.correctAnswer || parsedResponse.options?.[0] || "I understand it well"
          };
        }
        
        console.log('Returning parsed response');
        return parsedResponse;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('Failed to parse text:', cleanedText);
        
        // If it looks like a moderation response, return it as such
        if (moderationPhrases.some(phrase => cleanedText.toLowerCase().includes(phrase))) {
          console.log('Detected moderation phrase in unparseable response');
          return {
            status: SafetyStatus.INAPPROPRIATE,
            explanation: cleanedText || "I cannot help with that request.",
            subtopics: [],
            prerequisites: [],
            summary: ""
          };
        }
        
        // Default error response
        console.log('Returning default error response');
        return {
          status: SafetyStatus.NEEDS_HELP,
          explanation: "I encountered an error processing your request. Let me help you with something else.",
          subtopics: ['Basic Overview'],
          prerequisites: [],
          summary: "Let's start with the basics."
        };
      }
    } catch (error: any) {
      console.error('\n=== Agent Call Error ===');
      console.error('Error:', error);
      
      // Check if it's a safety-related error
      if (error.message?.includes('SAFETY')) {
        console.log('Response blocked by safety filters');
        return {
          status: SafetyStatus.INAPPROPRIATE,
          explanation: "I apologize, but I cannot generate that type of content. Let's focus on something else.",
          subtopics: [],
          prerequisites: [],
          summary: ""
        };
      }
      
      return {
        status: SafetyStatus.NEEDS_HELP,
        explanation: "I encountered an error. How can I help you with something else?",
        subtopics: ['Basic Overview'],
        prerequisites: [],
        summary: "Let's start with the basics."
      };
    }
  }

  // Adds a new entry to session history with timestamp
  private addToSessionHistory(entry: SessionHistoryEntry) {
    console.log('\n=== Adding to Session History ===');
    console.log('Entry type:', entry.type);
    console.log('Content:', entry.content);
    this.learningState.sessionHistory.push(entry);
  }

  // Safety check that must be run before any other agent
  private async runSafetyCheck(input: string): Promise<SafetyAgentOutput> {
    console.log('\n=== Running Safety Check ===');
    console.log('Input:', input);
    console.log('Session history length:', this.learningState.sessionHistory.length);

    const safetyInput: SafetyAgentInput = {
      userInput: input,
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n')
    };

    const safetyCheck = await this.callAgent(
      SAFETY_AGENT_INSTRUCTIONS,
      safetyInput
    ) as SafetyAgentOutput;

    console.log('Safety check status:', safetyCheck.status);

    if (safetyCheck.status !== SafetyStatus.SAFE) {
      try {
        console.log('Getting location-based resources...');
        // Get user's IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const userIp = ipData.ip;
        console.log('User IP:', userIp);

        // Get location-based resources
        const resource = await getLocationBasedResources(userIp);
        console.log('Got resources for location');
        
        // Format resources with markdown
        const resourceDetails = [
          resource.description ? `**${resource.description}**` : '',
          resource.phone.length ? `📞 **Phone**: ${resource.phone.join(', ')}` : '',
          resource.website ? `🌐 **Website**: [Click here](${resource.website})` : '',
          resource.email ? `✉️ **Email**: [${resource.email}](mailto:${resource.email})` : ''
        ].filter(Boolean);

        // Add a more empathetic and structured response
        safetyCheck.explanation = `I understand you're going through a difficult time. Your life has value, and there are people who want to help.\n\n### Immediate Support Available\n\n${resourceDetails.join('\n\n')}\n\n**You're not alone.** These services are:\n- Free and confidential\n- Available 24/7\n- Staffed by caring professionals\n- Here to listen without judgment\n\nPlease reach out - taking that first step can make all the difference.`;
      } catch (error) {
        console.error('Error getting location-based resources:', error);
        // Fallback to default resources if location detection fails
        console.log('Using default resources');
        const resource = await getLocationBasedResources();
        safetyCheck.explanation = `I care about your wellbeing. Please reach out for support:\n\n- **${resource.description}**\n- 📞 **Phone**: ${resource.phone.join(', ')}\n- 🌐 **Website**: [Click here](${resource.website})\n\nYou're not alone. These services are available 24/7 and ready to help.`;
      }
    }

    return safetyCheck;
  }

  // Begins a new learning topic
  async startNewTopic(topic: string, userBackground?: string): Promise<ExplorationAgentOutput> {
    console.log('\n=== Starting Agent Pipeline ===');
    console.log('Input:', topic);
    
    // Run safety check first
    console.log('Running safety check...');
    const safetyCheck = await this.runSafetyCheck(topic);
    
    if (safetyCheck.status !== SafetyStatus.SAFE) {
      console.log('Safety check failed:', safetyCheck.status);
      return {
        status: safetyCheck.status,
        explanation: safetyCheck.explanation,
        subtopics: [],
        prerequisites: [],
        summary: ""
      };
    }

    // Use agent classifier to determine the appropriate agent
    console.log('Running agent classifier...');
    const classifierInput: AgentClassifierInput = {
      userInput: topic,
      availableAgents: [
        { name: 'exploration', description: 'Explores new topics' },
        { name: 'interactive', description: 'Handles questions and answers' },
        { name: 'question', description: 'Generates quiz questions' },
        { name: 'answerEval', description: 'Evaluates answers to questions' }
      ],
      latestContextSummary: this.learningState.sessionHistory
        .map(h => h.content)
        .join('\n')
    };

    const classification = await this.callAgent(
      AGENT_CLASSIFIER_INSTRUCTIONS,
      classifierInput
    ) as AgentClassifierOutput;
    console.log('Agent classification:', classification.nextAgent);

    // If we're awaiting an answer, handle it with answer evaluation
    if (this.learningState.awaitingAnswer && this.learningState.lastQuestion) {
      console.log('Processing answer to previous question...');
      const evalInput: AnswerEvalAgentInput = {
        subtopic: this.learningState.activeSubtopic,
        broaderTopic: this.learningState.currentTopic,
        questionAsked: this.learningState.lastQuestion,
        userQuestionAnswer: topic,
        latestContextSummary: this.learningState.sessionHistory
          .map(h => h.content)
          .join('\n')
      };

      const feedback = await this.callAgent(
        ANSWER_EVAL_AGENT_INSTRUCTIONS,
        evalInput
      ) as AnswerEvalAgentOutput;

      // Reset question state
      this.learningState.lastQuestion = undefined;
      this.learningState.awaitingAnswer = false;

      // Add to session history
      this.addToSessionHistory({
        type: 'feedback',
        content: feedback.feedback,
        timestamp: new Date().toISOString()
      });

      return {
        status: SafetyStatus.SAFE,
        explanation: feedback.feedback,
        subtopics: [],
        prerequisites: [],
        summary: ""
      };
    }

    // Handle based on classification
    switch (classification.nextAgent) {
      case 'question':
        console.log('Generating quiz question...');
        const quiz = await this.getQuizQuestion(this.learningState.activeSubtopic);
        this.learningState.lastQuestion = quiz.question;
        this.learningState.lastQuestionType = 'quiz';
        this.learningState.awaitingAnswer = true;
        
        // Add to session history
        this.addToSessionHistory({
          type: 'quiz',
          content: quiz.question,
          timestamp: new Date().toISOString()
        });

        return {
          status: SafetyStatus.SAFE,
          explanation: quiz.question,
          subtopics: quiz.type === 'MCQ' ? quiz.options || [] : [],
          prerequisites: [],
          summary: ""
        };

      case 'answerEval':
        console.log('Evaluating answer...');
        if (!this.learningState.lastQuestion) {
          return {
            status: SafetyStatus.SAFE,
            explanation: "I don't see a previous question to evaluate. What would you like to learn about?",
            subtopics: [],
            prerequisites: [],
            summary: ""
          };
        }
        // Handle answer evaluation (already covered in the earlier check)
        return {
          status: SafetyStatus.SAFE,
          explanation: "Let me evaluate your answer...",
          subtopics: [],
          prerequisites: [],
          summary: ""
        };

      case 'interactive':
        console.log('Processing interactive response...');
        const interactiveInput: InteractiveAgentInput = {
          userInput: topic,
          latestContextSummary: this.learningState.sessionHistory
            .map(h => h.content)
            .join('\n')
        };
        const response = await this.callAgent(
          INTERACTIVE_AGENT_INSTRUCTIONS,
          interactiveInput
        ) as InteractiveAgentOutput;

        // Add to session history
        this.addToSessionHistory({
          type: 'explanation',
          content: response.response,
          timestamp: new Date().toISOString()
        });

        return {
          status: SafetyStatus.SAFE,
          explanation: response.response,
          subtopics: [],
          prerequisites: [],
          summary: ""
        };

      default:
        console.log('Starting new exploration...');
        // Check if input looks like an answer or uncertainty
        if (topic.toLowerCase().includes('not sure') || 
            topic.toLowerCase().includes('dont know') || 
            topic.toLowerCase().includes("don't know") ||
            topic.toLowerCase().includes('im unsure') ||
            topic.toLowerCase().includes("i'm unsure")) {
          console.log('Detected uncertainty, treating as answer evaluation...');
          return {
            status: SafetyStatus.SAFE,
            explanation: "That's okay! Let me help you understand this better. Would you like me to explain the topic again or give you a hint?",
            subtopics: ['Explain again', 'Give me a hint'],
            prerequisites: [],
            summary: ""
          };
        }

        // Default to exploration
        const explorationInput: ExplorationAgentInput = {
          userPrompt: topic,
          latestContextSummary: this.learningState.sessionHistory
            .map(h => h.content)
            .join('\n')
        };
        
        const exploration = await this.callAgent(
          EXPLORATION_AGENT_INSTRUCTIONS,
          explorationInput
        ) as ExplorationAgentOutput;

        // Reset and update learning state
        this.learningState = {
          ...this.initializeLearningState(),
          currentTopic: topic,
          learningPath: exploration.subtopics || []
        };

        // Add to session history
        this.addToSessionHistory({
          type: 'explanation',
          content: exploration.summary || '',
          timestamp: new Date().toISOString()
        });

        console.log('Pipeline complete');
        return exploration;
    }
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
    console.log('\n=== Generating Quiz Question ===');
    console.log('Subtopic:', subtopic);
    
    try {
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

      // Validate quiz content with fallbacks
      if (!quiz || typeof quiz !== 'object') {
        console.log('Invalid quiz response, using fallback');
        return {
          question: `What have you learned about ${subtopic}?`,
          type: 'MCQ',
          options: [
            'I understand it well',
            'I need more explanation',
            'I have some questions',
            'Let\'s move on to the next topic'
          ],
          correctAnswer: 'I understand it well'
        };
      }

      // Ensure all required fields exist with fallbacks
      const validatedQuiz = {
        question: quiz.question || `What have you learned about ${subtopic}?`,
        type: quiz.type || 'MCQ',
        options: quiz.type === 'MCQ' ? (quiz.options || [
          'I understand it well',
          'I need more explanation',
          'I have some questions',
          'Let\'s move on to the next topic'
        ]) : undefined,
        correctAnswer: quiz.correctAnswer || (quiz.options?.[0] || 'I understand it well')
      };

      // Store the correct answer for feedback
      this.learningState.lastQuizAnswer = validatedQuiz.correctAnswer;

      console.log('Generated quiz:', validatedQuiz);
      return validatedQuiz;
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Return a fallback question
      return {
        question: `What have you learned about ${subtopic}?`,
        type: 'MCQ',
        options: [
          'I understand it well',
          'I need more explanation',
          'I have some questions',
          'Let\'s move on to the next topic'
        ],
        correctAnswer: 'I understand it well'
      };
    }
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