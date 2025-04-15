<context>

# Overview

A multiplayer version of pai gow poker (face-up variant) that can be played in the browser. This is can be played by 2-7 players who will connect to an game session on startup. A player can continue until they run out of chips. The dealer is an AI that will handle all the gameplay. This is meant as just a small game for a few of my friends to play and it is meant for fun.

# Core Features
- User management - Each player should be prompted to enter in a username that must be unique according to all the players currently in the app. This is to give everyone on the server a unique identity to all other players.
- Table management - After selecting a name, a player can choose to: join an established table, create a new table and set the rules, or load up a table from a JSON file. This is so multiple games can run at the same time and previous games can be restored to their previous session.
- Game management - When a player has created a table, that player will be the "host" or in charge of running the table. They will set the rate at which the game plays and when to pause or when to step back to a previous state. This is important so that the app does not have to manage when to move on to the next game state.
- Gameplay - Pai Gow Poker standard rules will apply to emulate a real casino. A mock currency called DannyBucks (DB for short) will be used to indicate how much money a player currently has. The purpose of this game is to emulate playing in a casino without having to go to a casino.

## User Personas

1. **The Social Player (Friend)**
    
    - **Goal:** To easily join a game of Pai Gow Poker online with their friends for fun and social interaction, without the risk or complexity of real money gambling.
    - **Characteristics:** Enjoys casual card games, is comfortable using web browsers, wants a straightforward setup and clear gameplay. Primarily motivated by the social aspect of playing with known friends.
    - **Needs:** A simple way to create or join a game session, a clear view of the game state (cards, bets, player balances), intuitive controls for playing their hand, and visibility of other players at the table.
2. **The Host (Friend/Initiator)**
    
    - **Goal:** To set up a Pai Gow Poker game for their group, manage the game flow, and potentially load previous game sessions.
    - **Characteristics:** Organizes the game night, might be slightly more tech-comfortable (especially if loading games from files), wants control over the pace and progression of the game session. Likely the one who introduces the app to the group.
    - **Needs:** Easy-to-use tools for creating a new table or loading a saved one, clear controls for managing the game (setting pace, pausing, stepping back), and visibility of all players and game status.

## Key User Flows

1. **Initial Access & Identification:**
    
    - User navigates to the application URL in their browser.
    - User is prompted to enter a desired username.
        - _Feedback:_ The system checks for uniqueness among currently connected users and provides immediate feedback (success or request for a different name).
    - Upon successful username entry, the user proceeds to the main menu/lobby.
2. **Game Setup/Entry:**
    
    - **Flow A: Create Table (Host):**
        - User selects "Create New Table".
        - User potentially configures basic rules (e.g., starting DannyBucks amount, if different from a default).
        - A new game table is created, and the user (now Host) enters the table view, waiting for others.
    - **Flow B: Join Table (Player):**
        - User selects "Join Established Table".
        - User sees a list of active tables (showing Host name, number of current players).
        - User selects a table to join and enters the table view.
    - **Flow C: Load Table (Host):**
        - User selects "Load Table from File".
        - User uses a file browser to select a previously saved JSON game state file.
        - The system validates the file and recreates the table state. The user (Host) enters the loaded table view.
3. **Gameplay Loop:**
    
    - Players are at the table view, seeing their cards, DannyBucks balance, and other players.
    - **Betting:** When prompted by the game state (controlled by AI Dealer/Host pace), players place their bets using their DannyBucks.
    - **Hand Setting:** Players receive their cards and arrange them into the required 2-card high hand and 5-card low hand according to Pai Gow Poker rules.
    - **Showdown:** Hands are revealed, compared against the AI Dealer's hand.
    - **Resolution:** DannyBucks balances are updated based on win/loss/push outcomes.
    - The game proceeds to the next round, paced by the Host's settings or automatic progression.
4. **Game Management (Host Only):**
    
    - The Host has access to controls overlaid or separate on the UI to:
        - Start the game once enough players have joined.
        - Set the pace/timing between game stages.
        - Pause the game.
        - Step back to a previous game state (if implemented).
5. **Exiting/Game End:**
    
    - A player's session at a table ends if they run out of DannyBucks.
    - A player can voluntarily choose to leave the table via a UI button.
    - The Host can end the entire game session.

## UI/UX Considerations

