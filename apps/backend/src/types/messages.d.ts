/**
 * Defines the structure for messages exchanged via WebSocket.
 */
export interface WebSocketMessage {
	type: string;
	payload: any; // Use 'any' for now, refine with specific types later
}