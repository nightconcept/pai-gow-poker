# Pai Gow Poker - Task List (HONO_MIGRATION_TASK.md)

This document tracks the development tasks for the multiplayer Pai Gow Poker application. It follows the logical dependency chain outlined in the PRD for the MVP, includes milestones, a backlog for future enhancements, and a section for mid-process discoveries.

**Legend:**

* `[ ]` To Do
* `[x]` Done
* `(Human)`: Task primarily requires human judgment, configuration, or complex integration.
* `(AI Assist + Human)`: Task involves boilerplate or straightforward code porting where AI can generate a first draft, but requires human review, integration, and adaptation.

**Prompt to AI:** “Update TASK.md to mark \[TASK_ID\] as done” or “Update TASK.md to add task '\[NEW_TASK_DESCRIPTION\]' under \[PHASE/SECTION\]”.

---

## Phase 1: Minimum Viable Product (MVP) - Face-Up Variant

*(These tasks are mostly complete as per the previous state)*

### MVP Sub-Phase 1: Backend Foundation & Core Structures

*(Completed)*

1.  `[x]` Backend: Initialize Node.js Project
2.  `[x]` Backend: Implement Basic WebSocket Server
3.  `[x]` Backend: Define In-Memory State (Player, GameTable)
4.  `[x]` Backend: Implement Username Handling & Uniqueness Check

### MVP Sub-Phase 2: Core Game Mechanics (Backend - Face-Up Variant)

*(Completed)*
5.  `[x]` Backend: Implement Deck Creation, Shuffling, Dealing
6.  `[x]` Backend: Implement Dealer "House Way" & Ace-High Push Logic
7.  `[x]` Backend: Implement Basic Betting & DB Balance Logic
8.  `[x]` Backend: Implement Player Hand Input Handling & Validation
9.  `[x]` Backend: Implement Hand Comparison, Outcome Logic & DB Updates

### MVP Sub-Phase 3: Frontend Foundation & Connection

*(Completed)*
10. `[x]` Frontend: Initialize SvelteKit Project (Vite, Tailwind, Biome)
11. `[x]` Frontend: Create WebSocket Client Service
12. `[x]` Frontend: Set Up Svelte Stores for Game State
13. `[x]` Frontend: Implement Username Input UI & Connection Trigger

### MVP Sub-Phase 4: Frontend Gameplay UI & Interaction

*(Completed)*
14. `[x]` Frontend: Create Basic Game Table View Component
15. `[x]` Frontend: Display Basic Game State (Players, DB, Phase)
16. `[x]` Frontend: Display Dealer's Face-Up Hand & Set Hands
17. `[x]` Frontend: Display Player's 7 Cards (Text/CSS)
18. `[x]` Frontend: Implement Fixed Bet UI Button
19. `[x]` Frontend: Implement Player Hand Setting UI Interaction (Completed: 2025-04-15)
20. `[x]` Frontend: Display Round Results (Win/Loss/Push, Balance) (Completed: 2025-04-15)

### MVP Sub-Phase 5: Basic Infrastructure & Deployment (MVP)

*(Partially Complete)*
21. `[x]` Infrastructure: Create Backend Dockerfile *(Note: Will need update in Phase 2)*
22. `[ ]` Infrastructure: Configure Cloudflare Tunnel
23. `[x]` Infrastructure: Set up Vercel Project for Frontend
24. `[ ]` Infrastructure: Perform Initial Manual Deployment *(Blocked by Task 22 & Phase 2)*

---

## Phase 2: Backend Migration to Hono Framework

This phase focuses on replacing the custom Node.js/`ws` backend implementation with one based on the Hono web framework, while retaining the existing game logic.

