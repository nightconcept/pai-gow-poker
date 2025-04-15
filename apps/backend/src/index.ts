import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto'; // For generating unique IDs
import { Player } from './models/Player';
import { GameTable } from './models/GameTable';

/**
 * Defines the structure for messages exchanged via WebSocket.
 */
interface WebSocketMessage {
	type: string;
	payload: any; // Use 'any' for now, refine with specific types later
}

// --- Utility Functions ---

/**
	* Broadcasts a message to all connected clients, optionally excluding one.
	* @param {WebSocketMessage} message - The message to broadcast.
	* @param {string} [excludePlayerId] - The ID of the player to exclude.
	*/
function broadcast(message: WebSocketMessage, excludePlayerId?: string) {
	const messageString = JSON.stringify(message);
	console.log(`Broadcasting (exclude ${excludePlayerId || 'none'}):`, messageString);
	wss.clients.forEach((client) => {
		// Check if the client is a PlayerWebSocket and has a playerId
		const playerWs = client as PlayerWebSocket;
		if (
			playerWs.readyState === WebSocket.OPEN &&
			playerWs.playerId &&
			playerWs.playerId !== excludePlayerId
		) {
			playerWs.send(messageString);
		}
	});
}

// --- End Utility Functions ---

const PORT = 8080; // Define the port for the WebSocket server

// Create a new WebSocket server instance
const wss = new WebSocketServer({ port: PORT });

// --- Game State ---
// For MVP, create a single game table instance
const gameTable = new GameTable('main-table');
console.log(`Game table ${gameTable.id} created.`);
// --- End Game State ---

console.log(`Backend WebSocket server starting on port ${PORT}...`);

/**
 * Handles server listening event.
 */
wss.on('listening', () => {
	console.log(`WebSocket server listening on port ${PORT}`);
});

/**
 * Handles new client connections.
 */
// Extend WebSocket type to hold our player ID
interface PlayerWebSocket extends WebSocket {
	playerId?: string;
}

wss.on('connection', (ws: PlayerWebSocket) => {
	// Generate a unique ID for this connection/player
	const playerId = randomUUID();
	ws.playerId = playerId; // Store playerId on the WebSocket object
	console.log(`Client connected with ID: ${playerId}`);

	// Create a new Player instance and add it to the table
	const player = new Player(playerId, ws);
	gameTable.addPlayer(player);

	// Send a welcome message including the assigned player ID
	ws.send(
		JSON.stringify({
			type: 'connectionSuccess',
			payload: {
				message: 'Welcome to the Pai Gow Poker server!',
				playerId: playerId, // Send the client their ID
				tableId: gameTable.id,
			},
		}),
	);

	/**
	 * Handles messages received from a specific client.
	 */
	ws.on('message', (message: Buffer) => {
		// Ensure we know which player sent the message
		if (!ws.playerId) {
			console.error('Received message from connection without playerId.');
			return;
		}
		const currentPlayerId = ws.playerId;

		try {
			const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
			console.log(`Received message from ${currentPlayerId}:`, parsedMessage);

			// Route message based on type
			switch (parsedMessage.type) {
				case 'setUsername':
					handleSetUsername(currentPlayerId, parsedMessage, ws);
					break;
				case 'startGame': // Add handler for starting the game
					handleStartGame(currentPlayerId, parsedMessage, ws);
					break;
				case 'placeBet': // Add handler for placing bets
					handlePlaceBet(currentPlayerId, parsedMessage, ws);
					break;
				// Add other message handlers here (e.g., setHand)
				default:
					console.log(`Unknown message type received: ${parsedMessage.type}`);
					// Send an error or ignore
					ws.send(
						JSON.stringify({
							type: 'error',
							payload: { message: `Unknown message type: ${parsedMessage.type}` },
						}),
					);
			}

			// Remove basic echo logic now that routing is in place
		} catch (error) { // Close the try block here
			console.error('Failed to parse message or invalid message format:', error);
			ws.send(
				JSON.stringify({
					type: 'error',
					payload: { message: 'Invalid message format. Please send JSON.' },
				}),
			);
		} // Close the catch block here
	}); // Close ws.on('message') here

	/**
		* Handles a specific client disconnecting.
		*/
	ws.on('close', () => { // This should be inside wss.on('connection')
		// Retrieve the playerId associated with this connection
		const closingPlayerId = ws.playerId;
		if (closingPlayerId) {
			console.log(`Client disconnected: ${closingPlayerId}`);
			const removedPlayer = gameTable.getPlayerByConnectionId(closingPlayerId);
			// Remove the player from the game table
			gameTable.removePlayer(closingPlayerId);

			// Broadcast player left message to remaining clients
			if (removedPlayer && removedPlayer.username) {
				broadcast(
					{
						type: 'playerLeft',
						payload: {
							username: removedPlayer.username,
							playerId: closingPlayerId,
						},
					},
					closingPlayerId, // Don't send to the disconnecting client
				);
			}
		} else {
			console.log('Client disconnected (unknown ID)');
		}
	});

	/**
	 * Handles errors from a specific client's connection.
	 */
	ws.on('error', (error: Error) => { // Add type annotation and ensure inside wss.on('connection')
		console.error(`WebSocket error for player ${ws.playerId || 'unknown'}:`, error);
	});
}); // Close wss.on('connection') here

