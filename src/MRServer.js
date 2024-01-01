import { createServer } from "node:http";
import * as fs from "node:fs";
import { Server as IOServer } from "socket.io";
import crypto from 'crypto';

export class MRServer {
    /** @type {Map<string, {socket: import("socket.io").Socket, data: Object}>} Users connected to the server */
    USERS = new Map();
    COLORS = ["#b38c16", "#2bb7b7", "#9c27b0", "#f44336", "#009688"];

    /** @type {{url: string, method: string, needsAuth?: boolean, handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, data: URLSearchParams) => Promise<any> }[]}} */
    API_ENDPOINTS = [
        {
            url: "/ping",
            method: "GET",

            async handler(req, res, data) {
                return ({
                    pong: Date.now(),
                    data: [...data],
                });
            }
        },
        {
            url: "/keys/list",
            needsAuth: true,
            method: "GET",

            async handler(req, res) {
                const keys = Object.keys(this.db.admins);

                return ({
                    keys
                })
            }
        },
        {
            url: "/keys/add",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const keys = this.db.admins;
                let success = false;

                const key = data.get("key")
                if (key) {
                    success = true;

                    keys[key] = [];
                    this.saveDb();
                }

                return ({
                    success
                });
            }
        },
        {
            url: "/keys/delete",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const keys = this.db.admins;
                let success = false;

                const key = data.get("key")
                if (key && keys[key]) {
                    success = true;

                    delete keys[key];
                    this.saveDb();
                }

                return ({
                    success
                });
            }
        },

        /*** Users ***/
        {
            url: "/users/list",
            method: "GET",

            async handler(req, res) {
                return ({
                    users: [...this.USERS.values()].map(user => user.data)
                })
            }
        },

        /*** Bots ***/
        {
            url: "/bots/list",
            method: "GET",

            async handler(req, res) {
                return ({
                    bots: [...this.BOTS.values()].map(bot => bot.data)
                });
            }
        },

        /*** User specific ***/
        {
            url: "/user/info",
            method: "GET",

            async handler(req, res, data) {
                const user = this.USERS.get(data.get("id"));

                console.debug(this.USERS)

                if (user) {
                    return ({
                        user: user.data
                    });
                }

                return ({
                    success: false
                });
            }
        },
        {
            url: "/user/disconnect",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const user = this.USERS.get(data.get("id"));
                let success = false;

                if (user) {
                    user.socket.disconnect();
                    this.USERS.delete(data.get("id"));

                    success = true;
                }

                return ({
                    success
                })
            }
        },
        {
            url: "/user/ban",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const id = data.get("id");
                const user = [...this.USERS].find(([_, user]) => user.data.id === id)?.[1];
                let success = false;

                if (user) {
                    this.db.banned.push(user.data.id);
                    await this.saveDb();

                    user.socket.disconnect();

                    console.log(this.USERS);

                    success = true;
                }

                return ({
                    success
                })
            }
        },
        {
            url: "/user/unban",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const id = data.get("id");
                let success = false;

                if (this.db.banned.includes(id)) {
                    this.db.banned = this.db.banned.filter(bannedID => bannedID !== id);
                    await this.saveDb();

                    success = true;
                }

                return ({
                    success
                });
            }
        },

        /*** Message ***/
        {
            url: "/message/send",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                let success = false;

                const content = data.get("content");
                const type = data.get("type") || "info";
                if (content) {
                    success = true;

                    this.io.emit("sys-message", {
                        type,
                        content
                    });
                }

                return ({
                    success
                });
            }
        },
    ]

    static randID() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        const charactersLength = characters.length;

        for (let i = 0; i < 32; i++) {
            id += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        return id.slice(0, 32); // to be sure
    }

    static getIDsFromSocket(socket) {
        return MRServer.getIDsFromIP(socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress);
    }

    static getIDsFromIP(ip) {
        const hash = crypto.createHash('md5').update(ip).digest('hex').toUpperCase();
        const id = hash.slice(0, 32);

        return id;
    }

    #handleAuth(req, res) {
        if (!this.#isAllowed(req)) {
            res.writeHead(401);

            res.end(JSON.stringify({
                error: "Unauthorized",
                code: 401
            }));

            return true;
        }

        return false;
    }

    #isAllowed(req) {
        // Check if Authorization header is present and valid
        const secret = this.params.adminSecret;
        const authHeader = req.headers.authorization;

        if (!authHeader || (authHeader !== `Bearer ${secret}`)) {
            return false;
        }

        return true;
    }

    /**
     * Get user data
     * @param {import("socket.io").Socket} socket
     */
    #getUserData(socket) {
        let id = this.params.randomIDs ? MRServer.randID() : MRServer.getIDsFromSocket(socket);
        let user = `anon${Math.random().toString().substring(2, 5).toUpperCase()}`;

        // Session ID
        let uid = 0;
        this.USERS.forEach(u => {
            if (id === u.data.id) uid += 1;
        });

        // Flags
        const flags = [];

        return {
            id,
            session_id: `${id}-${uid}`,
            color: this.COLORS[parseInt(id.slice(0, 4), 36) % this.COLORS.length],
            user,
            flags,
        };
    }

    /**
     * Save the database to a file.
     */
    saveDb() {
        fs.writeFileSync(this.params.db, JSON.stringify(this.db));
    }

    /**
     * Initialize the server
     * @param {Object} params The server parameters
     */
    constructor(params) {
        /*** Initialize params ***/
        this.params = {
            // Server
            db: "./db.json",
            server: createServer(),

            // API
            apiURL: "/api",
            adminSecret: "very_secret",

            // Miscs
            randomIDs: false,

            ...params
        };

        /*** Database setup ***/
        if (!fs.existsSync(this.params.db) || !fs.statSync(this.params.db).isFile()) {
            fs.writeFileSync(this.params.db, JSON.stringify({ admins: {}, banned: [], bots: [] }));
        }

        /*** Initialize props ***/
        /** @type {Object} */
        this.db = JSON.parse(fs.readFileSync(this.params.db));

        /** @type {import("node:http").Server} */
        this.server = this.params.server;

        /** @type {import("socket.io").Server} */
        this.io = new IOServer(this.server, { cors: { origin: "*", methods: ["GET", "POST"] } });

        /*** Bind methods ***/
        this.io.on("connection", this.#handleSocket.bind(this)); // <- Handle connections for Sockets
        this.server.on("request", this.#handleApi.bind(this)); // <- Handle connections for the API
    }

    isIpBlacklisted(ip) {
        let id = MRServer.getIDsFromIP(ip);
        if (this.db.ipwhitelist.includes(id)) return false;
        //TODO: ip blacklist
        return false;
    }

    /**
     * Handle connections from clients
     * @param {import("socket.io").Socket} socket The connecting socket
     */
    #handleSocket(socket) {
        let messagesPerSecond = 0;
        let sentUsername = false;

        socket.once("auth", async (auth) => {
            if (sentUsername) return;
            sentUsername = true;

            const msgroom_user = this.#getUserData(socket);

            if (
                !auth.user ||
                auth.user.length < 1 ||
                auth.user.length > 18 ||
                auth.user === "System"
            ) {
                socket.emit("auth-error", "This nickname is not allowed.");
                return;
            } else {
                msgroom_user.user = auth.user;
            }

            let { admins, bots, banned, shadowbanned, ipwhitelist } = this.db;

            if (Object.values(admins).some(v => v.includes(msgroom_user.id))) {
                msgroom_user.flags.push('staff');
            }

            if (Object.values(bots).some(v => v.includes(msgroom_user.id))) {
                msgroom_user.flags.push('bot');
            }

            if (Object.values(banned).some(v => v.includes(msgroom_user.id))) {
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: User banned.</span> " + msgroom_user.id);
                socket.disconnect();

                return;
            } else if (this.isIpBlacklisted(socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress)) {
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: IP blacklisted.</span> " + msgroom_user.id);
                socket.disconnect();

                return;
            } else {
                // Add user to database
                this.USERS.set(msgroom_user.session_id, { socket: socket, data: msgroom_user, ip: socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress });

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

                if (Object.values(shadowbanned).some(v => v.includes(msgroom_user.id))) return;

                this.io.emit("user-join", {
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
                if (Object.values(shadowbanned).some(v => v.includes(msgroom_user.id))) return;
                if (messagesPerSecond <= 1) {
                    if (
                        username.length > 1 ||
                        username.length < 18 ||
                        username !== "System"
                    ) {
                        messagesPerSecond++;
                        this.io.emit("nick-changed", {
                            oldUser: msgroom_user.user,
                            newUser: username,
                            id: msgroom_user.id,
                            session_id: msgroom_user.session_id,
                        });
                        console.log("User", msgroom_user.user, "(" + msgroom_user.session_id + ") changed their username to", username);
                        msgroom_user.user = username;
                    }
                } else {
                    socket.emit("sys-message", {
                        type: "error",
                        content: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                    });
                }
            });

            socket.on("admin-action", async ({ args }) => {
                let log = "Admin Action";
                let { admins, banned } = this.db;
                let authed = Object.values(admins).some(a => a.includes(msgroom_user.id));

                if (!authed && args[1] !== "auth") {
                    socket.emit("sys-message", {
                        type: "error",
                        content: 'Authorization check failed.'
                    });
                    return;
                };

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
                                        "/a disauth: disauthenticate yourself from staff members",
                                        "/a status [id]: Status of user id, otherwise shows your own",
                                        "/a ban &lt;id&gt;: ban a user",
                                        "/a unban &lt;id&gt;: unban a user",
                                        "/a shadowban &lt;id&gt;: shadowban a user",
                                        "/a shadowunban &lt;id&gt;: shadowunban a user",
                                        "/a whitelist &lt;id&gt;: whitelist a user from the IP check",
                                        "/a disconnect &lt;id&gt;: disconnect a user",
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
                                content: 'You are already authenticated.'
                            });
                            return;
                        }

                        const key = args[2];
                        const keySet = Object.entries(admins).find(k => k[0] === key);

                        if (keySet) {
                            admins[keySet[0]].push(msgroom_user.id);
                            this.saveDb();

                            this.io.emit("user-update", {
                                type: "tag-add",
                                tag: "staff",
                                user: msgroom_user.session_id
                            });

                            socket.emit("sys-message", {
                                type: "info",
                                content: 'You are now logged in as a staff member.'
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: 'Authorization failed.'
                            });
                        }
                    } else if (args[1] === "disauth") {
                        if (!authed) {
                            return;
                        }

                        // Filter every keys with the user id
                        const keys = Object.entries(admins).filter(k => k[1].includes(msgroom_user.id));

                        // Remove the user id from every key
                        keys.forEach(k => {
                            admins[k[0]] = k[1].filter(id => id !== msgroom_user.id);
                            this.saveDb();
                        });

                        // Send a tag-remove event
                        this.io.emit("user-update", {
                            type: "tag-remove",
                            tag: "staff",
                            user: msgroom_user.session_id
                        });

                        // Send a sys-message
                        socket.emit("sys-message", {
                            type: "info",
                            content: 'You are now disauthenticated.'
                        })
                    } else if (args[1] === "status") {
                        let targetUser = { data: msgroom_user, socket: socket };

                        // If user is specified in args
                        if (args[2]) {
                            targetUser = [...this.USERS.values()].find(u => u.data.id === args[2]);

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
                                // `IP: <span class="bold-noaa">${targetUser.ip}</span>`
                            ].join("<br />")
                        });
                    } else if (args[1] === "ban") {
                        if (args[2]) {
                            let targetUsers = {};
                            this.USERS.forEach((value, key) => {
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
                                    banned.push(targetUsers[key].data.id);
                                    this.saveDb();
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
                            for (var i = 0; i < banned.length; i++) {
                                if (args[2] === banned[i]) {
                                    banned.splice(i, 1);
                                    break;
                                }
                            }
                            this.saveDb();
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
                    } else if (args[1] === "shadowban") {
                        if (args[2]) {
                            let targetUsers = {};
                            this.USERS.forEach((value, key) => {
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
                                    shadowbanned.push(targetUsers[key].data.id);
                                    this.saveDb();
                                    targetUsers[key].socket.disconnect();
                                });
                                socket.emit("sys-message", {
                                    type: "info",
                                    content: "User shadowbanned"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "shadowunban") {
                        if (args[2]) {
                            for (var i = 0; i < shadowbanned.length; i++) {
                                if (args[2] === shadowbanned[i]) {
                                    shadowbanned.splice(i, 1);
                                    break;
                                }
                            }
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                content: "User shadowunbanned"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                content: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "whitelist") {
                        if (args[2]) {
                            if (ipwhitelist.includes(args[2])) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    content: "User already whitelisted"
                                });
                                return;
                            };
                            ipwhitelist.push(args[2]);
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                content: "User whitelisted"
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
                                this.USERS.forEach((value, key) => {
                                    if (value.data.session_id === args[2]) {
                                        targetUsers[value.data.session_id] = value;
                                    }
                                });
                            } else {
                                this.USERS.forEach((value, key) => {
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
                // if (!data.type) return;
                if (!data.content) return;
                if (Object.values(shadowbanned).some(v => v.includes(msgroom_user.id))) return;
                if (messagesPerSecond <= 1) {
                    if (data.content.length <= 2048) {
                        messagesPerSecond++;
                        this.io.emit("message", {
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

            socket.on("disconnect", () => {
                this.USERS.delete(msgroom_user.session_id);
                clearInterval(resetMessagesPerSecond);

                if (Object.values(shadowbanned).some(v => v.includes(msgroom_user.id))) return;

                this.io.emit("user-leave", {
                    user: msgroom_user.user,
                    id: msgroom_user.id,
                    session_id: msgroom_user.session_id,
                });

                console.log("<- User", msgroom_user.user, "(" + msgroom_user.session_id + ") left the chat :(");
            });

            socket.emit("online", [...this.USERS.values()].map(u => u.data));
        })

    }

    /**
     * Handles API requests
     * @param {import("node:http").IncomingMessage} req The request
     * @param {import("node:http").ServerResponse} res The response
     */
    async #handleApi(req, res) {
        const API_URL = this.params.apiURL;

        // Check if the request is an API request
        if (!req.url.startsWith(`${API_URL}/`)) return;

        const [fetchURL, query] = req.url.slice(API_URL.length).split("?");

        console.debug(fetchURL, query);

        const endpoint = this.API_ENDPOINTS.find(e => e.url === fetchURL && e.method === req.method);

        // Check if the endpoint exists
        if (!endpoint) {
            res.writeHead(404);
            res.end(JSON.stringify({
                error: "Endpoint not found",
                code: 404
            }));
            return;
        }

        console.log(`[${endpoint ? '✓' : '✗'}|API] ${req.method} ${fetchURL}`);

        // Set the content type without sending the response
        res.writeHead(200, { 'Content-Type': 'application/json' });

        // Verify if the request needs auth then handle it
        if (endpoint.needsAuth && this.#handleAuth(req, res)) return;

        // Get the data from the search query
        const queryParams = new URLSearchParams(query);

        // Handle the request
        const data = await endpoint.handler.call(this, req, res, queryParams);

        if (res.writableEnded) return;
        res.end(JSON.stringify(data));
    }

    /**
     * Starts the server on the specified port.
     * @param {number} port - The port number to listen on. Default is 4096.
     */
    async start(port = 4096) {
        await this.server.listen(port);
    }
}