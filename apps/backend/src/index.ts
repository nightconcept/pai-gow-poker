import express from 'express';
import expressWs from 'express-ws';
import { WebSocket } from 'ws'; // Import WebSocket type if needed for type hints
import { randomUUID } from 'crypto'; // For generating unique IDs
import { Player } from './models/Player'; // Import Player model
import { WebSocketMessage } from './types/messages'; // Import WebSocket message interface
import {
  handleSetUsername,
  handleStartGame,
  handlePlaceBet,
  handleSetPlayerHand,
  handleRequestPlayerList,
  handleReadyForNextRound
} from './messageHandlers'; // Import handlers
import { broadcast } from './websocketUtils'; // Import broadcast utility
import { PlayerWebSocket } from './types/websocket'; // Import our extended type
import { getGameTable } from './GameManager'; // Import the getter function

const app = express();
const { app: wsApp } = expressWs(app); // Apply express-ws to the app and get the modified app instance

const PORT = process.env.PORT || 8080; // Use environment variable or default to 8080

// Basic root route
wsApp.get('/', (req: express.Request, res: express.Response) => {
  res.send('Server running');
});

// Define the primary WebSocket route
wsApp.ws('/ws', (ws: PlayerWebSocket, req: express.Request) => {
  // Generate a unique ID for this connection/player
  const playerId = randomUUID();
  ws.playerId = playerId; // Store playerId on the WebSocket object
  console.log(`Client connected with ID: ${playerId}`);

  // Access the game table instance
  const gameTable = getGameTable();

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
        case 'setPlayerHand': // Add handler for setting player hand
          handleSetPlayerHand(currentPlayerId, parsedMessage, ws);
          break;
        case 'requestPlayerList': // Handle request for player list
          handleRequestPlayerList(currentPlayerId, ws);
          break;
        case 'readyForNextRound': // Add handler for ready signal
          handleReadyForNextRound(currentPlayerId, parsedMessage, ws);
          break;
        default:
          console.warn(`Unknown message type received: ${parsedMessage.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message or invalid message format:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format. Please send JSON.' },
        }),
      );
    }
  });

  /**
   * Handles a specific client disconnecting.
   */
  ws.on('close', () => {
    // Retrieve the playerId associated with this connection
    const closingPlayerId = ws.playerId;
    if (closingPlayerId) {
      console.log(`Client disconnected: ${closingPlayerId}`);
      const gameTable = getGameTable(); // Get game table instance
      const removedPlayer = gameTable.getPlayerByConnectionId(closingPlayerId);
      // const wasHost = removedPlayer?.isHost; // Not needed for MVP broadcast logic

      // Remove the player from the game table (this might reassign host)
      gameTable.removePlayer(closingPlayerId);

      // Broadcast player left message to remaining clients
      if (removedPlayer && removedPlayer.username) {
        broadcast(
          gameTable, // Pass gameTable
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

      // Always broadcast the updated player list after someone leaves
      console.log('Player left, broadcasting updated player list.');
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
      console.log('Client disconnected (unknown ID)');
    }
  });

  /**
   * Handles errors from a specific client's connection.
   */
  ws.on('error', (error: Error) => {
    console.error(`WebSocket error for player ${ws.playerId || 'unknown'}:`, error);
  });
});

// Basic error handling middleware
wsApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
