<div align="center">

<img src="artifacts/fitvision/public/favicon.svg" width="120" height="120" alt="Wise Body logo" />

# Wise Body — Fitness App

**Home workouts, recovery and breathing — no equipment required.**
Part of [The Wise Cloud](https://thewise.cloud).

[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)](#tech-stack)
[![Language](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](#tech-stack)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)](#progressive-web-app)
[![Monorepo](https://img.shields.io/badge/monorepo-pnpm%20workspaces-F69220?logo=pnpm&logoColor=white)](#monorepo-layout)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](#license)

</div>

---

## Overview

**Wise Body** is an installable Progressive Web App that delivers guided strength, mobility, recovery and breathing sessions you can do in your living room — with **zero equipment**. The app curates short, focused routines, animates each exercise with a unique on-screen silhouette, tracks your progress over time, and works fully offline once installed.

The product lives inside a pnpm workspace monorepo together with a shared API server and a component-prototyping sandbox, so the same TypeScript types and API contracts flow end-to-end from the database to the UI.

## Highlights

- **No-equipment programs** — strength, mobility, recovery and breath-work, all designed for a small living-room footprint.
- **Per-exercise animations** — every exercise has its own hand-tuned silhouette animation so the cue is unmistakable, even at a glance.
- **Personalised onboarding** — a short flow tailors the program to the user's goal, fitness level and gender.
- **Offline-first PWA** — installable to the home screen, works offline via service worker, with proper manifest, icons and theme color.
- **Fully responsive** — mobile-first layout that scales gracefully to tablet and desktop.
- **Dark mode** — system-aware, with brand-tuned palettes for both modes.
- **Accessible by default** — semantic markup, keyboard support, reduced-motion respected, and ARIA wired through the component library.

## Screens

| Welcome | Workout | Session |
| :---: | :---: | :---: |
| Personalised onboarding flow | Browse and pick today's routine | Animated, timed, equipment-free |

> Open the app and the welcome screen will guide you through the rest.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | **React 18** + **Vite 7** + **TypeScript 5.9** |
| Styling | **Tailwind CSS** + custom design tokens |
| UI primitives | **Radix UI** (accessible, unstyled primitives) |
| Forms / state | **react-hook-form** + **zod** validation |
| Data | **TanStack Query** + **Orval**-generated hooks |
| API | **Express 5** (Node 24) bundled with **esbuild** |
| Database | **PostgreSQL** + **Drizzle ORM** + `drizzle-zod` |
| Tests | Playwright (e2e) |
| Package manager | **pnpm** workspaces |

## Monorepo Layout

```
.
├── artifacts/
│   ├── fitvision/         # Wise Body PWA (React + Vite)
│   ├── api-server/        # Shared Express 5 API server
│   └── mockup-sandbox/    # Component prototyping sandbox
├── packages/              # Shared TypeScript packages (types, schemas, utils)
├── pnpm-workspace.yaml
└── package.json
```

Each artifact owns its own dependencies and runs independently, but shares types and API contracts through workspace packages.

## Getting Started

### Prerequisites

- **Node.js 24+**
- **pnpm 9+**
- **PostgreSQL** (only required if you run the API server locally against a local DB)

### Install

```bash
pnpm install
```

### Run the app

```bash
# Run the Wise Body PWA in dev mode
pnpm --filter @workspace/fitvision run dev

# In another terminal, run the API server
pnpm --filter @workspace/api-server run dev
```

The PWA will be served on the port assigned by the workspace (Vite reads `PORT`); the API listens on `:8080` by default.

### Build for production

```bash
pnpm run build         # typecheck + build everything
pnpm --filter @workspace/fitvision run build   # build only the PWA
```

## Scripts Cheat-sheet

| Command | What it does |
| --- | --- |
| `pnpm run typecheck` | Full TypeScript typecheck across every package |
| `pnpm run build` | Typecheck + production build of every package |
| `pnpm --filter @workspace/fitvision run dev` | Start the PWA in dev mode |
| `pnpm --filter @workspace/fitvision run build` | Build the PWA for production |
| `pnpm --filter @workspace/fitvision run typecheck` | Typecheck just the PWA |
| `pnpm --filter @workspace/api-server run dev` | Start the API server |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate React Query hooks + Zod schemas from the OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push Drizzle schema changes (dev only) |

## Progressive Web App

Wise Body ships as an installable PWA:

- `public/manifest.json` declares name, theme color, display mode and icons.
- `public/service-worker.js` enables offline-first caching of the shell and assets.
- `public/favicon.svg` and `icon-192.png` / `icon-512.png` provide adaptive icons.
- The app advertises an "Install Wise Body" prompt where the platform supports it.

Users get a native-feeling icon on their home screen, full-screen launch, and the app continues to work without a network connection.

## Branding

- **Brand red:** `#A8121A`
- **Surface:** `#fafaf9` light / deep neutrals dark
- **Accent:** warm gold `#FFD89B` for the "wise" cue
- **Logo:** bold dumbbell silhouette on a wine→crimson gradient badge

## Roadmap

- [ ] Per-user progress sync across devices
- [ ] Weekly programs with adaptive difficulty
- [ ] Apple Health / Google Fit integration
- [ ] Audio coaching during sessions
- [ ] Multi-language support

## Contributing

This repository powers a production app, so contributions are reviewed against the existing design and product direction. If you'd like to propose a change:

1. Open an issue describing the problem or improvement.
2. Once aligned, fork and submit a pull request from a feature branch.
3. Make sure `pnpm run typecheck` and `pnpm run build` pass before requesting review.

## License

Proprietary — all rights reserved. Part of **The Wise Cloud**.
For licensing or partnership enquiries, please open a private issue or contact the maintainer.

---

<div align="center">
<sub>Built with care · <strong>fitness.thewise.cloud</strong></sub>
</div>
