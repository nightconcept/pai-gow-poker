# Pai Gow Poker - Task List (TASK.md)

This document tracks the development tasks for the multiplayer Pai Gow Poker application. It follows the logical dependency chain outlined in the PRD for the MVP, includes milestones, a backlog for future enhancements, and a section for mid-process discoveries.

**Legend:**
- `[ ]` To Do
- `[x]` Done

---

## Phase 1: Minimum Viable Product (MVP) - Face-Up Variant

These tasks focus on delivering the core Face-Up Pai Gow Poker experience.

### MVP Sub-Phase 1: Backend Foundation & Core Structures

1.  **[x] Backend: Initialize Node.js Project**
    * Verify the Node.js project structure in apps/backend.
    * Verify `package.json` exists in the backend folder.
    * Install core dependencies (`ws`).
    * Set up basic project scripts (e.g., `start`, `dev`).
    * **[x] Verify:** Project structure exists, dependencies install (`pnpm install` or `yarn`), basic server file runs without errors using `node server.js` (or similar).

2.  **[x] Backend: Implement Basic WebSocket Server**
    * Use the `ws` library to create a WebSocket server.
    * Implement server startup and listening on a configured port.
    * Handle basic client connection (`connection`) events.
    * Handle basic client disconnection (`close`) events.
    * Define and implement a basic JSON message structure (e.g., `{ type: '...', payload: {...} }`).
    * Implement basic message receiving (`message`) handler.
    * **[x] Verify:** Server starts, accepts WebSocket connection from a test client (e.g., browser console, Postman). Server logs connect/disconnect events. Basic predefined messages can be sent from client to server and server can broadcast a simple message back to the client(s).

3.  **[x] Backend: Define In-Memory State (Player, GameTable)**
    * Define JavaScript classes or object structures for `Player` (id, username, dannyBucks, currentHand, etc.) and `GameTable` (id, hostId, players array, gameState, deck, dealerHand, etc.) for a single table scenario.
    * Implement logic to add a new `Player` object to the `GameTable.players` array when a WebSocket connection is established (initially without username).
    * Implement logic to remove the `Player` object from the `GameTable.players` array on WebSocket disconnection.
    * **[x] Verify:** Inspect server logs or use debugger to confirm `Player` objects are added/removed from the in-memory `GameTable` state correctly upon client connect/disconnect. Data structures match the PRD definitions.

4.  **[x] Backend: Implement Username Handling & Uniqueness Check**
    * Implement message handling for `type: 'setUsername'`.
    * When the message is received, check if the proposed `payload.username` is unique among *currently connected* players in the `GameTable.players` array.
    * If unique, assign the username to the corresponding `Player` object and send a success response message (e.g., `{ type: 'usernameSuccess', payload: { username: '...' } }`) back to that client.
    * If not unique, send a failure response message (e.g., `{ type: 'usernameFailure', payload: { message: 'Username taken' } }`) back to that client.
    * Broadcast a message to all other clients when a new user successfully sets a username (e.g., `{ type: 'playerJoined', payload: { username: '...' } }`).
    * **[x] Verify:** Connect multiple clients. Attempt to set the same username from two clients; verify the second one fails. Set unique usernames; verify success messages are received and other clients get `playerJoined` updates. Inspect server state to confirm usernames are assigned correctly.

### MVP Sub-Phase 2: Core Game Mechanics (Backend - Face-Up Variant)

*(Depends on MVP Sub-Phase 1)*

5.  **[x] Backend: Implement Deck Creation, Shuffling, Dealing**
    * Define the `Card` structure (rank, suit).
    * Create a function to generate a standard 53-card deck (including Joker).
    * Implement a shuffling algorithm (e.g., Fisher-Yates).
    * Implement dealing logic: Deal 7 cards to each connected `Player` who has set a username, and 7 cards to the AI Dealer.
    * Store the dealt hands associated with the `Player` objects and the dealer state within the `GameTable`.
    * Broadcast the player's hand to the respective client and potentially a generic "dealing complete" message.
    * **[x] Verify:** Trigger dealing logic. Inspect server state/logs to confirm deck has 53 unique cards, shuffling appears random, each player and dealer receives exactly 7 cards, and hands are stored correctly.

