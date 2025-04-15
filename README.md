# Multiplayer Pai Gow Poker (Face-Up Variant)
 
 [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
 
 ## Overview

This project is a web-based, multiplayer version of **Pai Gow Poker** (specifically the **Face-Up** variant for the initial version). It allows 2-7 friends to connect to a game session and play against an AI dealer using a mock currency called DannyBucks (DB).

The primary goal is to provide a fun, simple, and social way for a small group of friends to play Pai Gow Poker online without the complexity or risk of real money gambling.

## Core Features (MVP Focus & Future Goals)

* **User Management:** Players enter a unique username for identification within the current server session. (Future: Persistent user accounts).
* **Table Management:**
    * **MVP:** Players automatically join a single, shared game table upon connection.
    * **Future:** Create new tables, join specific existing tables, load previous game sessions from a JSON file.
* **Game Management:**
    * **MVP:** Game flow (betting, dealing, showdown) progresses automatically, paced by the backend. The first player implicitly acts as host but without specific controls.
    * **Future:** Designated host player controls game start, pace, pause/resume, and potentially step-back functionality.
* **Gameplay (Face-Up Variant - MVP):**
    * Standard 53-card deck (with Joker).
    * AI Dealer manages gameplay.
    * Players place a fixed bet amount.
    * 7 cards dealt to players (face-down) and dealer (face-up).
    * Dealer hand set immediately according to "House Way".
    * Ace-High Pai Gow rule implemented (automatic push).
    * Players set their 2-card low hand and 5-card high hand (must rank higher) if not Ace-High push.
    * Hands compared against the dealer; Win/Loss/Push outcomes determined (commission-free for MVP).
    * DannyBucks balances updated.
    * **Future:** Support for other variants (e.g., Standard Commission), variable betting, side bets.

## Current Status

This project is **currently under active development**. The immediate focus is on delivering the **Minimum Viable Product (MVP)** described above: a playable Face-Up Pai Gow Poker game on a single table with core mechanics functioning.

See [TASK.md](TASK.md) for a detailed checklist of MVP tasks and progress.

## Tech Stack

* **Frontend:**
    * Framework: SvelteKit
    * Language: TypeScript / JavaScript
    * Styling: TailwindCSS v4 (JIT)
    * UI Components: Carbon Components Svelte (planned)
    * Build Tool: Vite
    * Linting/Formatting: Biome
    * Hosting: Vercel
    * Monorepo: pnpm Workspaces
* **Backend:**
    * Runtime: Node.js
    * Language: JavaScript (ES Modules)
    * WebSockets: `ws` library
    * State Management: In-memory (MVP), JSON file persistence (Future), Database (Later Future)
    * Hosting: Docker container on a dedicated home server, exposed via Cloudflare Tunnel
    * Monorepo: pnpm Workspaces
* **Real-time Communication:** WebSockets (`ws` library on backend, native browser API on frontend)
* **Deployment Pipeline (Future):** GitHub Actions for backend deployment, Vercel integration for frontend.

## Getting Started (Development Setup)

These instructions are for setting up a local development environment.

**Prerequisites:**

* Git
* Node.js (Check `.nvmrc` or `package.json` engines field for version, e.g., v18+)
* npm or yarn
* Docker (for running backend in a container)

**1. Clone the Repository:**

```bash
git clone <repository-url>
cd <repository-directory>