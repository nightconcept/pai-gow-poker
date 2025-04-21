# Pai Gow Poker - Task List (TASK.md)

**Purpose:** Tracks current tasks, backlog, and sub-tasks for the Pai Gow Poker project, focusing specifically on the migration from a standalone Node.js `ws` backend to an Express + `express-ws` backend.
**Includes:** Bullet list of active work for the migration, migration-specific milestones, and a section for anything discovered mid-process. The original MVP tasks are considered complete for the `ws` implementation, and the Future Enhancements backlog remains relevant for the new Express-based structure.
**AI Interaction:** This file can be updated manually or by prompting an AI assistant.
  - **Example Update Prompt:** "Update TASK.md to mark task M1.2 as done and add a new verification step to task M1.4."
  - **Example Addition Prompt:** "Add a new task under Migration Phase 1 in TASK.md: '[ ] (Human) Refactor broadcast logic to use a dedicated helper function.'"

**Legend:**
- `[ ]` To Do
- `[x]` Done
- `(Human)`: Task requires manual implementation, configuration, or complex debugging/integration best suited for a human developer.
- `(AI - Generate Code)`: Task involves generating relatively boilerplate or well-defined code blocks. Suitable for AI assistance (like Gemini Flash), but generated code *must* be reviewed and integrated by a human.
- `(AI - Suggest Config)`: Task where AI can suggest configuration changes (e.g., Dockerfile lines, package.json scripts), which must be reviewed and implemented by a human.

---

## Migration Phase 1: Switch Backend from Node.js `ws` to Express + `express-ws`

This phase focuses exclusively on replacing the underlying server technology while preserving the existing MVP game logic and functionality.

1.  **[x] (Human) Backend: Install Express & `express-ws` Dependencies**
    * Navigate to the `apps/backend` directory.
    * Run `pnpm add express express-ws @types/express @types/ws` (assuming TypeScript usage based on original PRD structure).
    * **Verify:** Dependencies are added to `apps/backend/package.json` and `pnpm-lock.yaml` is updated. `pnpm install` runs without errors.

2.  **[x] (AI - Generate Code) Backend: Generate Initial Express App Structure in `index.ts`**
    * **AI Prompt:** "Generate a basic Express TypeScript application structure in `apps/backend/src/index.ts`. It should import `express`, initialize an app, import and apply `express-ws`, listen on a port (e.g., 8080 or from an environment variable), and include a basic root route (`app.get('/')`) that sends a simple 'Server running' message. Include basic error handling middleware."
    * **(Human) Review & Integrate:** Review the generated code for correctness and integrate it into the existing `index.ts`, potentially commenting out the old `ws` server setup initially.
    * **Verify:** The basic Express server starts using the `dev` script (`pnpm --filter backend run dev`) and responds to HTTP GET requests on `/` via a browser or `curl`.

3.  **[x] (Human) Backend: Integrate `express-ws` and Define Core WebSocket Route**
    * Ensure `express-ws` is correctly initialized and applied to the Express app instance (as generated/verified in the previous step).
    * Define the primary WebSocket route, likely `/ws` (or similar): `app.ws('/ws', (ws, req) => { /* Connection logic here */ });`
    * **Verify:** The server still starts. Attempting to connect via a WebSocket client (e.g., browser dev tools, Postman) to the `/ws` endpoint should now establish a connection (even if no logic is inside the handler yet).

4.  **[ ] (Human) Backend: Refactor State Management Access**
    * Determine how the existing in-memory state (the single `GameTable` instance holding `Player` objects, deck, game state, etc.) will be accessed within the `app.ws('/ws', ...)` handler function.
    * *Option A (Simple):* Keep state defined in the top-level scope of `index.ts` if simple.
    * *Option B (Better):* Encapsulate game state and logic into a separate class or module (e.g., `GameManager.ts`) and pass the `ws` connection into its methods or instantiate it where needed.
    * Implement the chosen approach.
    * **Verify:** The `GameTable` instance and its methods/properties are accessible within the scope of the `app.ws('/ws', ...)` callback function.

5.  **[ ] (AI - Generate Code / Human - Integrate) Backend: Migrate WebSocket Event Handlers**
    * Move the logic currently inside the standalone `ws` server's event handlers (`server.on('connection', ...)` , `client.on('message', ...)` , `client.on('close', ...)`) into the `app.ws('/ws', ...)` handler.
    * **[ ] (Human) Migrate `connection` Logic:**
        * Inside `app.ws('/ws', (ws, req) => { ... })`, add the logic to create a new `Player` object and add it to the `GameTable`. Associate the `ws` instance with this player.
        * Send initial connection messages if needed.
    * **[ ] (AI - Generate Code / Human - Integrate) Migrate `message` Logic:**
        * **AI Prompt:** "Generate the structure for a `ws.on('message', (msg) => { ... })` handler inside the Express `app.ws` route. It should parse the incoming message as JSON, include a try-catch block for parsing errors, and have a basic switch statement structure based on `parsedMessage.type`."
        * **(Human) Integrate:** Copy the *existing* case logic (for `'setUsername'`, `'placeBet'`, `'setPlayerHand'`, etc.) from the old `ws` server's message handler into the generated switch statement. Ensure calls to game logic and state updates work correctly using the refactored state access (Task M1.4). Ensure `ws.send()` is used to send responses back to the specific client.
    * **[ ] (Human) Migrate `close` Logic:**
        * Inside `app.ws('/ws', ...)` add the `ws.on('close', () => { ... })` handler.
        * Copy the existing logic for removing the player from the `GameTable` and broadcasting leave messages.
    * **[ ] (Human) Adapt Broadcasting Logic:**
        * Review how messages were broadcast to all players in the old setup.
        * Ensure the `express-ws` setup can access all active `ws` connections associated with the `GameTable` to broadcast messages (e.g., by iterating through `GameTable.players` and using their associated `ws` instances). The `express-ws` object (`wsInstance = expressWs(app)`) provides access to `.getWss().clients` if needed, but managing clients per-table via your `GameTable` is likely better.
    * **Verify:** Connect multiple clients. Test setting usernames (uniqueness check), placing bets, dealing, setting hands (including validation), game progression, and win/loss/push outcomes. Verify state updates and messages are correctly sent/received by all clients. Verify players are removed correctly on disconnect.