6.  **[x] Backend: Implement Dealer "House Way" & Ace-High Push Logic**
    * Implement the "House Way" logic (as defined in Appendix/PRD) for the AI dealer to partition its 7 cards into a 5-card high hand and 2-card low hand. Pay attention to Joker rules and special cases (Pairs, Aces, etc.).
    * Implement hand ranking logic necessary for the House Way decisions and Ace-High check.
    * Immediately after dealing and *before* player action, set the dealer's hand using the House Way.
    * Determine if the dealer's 5-card hand is Ace-High Pai Gow.
    * Store the dealer's set hands and the Ace-High status in the `GameTable` state.
    * Broadcast the dealer's *revealed* 7 cards, the dealer's *set* high/low hands, and the game state (e.g., `'dealerSet'`, `'aceHighPush'`, or `'playerTurn'`) to all clients.
    * **[ ] Verify:** Test with various known 7-card hands (including Jokers, pairs, straights, flushes) and verify the dealer sets its hand according to the defined House Way rules. Verify Ace-High Pai Gow hands are correctly identified. Verify the correct game state and dealer hand information is broadcast.

7.  **[x] Backend: Implement Basic Betting & DB Balance Logic**
    * Initialize each `Player` object with a starting `dannyBucks` balance upon joining (after setting username).
    * Implement message handling for `type: 'placeBet'`. For MVP, assume a fixed bet amount.
    * Before dealing, allow players to place their bet. Deduct the fixed bet amount from the player's `dannyBucks` balance. Store the `currentBet`.
    * Prevent dealing until bets are placed (or timeout/host action in later phases).
    * (Outcome handling is in Task 9).
    * **[x] Verify:** Players start with correct DB. Send `placeBet` message; verify DB balance decreases by fixed amount and bet is recorded. Inspect server state. Test placing bet before dealing trigger.
   
   8.  **[x] Backend: Implement Player Hand Input Handling & Validation**
    * Implement message handling for `type: 'setPlayerHand'`. Payload should contain the player's chosen 2-card and 5-card hands.
    * Validate the received hands: exactly 2 cards in low, 5 cards in high; cards must be from the player's originally dealt 7 cards; the 5-card hand must rank strictly higher than the 2-card hand (using implemented ranking logic). Include Joker rules in validation.
    * If valid, store the set hands in the `Player` object state. Send confirmation to player.
    * If invalid, send an error message back to the player.
    * Only accept `setPlayerHand` messages during the correct game state (e.g., `'playerTurn'`) and *only* if it wasn't an Ace-High Push round.
    * **[x] Verify:** Send valid hand splits; verify server accepts and stores them. Send invalid splits (wrong card count, invalid cards, low hand > high hand); verify server rejects with error message. Try sending during wrong game state; verify rejection. Test with hands involving Jokers.
   
   9.  **[x] Backend: Implement Hand Comparison, Outcome Logic & DB Updates**
    * Implement 5-card and 2-card hand comparison logic respecting poker ranks and the "Copy" rule (dealer wins ties).
    * Once all players have submitted valid hands (or if Ace-High Push occurred):
    * If Ace-High Push: Mark all player outcomes as Push.
        * If not Ace-High Push: Compare each player's high/low hands against the dealer's high/low hands.
        * Determine Win/Loss/Push outcome for each player based on the comparison rules (Win both, Lose both, Split -> Push).
    * Update player `dannyBucks` balances based on the outcome and their `currentBet` (Win: +bet, Loss: -bet, Push: no change. MVP is commission-free).
    * Handle players running out of DB (set status, prevent future bets).
    * Broadcast round results to all clients (e.g., individual player outcomes, dealer hands, player hands, updated balances).
    * Transition game state back to betting (or waiting).
    * **[ ] Verify:** Test various player vs dealer hand scenarios (Win, Loss, Push, Copies, Ace-High Push). Verify outcomes are determined correctly per rules. Verify DB balances are updated correctly (no commission for MVP). Verify results are broadcast accurately to all clients. Check handling of zero DB players.

