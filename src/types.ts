export type Difficulty = 1 | 2 | 3;

export interface CsvRow {
  id: string;
  phrase: string;
  correct_concept: string;
  meaning: string;
  example: string;
  difficulty: string;
  tags: string;
  sinonims: string;
}

export interface Phrase {
  id: string;
  phrase: string;
  correctConcept: string;
  meaning: string;
  example: string | null;
  difficulty: Difficulty;
  tags: string[];
  sinonims: string[];
}

export interface QuizRound {
  roundNumber: number;
  phraseId: string;
  phrase: string;
  correctConcept: string;
  meaning: string;
  example: string | null;
  difficulty: Difficulty;
  options: string[];
  sinonims: string[];
  isBonus?: boolean;
}

export interface RoundAnswer {
  phraseId: string;
  selectedConcept: string;
  isCorrect: boolean;
}

export interface GameSession {
  playerName: string;
  rounds: QuizRound[];
  mainRoundCount?: number;
  currentRoundIndex: number;
  score: number;
  selectedAnswers: RoundAnswer[];
  alreadyUsedPhraseIds: string[];
  completed: boolean;
  startedAt: string;
  updatedAt: string;
}

export interface LoadPhrasesResult {
  ok: boolean;
  phrases: Phrase[];
  skippedRows: number;
  error?: string;
}
