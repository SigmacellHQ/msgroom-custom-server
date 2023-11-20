//@ts-check
import "dotenv/config";
import express from "express";
import { createServer as createHTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { handle as handleFileRequests } from "./server/file_server.js";
import { handle as handleSIORequests } from "./server/socket_server.js";
import { handle as handleAdminAPI } from "./server/admin_api.js";

const app = express();
const httpServer = createHTTPServer(app);
/** @type {import("msgroom/types/socket.io")} */
const io = new SocketIOServer(httpServer);

handleAdminAPI(httpServer);
handleFileRequests(httpServer);
handleSIORequests(io);

const args = process.argv;
const port = parseInt(args[2]) || 3030; // 0: node, 1: index.js, 2: port

console.log(`Starting on port ${port}...`);
app.listen(port, () => console.log(`Server online at http://localhost:${port}`));