### MVP Sub-Phase 3: Frontend Foundation & Connection

*(Can start in parallel with Sub-Phase 1/2)*

10. **[x] Frontend: Initialize SvelteKit Project (Vite, Tailwind, Biome)**
    * Use `pnpm sv create` (or similar) to scaffold the project.
    * Add and configure TailwindCSS v4 (JIT).
    * Add and configure Biome for linting/formatting.
    * Set up basic file structure (routes, components, stores, services).
    * **[x] Verify:** Project initializes, dev server runs (`pnpm run dev`), basic page loads in browser. Tailwind directives work. Biome formats/lints correctly on save or via command line.

11. **[x] Frontend: Create WebSocket Client Service**
    * Create a JavaScript/TypeScript module (e.g., `src/lib/services/websocket.js`).
    * Implement function to establish WebSocket connection to the backend server URL.
    * Implement handlers for `onopen`, `onmessage`, `onerror`, `onclose`.
    * Implement a function to send formatted JSON messages (`{ type: '...', payload: {...} }`) to the backend.
    * The `onmessage` handler should parse incoming JSON messages.
    * **[ ] Verify:** Service connects to the running backend (check browser console/network tab). Can manually trigger sending a message (e.g., a test ping) via console. Incoming messages from backend are logged correctly. Connection errors/closures are handled gracefully.

12. **[x] Frontend: Set Up Svelte Stores for Game State**
    * Create Svelte stores (e.g., in `src/lib/stores/`) to hold reactive game state:
        * `usernameStore` (string | null)
        * `playersStore` (array of player objects/usernames)
        * `dannyBucksStore` (number)
        * `myHandStore` (array of Card objects | null)
        * `dealerHandStore` (object with revealed 7 cards and set 2/5 cards | null)
        * `gameStateStore` (string, e.g., 'Connecting', 'NeedsUsername', 'Betting', 'PlayerTurn', 'Showdown', 'AceHighPush')
        * `lastResultStore` (object with win/loss/push info | null)
    * Connect the WebSocket service's `onmessage` handler to update these stores based on incoming message types (`usernameSuccess`, `playerJoined`, `gameStateUpdate`, `dealHand`, `roundResult`, etc.).
    * **[ ] Verify:** Use Svelte dev tools or log store values in components. Send mock messages from backend (or trigger real backend actions); verify stores update reactively and correctly based on message payloads.

13. **[ ] Frontend: Implement Username Input UI & Connection Trigger**
    * Create a Svelte component/route (e.g., `/`) displayed when `usernameStore` is null.
    * Include an input field for the username and a submit button.
    * On submit, call the WebSocket service to send the `setUsername` message.
    * Display feedback based on success/failure messages received from the backend (updating a local component state or checking the `usernameStore`).
    * Once successful (e.g., `usernameStore` is set), navigate or conditionally render the main game view.
    * **[ ] Verify:** UI shows initially. Enter username; verify `setUsername` message is sent. Receive success response; verify UI navigates/changes to game view and `usernameStore` is updated. Receive failure response (username taken); verify error message is shown and user stays on username screen.

### MVP Sub-Phase 4: Frontend Gameplay UI & Interaction

*(Depends on MVP Sub-Phase 2 backend logic and MVP Sub-Phase 3 frontend setup)*

14. **[ ] Frontend: Create Basic Game Table View Component**
    * Create the main Svelte component for the game interface (e.g., `src/routes/+page.svelte` or a dedicated component).
    * Structure the layout (Dealer area, Player area, Opponent list).
    * **[ ] Verify:** Component renders without errors when the user has a username and is theoretically "at the table". Basic layout areas are visible.

15. **[ ] Frontend: Display Basic Game State (Players, DB, Phase)**
    * In the Table View component, subscribe to relevant stores (`usernameStore`, `playersStore`, `dannyBucksStore`, `gameStateStore`).
    * Display the current player's username and DannyBucks balance.
    * Display a list of other connected players' usernames.
    * Display the current game phase/status message (e.g., "Place your bet", "Dealer has Ace-High Pai Gow!", "Set your hand").
    * **[ ] Verify:** Connect multiple clients with unique usernames. Verify own username/DB shows correctly. Verify list of other players updates as they join. Verify game status text changes based on backend `gameStateUpdate` messages reflected in the store.

