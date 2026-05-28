import type { GameSession } from "../types";

const STORAGE_KEYS = {
  playerName: "frases-fetes.playerName",
  session: "frases-fetes.session",
  score: "frases-fetes.score",
  currentRoundIndex: "frases-fetes.currentRoundIndex",
  selectedAnswers: "frases-fetes.selectedAnswers",
  alreadyUsedPhraseIds: "frases-fetes.alreadyUsedPhraseIds",
  theme: "frases-fetes.theme",
} as const;

const COOKIE_KEYS = {
  returningUser: "returningUser",
  lastPlayed: "lastPlayed",
} as const;

const memoryStore = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    const probeKey = "frases-fetes.probe";
    globalThis.localStorage.setItem(probeKey, "1");
    globalThis.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function readStorage(key: string): string | null {
  if (hasLocalStorage()) {
    return globalThis.localStorage.getItem(key);
  }

  return memoryStore.get(key) ?? null;
}

function writeStorage(key: string, value: string): void {
  if (hasLocalStorage()) {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
}

function removeStorage(key: string): void {
  if (hasLocalStorage()) {
    globalThis.localStorage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
}

function readJson<T>(key: string): T | null {
  const value = readStorage(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAgeDays = 180): void {
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function getPlayerName(): string | null {
  return readStorage(STORAGE_KEYS.playerName);
}

export function setPlayerName(playerName: string): void {
  writeStorage(STORAGE_KEYS.playerName, playerName);
}

export function clearPlayerName(): void {
  removeStorage(STORAGE_KEYS.playerName);
}

export function getSession(): GameSession | null {
  return readJson<GameSession>(STORAGE_KEYS.session);
}

export function saveSession(session: GameSession): void {
  const serializedSession = JSON.stringify(session);
  writeStorage(STORAGE_KEYS.session, serializedSession);
  writeStorage(STORAGE_KEYS.score, String(session.score));
  writeStorage(
    STORAGE_KEYS.currentRoundIndex,
    String(session.currentRoundIndex),
  );
  writeStorage(
    STORAGE_KEYS.selectedAnswers,
    JSON.stringify(session.selectedAnswers),
  );
  writeStorage(
    STORAGE_KEYS.alreadyUsedPhraseIds,
    JSON.stringify(session.alreadyUsedPhraseIds),
  );
}

export function clearSession(): void {
  removeStorage(STORAGE_KEYS.session);
  removeStorage(STORAGE_KEYS.score);
  removeStorage(STORAGE_KEYS.currentRoundIndex);
  removeStorage(STORAGE_KEYS.selectedAnswers);
  removeStorage(STORAGE_KEYS.alreadyUsedPhraseIds);
}

export function markReturningUser(): void {
  setCookie(COOKIE_KEYS.returningUser, "true");
  setCookie(COOKIE_KEYS.lastPlayed, new Date().toISOString());
}

export function isReturningUser(): boolean {
  return getCookie(COOKIE_KEYS.returningUser) === "true";
}

export function getLastPlayed(): string | null {
  return getCookie(COOKIE_KEYS.lastPlayed);
}

export function clearReturningUser(): void {
  clearCookie(COOKIE_KEYS.returningUser);
  clearCookie(COOKIE_KEYS.lastPlayed);
}

export type ThemePreference = "light" | "dark";

export function getThemePreference(): ThemePreference | null {
  const theme = readStorage(STORAGE_KEYS.theme);
  return theme === "light" || theme === "dark" ? theme : null;
}

export function setThemePreference(theme: ThemePreference): void {
  writeStorage(STORAGE_KEYS.theme, theme);
}
