import { loadPhrases } from "./csv";
import {
  clearPlayerName,
  clearReturningUser,
  clearSession,
  getLastPlayed,
  getPlayerName,
  getSession,
  getThemePreference,
  isReturningUser,
  markReturningUser,
  saveSession,
  setThemePreference,
  setPlayerName,
} from "./storage";
import type {
  Difficulty,
  GameSession,
  Phrase,
  QuizRound,
  RoundAnswer,
} from "../types";

const DEV_MAIN_ROUNDS = 15;
const FEEDBACK_REVEAL_DELAY_MS = 120;
const NEXT_BUTTON_REVEAL_DELAY_MS = 420;
const FALLBACK_DISTRACTORS = [
  "Alegria",
  "Por",
  "Sorpresa",
  "Cansament",
  "Confusió",
  "Esforç",
  "Rapidesa",
  "Desacord",
];

interface Elements {
  lightThemeOption: HTMLButtonElement;
  darkThemeOption: HTMLButtonElement;
  logoutButton: HTMLButtonElement;
  scoreboard: HTMLElement;
  progressValue: HTMLElement;
  scoreValue: HTMLElement;
  loadingPanel: HTMLElement;
  errorPanel: HTMLElement;
  errorMessage: HTMLElement;
  introPanel: HTMLElement;
  introHeading: HTMLElement;
  introMessage: HTMLElement;
  playerForm: HTMLFormElement;
  playerInput: HTMLInputElement;
  returningActions: HTMLElement;
  continueButton: HTMLButtonElement;
  newGameButton: HTMLButtonElement;
  gamePanel: HTMLElement;
  roundLabel: HTMLElement;
  phrase: HTMLElement;
  options: HTMLElement;
  feedback: HTMLElement;
  feedbackState: HTMLElement;
  feedbackMeaning: HTMLElement;
  feedbackExampleRow: HTMLElement;
  feedbackExample: HTMLElement;
  feedbackSinonimsRow: HTMLElement;
  feedbackSinonims: HTMLElement;
  nextButton: HTMLButtonElement;
  resultPanel: HTMLElement;
  resultScore: HTMLElement;
  resultCorrect: HTMLElement;
  resultPercent: HTMLElement;
  resultReward: HTMLElement;
  resultMessage: HTMLElement;
  restartButton: HTMLButtonElement;
}

let phrases: Phrase[] = [];
let session: GameSession | null = null;
let elements: Elements | null = null;
let nextButtonRevealTimeout: number | null = null;

function getResolvedPlayerName(): string {
  const ui = requireElements();
  return ui.playerInput.value.trim() || getPlayerName() || "";
}

function updateIntroHeading(nameOverride?: string): void {
  const ui = requireElements();
  const candidateName = nameOverride ?? ui.playerInput.value.trim() ?? "";
  const playerName = candidateName || getPlayerName();

  if (playerName) {
    ui.introHeading.textContent = `Hola, ${playerName}`;
    return;
  }

  ui.introHeading.textContent = "Comencem";
}

function updateLogoutVisibility(): void {
  const ui = requireElements();
  const hasPlayer = Boolean(getPlayerName() || session?.playerName);
  ui.logoutButton.hidden = !hasPlayer;
}

