/**
 * RADSIM Educational Types
 * Type definitions for the radiology education system
 */

// Skill levels for user proficiency
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

// Learning modes that affect system behavior
export type EducationalMode = 'tutorial' | 'practice' | 'assessment';

// Educational case structure
export interface EducationalCase {
  id: string;
  version: string;

  metadata: {
    title: string;
    description: string;
    difficulty: SkillLevel;
    estimatedTime: number; // in minutes
    tags: string[];
    created: Date;
    updated: Date;
    author?: string;
  };

  clinical: {
    modality: 'CT' | 'MR' | 'XR' | 'US';
    bodyPart: string;
    patientAge?: number;
    patientSex?: 'M' | 'F' | 'O';
    clinicalHistory?: string;
  };

  educational: {
    learningObjectives: string[];
    keyFindings: string[];
    teachingPoints: string[];
  };

  // Path to the actual image data
  imagePath?: string;
  imageUrl?: string;
}

// User profile for tracking progress
export interface UserProfile {
  userId: string;
  skillLevel: SkillLevel;
  currentMode: EducationalMode;
  specialtyFocus: string[];

  statistics: {
    totalCases: number;
    totalHours: number;
    averageScore: number;
    lastActive: Date;
  };

  preferences: {
    hintsEnabled: boolean;
    autoAdvance: boolean;
    soundEnabled: boolean;
  };
}

// Mode configuration that affects system behavior
export interface ModeConfiguration {
  hintsEnabled: boolean;
  hintsAutomatic: boolean;
  validationRealtime: boolean;
  tutorActive: boolean;
  timeLimit: number | null; // seconds, null for unlimited
  allowRetry: boolean;
  showGroundTruth: 'never' | 'on-request' | 'after-submission';
}

// Learning progress tracking
export interface LearningProgress {
  caseId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  mode: EducationalMode;

  interactions: {
    toolsUsed: string[];
    hintsRequested: number;
    measurementsMade: number;
    timeSpent: number; // seconds
  };

  performance?: {
    score: number;
    accuracy: number;
    completed: boolean;
  };
}

// Hint structure for progressive guidance
export interface EducationalHint {
  level: 1 | 2 | 3 | 4 | 5; // Increasing specificity
  text: string;
  visualCue?: {
    type: 'highlight' | 'arrow' | 'pulse' | 'box';
    coordinates?: number[];
    duration?: number;
  };
  triggerCondition?: {
    type: 'time' | 'error' | 'request' | 'inactivity';
    value: number;
  };
}

// Socratic tutor message types
export interface TutorMessage {
  id: string;
  timestamp: Date;
  role: 'tutor' | 'student';
  content: string;

  metadata?: {
    questionType?: 'leading' | 'diagnostic' | 'clarifying';
    expectedAnswer?: string;
    visualReference?: {
      tool?: string;
      coordinates?: number[];
    };
  };
}

// Session state for educational activities
export interface EducationalSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  mode: EducationalMode;
  currentCase?: EducationalCase;
  progress: LearningProgress;
  tutorConversation: TutorMessage[];
}