16. **[ ] Frontend: Display Dealer's Face-Up Hand & Set Hands**
    * Subscribe to the `dealerHandStore`.
    * When dealer hand data is available, render the dealer's 7 face-up cards (using simple text/CSS like "AH", "KC").
    * Render the dealer's set 2-card and 5-card hands clearly separated.
    * Clearly indicate if an Ace-High Push occurred (e.g., using text from `gameStateStore`).
    * **[ ] Verify:** Trigger backend dealing/dealer setting. Verify all 7 dealer cards are shown face-up. Verify the dealer's set high/low hands are displayed correctly based on store data. Verify Ace-High push status is clearly communicated visually when applicable.

17. **[ ] Frontend: Display Player's 7 Cards (Text/CSS)**
    * Subscribe to `myHandStore`.
    * When the player's hand is dealt, render the 7 cards using text/CSS representation.
    * **[ ] Verify:** Trigger backend dealing. Verify the 7 cards dealt to the specific client are displayed correctly based on store data.

18. **[ ] Frontend: Implement Fixed Bet UI Button**
    * Display a "Place Bet" button, enabled only during the 'Betting' game state.
    * On click, call the WebSocket service to send the `placeBet` message (with the fixed amount implicitly known by the backend for MVP).
    * Disable the button after clicking or when the state changes.
    * **[ ] Verify:** Button appears only during betting phase. Clicking sends `placeBet` message. Button disables appropriately.

19. **[ ] Frontend: Implement Player Hand Setting UI Interaction**
    * Make the player's displayed 7 cards interactive (e.g., clickable) *only* when the game state is `playerTurn` (and not Ace-High Push).
    * Implement logic to allow the player to select 2 cards for the low hand (the rest go to high hand), or select 5 for the high hand.
    * Provide clear visual feedback for selected cards/assigned hands.
    * Include client-side validation feedback (e.g., disable submit if not 2/5 split, show warning if low hand > high hand based on simple rank comparison).
    * Add a "Confirm Hand" button, enabled only when a valid 2/5 split is selected.
    * On confirm, send the `setPlayerHand` message with the selected hands via the WebSocket service.
    * Disable interaction after confirming or when state changes.
    * **[ ] Verify:** Card interaction is enabled only during player turn (and not Ace-High Push). Can select 2 cards; visual feedback works. Can select 5 cards; visual feedback works. Submit button enables only with valid 2/5 split. Client validation provides warnings. Confirm button sends correct `setPlayerHand` message. Interaction disables appropriately.

20. **[ ] Frontend: Display Round Results (Win/Loss/Push, Balance)**
    * Subscribe to `lastResultStore` and `dannyBucksStore`.
    * When round results are received, display the outcome clearly (e.g., "You WIN!", "You LOSE!", "PUSH!").
    * Show the amount won or lost (if applicable for future commission).
    * Ensure the displayed DannyBucks balance updates automatically via the store binding.
    * Optionally show the player's and dealer's final set hands during results display.
    * **[ ] Verify:** After backend processes outcomes, verify frontend displays correct Win/Loss/Push message based on store data. Verify DB balance display updates correctly.

### MVP Sub-Phase 5: Basic Infrastructure & Deployment (MVP)

*(Can be done incrementally)*

21. **[ ] Infrastructure: Create Backend Dockerfile**
    * Write a `Dockerfile` for the Node.js backend application.
    * Include steps to copy `package.json`, install dependencies, copy source code, expose the WebSocket port, and define the `CMD` or `ENTRYPOINT` to run the server.
    * Build the Docker image locally (`docker build`).
    * **[ ] Verify:** Docker image builds successfully without errors.