function getSystemTheme(): "light" | "dark" {
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getActiveTheme(): "light" | "dark" {
  const pinnedTheme = document.documentElement.dataset.theme;
  if (pinnedTheme === "light" || pinnedTheme === "dark") {
    return pinnedTheme;
  }

  return getSystemTheme();
}

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute("content", theme);
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearNextButtonRevealTimeout(): void {
  if (nextButtonRevealTimeout !== null) {
    globalThis.clearTimeout(nextButtonRevealTimeout);
    nextButtonRevealTimeout = null;
  }
}

function triggerScorePulse(): void {
  const ui = requireElements();

  if (prefersReducedMotion()) {
    return;
  }

  ui.scoreValue.getAnimations().forEach((animation) => {
    animation.cancel();
  });

  ui.scoreValue.animate(
    [
      { transform: "scale(1)", color: "var(--ink)" },
      { transform: "scale(1.14)", color: "var(--correct)", offset: 0.45 },
      { transform: "scale(1)", color: "var(--ink)" },
    ],
    {
      duration: 420,
      easing: "ease-out",
    },
  );
}

function revealNextButton(): void {
  const ui = requireElements();
  const delay = prefersReducedMotion() ? 0 : NEXT_BUTTON_REVEAL_DELAY_MS;

  clearNextButtonRevealTimeout();
  delete ui.nextButton.dataset.visible;

  nextButtonRevealTimeout = globalThis.setTimeout(() => {
    requestAnimationFrame(() => {
      ui.nextButton.dataset.visible = "true";
    });
    nextButtonRevealTimeout = null;
  }, delay);
}

function updateThemeToggle(): void {
  const ui = requireElements();
  const activeTheme = getActiveTheme();

  ui.lightThemeOption.setAttribute(
    "aria-pressed",
    String(activeTheme === "light"),
  );
  ui.darkThemeOption.setAttribute(
    "aria-pressed",
    String(activeTheme === "dark"),
  );
}

function initializeTheme(): void {
  const storedTheme = getThemePreference();
  if (storedTheme) {
    applyTheme(storedTheme);
  }

  updateThemeToggle();

  globalThis
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!getThemePreference()) {
        updateThemeToggle();
      }
    });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function requireElements(): Elements {
  if (elements) {
    return elements;
  }

  const root = document.querySelector<HTMLElement>("[data-game-root]");
  if (!root) {
    throw new Error("No s'ha trobat l'arrel del joc.");
  }

  const get = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Falta l'element ${selector}`);
    }

    return element;
  };

  elements = {
    lightThemeOption: get<HTMLButtonElement>("[data-theme-option='light']"),
    darkThemeOption: get<HTMLButtonElement>("[data-theme-option='dark']"),
    logoutButton: get<HTMLButtonElement>("[data-logout-button]"),
    scoreboard: get<HTMLElement>("[data-scoreboard]"),
    progressValue: get<HTMLElement>("[data-progress-value]"),
    scoreValue: get<HTMLElement>("[data-score-value]"),
    loadingPanel: get<HTMLElement>("[data-panel='loading']"),
    errorPanel: get<HTMLElement>("[data-panel='error']"),
    errorMessage: get<HTMLElement>("[data-error-message]"),
    introPanel: get<HTMLElement>("[data-panel='intro']"),
    introHeading: get<HTMLElement>("[data-intro-heading]"),
    introMessage: get<HTMLElement>("[data-intro-message]"),
    playerForm: get<HTMLFormElement>("[data-player-form]"),
    playerInput: get<HTMLInputElement>("#player-name"),
    returningActions: get<HTMLElement>("[data-returning-actions]"),
    continueButton: get<HTMLButtonElement>("[data-continue-button]"),
    newGameButton: get<HTMLButtonElement>("[data-new-game-button]"),
    gamePanel: get<HTMLElement>("[data-panel='game']"),
    roundLabel: get<HTMLElement>("[data-round-label]"),
    phrase: get<HTMLElement>("[data-phrase]"),
    options: get<HTMLElement>("[data-options]"),
    feedback: get<HTMLElement>("[data-feedback]"),
    feedbackState: get<HTMLElement>("[data-feedback-state]"),
    feedbackMeaning: get<HTMLElement>("[data-feedback-meaning]"),
    feedbackExampleRow: get<HTMLElement>("[data-feedback-example-row]"),
    feedbackExample: get<HTMLElement>("[data-feedback-example]"),
    feedbackSinonimsRow: get<HTMLElement>("[data-feedback-sinonims-row]"),
    feedbackSinonims: get<HTMLElement>("[data-feedback-sinonims]"),
    nextButton: get<HTMLButtonElement>("[data-next-button]"),
    resultPanel: get<HTMLElement>("[data-panel='result']"),
    resultScore: get<HTMLElement>("[data-result-score]"),
    resultCorrect: get<HTMLElement>("[data-result-correct]"),
    resultPercent: get<HTMLElement>("[data-result-percent]"),
    resultReward: get<HTMLElement>("[data-result-reward]"),
    resultMessage: get<HTMLElement>("[data-result-message]"),
    restartButton: get<HTMLButtonElement>("[data-restart-button]"),
  };

  return elements;
}

function hideAllPanels(): void {
  clearNextButtonRevealTimeout();

  const ui = requireElements();
  ui.loadingPanel.hidden = true;
  ui.errorPanel.hidden = true;
  ui.introPanel.hidden = true;
  ui.gamePanel.hidden = true;
  ui.resultPanel.hidden = true;
}

function setScoreboardVisibility(visible: boolean): void {
  requireElements().scoreboard.hidden = !visible;
}

