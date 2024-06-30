/*
################### Hate your life jar ###################
# Developers put an X when you feel like you want to die #
##########################################################
nolanwhy: XX
Kelbaz: X
*/
// Import .env config
import "dotenv/config";

// Import express and create app
import express from "express";
const app = express();

// Import HTTP
import http from "node:http";
const server = http.createServer(app);

// Import socket.io
import { Server as ioServer } from "socket.io";
const io = new ioServer(server);

// Other imports
import API from "./Common/API/imports.js";

const PORT = 4096;

app.use('/', express.static("./src/Common/WebClient/public"));
app.use('/api', API);

/* Connection step:
1. wait for handshake: "connection"
2. auth to server: "auth"
3. complete auth: "auth-complete"
*/

const serverinfo = {
    version: "2.0.0",
    automod: false
};

let connections = [];

// Process socket.io connections, messages, and basically everything
// TODO: Process socket.io in another file
io.on("connection", (socket) => {
    let authTimeout = setTimeout(() => socket.disconnect(), 10000);
    io.once("auth", (auth) => {
        clearTimeout(authTimeout);

        // Panic if the auth argument is invalid
        if(!auth?.user) {
            socket.emit("auth-error", "Invalid arguments");
            socket.disconnect();
        }

        let username = auth.user;
        
        if (!username || username.length < 1 || username.length > 18) {
            // Devs will decide between kick or anon username
            username = "anon" + Math.floor(Math.random() * 99) + 1;
        }

        let userId = "sigma";
        let sessionId = "sigma-69";
        socket.emit("auth-complete", { userId, sessionId });
        socket.emit("mrcs-serverinfo", serverinfo);

        connections.push({ userId, sessionId, socket });

        connections.forEach((connection) => {
            connection.socket.emit("user-join", {
                user: username,
                color: "black",
                flags: [ "staff", "bot" ],
                id: userId,
                session_id: sessionId
            });
        });
    });
});

// Listen on HTTP
if(process.env.ENABLE_WEB_CLIENT === "true") {
    server.listen(PORT, () => {
        console.log([
            `Started at http://localhost:${PORT}.`,
            "Thanks for using MRCS!",
            "",
        ].join("\n"));
    });
}