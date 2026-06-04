const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
// Redis adapter for Socket.IO scaling
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Mount controllers
const matchesController = require('./controllers/matchesController');
app.use('/api/matches', matchesController);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Attach socket handlers after adapter setup
async function init() {
	// Connect to MongoDB before starting
	try {
		const db = require('./db');
		await db.connect();
	} catch (err) {
		console.warn('MongoDB connect failed:', err.message);
	}
	const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
	try {
		const pubClient = createClient({ url: redisUrl });
		const subClient = pubClient.duplicate();
		await pubClient.connect();
		await subClient.connect();
		io.adapter(createAdapter(pubClient, subClient));
		console.log('Redis adapter attached for Socket.IO');
	} catch (err) {
		console.warn('Could not attach Redis adapter, continuing without it', err.message);
	}

	// Attach socket handlers
	require('./socketHandler')(io);

	const PORT = process.env.PORT || 3000;
	server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
}

init();

module.exports = { app, io };
