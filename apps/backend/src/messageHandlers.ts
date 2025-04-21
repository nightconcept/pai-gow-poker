import type { PlayerWebSocket } from './types/websocket';
import type { WebSocketMessage } from './types/messages';
import type { Card } from './models/Card';
import { getGameTable } from './GameManager';
import { broadcast, sendFullGameState } from './websocketUtils';
import { evaluate5CardHand, evaluate2CardHand, compareEvaluatedHands } from './utils/handEvaluator';

/**
 * Handles the 'setUsername' message from a client.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
export function handleSetUsername(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
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

		// 1. Send the specific 'usernameSuccess' message first
		ws.send(
			JSON.stringify({
				type: 'usernameSuccess',
				payload: {
					username: trimmedUsername,
					dannyBucks: player.dannyBucks,
					playerId: player.id // Send player ID back
				}
			})
		);

		// 2. Send the full current game state to the joining player
		sendFullGameState(gameTable, ws); // Pass gameTable

		// 3. Broadcast playerJoined to other clients (still useful for specific join notification)
		broadcast(
			gameTable, // Pass gameTable
			{
				type: 'playerJoined',
				payload: { username: trimmedUsername, id: playerId, isHost: player.isHost }, // Include isHost
			},
			playerId, // Exclude the player who just joined
		);

		// 4. Broadcast the updated player list to ALL clients
		console.log('Broadcasting updated player list after join.');
		broadcast(gameTable, { // Pass gameTable
			type: 'playerListUpdate',
			payload: {
				players: Array.from(gameTable.players.values())
					.filter(p => p.username) // Only send players with usernames
					.map(p => ({
						id: p.id,
						username: p.username,
						isHost: p.isHost // Include host status
					}))
			}
		});

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
	* Handles a request from a client to get the current player list.
	* @param {string} playerId - The ID of the player requesting the list.
	* @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
	*/
export function handleRequestPlayerList(playerId: string, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
	console.log(`Received requestPlayerList from ${playerId}`);
	const playersWithUsernames = Array.from(gameTable.players.values())
		.filter((p) => p.id !== playerId && p.username) // Filter out self AND ensure username is set
		.map((p) => ({ username: p.username, id: p.id, isHost: p.isHost })); // Include isHost

	ws.send(
		JSON.stringify({
			type: 'playerListUpdate',
			payload: { players: playersWithUsernames },
		}),
	);
}


/**
	* Handles the 'placeBet' message from a client.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
export function handlePlaceBet(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
	const player = gameTable.getPlayerByConnectionId(playerId);

	if (!player || !player.username) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot place bet: Player not found or username not set.' } }));
		return;
	}

	// For MVP, use the fixed bet amount defined in game settings
	const betAmount = gameTable.gameSettings.fixedBetAmount;

	// Validate game state (allow betting only in 'Betting' state now)
	if (gameTable.gameState !== 'Betting') {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Cannot place bet. Game state must be 'Betting', but is currently '${gameTable.gameState}'.` } }));
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
	broadcast(gameTable, { // Pass gameTable
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
	// 	handleStartGame(playerId, { type: 'startGame', payload: {} }, ws); // Need to adapt this call if used
	// }
}


/**
 * Handles the 'startGame' message to initiate a new round.
 * For MVP, any player can trigger this if the game is in Betting state.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
export function handleStartGame(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
	console.log(`Received startGame request from ${playerId}`);

	// Validate game state and sender
	const player = gameTable.getPlayerByConnectionId(playerId);
	if (!player) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Error: Player not found.' } }));
		return;
	}

	// --- Transition from WaitingForPlayers to Betting ---
	if (gameTable.gameState === 'WaitingForPlayers') {
		// Only allow host to start the betting phase
		if (player.id !== gameTable.hostId) {
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'Only the host can start the betting phase.' } }));
			return;
		}
		// Ensure there's at least one player (the host)
		if (gameTable.players.size === 0) {
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot start betting with no players.' } }));
			return;
		}

		console.log(`Host ${playerId} is starting the betting phase.`);
		gameTable.gameState = 'Betting';
		// Reset bets from any previous rounds for all players
		gameTable.players.forEach(p => p.currentBet = null);
		broadcast(gameTable, { type: 'gameStateUpdate', payload: { gameState: gameTable.gameState, message: 'Betting phase started. Please place your bets.' } }); // Pass gameTable

	// --- Transition from Betting to Dealing ---
	} else if (gameTable.gameState === 'Betting') {
		// Check if there are players with usernames *and* who have placed a bet
		const playersReady = Array.from(gameTable.players.values()).filter(
			p => p.username && p.currentBet !== null && p.currentBet > 0
		);

		if (playersReady.length > 0) {
			console.log(`Attempting to start new round with ${playersReady.length} players who have bet...`);
			// Transition state *before* dealing
			gameTable.gameState = 'Dealing';
			broadcast(gameTable, { type: 'gameStateUpdate', payload: { gameState: gameTable.gameState, message: 'Dealing cards...' } }); // Pass gameTable

			// Deal cards etc.
			gameTable.startNewRound(); // This will shuffle, deal, set dealer hand, and change state further

			// Broadcast the full updated game state using the helper function
			sendFullGameState(
				gameTable, // Pass gameTable
				undefined, // Broadcast to all
				gameTable.dealerHand.isAceHighPaiGow
					? 'Dealer has Ace-High Pai Gow! Round is a push.'
					: 'Dealer hand set. Please set your hand.'
			);
			// Individual player hands were sent within startNewRound
		} else {
			// If in Betting state but no one has bet
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot start dealing. No players have placed a bet.' } }));
		}
	// --- Invalid State ---
	} else {
		// Send error if in any other state (Dealing, PlayerAction, Showdown, etc.)
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Game cannot be started from the current state: ${gameTable.gameState}` } }));
	}
}


/**
 * Handles the 'setPlayerHand' message from a client.
 * @param {string} playerId - The ID of the player sending the message.
 * @param {WebSocketMessage} message - The parsed message object.
 * @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
 */