*(Configuration Reference: Hono Docs - [https://hono.dev/](https://hono.dev/), Node.js Server - [https://hono.dev/getting-started/nodejs](https://hono.dev/getting-started/nodejs), WebSockets - [https://hono.dev/helpers/websocket](https://hono.dev/helpers/websocket))*

1.  **\[x\] Backend: Install Hono Dependencies & Update Config (Human)**
    * `ID: HONO-DEP`
    * Stop any running backend dev server.
    * In `apps/backend/`, run `pnpm add hono @hono/node-server @hono/ws`.
    * (Optional) Remove direct `ws` dependency if `@hono/node-ws` is sufficient: `pnpm remove ws`.
    * Review `apps/backend/package.json` to ensure dependencies are added.
    * Review `apps/backend/tsconfig.json` - usually no changes needed, but verify `moduleResolution` is Node-compatible (e.g., `NodeNext` or `Node16`) and `esModuleInterop` is true.
    * **Verify:** `pnpm install` runs without errors in the workspace root. `package.json` reflects new dependencies.

2.  **\[x\] Backend: Basic Hono Server Setup (AI Assist + Human)**
    * `ID: HONO-SETUP`
    * *(AI Assist):* Prompt AI: "Generate a basic Hono server setup in `apps/backend/src/server.ts` using `@hono/node-server`. Include a simple GET route at `/` that returns 'OK'."
    * *(Human):* Create/rename `apps/backend/src/index.ts` to `apps/backend/src/server.ts`. Paste or adapt the AI-generated code. Ensure the server listens on a port (e.g., from `process.env.PORT` or a default like 8080).
    * *(Human):* Update `apps/backend/package.json` scripts (`dev`, `start`) to run `server.ts` (e.g., using `tsx` for dev: `tsx watch src/server.ts`, and `node dist/server.js` for start after building).
    * **Verify:** Run `pnpm --filter backend dev`. Access `http://localhost:8080/` in a browser; verify it returns 'OK'.

3.  **\[x\] Backend: Integrate Game State Management (Human)**
    * `ID: HONO-STATE`
    * *(Human):* Review the existing game state logic (likely involving `GameTable`, `Player` classes/objects in separate files).
    * *(Human):* Decide how to manage the `GameTable` instance(s). For MVP's single table, a simple singleton pattern might suffice: Instantiate the `GameTable` once at the server level and import it where needed.
    * *(Human):* Import the `GameTable` instance/manager into `server.ts`. *No code generation needed here, mostly import statements and potentially initialization adjustments.*
    * *(Human):* Consider using Hono middleware for future multi-table scenarios, but stick to simple import for now. `// TODO: Refactor state management using Hono context/middleware for multi-table support.`
    * **Verify:** Server still starts. Can add a temporary test route in `server.ts` that accesses the imported `GameTable` instance and logs some basic info (e.g., number of players) to confirm it's accessible.

4.  **\[ \] Backend: Implement WebSocket Route & Connection Handling (AI Assist + Human)**
    * `ID: HONO-WS-CONNECT`
    * *(AI Assist):* Prompt AI: "Generate a Hono WebSocket route at `/ws` using `@hono/ws` in `apps/backend/src/server.ts`. Include handlers for `onOpen`, `onClose`, and `onError` that log basic messages."
    * *(Human):* Integrate the generated route into the Hono app in `server.ts`.
    * *(Human):* Port the **existing Player creation/removal logic** from the old `ws` `connection`/`close` handlers into the Hono `onOpen`/`onClose` handlers.
        * In `onOpen`: Create a new `Player` instance, potentially assign a temporary ID, add it to the imported `GameTable` instance. Store the WebSocket instance (`ws`) or a unique ID associated with the Player for later communication.
        * In `onClose`: Find the corresponding `Player` based on the closed WebSocket connection and remove them from the `GameTable`. Broadcast 'playerLeft' (logic likely exists, needs adapting).
    * *(Human):* Adapt logic to access the `GameTable` instance (imported from Task HONO-STATE). Use Hono's context `c` within handlers if needed.
    * **Verify:** Restart backend. Frontend client attempts connection to `ws://localhost:PORT/ws`. Verify backend logs 'WebSocket opened' and 'WebSocket closed' messages. Use debugger or logs to confirm Player objects are added/removed from the `GameTable` state correctly.

5.  **\[ \] Backend: Implement WebSocket Message Handling (AI Assist + Human)**
    * `ID: HONO-WS-MSG`
    * *(AI Assist):* Prompt AI: "Generate the structure for the `onMessage` handler within the Hono WebSocket route in `server.ts`. Include parsing the incoming `event.data` as JSON and a basic `switch` statement structure based on a message `type` property."
    * *(Human):* Integrate the generated `onMessage` structure.
    * *(Human):* **Carefully port the existing message handling logic** (likely a large `switch` statement handling `setUsername`, `placeBet`, `setPlayerHand`, etc.) from the old `ws` `message` handler into the new Hono `onMessage` handler.
        * Adapt how the `Player` object associated with the current `ws` connection is retrieved.
        * Adapt calls to game logic functions (dealing, setting hands, comparing, etc.), passing the `GameTable` instance and relevant player/payload data.
        * Adapt how messages are sent back:
            * Direct reply: `ws.send(JSON.stringify({ type: '...', payload: {...} }))`
            * Broadcast: Iterate through all active WebSocket connections stored (e.g., associated with Players in `GameTable.players`) and call `ws.send()` for each. Hono context might offer helpers depending on setup.
    * *(Human):* Ensure error handling (e.g., invalid JSON, invalid actions) is ported correctly, sending error messages back to the specific client.
    * **Verify:** Restart backend. Use the frontend to trigger various actions (setUsername, placeBet, setPlayerHand). Verify backend processes messages correctly using existing game logic, updates state, and sends appropriate responses/broadcasts back to the frontend(s). Test error conditions.

6.  **\[ \] Backend: Update Dockerfile for Hono (Human)**
    * `ID: HONO-DOCKER`
    * *(Human):* Edit `apps/backend/Dockerfile`.
    * Ensure `pnpm install` step correctly installs Hono dependencies.
    * If using a build step (`pnpm build`), ensure it's run and copies the `dist` folder correctly.
    * Update the `CMD` or `ENTRYPOINT` to run the Hono server using Node.js (e.g., `CMD ["node", "dist/server.js"]` if built, or `CMD ["pnpm", "start"]` if running directly).
    * Ensure the `EXPOSE` command matches the port Hono listens on.
    * **Verify:** Build the Docker image using `docker build . -t pai-gow-hono-backend` (run from workspace root or adjust path). Run the container: `docker run -p 8080:8080 pai-gow-hono-backend`. Verify the server starts inside the container and responds to basic HTTP/WebSocket requests.

7.  **\[ \] Testing: Full End-to-End Verification (Human)**
    * `ID: HONO-TEST`
    * *(Human):* Run the Hono backend (either locally via `pnpm dev` or via the Docker container).
    * *(Human):* Run the SvelteKit frontend (`pnpm --filter frontend dev`).
    * *(Human):* Connect multiple clients (multiple browser tabs/windows).
    * *(Human):* Test the *entire* MVP game flow thoroughly:
        * Connect and set unique usernames.
        * Attempt to set duplicate usernames.
        * Place bets.
        * Observe dealer dealing and setting hand (including Ace-High Push).
        * Set player hands (test valid and invalid splits).
        * Observe showdown and results (Win/Loss/Push).
        * Verify DannyBucks updates correctly.
        * Verify player list updates on join/leave.
        * Verify game state messages update correctly.
    * **Verify:** The game functions identically to the previous Node.js/`ws` version from the frontend perspective. No regressions in MVP functionality.

---

## Milestones

* `[x]` **M1: Backend Foundation Complete:** MVP Tasks 1-4 finished.
* `[x]` **M2: Core Game Logic Complete:** MVP Tasks 5-9 finished.
* `[x]` **M3: Frontend Connection & State Complete:** MVP Tasks 10-13 finished.
* `[x]` **M4: MVP UI Interaction Complete:** MVP Tasks 14-20 finished.
* `[ ]` **M5: MVP Deployed & Playable:** MVP Tasks 21-24 finished. *(Blocked by Task 22 & Phase 2)*
* `[ ]` **M6: Hono Migration Complete & Verified:** Phase 2 Tasks HONO-DEP to HONO-TEST finished. Backend successfully migrated to Hono.

---

## Enhancements (PRE-RELEASE)

*(Tasks to complete before M5/M6)*

* \[x\] Issue 1. Center graphics vertically and horizontally. (Frontend)
* \[x\] Issue 2. Create a new Card component (Frontend) (Done: 2025-04-16)
* \[x\] Issue 3. Add System/Chat Box (Frontend) (Done: 2025-04-18)
* \[ \] Issue 4. `ID: FEAT-DELAYS` Add waits/delays between game states for better UX (Backend: add delays; Frontend: potentially show timers/indicators). (Human)
* \[ \] Issue 5. `ID: FEAT-TABLE-LOOK` Make the the areas look more like a table (CSS/Styling). (Human)
* \[x\] Issue 6. Componentize the Dealer area, Player area, Other Players Area, and top bar. (Frontend) (Done: 2025-04-16)
* \[x\] Issue 7. Refactor username selection to it's own component. (Frontend)
* \[x\] Issue 8. Fix DB amount not updating properly. (Backend/Frontend) (Done: 2025-04-17)
* \[ \] Issue 9. `ID: FEAT-DARKMODE` Add a dark mode toggle component (Frontend - Tailwind). (Human)
* \[ \] Issue 10. `ID: FEAT-BUTTON-CLEANUP` Cleanup buttons (Enable/disable logic vs static presence). (Frontend) (Human)
* \[x\] Issue 11. Display round DB change (+/- X) with color coding. (Frontend) (Done: 2025-04-19)
* \[ \] Issue 12. `ID: FEAT-ERROR-LOGGING` Improve backend error logging, especially during hand setting/validation. (Backend) (Human)
* \[ \] Issue 13. `ID: FEAT-READY-CHECKS` Player state ready indicators (e.g., check marks before starting round). (Backend/Frontend) (Human)
* \[x\] Issue 14. System messages not showing every state change - Fix subscription. (Frontend) (Done: 2025-04-20)
* \[ \] Issue 15. `ID: FEAT-PLAYER-AREA-CLEANUP` Player area button layout/cleanup. (Frontend) (Human)
* \[ \] Issue 16. `ID: FEAT-RECOVERY` Implement basic error state recovery (e.g., host action to reset table state) without server restart. (Backend/Frontend) (Human)

---

## Future Enhancements (Post-MVP / Post-Hono Migration)

*(Items from PRD Roadmap Phase 2 onwards)*

* `[ ]` Implement Multiple Table Support (Backend & Frontend)
* `[ ]` Implement Game Variant Selection (Face-Up, Standard Commission, etc.)
* `[ ]` Implement Host Controls (Start Game, Pause/Resume, Pace)
* `[ ]` Implement Save/Load Game State from JSON
* `[ ]` Implement Step Back Functionality (Advanced)
* `[ ]` Implement Variable Betting UI & Logic
* `[ ]` Implement Side Bets (Define rules/paytables first)
* `[ ]` Improve UI Polish & Animations
* `[ ]` Enhance Player Experience (Reconnects, Spectator Mode, Chat)
* `[ ]` Implement Database Integration (PostgreSQL/MongoDB/SQLite)
* `[ ]` Implement User Accounts (Registration/Login, Persistent DB)
* `[ ]` Implement Automated Backend Deployment (GitHub Actions)
* `[ ]` Add Comprehensive Backend Testing (Unit, Integration)
* `[ ]` Add Backend Logging & Monitoring
* `[ ]` Implement Rate Limiting / Enhanced Security
* `[ ]` Refactor Codebase for Maintainability

---

## Mid-Process Discoveries / Notes

*(Add notes, decisions, or issues discovered during development here)*

* Decided to simplify House Way rule for Four of a Kind (7s-10s) to always keep together for MVP AI simplicity.
* Network latency on home server sometimes causes slight delay in state updates, acceptable for friends but monitor.
* Biome setup required specific VS Code settings adjustment.
* **\[x\] TODO (Cleanup):** Remove temporary "Place Bet" and "Start Game" buttons from +page.svelte. (Completed: 2025-04-15)
* **\[x\] TODO (Backend):** Implement handling for `readyForNextRound` message. (Completed: 2025-04-15)
* **\[x\] Discovered:** Fix `startGame` from `WaitingForPlayers` state needed immediate handling. (Completed: 2025-04-19)
* **Note (Hono):** Will use `@hono/ws` helper for WebSocket handling as it seems cleaner than manual `ws` integration within Hono routes.
* **Note (Hono State):** Initial Hono migration will use simple singleton import for `GameTable`. Will add TODO comment to refactor later using Hono context/middleware if multi-table support is added.

---