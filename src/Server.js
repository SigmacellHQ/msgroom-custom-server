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
        let messagesPerSecond = 0;
        let sentUsername = false;

        socket.once("auth", async (auth) => {
            if (sentUsername) return;
            sentUsername = true;

            const msgroom_user = getUserData(socket);
            users.set(msgroom_user.session_id, { socket: socket, data: msgroom_user, ip: socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress });

            if (
                !auth.user ||
                auth.user.length < 1 ||
                auth.user.length > 16 ||
                auth.user === "System"
            ) {
                socket.emit("auth-error", "This nickname is not allowed.");
                return;
            } else {
                msgroom_user.user = auth.user;
            }

            let admins = JSON.parse(await readFileSync("./src/database/admins.json"));
            let bots = JSON.parse(await readFileSync("./src/database/bots.json"));
            let bans = JSON.parse(await readFileSync("./src/database/banned.json"));

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
                console.log("-> User " + msgroom_user.user, "(" + msgroom_user.session_id + ") joined the chat :D");
            }

            let resetMessagesPerSecond = setInterval(() => {
                messagesPerSecond = 0;
            }, 1000);

            /**
             * On message reception, handle it
             */
            socket.on("change-user", (username) => {
                if (
                    username.length > 1 ||
                    username.length < 16 ||
                    username !== "System"
                ) {
                    io.emit("nick-changed", {
                        oldUser: msgroom_user.user,
                        newUser: username,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                    });
                    console.log("User", msgroom_user.user, "(" + msgroom_user.session_id + ") changed their username to", username);
                    msgroom_user.user = username;
                }
            });

            socket.on("admin-action", async ({ args }) => {
                let log = "Admin Action";
                let admins = JSON.parse(await readFileSync("./src/database/admins.json"));
                let authed = Object.values(admins).some(a => a.includes(msgroom_user.id));
                let bans = JSON.parse(await readFileSync("./src/database/banned.json"));
                log += "\nArguments: " + JSON.stringify(args.slice(1)) + "\nAdmin: " + authed.toString();

                if (args[0] === "a") {
                    if (args[1] === "help") {
                        {
                            if (authed) {
                                socket.emit("sys-message", {
                                    type: "info",
                                    content: [
                                        "Admin commands list",
                                        "", "",
                                        "&lt;item&gt; denotes required, [item] for optional.<br><br>",
                                        "/a help: this thing",
                                        "/a status [id]: Status of user id, otherwise shows your own",
                                        "/a ban &lt;id&gt;: ban a user",
                                        "/a unban &lt;id&gt;: unban a user",
                                        "----- NOT DONE -----",
                                        "/a shadowban &lt;id&gt;: shadowban a user",
                                        "/a shadowunban &lt;id&gt;: shadowunban a user",
                                        "/a whitelist &lt;id&gt;: whitelist a user from the IP check",
                                        "/a disconnect &lt;id&gt;: disconnect a user -- except this, its done",
                                        "",
                                        "IDs can be obtained from /list."
                                    ].join("<br />")
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
                            writeFileSync("./src/database/admins.json", JSON.stringify(admins));

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
                        let targetUser = { data: msgroom_user, socket: socket };

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
                                `IP: <span class="bold-noaa">${targetUser.ip}</span>`
                            ].join("<br />")
                        });
                    } else if (args[1] === "ban") {
                        if (args[2]) {
                            let targetUsers = {};
                            users.forEach((value, key) => {
                                if (value.data.id === args[2]) {
                                    targetUsers[value.data.session_id] = value;
                                }
                            });
                            if (targetUsers.length < 1) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User doesn't exist"
                                });
                                return;
                            } else {
                                Object.keys(targetUsers).forEach(key => {
                                    bans.push(targetUsers[key].data.id);
                                    writeFileSync("./src/database/banned.json", JSON.stringify(bans));
                                    targetUsers[key].socket.disconnect();
                                });
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
                            for (var i = 0; i < bans.length; i++) {
                                if (args[2] === bans[i]) {
                                    bans.splice(i, 1);
                                    break;
                                }
                            }
                            writeFileSync("./src/database/banned.json", JSON.stringify(bans));
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
                    } else if (args[1] === "disconnect") {
                        if (args[2]) {
                            let targetUsers = {};
                            if (args[2].length !== 32) {
                                users.forEach((value, key) => {
                                    if (value.data.session_id === args[2]) {
                                        targetUsers[value.data.session_id] = value;
                                    }
                                });
                            } else {
                                users.forEach((value, key) => {
                                    if (value.data.id === args[2]) {
                                        targetUsers[value.data.session_id] = value;
                                    }
                                });
                            }
                            if (targetUsers.length < 1) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User doesn't exist"
                                });
                                return;
                            } else {
                                Object.keys(targetUsers).forEach(key => {
                                    targetUsers[key].socket.disconnect();
                                });
                                socket.emit("sys-message", {
                                    type: "info",
                                    content: "User disconnected"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: "Please put the ID"
                            });
                        }
                    }

                    log += "\n-------------------";
                    console.log(log);
                }
            });

            // Message handling
            socket.on("message", data => {
                if (messagesPerSecond <= 1) {
                    if (data.content.length <= 2048) {
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
                        console.log(msgroom_user.user, "(" + msgroom_user.session_id + "):", data.content);
                    }
                } else {
                    socket.emit("sys-message", {
                        type: "error",
                        content: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                    });
                }

            });
        })

    }
    
    async start(port = 3030) {
        await this.server.listen(port);
    }
}