export function handleSetPlayerHand(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
	const player = gameTable.getPlayerByConnectionId(playerId);

	if (!player || !player.username || !player.currentHand) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot set hand: Player not found, username not set, or hand not dealt.' } }));
		return;
	}

	// Validate game state
	if (gameTable.gameState !== 'PlayerAction') {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Cannot set hand in current game state: ${gameTable.gameState}. Waiting for 'PlayerAction'.` } }));
		return;
	}

	// Validate payload structure
	const { highHand, lowHand } = message.payload;
	if (!Array.isArray(highHand) || !Array.isArray(lowHand)) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid payload format. Expecting { highHand: Card[], lowHand: Card[] }.' } }));
		return;
	}

	// Validate card counts
	if (highHand.length !== 5 || lowHand.length !== 2) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Invalid hand split. High hand must have 5 cards (${highHand.length} provided), Low hand must have 2 cards (${lowHand.length} provided).` } }));
		return;
	}

	// Validate cards are from the player's dealt hand
	const combinedSetHand = [...highHand, ...lowHand];
	if (combinedSetHand.length !== 7) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid total number of cards in split hands.' } }));
		return;
	}

	const dealtHandString = player.currentHand.map(card => `${card.rank}-${card.suit}`).sort().join(',');
	const setHandString = combinedSetHand.map(card => `${card.rank}-${card.suit}`).sort().join(',');

	if (dealtHandString !== setHandString) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid cards in split. Cards do not match the originally dealt hand.' } }));
		return;
	}

	// Validate Pai Gow Rule: High Hand > Low Hand
	try {
		const highHandEval = evaluate5CardHand(highHand as Card[]);
		const lowHandEval = evaluate2CardHand(lowHand as Card[]);
		const comparison = compareEvaluatedHands(highHandEval, lowHandEval);

		if (comparison < 0) { // Low hand is stronger than high hand
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid hand split: The 5-card High Hand must rank higher than the 2-card Low Hand.' } }));
			return;
		}
		if (comparison === 0) { // Hands are equal rank (e.g. both Ace high) - still invalid
			ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid hand split: The 5-card High Hand must rank strictly higher than the 2-card Low Hand (cannot be equal rank).' } }));
			return;
		}
	} catch (evalError: any) {
		console.error(`Hand evaluation error for player ${playerId}:`, evalError);
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Internal server error during hand validation: ${evalError.message}` } }));
		return;
	}

	// --- Hand is Valid ---
	player.setHighHand = highHand as Card[];
	player.setLowHand = lowHand as Card[];
	player.hasSetHand = true;

	console.log(`Player ${playerId} (${player.username}) set their hand successfully.`);

	// Send confirmation back to player
	ws.send(JSON.stringify({
		type: 'setHandSuccess',
		payload: { message: 'Hand set successfully.' }
	}));

	// Broadcast that the player has set their hand (don't reveal hand yet)
	broadcast(gameTable, { // Pass gameTable
		type: 'playerSetHand',
		payload: { playerId: playerId, username: player.username }
	}, playerId);

	// --- Check if all players are ready for showdown ---
	const activePlayers = Array.from(gameTable.players.values()).filter(p => p.username && p.currentBet !== null);
	const allPlayersReady = activePlayers.every(p => p.hasSetHand);

	if (allPlayersReady && activePlayers.length > 0) {
		console.log("All active players have set their hands. Proceeding to showdown...");
		// Trigger the next phase (comparison/outcome)
		handleShowdown(); // Call the next step function (defined below)
	}
}

/**
	* Handles the 'readyForNextRound' message from a client.
	* @param {string} playerId - The ID of the player sending the message.
	* @param {WebSocketMessage} message - The parsed message object.
	* @param {PlayerWebSocket} ws - The WebSocket connection of the sender.
	*/
export function handleReadyForNextRound(playerId: string, message: WebSocketMessage, ws: PlayerWebSocket) {
	const gameTable = getGameTable(); // Get game table instance
	const player = gameTable.getPlayerByConnectionId(playerId);

	if (!player || !player.username) {
		ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot signal ready: Player not found or username not set.' } }));
		return;
	}

	// Validate game state
	if (gameTable.gameState !== 'RoundOver') {
		ws.send(JSON.stringify({ type: 'error', payload: { message: `Cannot signal ready. Game state must be 'RoundOver', but is currently '${gameTable.gameState}'.` } }));
		return;
	}

	// Mark player as ready
	player.isReadyForNextRound = true;
	console.log(`Player ${playerId} (${player.username}) is ready for the next round.`);

	// Send confirmation back to player (optional)
	ws.send(JSON.stringify({ type: 'readyConfirm', payload: { message: 'Ready status confirmed.' } }));

	// --- Check if all active players are ready ---
	// Active players are those with a username and enough funds to potentially bet (or just > 0 DB)
	const activePlayers = Array.from(gameTable.players.values()).filter(
		p => p.username && p.dannyBucks > 0 // Consider players with 0 DB as inactive for starting next round
	);

	const allActivePlayersReady = activePlayers.every(p => p.isReadyForNextRound);

	if (allActivePlayersReady && activePlayers.length > 0) {
		console.log("All active players are ready. Starting next round...");

		// --- Reset Player and Dealer State for Next Round ---
		console.log("Resetting player and dealer states for betting...");
		gameTable.players.forEach(p => {
			// Reset round-specific states for ALL players
			p.currentHand = null;
			p.setHighHand = null;
			p.setLowHand = null;
			p.currentBet = null;
			p.hasSetHand = false;
			p.isReadyForNextRound = false; // Reset readiness
		});
		gameTable.dealerHand = { // Reset dealer state
			dealtCards: null,
			highHand: null,
			lowHand: null,
			isAceHighPaiGow: false,
		};
		// --- End Reset Logic ---

		// Transition back to Betting state
		gameTable.gameState = 'Betting';
		console.log(`--- New Round Ready. Game state transitioned to: ${gameTable.gameState} ---`);

		// Broadcast the full game state update using the helper function
		sendFullGameState(gameTable, undefined, 'Place your bets for the next round!'); // Pass gameTable

	} else {
		console.log(`Waiting for other players to be ready. Total active: ${activePlayers.length}, Ready: ${activePlayers.filter(p => p.isReadyForNextRound).length}`);
	}
}


/**
	* Handles the showdown phase: comparing hands, determining outcomes, updating balances.
	* Note: This function doesn't take ws/playerId/message as it's triggered internally.
	*/
export function handleShowdown() {
	const gameTable = getGameTable(); // Get game table instance
	console.log(`--- Starting Showdown for table ${gameTable.id} ---`);
	gameTable.gameState = 'Showdown'; // Ensure state is correct

	const activePlayers = Array.from(gameTable.players.values()).filter(
		p => p.username && p.currentBet !== null && p.hasSetHand // Players involved in the showdown
	);
	const dealer = gameTable.dealerHand;
	const results: any[] = []; // Store results for broadcasting

	if (!dealer.highHand || !dealer.lowHand) {
		console.error("CRITICAL: Dealer hands are not set during showdown.");
		gameTable.gameState = 'WaitingForPlayers'; // Reset state
		broadcast(gameTable, { type: 'error', payload: { message: 'Internal server error: Dealer hand missing during showdown.' } }); // Pass gameTable
		return;
	}

	// Evaluate dealer hands once
	const dealerHighEval = evaluate5CardHand(dealer.highHand);
	const dealerLowEval = evaluate2CardHand(dealer.lowHand);

	// --- Handle Ace-High Push Case ---
	if (dealer.isAceHighPaiGow) {
		console.log("Processing Ace-High Pai Gow Push outcome.");
		activePlayers.forEach(player => {
			const outcome = 'Push';
			// Return the bet amount
			player.dannyBucks += player.currentBet!; // Add bet back

			results.push({
				playerId: player.id,
				username: player.username,
				outcome: outcome,
				betAmount: player.currentBet,
				winnings: 0, // No winnings on push
				newBalance: player.dannyBucks,
				playerHighHand: player.setHighHand, // Show hands even on push
				playerLowHand: player.setLowHand,
			});
			console.log(`Player ${player.id} (${player.username}): ${outcome} (Ace-High). Returned ${player.currentBet} DB. New balance: ${player.dannyBucks}`);
		});
	} else {
		// --- Handle Normal Comparison ---
		console.log("Processing normal hand comparisons.");
		activePlayers.forEach(player => {
			if (!player.setHighHand || !player.setLowHand) {
				console.warn(`Player ${player.id} (${player.username}) reached showdown without set hands. Skipping.`);
				results.push({
					playerId: player.id,
					username: player.username,
					outcome: 'Error', // Indicate an issue
					betAmount: player.currentBet,
					winnings: 0,
					newBalance: player.dannyBucks,
					playerHighHand: null,
					playerLowHand: null,
				});
				return; // Skip this player
			}

			try {
				// Evaluate player hands
				const playerHighEval = evaluate5CardHand(player.setHighHand);
				const playerLowEval = evaluate2CardHand(player.setLowHand);

				// Compare hands (Player vs Dealer)
				const highHandComparison = compareEvaluatedHands(playerHighEval, dealerHighEval); // 1: P > D, -1: P < D, 0: Tie (D wins)
				const lowHandComparison = compareEvaluatedHands(playerLowEval, dealerLowEval);   // 1: P > D, -1: P < D, 0: Tie (D wins)

				let outcome: string;
				let winnings = 0;

				// Determine Win/Loss/Push (Dealer wins ties)
				const playerWinsHigh = highHandComparison > 0;
				const playerWinsLow = lowHandComparison > 0;
				const dealerWinsHigh = highHandComparison <= 0; // Includes tie
				const dealerWinsLow = lowHandComparison <= 0;  // Includes tie

				if (playerWinsHigh && playerWinsLow) {
					outcome = 'Win';
					winnings = player.currentBet!; // MVP: Even money, no commission
					player.dannyBucks += player.currentBet! + winnings; // Original bet back + winnings
				} else if (dealerWinsHigh && dealerWinsLow) {
					outcome = 'Loss';
					winnings = -player.currentBet!; // Lost the bet
					// DB already deducted, no change needed here for loss
				} else {
					outcome = 'Push';
					winnings = 0;
					player.dannyBucks += player.currentBet!; // Return original bet
				}

				results.push({
					playerId: player.id,
					username: player.username,
					outcome: outcome,
					betAmount: player.currentBet,
					winnings: winnings,
					newBalance: player.dannyBucks,
					playerHighHand: player.setHighHand,
					playerLowHand: player.setLowHand,
				});
				console.log(`Player ${player.id} (${player.username}): ${outcome}. High: ${highHandComparison > 0 ? 'Win' : 'Lose/Tie'}, Low: ${lowHandComparison > 0 ? 'Win' : 'Lose/Tie'}. Winnings: ${winnings}. New balance: ${player.dannyBucks}`);

			} catch (evalError: any) {
				console.error(`Error comparing hands for player ${player.id}:`, evalError);
				results.push({
					playerId: player.id,
					username: player.username,
					outcome: 'Error',
					betAmount: player.currentBet,
					winnings: 0,
					newBalance: player.dannyBucks,
					playerHighHand: player.setHighHand,
					playerLowHand: player.setLowHand,
					error: `Evaluation/Comparison Error: ${evalError.message}`
				});
			}
		});
	}

	// --- Broadcast Results ---
	broadcast(gameTable, { // Pass gameTable
		type: 'roundResult',
		payload: {
			results: results,
			dealerDealtCards: dealer.dealtCards, // Show what dealer had
			dealerHighHand: dealer.highHand,
			dealerLowHand: dealer.lowHand,
			isAceHighPaiGow: dealer.isAceHighPaiGow,
		}
	});
	console.log("Round results broadcasted.");

	// --- Reset logic moved to handleReadyForNextRound ---

	// Transition state to indicate round is over, waiting for players to ready up
	gameTable.gameState = 'RoundOver';
	broadcast(gameTable, { // Pass gameTable
		type: 'gameStateUpdate',
		payload: {
			gameState: gameTable.gameState,
			message: 'Round over. Click "Start Next Round" when ready.'
		}
	});
	console.log(`--- Showdown Complete. Game state transitioned to: ${gameTable.gameState} ---`);
}