6.  **[ ] (AI - Suggest Config / Human - Implement) Backend: Update Dockerfile**
    * **AI Prompt:** "Suggest changes to a Dockerfile for a Node.js TypeScript Express app. It should copy `package.json`, install dependencies using `pnpm`, copy source code, compile TypeScript (if needed), expose the correct port, and set the `CMD` to run the Express server (e.g., `node dist/index.js`)."
    * **(Human) Review & Implement:** Adapt the suggestions to the existing `Dockerfile`. Ensure the correct port is exposed (matching the one Express listens on) and the `CMD` or `ENTRYPOINT` correctly starts the Express server (likely `node dist/index.js` after a TypeScript build step).
    * **Verify:** Build the Docker image using the updated `Dockerfile` (`docker build .`). The image builds successfully.

7.  **[ ] (Human) Backend: Update `package.json` Scripts**
    * Review the `scripts` section in `apps/backend/package.json`.
    * Ensure the `start` and `dev` scripts correctly run the new Express server (e.g., `start` might be `node dist/index.js`, `dev` might use `ts-node` or `nodemon` with `index.ts`). Adjust TypeScript build scripts if necessary.
    * **Verify:** `pnpm --filter backend run dev` starts the server correctly in development mode. `pnpm --filter backend run build` (if applicable) compiles successfully. `pnpm --filter backend run start` runs the compiled code correctly.

8.  **[ ] (Human) Infrastructure: Verify Cloudflare Tunnel Configuration**
    * Check the Cloudflare Tunnel configuration (`config.yml` or dashboard settings).
    * If the port the backend listens on has changed (e.g., from 8080 to 3000), update the tunnel configuration (`service: http://localhost:NEW_PORT`) to point to the correct local port exposed by the Docker container/Express app.
    * **Verify:** The tunnel is running and correctly routing traffic from the public hostname to the *new* Express application's port.

9.  **[ ] (Human) Testing: Full MVP Feature Verification**
    * Run the deployed system (Vercel Frontend <-> Cloudflare Tunnel <-> Dockerized Express Backend).
    * Perform end-to-end testing of *all* MVP features defined in the original `TASK.md` (Phases 1-4):
        * Connecting and setting unique usernames.
        * Placing bets.
        * Dealing cards (player and dealer face-up).
        * Dealer "House Way" and Ace-High Push logic.
        * Player hand setting interaction and validation.
        * Correct outcome determination (Win/Loss/Push - commission-free).
        * DannyBucks balance updates.
        * Broadcasting of game state, player joins/leaves, and results to all clients.
        * Handling player disconnects.
    * **Verify:** The game functions identically to the previous `ws`-based implementation from a user perspective. All MVP features work correctly on the new Express backend.

---

## Milestones (Migration)

-   **[x] M1.M1: Express Setup Complete:** Tasks M1.1 - M1.3 finished. Basic Express server runs and accepts WebSocket connections.
-   **[ ] M1.M2: Core Logic Migrated:** Tasks M1.4 - M1.5 finished. Existing game logic operates within the Express WebSocket route.
-   **[ ] M1.M3: Configuration Updated:** Tasks M1.6 - M1.8 finished. Docker, scripts, and tunnel config match the new setup.
-   **[ ] M1.M4: Migration Verified:** Task M1.9 finished. Full MVP functionality confirmed on the new Express backend. Migration complete.

---

## Mid-Process Discoveries / Notes (Migration)

*(Add notes, decisions, or issues discovered during the migration process here)*

-   *Example:* Decided to encapsulate game state in `GameManager.ts` for better organization within Express routes.
-   *Example:* `express-ws` requires careful handling of async operations within message handlers.

---

## Future Enhancements (Post-MVP / Post-Migration)

*(These remain the same as the original PRD/TASK list but will now be implemented within the Express backend structure)*

-   [ ] Implement Multiple Table Support (Backend & Frontend)
-   [ ] Implement Game Variant Selection (Face-Up, Standard Commission, etc.)
-   [ ] Implement Host Controls (Start Game, Pause/Resume, Pace)
-   [ ] Implement Save/Load Game State from JSON
-   [ ] Implement Step Back Functionality (Advanced)
-   [ ] Implement Variable Betting UI & Logic
-   [ ] Implement Side Bets (Define rules/paytables first)
-   [ ] Improve UI Polish & Animations
-   [ ] Enhance Player Experience (Reconnects, Spectator Mode, Chat)
-   [ ] Implement Database Integration (PostgreSQL/MongoDB/SQLite)
-   [ ] Implement User Accounts (Registration/Login, Persistent DB)
-   [ ] Implement Automated Backend Deployment (GitHub Actions)
-   [ ] Add Comprehensive Backend Testing (Unit, Integration)
-   [ ] Add Backend Logging & Monitoring
-   [ ] Implement Rate Limiting / Enhanced Security (Easier with Express middleware)
-   [ ] Refactor Codebase for Maintainability