22. **[ ] Infrastructure: Configure Cloudflare Tunnel**
    * Install `cloudflared` on the home server.
    * Log in to Cloudflare (`cloudflared login`).
    * Create a tunnel (`cloudflared tunnel create <tunnel-name>`).
    * Configure the tunnel to point to the local port the Docker container will expose (e.g., `localhost:8080`).
    * Create a DNS record (CNAME) in Cloudflare pointing the desired public hostname to the tunnel.
    * Run the tunnel (`cloudflared tunnel run <tunnel-name>`).
    * **[ ] Verify:** Tunnel runs successfully. Can access a simple test service (or the preliminary websocket server) running on the specified local port via the public Cloudflare hostname. Ensure WebSocket connections (WSS) work through the tunnel.

23. **[ ] Infrastructure: Set up Vercel Project for Frontend**
    * Create a new project on Vercel.
    * Connect it to the GitHub repository containing the SvelteKit frontend code.
    * Configure build settings (usually auto-detected for SvelteKit/Vite).
    * Set environment variables if needed (e.g., the backend WebSocket URL provided by Cloudflare Tunnel).
    * **[ ] Verify:** Vercel project is created and linked. Initial deployment builds and deploys successfully.

24. **[ ] Infrastructure: Perform Initial Manual Deployment**
    * Build the backend Docker image locally.
    * Run the backend Docker container on the home server, mapping the required port.
    * Ensure the Cloudflare Tunnel is running and pointing to the container's port.
    * Trigger a deployment of the frontend on Vercel (e.g., by pushing to the main branch).
    * Access the Vercel app URL.
    * **[ ] Verify:** Frontend loads from Vercel URL. Frontend successfully connects to the backend via the Cloudflare Tunnel WebSocket URL. Can complete the full MVP game loop (connect, set username, bet, see dealer hand, set own hand, see results) with another player (or test client).

---

## Milestones

-   **[ ] M1: Backend Foundation Complete:** Tasks 1-4 finished. Basic connection and user identification works.
-   **[ ] M2: Core Game Logic Complete:** Tasks 5-9 finished. Backend can run a full Face-Up game round internally.
-   **[ ] M3: Frontend Connection & State Complete:** Tasks 10-13 finished. Frontend can connect, user can login, basic state sync works.
-   **[ ] M4: MVP UI Interaction Complete:** Tasks 14-20 finished. Frontend UI allows playing the game based on backend state.
-   **[ ] M5: MVP Deployed & Playable:** Tasks 21-24 finished. A playable version is accessible online via Vercel and Cloudflare Tunnel.

---

## Backlog / Future Enhancements (Post-MVP)

*(Items from PRD Roadmap Phase 2 onwards)*

-   [ ] Implement Multiple Table Support (Backend & Frontend)
-   [ ] Implement Game Variant Selection (Face-Up, Standard Commission, etc.)
-   [ ] Implement Host Controls (Start Game, Pause/Resume, Pace)
-   [ ] Implement Save/Load Game State from JSON
-   [ ] Implement Step Back Functionality (Advanced)
-   [ ] Implement Variable Betting UI & Logic
-   [ ] Implement Side Bets (Define rules/paytables first)
-   [ ] Implement Card Graphics (Image/SVG)
-   [ ] Improve UI Polish & Animations
-   [ ] Enhance Player Experience (Reconnects, Spectator Mode, Chat)
-   [ ] Implement Database Integration (PostgreSQL/MongoDB/SQLite)
-   [ ] Implement User Accounts (Registration/Login, Persistent DB)
-   [ ] Implement Automated Backend Deployment (GitHub Actions)
-   [ ] Add Comprehensive Backend Testing (Unit, Integration)
-   [ ] Add Backend Logging & Monitoring
-   [ ] Implement Rate Limiting / Enhanced Security
-   [ ] Refactor Codebase for Maintainability

---

## Mid-Process Discoveries / Notes

*(Add notes, decisions, or issues discovered during development here)*

-   *(Example)* Decided to simplify House Way rule for Four of a Kind (7s-10s) to always keep together for MVP AI simplicity.
-   *(Example)* Network latency on home server sometimes causes slight delay in state updates, acceptable for friends but monitor.
-   *(Example)* Biome setup required specific VS Code settings adjustment.