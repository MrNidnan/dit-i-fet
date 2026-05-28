# Frases Fetes

Petit joc estàtic fet amb Astro i TypeScript per practicar frases fetes en català a partir d'un fitxer CSV públic.

## Llicència

Aquest projecte es distribueix sota la llicència GNU GPL v3. Consulta el fitxer `LICENSE` per al text complet.

## Arquitectura

- Astro genera el layout i la pàgina estàtica.
- Un mòdul petit de TypeScript al navegador carrega `/data/frases-fetes.csv`, crea les rondes i controla la UI.
- La sessió es desa a `localStorage` i els marcadors de retorn es guarden amb cookies lleugeres.

## Nota sobre el CSV

En un desplegament estàtic d'Astro, qualsevol fitxer dins de `public/` és públic i descarregable. Això inclou `public/data/frases-fetes.csv` servit com a `/data/frases-fetes.csv`. En aquest MVP educatiu això és intencional i acceptable.

## Desenvolupament local

```bash
pnpm install
pnpm dev
```

Obre l'URL que mostra Astro, normalment `http://localhost:4321`.

## Build de producció

```bash
pnpm build
pnpm preview
```

`pnpm preview` serveix localment la carpeta `dist/` per validar el build estàtic.

## Desplegament estàtic

1. Executa `pnpm build`.
2. Publica el contingut de `dist/` a qualsevol host estàtic, com Netlify, Vercel en mode static, GitHub Pages o Cloudflare Pages.
3. Assegura't que el fitxer `dist/data/frases-fetes.csv` es publica tal com està perquè el navegador el pugui descarregar.

## Comandes útils

```bash
pnpm astro --help
```