function getFeedbackMessage(score: number, totalRounds: number): string {
  const percentage =
    totalRounds === 0 ? 0 : Math.round((score / totalRounds) * 100);

  if (percentage >= 80) {
    return "Domines molt bé les frases fetes. Continua així.";
  }

  if (percentage >= 50) {
    return "Bon ritme. Encara pots afinar alguns matisos.";
  }

  return "Has fet una primera volta útil. Torna-hi i fixa't en els significats.";
}

function getCurrentWinningStreak(sessionToInspect: GameSession | null): number {
  if (!sessionToInspect) {
    return 0;
  }

  let streak = 0;

  for (
    let index = sessionToInspect.selectedAnswers.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (!sessionToInspect.selectedAnswers[index]?.isCorrect) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getFeedbackStateMessage(answer: RoundAnswer): string {
  if (!answer.isCorrect) {
    return "No és correcte";
  }

  const winningStreak = getCurrentWinningStreak(session);
  if (winningStreak > 0 && winningStreak % 5 === 0) {
    return "Correcte! Ànim! Premi per al final!";
  }

  return "Correcte!";
}

function buildDifficultyPattern(roundCount: number): Difficulty[] {
  return Array.from({ length: roundCount }, (_, index) => {
    if (index < 5) {
      return 1;
    }

    if (index < 10) {
      return 2;
    }

    return 3;
  });
}

function getMainRoundCount(poolLength: number): number {
  return Math.min(DEV_MAIN_ROUNDS, poolLength);
}

function getConfiguredMainRoundCount(
  sessionToInspect: GameSession | null,
): number {
  if (!sessionToInspect) {
    return 0;
  }

  return (
    sessionToInspect.mainRoundCount ??
    sessionToInspect.rounds.filter((round) => !round.isBonus).length
  );
}

function getLastRound(sessionToInspect: GameSession | null): QuizRound | null {
  if (!sessionToInspect || sessionToInspect.rounds.length === 0) {
    return null;
  }

  return sessionToInspect.rounds[sessionToInspect.rounds.length - 1] ?? null;
}

function didWinFinalBonusRound(sessionToInspect: GameSession | null): boolean {
  const lastRound = getLastRound(sessionToInspect);
  if (!lastRound?.isBonus || !sessionToInspect) {
    return false;
  }

  return sessionToInspect.selectedAnswers.some(
    (answer) => answer.phraseId === lastRound.phraseId && answer.isCorrect,
  );
}

function didPerfectMainRounds(sessionToInspect: GameSession | null): boolean {
  if (!sessionToInspect) {
    return false;
  }

  const mainRounds = sessionToInspect.rounds.filter((round) => !round.isBonus);
  if (mainRounds.length === 0) {
    return false;
  }

  return mainRounds.every((round) =>
    sessionToInspect.selectedAnswers.some(
      (answer) => answer.phraseId === round.phraseId && answer.isCorrect,
    ),
  );
}

function getCurrentRoundAnswer(round: QuizRound): RoundAnswer | undefined {
  if (!session) {
    return undefined;
  }

  return session.selectedAnswers.find(
    (answer) => answer.phraseId === round.phraseId,
  );
}

function buildOptions(correctConcept: string, phrasesPool: Phrase[]): string[] {
  const uniqueConcepts = shuffle(
    Array.from(
      new Set(
        phrasesPool
          .map((phrase) => phrase.correctConcept)
          .filter((concept) => concept && concept !== correctConcept),
      ),
    ),
  );

  const options = new Set<string>([correctConcept]);

  for (const concept of uniqueConcepts) {
    options.add(concept);
    if (options.size === 4) {
      break;
    }
  }

  for (const concept of FALLBACK_DISTRACTORS) {
    if (options.size === 4) {
      break;
    }

    if (concept !== correctConcept) {
      options.add(concept);
    }
  }

  return shuffle(Array.from(options));
}

function chooseRounds(pool: Phrase[]): QuizRound[] {
  const totalRounds = getMainRoundCount(pool.length);
  const difficultyPattern = buildDifficultyPattern(totalRounds);
  const available = shuffle(pool);
  const rounds: QuizRound[] = [];

  for (let index = 0; index < totalRounds; index += 1) {
    const preferredDifficulty = difficultyPattern[index];
    const preferredIndex = available.findIndex(
      (phrase) => phrase.difficulty === preferredDifficulty,
    );
    const chosenIndex = Math.max(preferredIndex, 0);
    const phrase = available.splice(chosenIndex, 1)[0];

    rounds.push({
      roundNumber: index + 1,
      phraseId: phrase.id,
      phrase: phrase.phrase,
      correctConcept: phrase.correctConcept,
      meaning: phrase.meaning,
      example: phrase.example,
      difficulty: phrase.difficulty,
      options: buildOptions(phrase.correctConcept, pool),
      sinonims: phrase.sinonims,
    });
  }

  if (available.length > 0) {
    const bonusPhrase = available[0];
    rounds.push({
      roundNumber: rounds.length + 1,
      phraseId: bonusPhrase.id,
      phrase: bonusPhrase.phrase,
      correctConcept: bonusPhrase.correctConcept,
      meaning: bonusPhrase.meaning,
      example: bonusPhrase.example,
      difficulty: bonusPhrase.difficulty,
      options: buildOptions(bonusPhrase.correctConcept, pool),
      sinonims: bonusPhrase.sinonims,
      isBonus: true,
    });
  }

  return rounds;
}

function createSession(playerName: string, pool: Phrase[]): GameSession {
  const rounds = chooseRounds(pool);
  const timestamp = new Date().toISOString();
  const mainRoundCount = rounds.filter((round) => !round.isBonus).length;

  return {
    playerName,
    rounds,
    mainRoundCount,
    currentRoundIndex: 0,
    score: 0,
    selectedAnswers: [],
    alreadyUsedPhraseIds: rounds.map((round) => round.phraseId),
    completed: false,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

function updateProgress(): void {
  if (!session) {
    return;
  }

  const ui = requireElements();
  const currentRound = session.rounds[session.currentRoundIndex];
  const mainRoundCount = getConfiguredMainRoundCount(session);

  ui.progressValue.textContent = currentRound?.isBonus
    ? "Ronda bonus"
    : `${Math.min(session.currentRoundIndex + 1, mainRoundCount)}/${mainRoundCount}`;
  ui.scoreValue.textContent = String(session.score);
}

function persistSession(): void {
  if (!session) {
    return;
  }

  session.updatedAt = new Date().toISOString();
  saveSession(session);
}

function applyOptionState(
  button: HTMLButtonElement,
  round: QuizRound,
  selectedAnswer?: RoundAnswer,
): void {
  const option = button.dataset.optionValue ?? "";
  const isSelected = selectedAnswer?.selectedConcept === option;
  const isCorrect = round.correctConcept === option;

  delete button.dataset.state;

  if (selectedAnswer) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");

    if (isSelected) {
      button.dataset.state = selectedAnswer.isCorrect ? "correct" : "wrong";
    } else if (isCorrect) {
      button.dataset.state = "correct-answer";
    }

    return;
  }

  button.disabled = false;
  button.removeAttribute("aria-disabled");
}

function renderOptions(round: QuizRound, selectedAnswer?: RoundAnswer): void {
  const ui = requireElements();

  const existingButtons = Array.from(
    ui.options.querySelectorAll<HTMLButtonElement>(".option-button"),
  );
  const canReuseButtons =
    existingButtons.length === round.options.length &&
    existingButtons.every(
      (button, index) => button.dataset.optionValue === round.options[index],
    );

  if (canReuseButtons) {
    existingButtons.forEach((button) => {
      applyOptionState(button, round, selectedAnswer);
    });
    return;
  }

  ui.options.replaceChildren();

  for (const option of round.options) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "option-button";
    button.textContent = option;
    button.dataset.optionValue = option;

    if (!selectedAnswer) {
      button.addEventListener("click", () => handleAnswer(option));
    }

    applyOptionState(button, round, selectedAnswer);

    ui.options.append(button);
  }
}

function showFeedback(round: QuizRound, answer: RoundAnswer): void {
  const ui = requireElements();
  ui.feedback.hidden = false;
  ui.nextButton.hidden = false;
  ui.feedback.dataset.tone = answer.isCorrect ? "correct" : "wrong";
  ui.feedbackState.textContent = getFeedbackStateMessage(answer);
  ui.feedbackMeaning.textContent = round.meaning;
  ui.feedbackExample.textContent = round.example ?? "";
  ui.feedbackExampleRow.hidden = !round.example;
  ui.feedbackSinonims.textContent = round.sinonims.join(", ");
  ui.feedbackSinonimsRow.hidden = round.sinonims.length === 0;

  delete ui.feedback.dataset.visible;
  requestAnimationFrame(() => {
    const secondFrameDelay = prefersReducedMotion()
      ? 0
      : FEEDBACK_REVEAL_DELAY_MS;
    globalThis.setTimeout(() => {
      ui.feedback.dataset.visible = "true";
    }, secondFrameDelay);
  });

  revealNextButton();
}

function renderRound(): void {
  if (!session) {
    return;
  }

  const ui = requireElements();
  const round = session.rounds[session.currentRoundIndex];
  if (round?.isBonus && !didPerfectMainRounds(session)) {
    session.completed = true;
    persistSession();
    renderResult();
    return;
  }

  const existingAnswer = getCurrentRoundAnswer(round);

  hideAllPanels();
  setScoreboardVisibility(true);
  ui.gamePanel.hidden = false;
  const mainRoundCount = getConfiguredMainRoundCount(session);
  ui.roundLabel.textContent = round.isBonus
    ? "Ronda bonus"
    : `${Math.min(round.roundNumber, mainRoundCount)}/${mainRoundCount}`;
  ui.phrase.textContent = round.phrase;
  ui.feedback.hidden = true;
  ui.nextButton.hidden = true;
  delete ui.feedback.dataset.tone;
  delete ui.feedback.dataset.visible;
  delete ui.nextButton.dataset.visible;
  updateProgress();
  updateLogoutVisibility();
  renderOptions(round, existingAnswer);

  if (existingAnswer) {
    showFeedback(round, existingAnswer);
  }
}

function renderResult(): void {
  if (!session) {
    return;
  }

  const ui = requireElements();
  const mainRoundCount = getConfiguredMainRoundCount(session);
  const mainCorrectCount = session.selectedAnswers.filter((answer) => {
    const round = session.rounds.find(
      (candidate) => candidate.phraseId === answer.phraseId,
    );
    return answer.isCorrect && !round?.isBonus;
  }).length;
  const percentage =
    mainRoundCount === 0
      ? 0
      : Math.round((mainCorrectCount / mainRoundCount) * 100);
  const wonBonusRound = didWinFinalBonusRound(session);

  hideAllPanels();
  setScoreboardVisibility(true);
  ui.resultPanel.hidden = false;
  ui.resultScore.textContent = String(session.score);
  ui.resultCorrect.textContent = `${mainCorrectCount} / ${mainRoundCount}`;
  ui.resultPercent.textContent = `${percentage}%`;
  ui.resultReward.hidden = !wonBonusRound;
  ui.resultMessage.textContent = getFeedbackMessage(
    mainCorrectCount,
    mainRoundCount,
  );
  ui.progressValue.textContent = wonBonusRound
    ? "Ronda bonus superada"
    : `${mainRoundCount}/${mainRoundCount}`;
  ui.scoreValue.textContent = String(session.score);
  updateLogoutVisibility();
}

function renderIntro(): void {
  const ui = requireElements();
  const playerName = getPlayerName();
  const savedSession = getSession();
  const canContinue = Boolean(
    savedSession && !savedSession.completed && savedSession.rounds.length > 0,
  );
  const lastPlayed = getLastPlayed();
  const lastPlayedSuffix = lastPlayed
    ? ` de ${new Date(lastPlayed).toLocaleDateString("ca-ES")}`
    : "";

  hideAllPanels();
  setScoreboardVisibility(false);
  ui.introPanel.hidden = false;
  ui.playerForm.hidden = false;
  ui.playerInput.value = playerName ?? "";
  updateLogoutVisibility();

  if (playerName && (isReturningUser() || canContinue)) {
    updateIntroHeading(playerName);
    ui.introMessage.textContent = canContinue
      ? `Tens una partida oberta${lastPlayedSuffix}.`
      : "Ja pots començar una nova partida quan vulguis.";
    ui.returningActions.hidden = false;
    ui.continueButton.hidden = !canContinue;
    ui.newGameButton.textContent = "Nova partida";
    return;
  }

  updateIntroHeading();
  ui.introMessage.textContent = "Escriu el teu nom per començar la partida.";
  ui.returningActions.hidden = true;
}

function startNewGame(playerName: string): void {
  session = createSession(playerName, phrases);
  setPlayerName(playerName);
  markReturningUser();
  persistSession();
  updateLogoutVisibility();
  renderRound();
}

function logoutPlayer(): void {
  session = null;
  clearSession();
  clearPlayerName();
  clearReturningUser();

  const ui = requireElements();
  ui.playerInput.value = "";
  updateIntroHeading("");
  renderIntro();
  ui.playerInput.focus();
}

function handleAnswer(selectedConcept: string): void {
  if (!session) {
    return;
  }

  const round = session.rounds[session.currentRoundIndex];
  const alreadyAnswered = getCurrentRoundAnswer(round);
  if (alreadyAnswered) {
    return;
  }

  const answer: RoundAnswer = {
    phraseId: round.phraseId,
    selectedConcept,
    isCorrect: selectedConcept === round.correctConcept,
  };

  session.selectedAnswers = [...session.selectedAnswers, answer];
  if (answer.isCorrect) {
    session.score += 1;
  }

  persistSession();
  updateProgress();
  if (answer.isCorrect) {
    triggerScorePulse();
  }
  renderOptions(round, answer);
  showFeedback(round, answer);
}

function handleNextRound(): void {
  if (!session) {
    return;
  }

  const nextRoundIndex = session.currentRoundIndex + 1;
  if (nextRoundIndex >= session.rounds.length) {
    session.completed = true;
    persistSession();
    renderResult();
    return;
  }

  const nextRound = session.rounds[nextRoundIndex];
  if (nextRound?.isBonus && !didPerfectMainRounds(session)) {
    session.completed = true;
    persistSession();
    renderResult();
    return;
  }

  session.currentRoundIndex = nextRoundIndex;
  persistSession();
  renderRound();
}

function hydrateSavedSession(savedSession: GameSession): boolean {
  const phraseIds = new Set(phrases.map((phrase) => phrase.id));
  const allRoundsStillValid = savedSession.rounds.every((round) =>
    phraseIds.has(round.phraseId),
  );

  if (!allRoundsStillValid || savedSession.rounds.length === 0) {
    clearSession();
    return false;
  }

  session = savedSession;
  return true;
}

function bindEvents(): void {
  const ui = requireElements();

  ui.lightThemeOption.addEventListener("click", () => {
    setThemePreference("light");
    applyTheme("light");
    updateThemeToggle();
  });

  ui.darkThemeOption.addEventListener("click", () => {
    setThemePreference("dark");
    applyTheme("dark");
    updateThemeToggle();
  });

  ui.logoutButton.addEventListener("click", () => {
    logoutPlayer();
  });

  ui.playerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const playerName = getResolvedPlayerName();

    if (!playerName) {
      ui.playerInput.focus();
      return;
    }

    clearSession();
    startNewGame(playerName);
  });

  ui.playerInput.addEventListener("input", () => {
    updateIntroHeading(ui.playerInput.value.trim());
  });

  ui.continueButton.addEventListener("click", () => {
    const savedSession = getSession();
    if (savedSession && hydrateSavedSession(savedSession)) {
      const playerName = getResolvedPlayerName();
      if (playerName) {
        session.playerName = playerName;
        setPlayerName(playerName);
        persistSession();
      }
      markReturningUser();
      renderRound();
    } else {
      renderIntro();
    }
  });

  ui.newGameButton.addEventListener("click", () => {
    const playerName = getResolvedPlayerName();
    if (!playerName) {
      ui.returningActions.hidden = true;
      ui.playerInput.focus();
      return;
    }

    clearSession();
    startNewGame(playerName);
  });

  ui.nextButton.addEventListener("click", () => {
    handleNextRound();
  });

  ui.restartButton.addEventListener("click", () => {
    const playerName = getPlayerName() ?? session?.playerName ?? "";
    clearSession();
    startNewGame(playerName);
  });
}

function showError(message: string): void {
  const ui = requireElements();
  hideAllPanels();
  setScoreboardVisibility(false);
  updateLogoutVisibility();
  ui.errorPanel.hidden = false;
  ui.errorMessage.textContent = message;
}

async function initGame(): Promise<void> {
  initializeTheme();
  bindEvents();

  const result = await loadPhrases();
  if (!result.ok) {
    showError(result.error ?? "No s'ha pogut carregar el joc.");
    return;
  }

  phrases = result.phrases;

  if (phrases.length === 0) {
    showError("No hi ha frases disponibles per jugar ara mateix.");
    return;
  }

  const savedSession = getSession();
  if (
    savedSession &&
    !savedSession.completed &&
    hydrateSavedSession(savedSession)
  ) {
    renderIntro();
    return;
  }

  renderIntro();
}

await initGame();