/**
 * Handles server-level errors.
 */
wss.on('error', (error) => {
	console.error('WebSocket Server error:', error);
});

console.log('WebSocket server setup complete. Waiting for connections...');

// --- Message Handlers ---

/**
 * Handles the 'setUsername' message from a client.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
function handleSetUsername(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const requestedUsername = message.payload?.username;

	if (typeof requestedUsername !== 'string' || requestedUsername.trim().length === 0) {
		ws.send(
			JSON.stringify({
				type: 'usernameFailure',
				payload: { message: 'Invalid username format.' },
			}),
		);
		return;
	}

	const trimmedUsername = requestedUsername.trim();
	const player = gameTable.getPlayerByConnectionId(playerId);

	if (!player) {
		console.error(`Player not found for ID ${playerId} during setUsername`);
		ws.send(
			JSON.stringify({
				type: 'error',
				payload: { message: 'Internal server error: Player not found.' },
			}),
		);
		return;
	}

	// Check for uniqueness
	let isUnique = true;
	for (const otherPlayer of gameTable.players.values()) {
		if (otherPlayer.id !== playerId && otherPlayer.username === trimmedUsername) {
			isUnique = false;
			break;
		}
	}

	if (isUnique) {
		// Update player state
		player.username = trimmedUsername;
		player.dannyBucks = gameTable.gameSettings.startingDB; // Assign starting balance
		// Reset bet status from previous potential rounds
		player.currentBet = null;

		console.log(`Player ${playerId} set username to: ${trimmedUsername}`);

		// Send success response to the client
		ws.send(
			JSON.stringify({
				type: 'usernameSuccess',
				payload: {
					username: trimmedUsername,
					dannyBucks: player.dannyBucks,
					// Include current list of other players
					players: Array.from(gameTable.players.values())
						.filter((p) => p.id !== playerId && p.username) // Only send players who have set a username
						.map((p) => ({ username: p.username, id: p.id })),
				},
			}),
		);

		// Broadcast playerJoined to other clients
		broadcast(
			{
				type: 'playerJoined',
				payload: { username: trimmedUsername, id: playerId },
			},
			playerId, // Exclude the player who just joined
		);
	} else {
		// Send failure response
		ws.send(
			JSON.stringify({
				type: 'usernameFailure',
				payload: { message: `Username "${trimmedUsername}" is already taken.` },
			}),
		);
	}
}

/**
 * Handles the 'placeBet' message from a client.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
function handlePlaceBet(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const player = gameTable.getPlayerByConnectionId(playerId);

	if (!player || !player.username) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot place bet: Player not found or username not set.' } }));
		return;
	}

	// For MVP, use the fixed bet amount defined in game settings
	const betAmount = gameTable.gameSettings.fixedBetAmount;

	// Validate game state (allow betting only in 'WaitingForPlayers' or 'Betting' state)
	if (gameTable.gameState !== 'WaitingForPlayers' && gameTable.gameState !== 'Betting') {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Cannot place bet in current game state: ${gameTable.gameState}` } }));
		return;
	}

	// Check if player already placed a bet this round
	if (player.currentBet !== null) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'You have already placed a bet for this round.' } }));
		return;
	}

	// Check sufficient balance
	if (player.dannyBucks < betAmount) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Insufficient funds. You need ${betAmount} DB, but have ${player.dannyBucks} DB.` } }));
		return;
	}

	// --- Place the Bet ---
	player.currentBet = betAmount;
	player.dannyBucks -= betAmount;

	// Transition state if this is the first bet
	if (gameTable.gameState === 'WaitingForPlayers') {
		gameTable.gameState = 'Betting';
		// Broadcast the state change to all players
		broadcast({
			type: 'gameStateUpdate',
			payload: { gameState: gameTable.gameState, message: 'Betting has started. Place your bets!' }
		});
		console.log(`Game state changed to Betting by player ${playerId}`);
	}

	console.log(`Player ${playerId} (${player.username}) placed bet of ${betAmount}. Remaining DB: ${player.dannyBucks}`);

	// Send confirmation back to the player
	ws.send(JSON.stringify({
		type: 'betSuccess',
		payload: {
			betAmount: player.currentBet,
			dannyBucks: player.dannyBucks,
		}
	}));

	// Broadcast the bet placement to other players
	broadcast({
		type: 'playerBet',
		payload: {
			playerId: playerId,
			username: player.username,
			betAmount: player.currentBet,
		}
	}, playerId); // Exclude the player who just bet

	// Optional: Auto-start logic (commented out for now, rely on manual startGame)
	// const allPlayersBet = Array.from(gameTable.players.values())
	// 	.filter(p => p.username)
	// 	.every(p => p.currentBet !== null);
	// if (allPlayersBet && gameTable.players.size > 0 && gameTable.gameState === 'Betting') {
	// 	console.log("All active players have placed bets. Starting game automatically...");
	// 	handleStartGame(playerId, { type: 'startGame', payload: {} }, ws);
	// }
}


/**
 * Handles the 'startGame' message to initiate a new round.
 * For MVP, any player can trigger this if the game is in Betting state.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
function handleStartGame(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	console.log(`Received startGame request from ${playerId}`);

	// Validate game state: Only allow starting from 'Betting' state now
	if (gameTable.gameState === 'Betting') {
		// Check if there are players with usernames *and* who have placed a bet
		const playersReady = Array.from(gameTable.players.values()).filter(
			p => p.username && p.currentBet !== null && p.currentBet > 0
		);

		if (playersReady.length > 0) {
			console.log(`Attempting to start new round with ${playersReady.length} players who have bet...`);
			// Transition state *before* dealing
			gameTable.gameState = 'Dealing';
			broadcast({ type: 'gameStateUpdate', payload: { gameState: gameTable.gameState, message: 'Dealing cards...' } });

			// Deal cards etc.
			gameTable.startNewRound(); // This will shuffle, deal, set dealer hand, and change state further

			// Broadcast the updated game state, including the revealed dealer hand details
			broadcast({
				type: 'gameStateUpdate',
				payload: {
					gameState: gameTable.gameState, // Will be 'AceHighPush' or 'PlayerAction'
					dealerHand: { // Send all dealer info for Face-Up variant
						dealtCards: gameTable.dealerHand.dealtCards,
						highHand: gameTable.dealerHand.highHand,
						lowHand: gameTable.dealerHand.lowHand,
						isAceHighPaiGow: gameTable.dealerHand.isAceHighPaiGow,
					},
					message: gameTable.dealerHand.isAceHighPaiGow
						? 'Dealer has Ace-High Pai Gow! Round is a push.'
						: 'Dealer hand set. Please set your hand.',
				},
			});
			// Individual player hands were sent within startNewRound
		} else {
			// This case should be less likely now if we only start from Betting state
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'No players have placed a bet.' } }));
		}
	} else {
		// Send error if not in Betting state
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Game can only be started during the 'Betting' phase. Current state: ${gameTable.gameState}` } }));
	}
}

// --- End Message Handlers ---