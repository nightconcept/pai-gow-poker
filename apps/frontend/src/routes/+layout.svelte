<script lang="ts">
	import { onMount } from 'svelte';
	import { connectWebSocket, connectionStatus } from '$lib/services/websocket';
	import { get } from 'svelte/store';
	import '../app.css';

	// --- Configuration ---
	// TODO: Move this to an environment variable (.env) or config file
	const WEBSOCKET_URL = 'ws://localhost:8080'; // Replace with your actual backend WebSocket URL

	const { children } = $props();

	// Establish WebSocket connection once when the layout mounts
	onMount(() => {
		console.log('Layout mounted. Checking connection status...');
		// Only connect if not already open or connecting
		const status = get(connectionStatus);
		if (status === 'closed' || status === 'error') {
			console.log('Layout attempting WebSocket connection to:', WEBSOCKET_URL);
			connectWebSocket(WEBSOCKET_URL + '/ws'); // Append /ws for express-ws route
		} else {
			console.log('Layout: WebSocket connection already exists or is connecting (Status:', status + ')');
		}

		// Note: We are not closing the connection in onDestroy here.
		// The connection will persist as long as the app tab is open.
		// Explicit disconnect logic could be added later if needed.
	});
</script>

{@render children()}
