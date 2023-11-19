import {
    writeFileSync,
    readFileSync,
} from "fs";
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
        if (id === u.data.id) uid += 1;
    });

    console.debug(`USER SID: ${id}-${uid}`);

    // Flags
    const flags = [];

    return {
        id,
        session_id: `${id}-${uid}`,
        color: `#${parseInt(id, 36).toString(16).slice(0, 6)}`,
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

        socket.on("auth", async (auth) => {
            if (!sentUsername) {
                sentUsername = true;
                const msgroom_user = getUserData(socket);
                users.set(msgroom_user.session_id, { socket: socket, data: msgroom_user });

                if (!auth.user || auth.user.length < 1 || auth.user.length > 16) {
                    socket.emit("auth-error", "This nickname is not allowed.");
                    return;
                } else {
                    msgroom_user.user = auth.user;
                }

                let admins = JSON.parse(await readFileSync("./database/admins.json"));
                let bots = JSON.parse(await readFileSync("./database/bots.json"));

                for (var i = 0; i < admins.length; i++) {
                    if (admins[i].includes(msgroom_user.id)) {
                        msgroom_user.flags.push('staff');
                        break;
                    }
                }
                for (var i = 0; i < bots.length; i++) {
                    if (bots[i].includes(msgroom_user.id)) {
                        msgroom_user.flags.push('bot');
                        break;
                    }
                }

                socket.emit("auth-complete", msgroom_user.id, msgroom_user.session_id);

                io.emit("user-join", {
                    user: msgroom_user.user,
                    color: msgroom_user.color,
                    id: msgroom_user.id,
                    session_id: msgroom_user.session_id,
                    flags: msgroom_user.flags,
                });

                socket.emit("message", {
                    type: 'text',
                    content: 'This is a recoded version of MsgRoom. Things aren\'t broken, they just aren\'t made.',
                    user: 'System',
                    color: 'rgb(0, 0, 128)',
                    id: '',
                    session_id: '',
                    date: new Date().toUTCString()
                });

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
                        io.emit("nick-changed", {
                            oldUser: msgroom_user.user,
                            newUser: username,
                            id: msgroom_user.id,
                            session_id: msgroom_user.session_id,
                        });
                        msgroom_user.user = username;
                    }
                });

                socket.on("admin-action", async args => {
                    args = args.slice(1);
                    let admins = JSON.parse(await readFileSync("./database/admins.json"));
                    let adminkeys = JSON.parse(await readFileSync("./database/adminkeys.json"));
                    let authed = false;

                    for (const i in admins) {
                        if (admins[i].includes(msgroom_user.id)) {
                            authed = true;
                            break;
                        }
                    }
                    
                    if (args[0] === "auth") {
                        if(authed) {
                            socket.emit("sys-message", {
                                type: "info",
                                content: 'You are already authentificated.'
                            });
                        } else {
                            let key = args[1];
                            let success = false;
                            for(var i = 0; i < adminkeys.length; i++) {
                                if(key === adminkeys[i]) {
                                    success = true;
                                    admins[key].push(msgroom_user.id);
                                    await writeFileSync("./database/admins.json", JSON.stringify(admins, null, 4));
                                    socket.emit("sys-message", {
                                        type: "info",
                                        content: 'You are now authentificated as a staff member.'
                                    });
                                    break;
                                }
                            }
                            if(!success) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: 'Authorization failed.'
                                });
                            }
                        }
                    } else if(args[0] === "status") {
                        let id = msgroom_user.id;
                        let user = msgroom_user;
                        let userSocket = socket;
                        let foundUser = true;
                        if(args[1]) {
                            foundUser = false;
                            id = args[1];
                            users.forEach((value, key) => {
                                for(var i = 0; i < value['data'].length; i++) {
                                    if(id == value['data'].id) {
                                        user = value['data'];
                                        userSocket = value['socket'];
                                        foundUser = true;
                                        break;
                                    }
                                }
                            });
                            if(!foundUser) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User doesn't exist"
                                });
                            }
                        }
                        if(user && foundUser) {
                            socket.emit("sys-message", {
                                type: "info",
                                content: 'User status:<br>ID: <span class="bold-noaa">' + id + '</span><br>All Flags: <span class="bold-noaa">' + JSON.stringify(user.flags) + '</span><br>IP: <span class="bold-noaa">' + userSocket.conn.remoteAddress + '</span>'
                            });
                        }
                    }
                });

                // Message handling
                socket.on("message", data => {
                    if (messagesPerSecond <= 1) {
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

                    io.emit("user-leave", {
                        user: msgroom_user.user,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                    });
                });

                socket.emit("online", [...users.values()].map(u => u.data));
            };
        });
    });
}