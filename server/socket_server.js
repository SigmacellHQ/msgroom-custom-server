import { sleep } from "../utils.js";
import crypto from 'crypto';

/** @type {Map<string, {socket: Socket, data: {}}>} Stores connected users */
const users = new Map();

export function getIDsFromSocket(socket) {
    const hash = crypto.createHash('md5').update(socket.conn.remoteAddress).digest('hex').toUpperCase();
    const id = hash.slice(0, 32);

    return id;
}

/**
 * Get user data
 * @param {import("socket.io").Socket} socket
 */
export function getUserData(socket) {
    const id = getIDsFromSocket(socket);
    
    let user = `anon${Math.random().toString().substring(2, 5).toUpperCase()}`;

    // Session ID
    let uid = 0;
    users.forEach(u => {
        if (id === u.id) uid += 1;
    });

    // Flags
    const flags = [];

    return {
        id,
        session_id: `${id}-${uid}`,
        color: "#333",
        user,
        flags,
    };
}

export function handle(io) {
    /**
     * Waits for a connection from a client
     */
    io.on("connection", socket => {
        let messagesPerSecond = 0;
        let sentUsername = false;

        socket.on("auth", (auth) => {
            if(!sentUsername) {
                sentUsername = true;
                const msgroom_user = getUserData(socket);

                if(!auth.user || auth.user.length < 1 || auth.user.length > 16)  {
                    socket.emit("auth-error", "This nickname is not allowed.");
                    return;
                } else {
                    msgroom_user.user = auth.user;
                }
                
                users.set(msgroom_user.session_id, { socket: socket, data: msgroom_user });
        
                io.emit("user-join", {
                    user: msgroom_user.user,
                    color: msgroom_user.color,
                    id: msgroom_user.id,
                    session_id: msgroom_user.session_id,
                    flags: msgroom_user.flags,
                });

                socket.emit("auth-complete", "OK");
                socket.emit("online");

                let resetMessagesPerSecond = setInterval(() => {
                    messagesPerSecond = 0;
                }, 1000);
        
                /**
                 * On message reception, handle it
                 */
                socket.on("nick-change", (username) => {
                    if (username.length < 1 || username.length > 16) {
                        socket.emit("nick-changed-success", false);
                    } else {
                        socket.emit("nick-changed-success", true);
                        let user = null;
                        for(const [key, value] of users.entries()) {
                            if(value.data.session_id === msgroom_user.session_id) {
                                user = value.data;
                                break;
                            }
                        }
                        io.emit("nick-changed", {
                            oldUser: user.user,
                            newUser: username,
                            id: '',
                            session_id: ''
                        });
                        user.user = username;
                    }
                });

                // Message handling
                socket.on("message", data => {
                    if(messagesPerSecond <= 2) {
                        messagesPerSecond++;
                        io.emit("message", {
                            type: 'text',
                            content: data.content,
                            user: msgroom_user.user,
                            color: msgroom_user.color,
                            id: msgroom_user.id,
                            session_id: msgroom_user.session_id,
                            date: new Date().toUTCString()
                        });
                    } else {
                        socket.emit("sys-message", {
                            type: "error",
                            content: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                        });
                    }
                });
        
                socket.on("disconnect", () => {
                    users.delete(socket);
                    clearInterval(resetMessagesPerSecond);
        
                    io.emit("user-left", {
        
                    })
                })
            };
        });
    });
}