- **Simplicity & Clarity:** Prioritize ease of understanding. The primary goal is fun among friends. Avoid overly complex features or cluttered interfaces. Use clear labels and visual cues.
- **Visual Design:** A clean, perhaps minimalist, casino or card table theme can enhance the experience. Ensure cards are large and legible. Clearly differentiate player areas, the dealer area, and betting zones.
- **Information Display:**
    - Persistently display each player's username and current DannyBucks balance.
    - Clearly indicate the current phase of the game (e.g., "Place Bets", "Set Your Hand", "Dealer's Turn").
    - Show community cards (if any, though standard Pai Gow doesn't use them) and dealer's hand clearly during the showdown.
    - Display win/loss/push results prominently after each round.
- **Interaction:**
    - **Username:** Provide instant validation on uniqueness.
    - **Table Management:** Make creating, joining, or loading tables intuitive. List available tables with essential info (Host, # Players). File loading should use standard browser file inputs.
    - **Betting:** Use simple buttons or a slider for selecting bet amounts within allowed limits. A clear "Confirm Bet" action is crucial.
    - **Hand Setting:** This is a critical interaction. Consider drag-and-drop card placement or clicking cards to assign them to the high/low hand. Provide visual validation/feedback (e.g., highlighting the hands, warning if the high hand doesn't meet rules).
- **Real-time Feedback:** The UI must update dynamically for all players as the game progresses (bets placed, cards dealt, players join/leave, balances change). Use technologies like WebSockets to ensure smooth, low-latency updates.
- **Host Controls:** Make host controls easily accessible _only_ to the designated host player. They should be visually distinct from regular player actions.
- **Responsiveness:** While primarily a browser game, consider basic responsiveness so it's usable on various common desktop screen sizes.
- **Error Handling:** Gracefully handle potential issues like invalid JSON files, network disconnects, or invalid user inputs with clear, user-friendly messages.

</context>

<PRD>
# Technical Architecture

This section details the technical implementation plan for the multiplayer Pai Gow Poker application, covering its components, data structures, communication methods, and hosting infrastructure.

## System Components

1. **Frontend Application:**
    
    - **Framework:** SvelteKit
    - **Language:** JavaScript/TypeScript
    - **Package Management:** pnpm
    - **Styling:** TailwindCSS v4 (using the JIT compiler)
    - **Build Tool:** Vite
    - **Linting/Formatting:** Biome
    - **Functionality:** Renders the user interface, handles user input (username, betting, hand setting), connects to the backend via WebSockets for real-time game state updates and sending player actions. Manages local UI state using **Svelte Stores**.
    - **Hosting:** Deployed as a static or server-rendered site on Vercel.
2. **Backend Application (Game Server):**
    
    - **Runtime:** **Node.js**
    - **Language:** JavaScript (using ES Modules).
    - **Core Logic:** Manages game sessions, player connections, Pai Gow Poker game rules, AI dealer logic, and real-time communication.
    - **Communication Protocol:** WebSockets for real-time, bidirectional communication with frontend clients, using the **`ws` library**. Includes robust connection handling, error management, and room/broadcast logic to isolate communication per game table.
    - **State Management:** Primarily in-memory storage for active game sessions, players, card hands, and DannyBucks balances for the Proof of Concept (PoC).
    - **Persistence (PoC):** Functionality to save/load game table state to/from JSON files stored on the server's local filesystem. **Implement frequent automatic saving** of the `GameTable` state to mitigate data loss on unexpected shutdowns.
    - **Hosting:** Runs inside a Docker container on a dedicated home server.
3. **Real-time Communication Layer:**
    
    - **Technology:** WebSocket server implemented within the Node.js Backend Application using the **`ws` library**.
    - **Functionality:** Handles individual client connections, manages message broadcasting to players within the same game table/session (rooms), transmits game state updates and player actions.
4. **Deployment Pipeline (CI/CD):**
    
    - **Frontend:** GitHub repository linked to Vercel. Pushes to the main branch trigger automatic builds and deployments on Vercel.
    - **Backend:** GitHub repository containing Node.js backend code and Dockerfile. Pushes to the main branch trigger a GitHub Action.
        - The GitHub Action will:
            1. Build a new Docker image for the backend application.
            2. Push the image to a container registry (e.g., Docker Hub, GitHub Container Registry).
            3. Securely connect (e.g., SSH) to the home server (using secrets stored in GitHub Actions).
            4. Execute commands on the home server to pull the latest Docker image and restart the backend container with the new image.

## Data Models (In-Memory / JSON Representation)

- **`Player`:**
    - `id`: Unique identifier (e.g., WebSocket connection ID or generated UUID).
    - `username`: String (unique within an active session).
    - `dannyBucks`: Number (current chip balance).
    - `currentHand`: Array of `Card` objects (or null).
    - `currentBet`: Number (or null).
    - `isHost`: Boolean.
- **`Card`:**
    - `rank`: String ('2', '3', ..., 'K', 'A').
    - `suit`: String ('Spades', 'Hearts', 'Diamonds', 'Clubs').
    - _Initial Rendering Note:_ The Svelte component rendering a card will initially use text/CSS based on `rank` and `suit` (e.g., rendering "AS" for Ace of Spades). The component structure will allow easily swapping this rendering logic for `<img>` tags or SVG elements later.
- **`GameTable` / `Session`:**
    - `id`: Unique identifier (e.g., generated UUID).
    - `hostId`: `Player.id` of the host.
    - `players`: Array of `Player` objects currently at the table.
    - `gameState`: String enum (e.g., 'WaitingForPlayers', 'Betting', 'Dealing', 'PlayerAction', 'Showdown', 'Paused').
    - `deck`: Array of `Card` objects.
    - `dealerHand`: Structure representing the dealer's hand.
    - `gameSettings`: Object (e.g., `{ startingDB: 1000 }`).
    - `turnHistory`: (Optional) Array to store previous states for step-back functionality.
- **WebSocket Message:**
    - `type`: String (e.g., 'joinTable', 'placeBet', 'setHand', 'gameStateUpdate', 'playerJoined', 'error').
    - `payload`: Object containing relevant data for the message type.

## APIs and Integrations

1. **Frontend <-> Backend API:**
    - **Protocol:** WebSocket Secure (WSS). The frontend initiates a WebSocket connection to the backend server's exposed endpoint.
    - **Messages:** JSON-based messages following the defined `WebSocket Message` structure for all game-related actions and state synchronization.
2. **GitHub <-> Vercel:** Standard integration for CI/CD. Vercel watches the frontend code in the GitHub repository.
3. **GitHub <-> Home Server (via GitHub Actions):**
    - **Protocol:** SSH (for deployment commands). Requires storing SSH keys/credentials securely in GitHub secrets.
    - **Container Registry API:** Interaction with Docker Hub/GHCR API to push/pull images.

## Infrastructure Requirements

1. **Frontend Hosting:** Vercel free or paid tier.
2. **Backend Hosting:**
    - Home Server: Sufficient CPU, RAM, and network bandwidth for the Node.js application, Docker, and WebSocket connections (2-7 players). OS with Docker support (e.g., Linux).
    - Docker: Docker engine installed on the home server.
    - Cloudflare Tunnel: Cloudflare account, `cloudflared` daemon running on the home server to expose the backend Docker container's port securely via a Cloudflare domain.
3. **Code Repository:** GitHub account.
4. **Container Registry:** Docker Hub, GitHub Container Registry, or similar.
5. **Domain Name:** A domain managed by Cloudflare for the Tunnel.

## Implementation Notes & Considerations

- **Card Component Design:** Structure the Svelte component responsible for displaying cards flexibly, passing `rank` and `suit` as props. Use conditional logic or CSS classes to switch between text-based rendering and image/SVG rendering in the future.
- **WebSocket Management:** Ensure the backend WebSocket implementation (`ws` library) properly handles client connects/disconnects, associates connections with players/tables, and efficiently broadcasts messages only to relevant clients within a specific game room/table. Implement heartbeat checks or ping/pong messages to detect and clean up stale connections.

Okay, here is the revised development roadmap specifying Face-Up Pai Gow Poker for the MVP and planning for other variants later.

# Development Roadmap

This roadmap outlines the features and functionality planned for the Pai Gow Poker application, broken down into Minimum Viable Product (MVP) and subsequent enhancement phases.

## Phase 1: Minimum Viable Product (MVP) - Face-Up Variant

The goal of the MVP is to deliver the core experience: playing a functional game of **Face-Up Pai Gow Poker** with friends in a single shared session using mock currency. This variant is commission-free.

**Backend (Node.js):**

1. **WebSocket Server:**
    - Set up Node.js project with the `ws` library.
    - Implement basic WebSocket connection handling (connect, disconnect).
    - Establish simple message structure (JSON payload with `type`).
2. **Session & Player Management:**
    - Implement in-memory storage for a single `GameTable` instance.
    - Manage `Player` objects in memory (add on connect, remove on disconnect).
    - Implement username entry and uniqueness check among currently connected players for the single table.
    - Assign first connected player as implicit Host (no special controls needed for MVP).
    - Basic broadcast logic to send updates to all players in the single table.
3. **Core Game Logic (Face-Up):**
    - Implement standard 53-card deck (with Joker) creation and shuffling.
    - Deal 7 cards face-down to each connected player and 7 cards **face-up** to the AI dealer.
    - Implement AI dealer logic to set its hand according to a standard "house way" **immediately** after the deal.
    - **Implement Ace-High Push Rule:** Check if the dealer's best 5-card hand is Ace-high ("Ace-High Pai Gow"). If true, the round results in an automatic push for all player main wagers.
    - If not an Ace-High push, receive player's chosen 2-card/5-card hand split via WebSocket message. (Requires basic validation: 2 cards in high, 5 in low, high hand ranks higher).
    - Implement Pai Gow Poker hand comparison logic (player vs. dealer) for non-push rounds.
    - Calculate win/loss/push outcomes based on comparisons (commission-free).
4. **Currency Management:**
    - Initialize players with a starting DannyBucks (DB) balance.
    - Implement logic for a fixed bet amount per hand.
    - Update player DB balances based on game outcomes (even money for wins, loss for losses, no change for pushes).
    - Handle players running out of DB (e.g., cannot bet further, effectively out).

**Frontend (SvelteKit):**

1. **Project Setup & Connection:**
    - Initialize SvelteKit project with Vite, TailwindCSS v4, Biome, and Carbon Components Svelte (using starter template).
    - Implement WebSocket client connection logic to the backend server.
    - Set up Svelte Stores for managing reactive game state received from the backend.
2. **User Interface (UI) - Face-Up:**
    - Screen/Component for entering a username.
    - Main Game Table View:
        - Display current player's username and DB balance.
        - List other connected players' usernames.
        - Display the AI Dealer's 7 **face-up** cards and its set 5-card/2-card hands.
        - Display game status messages (e.g., "Dealer has Ace-High Pai Gow - Push!", "Set Your Hand", "Round Results").
        - Display the player's 7 dealt cards using text/CSS representation (e.g., "AH", "KC").
        - Implement UI interaction for player to select/designate their 2-card high hand and 5-card low hand (_only enabled if dealer does not have Ace-High Pai Gow_).
        - UI element to trigger a fixed bet for the round (placed before the deal).
        - Display round results (Win/Loss/Push and amount).

**Infrastructure & Setup:**

1. **Basic Backend Containerization:**
    - Create a simple Dockerfile for the Node.js backend application.
2. **Basic Hosting Setup:**
    - Configure Cloudflare Tunnel on the home server to expose the backend Docker container's port.
    - Set up a Vercel project linked to the frontend GitHub repository.
    - _(Manual deployment sufficient for MVP)_

## Phase 2: Future Enhancements

Building upon the MVP, these features add more robust table/game management, improved gameplay, support for other variants, and better technical foundations.

**Table & Game Management:**

1. **Multiple Tables & Variants:**
    - Backend logic to manage multiple `GameTable` instances concurrently.
    - Frontend UI to list available tables (showing host, player count, **game variant**).
    - Frontend UI flow for explicitly creating a new table, **including selecting the Pai Gow Poker variant (e.g., Face-Up, Standard Commission, Commission-Free)**.
    - Frontend UI flow for joining a specific table from the list.
    - Backend logic to handle rules specific to the selected variant (e.g., commission, dealer hand visibility).
2. **Host Controls:**
    - Backend logic to identify and grant control to the host player.
    - Frontend UI elements (visible only to the host) for:
        - Starting the game manually.
        - Pausing/Resuming the game flow.
        - Setting the pace/timer between game stages (optional).
3. **Save/Load Functionality:**
    - Backend logic to serialize `GameTable` state to a JSON file on the server.
    - Backend logic to deserialize a JSON file and restore `GameTable` state.
    - Frontend UI (host only) to trigger saving the current game state.
    - Frontend UI flow for loading a game state from an uploaded JSON file.
4. **Step Back Functionality (Advanced):**
    - Backend state management to store historical game states within a session.
    - Host control to revert the game to a previous state.

**Gameplay & UX Improvements:**

1. **Enhanced Betting:**
    - Frontend UI for variable betting (e.g., input field, slider, +/- buttons).
    - Backend logic to handle variable bets.
    - Optional: Implement side bets common in Pai Gow variants (e.g., Fortune Bonus, Ace-High Bonus - requires defining paytables).
2. **Visual Polish:**
    - Implement actual card graphics (Images or SVG) replacing the text representation.
    - Improve UI layout and visual feedback (e.g., highlighting active player, animations for dealing/results).
    - Display other players' DB balances.
3. **Player Experience:**
    - Handle player disconnects/reconnects more gracefully (allow rejoining a game in progress if possible).
    - Implement a spectator mode (for players out of DB or joining late).
    - Optional: Basic in-game text chat per table.

**User Accounts & Persistence:**

1. **Database Integration:**
    - Introduce a database (e.g., PostgreSQL, MongoDB, or simpler SQLite initially).
    - Refactor backend state management to use the database for persistence instead of JSON files/memory for critical data.
2. **User Accounts:**
    - Implement user registration/login system.
    - Store user profiles and potentially persistent DB balances or stats in the database.
    - Ensure globally unique usernames.

**Technical & Infrastructure Enhancements:**

1. **Automated Backend Deployment:**
    - Implement GitHub Action workflow to build and deploy the backend Docker container automatically on pushes.
2. **Robustness & Scalability:**
    - Implement comprehensive input validation and error handling on the backend.
    - Add backend logging.
    - Consider rate limiting on WebSocket actions.
    - Refactor code for clarity, maintainability, and performance.
3. **Testing:**
    - Implement unit tests for core game logic (including variant rules).
    - Implement integration tests for API/WebSocket interactions.

# Logical Dependency Chain

This outlines the sequence of development, prioritizing foundational elements and reaching a usable state rapidly. Features are scoped to be atomic where possible, allowing for incremental building and testing.

**Phase 1: Backend Foundation & Core Structures**

1. **Node.js Project Setup:** Initialize the backend project, install necessary dependencies (`ws` library).
2. **Basic WebSocket Server:** Implement server startup, listen for incoming connections, handle basic connect/disconnect events. Define the basic JSON message structure (`{ type: '...', payload: {...} }`).
3. **In-Memory State Management (Single Table):**
    - Define basic data structures (`Player`, `GameTable`) in memory.
    - Implement logic to add a `Player` on connection and remove on disconnection for a single `GameTable`.
4. **Username Handling:**
    - Implement message handling (`type: 'setUsername'`) to receive a desired username.
    - Implement logic to check uniqueness against _currently connected_ players in the session. Send success/failure response back to the client.

**Phase 2: Core Game Mechanics (Backend - Face-Up Variant)**

_(Depends on Phase 1)_

5. **Deck & Dealing Logic:**
    - Create the 53-card deck (including Joker rules for straights/flushes/Ace).
    - Implement shuffling.
    - Implement dealing logic: 7 cards to each connected `Player` and 7 cards to the AI Dealer. Store these hands in the `GameTable` state.
6. **Dealer Hand Setting & Ace-High Push:**
    - Implement the "House Way" logic for the AI dealer to set its 5-card and 2-card hands from its 7 cards. **This happens immediately after the deal.**
    - Determine if the dealer's best 5-card hand is Ace-high ("Ace-High Pai Gow").
    - Broadcast the dealer's set hands and the game state (e.g., `'dealerSet'`, `'aceHighPush'`, or `'playerTurn'`) to all clients.
7. **Betting & Currency (Basic):**
    - Initialize player DB balance on join.
    - Implement logic to accept a fixed bet amount message (`type: 'placeBet'`) before dealing starts. Deduct from balance.
    - _(Outcome handling comes after comparison)_.
8. **Player Hand Input:**
    - Implement message handling (`type: 'setPlayerHand'`) to receive the player's chosen 2-card/5-card split.
    - Validate the submitted hand (correct number of cards, high hand ranks >= low hand). Store valid hands.
9. **Hand Comparison & Outcome:**
    - Once all players have set hands (or if Ace-High Push occurred), implement comparison logic: compare each player's high/low hand against the dealer's high/low hand (if not an Ace-High Push).
    - Determine Win/Loss/Push outcome for each player based on comparisons or the Ace-High Push rule.
    - Update player DB balances based on the outcome (even money win, loss, or push).
    - Broadcast round results (individual outcomes, updated balances) to all clients.

**Phase 3: Frontend Foundation & Connection**

_(Can start in parallel with Phase 1/2 after basic backend server exists)_

10. **SvelteKit Project Setup:** Initialize the frontend project (Vite, TailwindCSS v4, Biome). Basic routing setup.
11. **WebSocket Client Service:** Create a reusable service/module to handle connecting to the backend WebSocket, sending messages, and receiving/parsing incoming messages.
12. **State Management (Stores):** Set up Svelte Stores to hold game state information received from the backend (e.g., player list, own hand, dealer hand, balances, game phase). The WebSocket service will update these stores.
13. **Username Input UI:** Create the initial component/page for the user to enter their username and initiate the connection (`setUsername` message). Handle feedback (success/failure).

**Phase 4: Frontend Gameplay UI & Interaction**

_(Depends on Phase 2 backend logic and Phase 3 frontend setup)_

14. **Basic Table View Component:** Create the main component to display the game.
15. **Display Game State:** Render basic information from stores: list of player usernames, current player DB balance, current game phase messages.
16. **Display Dealer Hand:** Render the dealer's 7 face-up cards and the set 2/5 card hands based on data from the stores. Clearly indicate if an Ace-High Push occurred.
17. **Display Player Hand:** Render the current player's 7 cards (using text/CSS initially).
18. **Betting UI (Basic):** Implement a simple button or input to send the fixed `placeBet` message.
19. **Player Hand Setting UI:** Implement the interaction (e.g., clicking cards) for the player to designate their 2-card and 5-card hands. Send the `setPlayerHand` message. **Crucially, this UI should only be enabled when the game state allows (i.e., not during betting, not if Ace-High Push).**
20. **Display Results:** Clearly show the outcome of the round (Win/Loss/Push) and the updated DB balance.

**Phase 5: Basic Infrastructure & Deployment (MVP)**

_(Can be done incrementally alongside other phases)_

21. **Backend Dockerfile:** Create the Dockerfile to build the backend Node.js application image.
22. **Cloudflare Tunnel Setup:** Configure `cloudflared` to expose the port where the Docker container will run.
23. **Vercel Project Setup:** Connect the frontend GitHub repository to Vercel for hosting.
24. **Initial Manual Deployment:** Build the Docker image, run it locally, deploy the frontend to Vercel to achieve the first playable version.

---

**Explicitly Post-MVP (Based on Previous User Request):**

- Support for **Game Variants** other than Face-Up.
- **Game State Step Back** functionality.
- **Database Integration** (replacing in-memory/JSON state).
- **User Registration/Login System** (persistent accounts).
- **Automated Backend Deployment** (GitHub Actions).
- **Save/Load Game State from JSON**.
- **Host Controls** (Pause, Pace, etc.).
- **Multiple Table Support**.
- **Variable Betting / Side Bets**.
- **Card Graphics** (replacing text/CSS).
- **Enhanced Player Experience** (Spectator Mode, Chat, Reconnects).
- **Advanced Technical Improvements** (Testing, Robustness, Logging).

# Risks and Mitigations

This section identifies potential challenges during development and outlines strategies to address them. The mitigations listed are the path this project will go to mitigate that risk.

## Technical Challenges

1. **Risk:** Ensuring real-time game state synchronization via WebSockets is reliable and consistent across all connected clients, especially given potential network latency or brief disconnects using a home server setup.
    
    - **Mitigation:**
        - Utilize the robust `ws` library for Node.js and implement clear logic for broadcasting state updates only to relevant players within a game table (room).
        - Design the frontend (Svelte Stores) to reactively update based on incoming state messages.
        - For MVP, focus on reliable broadcasting. For future enhancements, consider mechanisms for clients to detect desync or request a full state refresh upon reconnecting after a drop.
        - Keep the backend logic efficient to minimize server-side delays.

2. **Risk:** Backend availability and performance depend on the reliability of the home server, its internet connection, and the Cloudflare Tunnel.
    
    - **Mitigation:**
        - Accept this as a known limitation for a personal project intended for friends.
        - Ensure the home server has sufficient resources (RAM, CPU) for the expected load (2-7 players).
        - Keep the backend application reasonably lightweight.
        - Ensure the `cloudflared` service and Docker container are configured to restart automatically if they crash.
        - Monitor the server and network connection if issues arise.
3. **Risk:** Complexity in setting up and maintaining the automated backend deployment pipeline (GitHub Actions -> Docker Registry -> SSH -> Home Server).
    
    - **Mitigation:**
        - Defer automation to post-MVP. Handle initial deployments manually (build/run Docker locally, push frontend to Vercel).
        - When implementing automation, use GitHub Secrets securely for credentials, test scripts thoroughly, and start with simple deployment steps.

## Figuring out the MVP that we can build upon

1. **Risk:** Scope creep during MVP development, adding features not essential for the initial playable Face-Up game (e.g., multiple tables, host controls, graphics).
    
    - **Mitigation:**
        - Strictly follow the defined MVP scope in the Development Roadmap and Logical Dependency Chain.
        - Maintain a backlog for features explicitly marked as "Future Enhancements" and resist pulling them into the initial build.
        - Focus relentlessly on the core gameplay loop: connect -> bet -> dealer sets -> player sets (if applicable) -> see results.
2. **Risk:** Designing an intuitive and error-free user interface for setting the 2-card/5-card player hand.
    
    - **Mitigation:**
        - Start with a simple interaction mechanism (e.g., clicking cards to toggle between high/low hand assignment).
        - Provide clear visual feedback to the player as they set their hand (e.g., highlighting assigned cards, showing resulting hands).
        - Add client-side validation feedback (e.g., warning if the 2-card hand ranks higher than the 5-card hand) before sending to the server.
        - Get early feedback from friends during testing on the usability of the hand-setting interface.
3. **Risk:** Over-engineering the initial solution with complex abstractions or premature optimizations not required for the MVP scope.
    
    - **Mitigation:**
        - Prioritize simplicity and clarity in the MVP codebase.
        - Leverage standard features of SvelteKit (stores, components) and Node.js appropriately.
        - Avoid building generic systems (e.g., complex variant handling) until those features are actively being developed post-MVP. Focus on solving the immediate problem first.

## Resource Constraints

1. **Risk:** Insufficient testing due to reliance on a small group of friends, potentially missing bugs or usability issues.
    
    - **Mitigation:**
        - Encourage testers (friends) to be thorough and provide specific feedback.
        - Implement basic backend logging to help diagnose issues reported during playtests.
        - Perform diligent self-testing covering different scenarios and edge cases.
        - Focus testing on the core game logic and hand-setting UI, as these are most critical.
2. **Risk:** Time and effort required for maintaining the home server infrastructure, troubleshooting network issues, or potential hardware failures.
    
    - **Mitigation:**
        - Keep the server setup as simple as possible (OS + Docker + Cloudflared).
        - Use Docker to simplify application deployment and management on the server.
        - Accept that home infrastructure requires more hands-on maintenance than cloud services. Budget some time for potential troubleshooting.

# Appendix
## Pai Gow Poker Game Rules

### 1. Overview

**Game:** Pai Gow Poker
**Players:** 2-7 Human Players + 1 AI Dealer
**Deck:** Standard 52-card deck plus one Joker (53 cards total).
**Objective:** For each player to arrange their seven dealt cards into two hands—a 5-card "High Hand" and a 2-card "Low Hand"—that rank higher than the Dealer's corresponding hands.

### 2. The Joker

The Joker is semi-wild and can be used as follows:

* **As an Ace:** It can represent an Ace.
* **To Complete a Straight:** It can fill a gap in a sequence (e.g., 8-7-Joker-5-4 becomes 8-7-6-5-4).
* **To Complete a Flush:** It can represent any suit needed to make five cards of the same suit.
* **To Complete a Straight Flush / Royal Flush:** It can fill a gap or act as a needed suit/rank.
* **Default:** If the Joker cannot be used to complete a Straight or Flush according to the rules above, it *always* counts as an Ace.
* **Five Aces:** The hand A-A-A-A-Joker is the highest possible hand, ranking above a Royal Flush.

### 3. Game Flow *(Revised Sequence)*

1.  **Betting:** Each active player places a wager in their designated betting area.
2.  **Dealing:** The AI Dealer shuffles the 53-card deck and deals seven hands of seven cards each, face down. One hand goes to the Dealer, and one hand goes to each player who placed a bet. Unused hands are discarded (mucked).
3.  **Dealer Hand Setting & Reveal:** The AI Dealer immediately sets its hand according to the predefined "House Way" rules (See Section 5) and reveals both its High Hand and Low Hand face up.
4.  **Player Hand Setting:** After observing the Dealer's revealed hands, players examine their own seven cards and partition them into a 5-card High Hand and a 2-card Low Hand.
    * **Fundamental Rule:** The poker rank of the 5-card High Hand *must* be strictly higher than the poker rank of the 2-card Low Hand.
    * **Foul Hand:** Failure to adhere to the Fundamental Rule results in a "Foul Hand," which automatically loses the wager.
5.  **Showdown & Comparison:** Players place their set hands face up (Low Hand in front, High Hand behind). Each player's hands are then compared directly to the Dealer's already visible hands.
6.  **Outcome Determination:** Based on the comparisons, determine if the player Wins, Loses, or Pushes (See Section 7).
7.  **Payout:** Wagers are settled according to the outcome (See Section 8).

### 4. Hand Rankings

#### 4.1. 5-Card High Hand Rankings (Highest to Lowest)

1.  **Five Aces:** (A-A-A-A-Joker)
2.  **Royal Flush:** (A-K-Q-J-10, same suit)
3.  **Straight Flush:** (Five sequential cards, same suit, e.g., 9-8-7-6-5 of Hearts)
4.  **Four of a Kind:** (e.g., K-K-K-K-3)
5.  **Full House:** (Three of a Kind + Pair, e.g., J-J-J-5-5)
6.  **Flush:** (Five cards, same suit, not sequential, e.g., K-Q-9-6-2 of Spades)
7.  **Straight:** (Five sequential cards, mixed suits, e.g., 7-6-5-4-3). Ace can be high (A-K-Q-J-10) or low (A-2-3-4-5). A-K-Q-J-10 is the highest straight; A-2-3-4-5 is typically the second-highest straight.
8.  **Three of a Kind:** (e.g., 7-7-7-K-2)
9.  **Two Pair:** (e.g., A-A-9-9-5)
10. **One Pair:** (e.g., Q-Q-8-4-3)
11. **High Card:** (None of the above, highest card determines rank, e.g., A-K-7-5-2)

#### 4.2. 2-Card Low Hand Rankings (Highest to Lowest)

1.  **Pair:** (A-A highest, down to 2-2 lowest)
2.  **High Card:** (Ranked by the highest card, then the second card. A-K highest, down to 3-2 lowest)

### 5. Dealer's Hand Setting ("House Way")

The AI Dealer *must* set its 7 cards according to these specific rules to ensure consistency. Process the hand possibilities in order from highest potential (e.g., check for Five Aces first) downwards.

1.  **Five Aces:** Split - Place AAA in High Hand, AA in Low Hand.
2.  **Four of a Kind:**
    * **Aces, Kings, Queens, Jacks:** Always split. Place one pair in High Hand, one pair in Low Hand.
    * **7s through 10s:** Split into two pairs *unless* doing so requires breaking up a Straight or Flush *and* an Ace can be played in the Low Hand. Otherwise, keep the Four of a Kind in the High Hand and play the highest remaining two cards in the Low Hand. (Simpler AI rule: Always keep together in High Hand, play highest two singles in Low Hand). *[AI Implementation Note: Choose one consistent rule - keeping together is simpler].*
    * **6s or Lower:** Always keep the Four of a Kind together in the High Hand. Play the highest two remaining cards in the Low Hand.
3.  **Full House:** Always split. Place the Three of a Kind in the High Hand and the Pair in the Low Hand.
4.  **Straight, Flush, or Straight Flush (with 7 distinct cards):**
    * **General Rule:** Keep the Straight or Flush in the High Hand. Select the two highest remaining cards that maintain the "High Hand > Low Hand" rule for the Low Hand.
    * **If Hand also contains One Pair:** Play the pair in the Low Hand *only if* the Straight/Flush remains intact in the High Hand and the High Hand still outranks the Low Hand pair. Otherwise, keep the Straight/Flush in the High Hand and play the highest two single cards in the Low Hand.
    * **If Hand also contains Two Pairs:** Ignore the Straight/Flush possibility and use the "Two Pair" rules below.
    * **If Hand also contains Three of a Kind:** Ignore the Straight/Flush possibility and use the "Three of a Kind" rules below.
5.  **Three of a Kind:**
    * **General Rule:** Keep the Three of a Kind together in the High Hand. Play the two highest remaining single cards in the Low Hand.
    * **Exception (Three Aces):** Place two Aces in the High Hand, and place the third Ace plus the highest remaining single card in the Low Hand.
6.  **Two Pair:**
    * **General Rule:** Always split the pairs. Place the higher-ranking pair in the High Hand and the lower-ranking pair in the Low Hand. Play the highest remaining single card ("kicker") in the High Hand.
    * **Exception (Pair of Aces + Any Other Pair):** Always split. Place the pair of Aces in the High Hand and the lower pair in the Low Hand.
    * **Exception (Two Low Pairs + Ace Kicker):** Some house ways play low pairs (e.g., 9s or lower) together in the High Hand if there's an Ace kicker to play in the Low Hand. (Simpler AI rule: Always split per General Rule). *[AI Implementation Note: Choose one consistent rule - always splitting is simpler].*
7.  **One Pair:** Place the pair in the High Hand. Place the two highest remaining single cards in the Low Hand.
8.  **No Pair (High Card):** Place the single highest card in the High Hand. Place the next two highest cards in the Low Hand.

### 6. Comparison Rules

* The player's High Hand is compared only to the Dealer's High Hand.
* The player's Low Hand is compared only to the Dealer's Low Hand.
* Standard poker rankings determine which hand is higher in each comparison.

### 7. Outcome Determination

* **Player Wins:** Player's High Hand > Dealer's High Hand **AND** Player's Low Hand > Dealer's Low Hand.
* **Player Loses:** Player's High Hand < Dealer's High Hand **AND** Player's Low Hand < Dealer's Low Hand.
    * **OR** Player's High Hand ties Dealer's High Hand **AND** Player's Low Hand ties Dealer's Low Hand.
    * **OR** Player wins one hand, but the other hand is a tie.
    * **OR** Player loses one hand, and the other hand is a tie.
    * **OR** Player's hand is Foul.
* **Push (Tie Bet):** Player wins one comparison **AND** loses the other comparison.
* **"Copy" Rule:** If a player's hand (either High or Low) is identical in rank to the Dealer's corresponding hand (e.g., both have A-K in the Low Hand), the **Dealer wins that specific comparison.**

### 8. Payouts

* **Winning Wager:** Pays 1-to-1 (even money) **minus a 5% commission** calculated on the amount won.
    * *Example:* $100 bet wins. Payout = $100 (original bet) + $100 (winnings) - $5 (5% commission on winnings) = $195 total return.
* **Losing Wager:** The player loses the entire amount wagered.
* **Push:** The player's wager is returned. No win, no loss, no commission.
* **Foul Hand:** The player loses the entire amount wagered. No commission.

### 9. Notes for AI Implementation

* Ensure robust card representation (Rank + Suit).
* Implement hand evaluation logic accurately for both 5-card and 2-card hands.
* The Joker logic needs careful handling during evaluation.
* The House Way implementation must strictly follow the chosen rules (especially if simplifying options noted above are taken).
* Handle commission calculation precisely.
* Manage game state correctly (dealing, betting, setting, comparing, payout).

## Project Base Structure
This is the initial base structure of this project and will be outdated as tasks get done. This is a monorepo using pnpm workspaces.

```
pai-gow-poker/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   └── ... (SvelteKit files)
│       ├── static/
│       ├── package.json
│       ├── svelte.config.js
│       ├── tsconfig.json (if using TS)
│       └── vite.config.ts (if using TS)
├── project/
│   ├── PLANNING.md/
│   └── TASK.md/
├── node_modules/        # Managed by pnpm
├── package.json         # Root package.json
├── pnpm-lock.yaml       # pnpm lockfile
└── pnpm-workspace.yaml  # Workspace configuration
```

</PRD>