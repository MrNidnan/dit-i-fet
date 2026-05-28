import type { CsvRow, Difficulty, LoadPhrasesResult, Phrase } from "../types";

const REQUIRED_COLUMNS = [
  "id",
  "phrase",
  "correct_concept",
  "meaning",
  "example",
  "difficulty",
  "tags",
] as const;

const OPTIONAL_COLUMNS = ["sinonims"] as const;

function splitCsvRows(source: string): string[] {
  const rows: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (!insideQuotes && (character === "\n" || character === "\r")) {
      if (current.trim()) {
        rows.push(current);
      }

      current = "";

      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      continue;
    }

    current += character;
  }

  if (current.trim()) {
    rows.push(current);
  }

  return rows;
}

function splitCsvColumns(row: string): string[] {
  const columns: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    const nextCharacter = row[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (!insideQuotes && character === ",") {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  columns.push(current.trim());
  return columns;
}

function parseCsv(text: string): CsvRow[] {
  const rows = splitCsvRows(text);
  if (rows.length < 2) {
    return [];
  }

  const header = splitCsvColumns(rows[0]).map((column) =>
    column.trim().toLowerCase(),
  );
  const hasRequiredColumns = REQUIRED_COLUMNS.every((column) =>
    header.includes(column),
  );

  if (!hasRequiredColumns) {
    return [];
  }

  return rows.slice(1).map((row) => {
    const values = splitCsvColumns(row);
    const record = {} as Record<keyof CsvRow, string>;

    header.forEach((column, index) => {
      if (
        REQUIRED_COLUMNS.includes(column as (typeof REQUIRED_COLUMNS)[number]) ||
        OPTIONAL_COLUMNS.includes(column as (typeof OPTIONAL_COLUMNS)[number])
      ) {
        record[column as keyof CsvRow] = values[index] ?? "";
      }
    });

    return {
      id: record.id ?? "",
      phrase: record.phrase ?? "",
      correct_concept: record.correct_concept ?? "",
      meaning: record.meaning ?? "",
      example: record.example ?? "",
      difficulty: record.difficulty ?? "",
      tags: record.tags ?? "",
      sinonims: record.sinonims ?? "",
    };
  });
}

function parseDifficulty(value: string): Difficulty | null {
  const difficulty = Number.parseInt(value, 10);
  if (difficulty === 1 || difficulty === 2 || difficulty === 3) {
    return difficulty;
  }

  return null;
}

function normalizePhrase(row: CsvRow): Phrase | null {
  const id = row.id.trim();
  const phrase = row.phrase.trim();
  const correctConcept = row.correct_concept.trim();
  const meaning = row.meaning.trim();
  const difficulty = parseDifficulty(row.difficulty);

  if (!id || !phrase || !correctConcept || !meaning || difficulty === null) {
    return null;
  }

  return {
    id,
    phrase,
    correctConcept,
    meaning,
    example: row.example.trim() ? row.example.trim() : null,
    difficulty,
    tags: row.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    sinonims: row.sinonims
      .split(",")
      .map((sinonim) => sinonim.trim())
      .filter(Boolean),
  };
}

export async function loadPhrases(
  url = "/data/frases-fetes.csv",
): Promise<LoadPhrasesResult> {
  try {
    const response = await fetch(url, { credentials: "same-origin" });

    if (!response.ok) {
      return {
        ok: false,
        phrases: [],
        skippedRows: 0,
        error:
          "No s'ha pogut descarregar el fitxer de frases. Revisa que existeixi a /data/frases-fetes.csv.",
      };
    }

    const text = await response.text();
    const parsedRows = parseCsv(text);

    if (parsedRows.length === 0) {
      return {
        ok: false,
        phrases: [],
        skippedRows: 0,
        error: "El CSV no té el format esperat o no conté files vàlides.",
      };
    }

    const seenIds = new Set<string>();
    const phrases: Phrase[] = [];
    let skippedRows = 0;

    for (const row of parsedRows) {
      const phrase = normalizePhrase(row);

      if (!phrase || seenIds.has(phrase.id)) {
        skippedRows += 1;
        continue;
      }

      seenIds.add(phrase.id);
      phrases.push(phrase);
    }

    if (phrases.length === 0) {
      return {
        ok: false,
        phrases: [],
        skippedRows,
        error: "No hi ha prou frases vàlides per començar la partida.",
      };
    }

    return {
      ok: true,
      phrases,
      skippedRows,
    };
  } catch {
    return {
      ok: false,
      phrases: [],
      skippedRows: 0,
      error:
        "Hi ha hagut un error carregant el CSV. Torna-ho a provar d'aquí a un moment.",
    };
  }
}
