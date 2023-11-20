import {
    writeFileSync,
    readFileSync,
} from "fs";
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

        socket.once("auth", async (auth) => {
            if (sentUsername) return;
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
            let bans = JSON.parse(await readFileSync("./database/banned.json"));

            if (Object.values(admins).some(v => v.includes(msgroom_user.id))) {
                msgroom_user.flags.push('staff');
            }

            if (Object.values(bots).some(v => v.includes(msgroom_user.id))) {
                msgroom_user.flags.push('bot');
            }
            
            if (Object.values(bans).some(v => v.includes(msgroom_user.id))) {
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong.</span> " + msgroom_user.id);
                socket.disconnect();
                return;
            } else {
                socket.emit("auth-complete", msgroom_user.id, msgroom_user.session_id);

                socket.emit("message", {
                    type: 'text',
                    content: 'Hi! This custom server was made by nolanwhy and Kelbaz. Please don\'t remove this credit.',
                    user: 'System',
                    color: 'rgb(0, 0, 128)',
                    id: '',
                    session_id: '',
                    date: new Date().toUTCString()
                });

                io.emit("user-join", {
                    user: msgroom_user.user,
                    color: msgroom_user.color,
                    id: msgroom_user.id,
                    session_id: msgroom_user.session_id,
                    flags: msgroom_user.flags,
                });
            }

            let resetMessagesPerSecond = setInterval(() => {
                messagesPerSecond = 0;
            }, 1000);

            /**
             * On message reception, handle it
             */
            socket.on("change-user", (username) => {
                if (username.length < 1 || username.length > 16) {
                    socket.emit("change-user-success", false);
                } else {
                    socket.emit("change-user-success", true);
                    io.emit("nick-changed", {
                        oldUser: msgroom_user.user,
                        newUser: username,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                    });
                    msgroom_user.user = username;
                }
            });

            socket.on("admin-action", async ({ args }) => {
                let log = "Admin Action";
                let admins = JSON.parse(await readFileSync("./database/admins.json"));
                let authed = Object.values(admins).some(a => a.includes(msgroom_user.id));
                let bans = JSON.parse(await readFileSync("./database/banned.json"));
                log += "\nArguments: " + JSON.stringify(args.slice(1)) + "\nAdmin: " + authed.toString();
                if (args[0] === "a") {
                    if (args[1] === "help") { {
                        if (authed) {
                            socket.emit("sys-message", {
                                type: "info",
                                content: `Admin commands list<br><br><br>&lt;item&gt; denotes required, [item] for optional.<br><br>
/a help: this thing<br>
/a status [id]: Status of user id, otherwise shows your own<br>
/a ban &lt;id&gt;: ban a user<br>
/a unban &lt;id&gt;: unban a user<br>
----- NOT DONE -----
/a shadowban &lt;id&gt;: shadowban a user<br>
/a shadowunban &lt;id&gt;: shadowunban a user<br>
/a whitelist &lt;id&gt;: whitelist a user from the IP check<br>
/a disconnect &lt;id&gt;: disconnect a user<br><br>
IDs can be obtained from /list.`
                            });
                        }
                    }
                    } else if (args[1] === "auth") {
                        if (authed) {
                            socket.emit("sys-message", {
                                type: "info",
                                content: 'You are already authentificated.'
                            });
                            return;
                        }

                        const key = args[2];
                        const keySet = Object.entries(admins).find(k => k[0] === key);

                        console.log(keySet, key);

                        if (keySet) {
                            admins[keySet[0]].push(msgroom_user.id);
                            writeFileSync("./database/admins.json", JSON.stringify(admins));

                            socket.emit("sys-message", {
                                type: "info",
                                content: 'You are now authentificated as a staff member. Rejoin to make people see you\'re staff.'
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: 'Authorization failed.'
                            });
                        }
                    } else if (args[1] === "status") {
                        let targetUser = {data: msgroom_user, socket: socket};

                        // If user is specified in args
                        if (args[2]) {
                            targetUser = [...users.values()].find(u => u.data.id === args[2]);

                            if (!targetUser) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User doesn't exist"
                                });
                                return;
                            }
                        }

                        socket.emit("sys-message", {
                            type: "info",
                            content: [
                                `User status:`,
                                `ID: <span class="bold-noaa">${targetUser.data.id}</span>`,
                                `All Flags: <span class="bold-noaa">${JSON.stringify(targetUser.data.flags)}</span>`,
                                `IP: <span class="bold-noaa">${targetUser.socket.conn.remoteAddress}</span>`
                            ].join("<br />")
                        });
                    } else if (args[1] === "ban") {
                        if (args[2]) {
                            let targetUser = {data: null, socket: null}
                            targetUser = [...users.values()].find(u => u.data.id === args[2]);

                            if (!targetUser) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User doesn't exist"
                                });
                                return;
                            } else {
                                bans.push(targetUser.id);
                                writeFileSync("./database/banned.json", JSON.stringify(bans));
                                targetUser.socket.disconnect();
                                socket.emit("sys-message", {
                                    type: "info",
                                    content: "User banned"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "unban") {
                        if (args[2]) {
                            for(var i = 0; i < bans.length; i++) {
                                if(args[2] === bans[i]) {
                                    bans[i].splice(i, 1);
                                    break;
                                }
                            }
                            writeFileSync("./database/banned.json", JSON.stringify(bans));
                            socket.emit("sys-message", {
                                type: "info",
                                content: "User unbanned"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: "Please put the ID"
                            });
                        }
                    }
                }
                log += "\n-------------------";
                console.log(log);
            });

            // Message handling
            socket.on("message", data => {
                if (messagesPerSecond <= 1) {
                    if(data.content.length <= 2048) {
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
                    }
                } else {
                    socket.emit("sys-message", {
                        type: "error",
                        content: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                    });
                }

            });

            socket.on("disconnect", () => {
                users.delete(msgroom_user.session_id);
                clearInterval(resetMessagesPerSecond);

                io.emit("user-leave", {
                    user: msgroom_user.user,
                    id: msgroom_user.id,
                    session_id: msgroom_user.session_id,
                });
            });

            socket.emit("online", [...users.values()].map(u => u.data));
        });
    });
}