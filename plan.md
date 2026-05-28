## Plan: Static Astro Frases Fetes Game

Build a greenfield static Astro site that fetches a public CSV from /data/frases-fetes.csv at runtime, parses it safely in the browser, and runs a 15-round multiple-choice quiz with localStorage session persistence plus lightweight cookies for return detection. This keeps deployment simple, matches the static-hosting constraint, and avoids adding any backend or private-data assumptions.

**Steps**

1. Scaffold the Astro project in the empty workspace with TypeScript support and the static site defaults. Install dependencies, confirm the standard Astro scripts work, and keep the project framework-free unless Astro’s base template adds anything unnecessary.
2. Create the required app structure under src/pages, src/layouts, src/components, src/scripts, src/styles, and the public/data folder. Keep all interactive logic in small TypeScript modules instead of introducing React or server routes.
3. Define the core types for CSV rows, parsed phrases, round records, answer feedback, and persisted game session. Include explicit nullable handling for malformed or optional CSV fields so invalid rows can be dropped without crashing.
4. Implement CSV loading and parsing in src/scripts/csv.ts. Fetch /data/frases-fetes.csv in the browser, parse quoted CSV rows conservatively, validate required columns, ignore malformed rows safely, normalize tags/difficulty, and surface a Catalan error state if loading fails.
5. Implement game-state persistence helpers in src/scripts/storage.ts. Store playerName, current session, score, current round index, selected answers, and already-used phrase IDs in localStorage with defensive parse/fallback behavior. Store returningUser=true and lastPlayed in cookies with simple helper functions.
6. Implement round generation and progression in src/scripts/game.ts. Build a quiz session from parsed phrases using the requested difficulty progression (1–5 easy, 6–10 medium, 11–15 hard), fill shortages from other levels, cap the total rounds to available valid rows, avoid reusing phrase IDs within a session, generate four unique options per round, and use fallback distractors when concept diversity is insufficient.
7. Build BaseLayout.astro for global page structure, metadata, and global styles import. Make the page static and explicitly avoid any server-side data loading or secrets.
8. Build GameShell.astro as the main semantic shell for the game UI. Render the centered card layout, loading state, error state, onboarding state, active round state, feedback panel, and final-results state. Use semantic headings, progress text, score display, aria-live feedback, and real buttons for all answer and flow controls.
9. Build index.astro as the single entry page that composes the layout and game shell and loads the client TypeScript needed for interaction. Keep the Astro layer thin and static.
10. Add a mobile-first global stylesheet in src/styles/global.css with clear contrast, a strong centered card, large phrase text, large answer buttons, visible progress/score, and correctness indicators that use both text and styling instead of color alone.
11. Add the example CSV file at public/data/frases-fetes.csv using the provided schema and seed rows. Document in the app copy or README-level instructions that this CSV is intentionally public/downloadable in static deployment.
12. Run focused verification: start the dev server, confirm CSV fetch works from /data/frases-fetes.csv, exercise first-visit naming flow, resume flow, new-game flow, round feedback flow, end screen, and error handling by temporarily simulating a missing CSV. Then run the production build and preview to verify the static output behaves the same.
13. Add concise run and deployment instructions covering npm install, npm run dev, npm run build, npm run preview, and static hosting of the generated dist directory.

**Relevant files**

- c:\dev\angel\dit-i-fet\src\pages\index.astro — single static entry page that mounts the game shell.
- c:\dev\angel\dit-i-fet\src\layouts\BaseLayout.astro — shared HTML document wrapper and style import.
- c:\dev\angel\dit-i-fet\src\components\GameShell.astro — semantic game markup and client-script hook.
- c:\dev\angel\dit-i-fet\src\scripts\csv.ts — runtime CSV fetch, parse, validation, and normalization.
- c:\dev\angel\dit-i-fet\src\scripts\game.ts — quiz generation, difficulty progression, scoring, and UI orchestration.
- c:\dev\angel\dit-i-fet\src\scripts\storage.ts — localStorage/cookie read-write helpers and resume logic.
- c:\dev\angel\dit-i-fet\src\styles\global.css — mobile-first visual design and accessible states.
- c:\dev\angel\dit-i-fet\src\types.ts — shared interfaces/types.
- c:\dev\angel\dit-i-fet\public\data\frases-fetes.csv — public phrase source loaded from /data/frases-fetes.csv.
- c:\dev\angel\dit-i-fet\package.json — Astro scripts and dependency surface.
- c:\dev\angel\dit-i-fet\astro.config.mjs or astro.config.ts — static-site configuration if needed.
- c:\dev\angel\dit-i-fet\README.md — local run, build, preview, and static deployment instructions.

**Verification**

1. Run pnpm install, npm run dev, and confirm the browser loads the CSV from /data/frases-fetes.csv without console errors.
2. Validate onboarding: first visit asks “Com et dius?”, stores the player name, sets returning-user cookies, and starts a new game.
3. Validate returning flow: reload after starting a game, confirm greeting by name plus options to continue the incomplete session or start a new one.
4. Validate gameplay: each round shows one phrase, four unique answer buttons, correct/wrong feedback in aria-live, the correct concept, the meaning, and the example when present.
5. Validate progression: easy rounds dominate slots 1–5, medium 6–10, hard 11–15, with fallback filling if a difficulty bucket is short.
6. Validate resilience: malformed CSV rows are ignored, fewer than 15 valid rows reduces the total round count cleanly, and a missing/bad CSV shows a Catalan error message instead of crashing.
7. Run npm run build and npm run preview, then re-test the complete flow from the built static site.

**Decisions**

- The CSV remains in public/data and is intentionally public/downloadable because this is a static educational site and the user explicitly accepts that deployment tradeoff.
- The browser fetches the CSV at runtime from /data/frases-fetes.csv rather than embedding it at build time, because that was explicitly requested and keeps the data source aligned with the static deployment model.
- The implementation stays Astro + TypeScript with minimal client-side JavaScript and no React, backend, authentication, database, server routes, or secrets.
- The first version prioritizes a single polished quiz flow over extra modes, leaderboards, timers, or content authoring tools.

**Further Considerations**

1. If time allows after the MVP, add a small README section for CSV authoring rules so future content updates do not break the parser.
2. If content volume grows, consider pre-validating CSV rows in a build script later, but keep runtime fetch for this first static release unless requirements change.

Never use npm install, but pnpm install instead, and update the README instructions accordingly.
