import { createServer } from "node:http";
import { Server as IOServer } from "socket.io";

class MRServer {
    /** @type {Map<string, {socket: import("socket.io").Socket, data: Object}>} Users connected to the server */
    USERS = new Map();

    /**
     * Initialize the server
     * @param {Object} params The server parameters
     */
    constructor(params) {
        // Initialize params
        this.params = {
            db: "./db.json",
            server: createServer(),
            ...params
        };

        // Initialize props
        this.db = this.params.db;
        this.server = this.params.server;
        this.socket = new IOServer(this.server);

        // Bind methods
        this.socket.on(
            "connection",
            this.#handleConnection.bind(this)
        );
    }

    /**
     * Handle connections from clients
     * @param {import("socket.io").Socket} socket The connecting socket
     */
    #handleConnection(socket) {
        
    }

    async start(port = 3030) {
        await this.server.listen(port);
    }
}