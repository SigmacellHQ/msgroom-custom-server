import "dotenv/config";
import { createServer as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { handle as handleFileRequests } from "./src/server/file_server.js";
import { handle as handleSIORequests } from "./src/server/socket_server.js";
import { handle as handleAdminAPI } from "./src/server/admin_api.js";

const http = HTTPServer();
const io = new SocketIOServer(http);

handleAdminAPI(http);
handleFileRequests(http);
handleSIORequests(io, http);

const args = process.argv;
const PORT = parseInt(args[2]) || 3030; // 0: node, 1: index.js, 2: port

console.log(`Starting on port ${PORT}...`);
http.listen(PORT, () => console.log(`DONE: http://localhost:${PORT}`));