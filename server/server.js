import app from "./app.js";
import connectionToDB from "./config/dbConnection.js";
import http from "http";
import { initializeSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Start server with HTTP server instance instead of Express app
server.listen(PORT, async () => {
  await connectionToDB();
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
