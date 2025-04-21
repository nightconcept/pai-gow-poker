import express from 'express';
import expressWs from 'express-ws';
import { WebSocket } from 'ws'; // Import WebSocket type if needed for type hints

const app = express();
const { app: wsApp } = expressWs(app); // Apply express-ws to the app and get the modified app instance

const PORT = process.env.PORT || 8080; // Use environment variable or default to 8080

// Basic root route
wsApp.get('/', (req: express.Request, res: express.Response) => {
  res.send('Server running');
});

// Define the primary WebSocket route
wsApp.ws('/ws', (ws: WebSocket, req: express.Request) => {
  /* Connection logic here */
  console.log('WebSocket connection established'); // Add a log for confirmation
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

// Note: The main WebSocket route (/ws) and game logic will be integrated in subsequent steps.
// This file currently only sets up the basic Express server and express-ws.