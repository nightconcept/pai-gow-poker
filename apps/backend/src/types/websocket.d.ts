import { WebSocket } from 'ws';

export interface PlayerWebSocket extends WebSocket {
	playerId?: string;
}