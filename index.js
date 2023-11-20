import "dotenv/config";
import { createServer as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { handle as handleFileRequests } from "./server/file_server.js";
import { handle as handleSIORequests } from "./server/socket_server.js";
import { handle as handleAdminAPI } from "./server/admin_api.js";

const http = HTTPServer();
const io = new SocketIOServer(http, {
    path: "/socket.io",
    transports: ["polling", "websocket"]
});

handleAdminAPI(http);
handleFileRequests(http);
handleSIORequests(io);

const args = process.argv;
const PORT = parseInt(args[2]) || 3030; // 0: node, 1: index.js, 2: port

console.log(`Starting on port ${PORT}...`);
let started = false;
try {
    http.listen(PORT);
    started = true;
} catch (e) {
    started = false;
    console.error(e);
}
if (started) {
    console.log(`Done: http://localhost:${PORT}`);
}