import { createServer } from "node:http";
import * as fs from "node:fs";
import { spawn } from "node:child_process";
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

        /*** Keys ***/
        {
            url: "/keys/list",
            needsAuth: true,
            method: "GET",

            async handler(req, res) {
                const keys = Object.keys(this.db.keys);

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
                const { keys } = this.db;
                let success = false;

                const key = data.get("key");
                const flags = data.get("flags")?.split(",") || [];

                if (key) {
                    success = true;

                    keys[key] = {
                        users: [],
                        flags: [...flags]
                    };
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
                const keys = this.db.keys;
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

            async handler() {
                return ({
                    bots: [...this.USERS.values()].map(u => u.data).filter(u => this.db.keys.find(k => k.users.includes(u.id)) || u.flags.includes("bot"))
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
            url: "/user/banned",
            method: "GET",

            async handler(req, res, data) {
                const id = data.get("id");

                return ({
                    banned: this.db.banned.includes(id)
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
                        message: content
                    });
                }

                return ({
                    success
                });
            }
        },

        /*** Server ***/
        {
            url: "/server/stop",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                let timeout = 0;

                if (data.has("t")) {
                    timeout = parseInt(data.get("t"));
                }

                if (data.has("alert") && timeout > 0) {
                    this.io.emit("sys-message", {
                        type: "info",
                        message: `**The server will stop in ${timeout} seconds.**`,
                    });
                }

                res.end(JSON.stringify({ success: true }));

                setTimeout(() => {
                    process.exit(0);
                }, timeout * 1000);
            }
        },
        {
            url: "/server/restart",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                let timeout = 0;

                if (data.has("t")) {
                    timeout = parseInt(data.get("t"));
                }

                if (data.has("alert") && timeout > 0) {
                    this.io.emit("sys-message", {
                        type: "info",
                        message: `**The server will restart in ${timeout} seconds.**`,
                    });
                }

                res.end(JSON.stringify({ success: true }));

                setTimeout(() => {
                    // Create a new process 
                    process.once("exit", () => {
                        spawn(
                            process.argv.shift(),
                            process.argv,
                            {
                                cwd: process.cwd(),
                                detached: true,
                                stdio: "inherit"
                            }
                        );
                    });

                    process.exit(0);
                }, timeout * 1000);
            }
        },

        /*** Channels ***/
        {
            url: "/channels/islocked",
            method: "GET",

            async handler(req, res, data) {
                const channel = data.get("channel");

                return ({
                    isLocked: Object.keys(this.db.channelPassword).includes(channel),
                })
            }
        },
        {
            url: "/channels/lock",
            needsAuth: true,
            method: "GET",

            async handler(req, res, data) {
                const channel = data.get("channel");
                const password = data.get("password");

                this.db.channelPassword[channel] = password;
                await this.saveDb();

                return ({
                    success: true,
                })
            }
        }
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
        if (!secret) return false;
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
        let users = [];
        this.USERS.forEach(u => {
            if (id === u.data.id) users.push(u.data);
        });
        while (users.some(user => parseInt(user.session_id.split("-")[1]) === uid)) {
            uid++;
        }

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
            adminSecret: null,

            // Miscs
            randomIDs: false,
            requireLoginKeys: false,
            enableAutoMod: false,
            ratelimit: 2,
            userLimit: 5,
            userKnowBlocks: false,
            enableChannels: false,

            ...params
        };

        /*** Database setup ***/
        if (!fs.existsSync(this.params.db) || !fs.statSync(this.params.db).isFile()) {
            fs.writeFileSync(this.params.db, JSON.stringify({ keys: {}, banned: [], shadowbanned: [], ipwhitelist: [], ipblacklist: [], loginkeys: {}, channelPassword: {} }));
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
        if (this.db.ipblacklist.includes(id)) return true;
        return false;
    }

    getUserListInChannel(channel) {
        let targetUsers = {};
        this.USERS.forEach((value, key) => {
            if (
                !this.params.enableChannels ||
                value.channel === channel
            ) {
                targetUsers[value.data.session_id] = value;
            }
        });
        return targetUsers;
    }

    /**
     * Handle connections from clients
     * @param {import("socket.io").Socket} socket The connecting socket
     */
    #handleSocket(socket) {
        console.log("New user joining, waiting for auth.");
        let messagesPerSecond = 0;
        let sentUsername = false;

        socket.once("auth", async (auth) => {
            if (sentUsername) return;
            sentUsername = true;

            console.log("Auth sent: ", JSON.stringify(auth, null, 4));

            const msgroom_user = this.#getUserData(socket);

            if (auth.disconnectAll) {
                let targetUsers = {};
                this.USERS.forEach((value, key) => {
                    if (value.data.id === msgroom_user.id) {
                        targetUsers[value.data.session_id] = value;
                    }
                });
                Object.keys(targetUsers).forEach(key => {
                    targetUsers[key].socket.disconnect();
                });
            }

            let channel = "main";
            if (this.params.enableChannels && auth.channel) channel = auth.channel;

            let accs = 0;
            this.USERS.forEach((value, key) => {
                if (value.data.id === msgroom_user.id) {
                    accs++;
                }
            });

            if (accs >= this.params.userLimit) {
                socket.emit("mrcs-error", "toomuchusers");
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: Too Much Users.</span> <code>" + msgroom_user.id + "</code><br>You have joined with too much accounts. Please leave or wait some time.");
                return;
            }

            if (
                !auth.user ||
                auth.user.length < 1 ||
                auth.user.length > 18 ||
                auth.user === "System"
            ) {
                socket.emit("auth-error", "This nickname is not allowed.");
                socket.disconnect();

                return;
            } else {
                msgroom_user.user = auth.user;
            }

            let { keys, banned, shadowbanned, ipwhitelist, ipblacklist, loginkeys, channelPassword } = this.db;

            if (Object.keys(channelPassword).includes(channel)) {
                const [chName, chPassword] = Object.entries(channelPassword).find(e => e[0] === channel);

                if (!auth.channelPassword) {
                    socket.emit("mrcs-error", "channelpass");
                    socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: Missing Channel Password.</span> <code>" + msgroom_user.id + "</code><br>A password is needed to access #" + channel + ".");
                    socket.disconnect();

                    return;
                }

                if (auth.channelPassword !== chPassword) {
                    socket.emit("mrcs-error", "channelpass");
                    socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: Bad Channel Password.</span> <code>" + msgroom_user.id + "</code><br>The given password is incorrect.");
                    socket.disconnect();

                    return;
                }
            }

            if (this.params.requireLoginKeys && !auth.loginkey) {
                socket.emit("mrcs-error", "loginkey");
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: Missing Login Key.</span> <code>" + msgroom_user.id + "</code><br>Add a loginkey argument to your auth emittion. (Ask the owner of this MRCS instance to get one)");
                socket.disconnect();

                return;
            }
            if (this.params.requireLoginKeys && !loginkeys.includes(auth.loginkey)) {
                socket.emit("mrcs-error", "loginkey");
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: Unknown Login Key.</span> <code>" + msgroom_user.id + "</code><br>Your loginkey argument on auth emittion does not exist. (Ask the owner of this MRCS instance to get one)");
                socket.disconnect();

                return;
            }

            if (auth.staff) {
                if (keys.hasOwnProperty(auth.staff)) {
                    keys[auth.staff].users.push(msgroom_user.id);
                    this.saveDb();
                }
            }

            // Flag registering
            const flags = new Set(msgroom_user.flags);
            for (const key of Object.values(keys)) {
                if (!key.users.includes(msgroom_user.id)) continue;
                flags.add(...key.flags);
            }
            msgroom_user.flags = [...flags];

            if(auth.bot && !msgroom_user.flags.includes("bot")) {
                msgroom_user.flags.push("bot");
            }

            if (Object.values(banned).some(v => v.includes(msgroom_user.id))) {
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: User banned.</span> <code>" + msgroom_user.id + "</code>");
                socket.disconnect();

                return;
            } else if (this.isIpBlacklisted(socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress)) {
                socket.emit("auth-error", "<span class='bold-noaa'>Something went wrong: IP blacklisted.</span> <code>" + msgroom_user.id + "</code>");
                socket.disconnect();

                return;
            } else {
                // Tell the client the MRCS server info
                socket.emit("mrcs-serverinfo", {
                    version: "1.4.0",
                    beta: true,
                    messageRatelimit: this.params.ratelimit || 2,
                    userLimit: this.params.userLimit || 5,
                    automod: this.params.enableAutoMod || false,
                    loginkeys: this.params.requireLoginKeys || false,
                    userKnowBlocks: this.params.userKnowBlocks || false,
                    channels: this.params.enableChannels || false,
                });

                // Add user to database
                this.USERS.set(msgroom_user.session_id, { socket: socket, data: msgroom_user, ip: socket.request.headers['cf-connecting-ip'] || socket.conn.remoteAddress, loginkey: auth.loginkey || "", channel });

                socket.emit("auth-complete", msgroom_user.id, msgroom_user.session_id);
                socket.emit("message", {
                    type: 'text',
                    content: 'Hi! This custom server was made by nolanwhy and Kelbaz. Please don\'t remove this credit.\n[GitHub Repository 🡕](https://github.com/nolanwhy/msgroom-custom-server)\nMessage from 4/14/24: We made a big mistake by using node:http for MRCS. We will rewrite absolutely EVERYTHING.\nIt will be the exact same but inside, not at all.\nGet ready for v2!\n-nolanwhy & Kelbaz\nMessagr from 6/24/24: We are currently rewriting everything on a new branch, when done, it will get pushed into the main branch.\n[MRCSv2 (develop branch) 🡕](https://github.com/SigmacellHQ/msgroom-custom-server/tree/develop)',
                    user: 'nolanwhy & Kelbaz',
                    color: 'rgb(0, 0, 128)',
                    id: '',
                    session_id: '',
                    date: new Date().toUTCString()
                });

                if (Object.values(shadowbanned).some(v => v.includes(msgroom_user.id))) return;

                let targetUsers = this.getUserListInChannel(channel);
                Object.keys(targetUsers).forEach(key => {
                    targetUsers[key].socket.emit("user-join", {
                        user: msgroom_user.user,
                        color: msgroom_user.color,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                        flags: msgroom_user.flags
                    });
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
                if (messagesPerSecond < this.params.ratelimit) {
                    if (
                        username.length >= 1 &&
                        username.length <= 18 &&
                        username !== "System"
                    ) {
                        messagesPerSecond++;
                        let targetUsers = this.getUserListInChannel(channel);
                        Object.keys(targetUsers).forEach(key => {
                            targetUsers[key].socket.emit("nick-changed", {
                                oldUser: msgroom_user.user,
                                newUser: username,
                                id: msgroom_user.id,
                                session_id: msgroom_user.session_id,
                            });
                        });
                        console.log("User", msgroom_user.user, "(" + msgroom_user.session_id + ") changed their username to", username);
                        msgroom_user.user = username;
                    }
                } else {
                    socket.emit("sys-message", {
                        type: "error",
                        message: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                    });
                }
            });

            socket.on("admin-action", async ({ args }) => {
                let log = "-------------------\nAdmin Action";
                let { keys, banned } = this.db;
                let isStaff = Object.values(keys).some(a => (a.users.includes(msgroom_user.id) && a.flags.includes("staff")));
                let authed = Object.values(keys).some(a => (a.users.includes(msgroom_user.id)));

                log += "\nArguments: " + JSON.stringify(args.slice(1)) + "\nAdmin: " + isStaff.toString();

                if (args[0] === "a") {
                    if (args[1] === "auth") {
                        const key = args[2];

                        if (Object.keys(keys).some(k => k === key)) {
                            const keyConfig = Object.entries(keys).find(([k, v]) => k === key)?.[1];

                            keyConfig.users.push(msgroom_user.id);
                            this.saveDb();

                            const addedFlags = keyConfig.flags.filter(f => !msgroom_user.flags.includes(f));
                            for (const flag of addedFlags) {
                                this.io.emit("user-update", {
                                    type: "tag-add",
                                    tag: flag,
                                    user: msgroom_user.session_id
                                });
                            }

                            socket.emit("sys-message", {
                                type: "info",
                                message: 'You are now logged in.'
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: 'Authorization failed.'
                            });
                        }

                        return;
                    }

                    if (args[1] === "disauth") {
                        if (!authed) {
                            return;
                        }

                        // Filter every keys with the user id
                        const authedKeys = Object.entries(keys).filter(k => k[1].users.includes(msgroom_user.id));

                        // Remove the user id from every key
                        authedKeys.forEach(([key, value]) => {
                            keys[key].users = value.users.filter(id => id !== msgroom_user.id);
                            this.saveDb();
                        });

                        // Send a tag-remove event
                        const tagSet = new Set(authedKeys.flatMap(([k, v]) => v.flags));
                        for (const tag of tagSet) {
                            this.io.emit("user-update", {
                                type: "tag-remove",
                                tag,
                                user: msgroom_user.session_id
                            });
                        }

                        // Send a sys-message
                        socket.emit("sys-message", {
                            type: "info",
                            message: 'You are now disauthenticated.'
                        });

                        return;
                    }

                    // Auth barrier
                    if (!isStaff) {
                        socket.emit("sys-message", {
                            type: "error",
                            message: 'Authorization check failed.'
                        });
                        return;
                    };

                    if (args[1] === "help") {
                        socket.emit("sys-message", {
                            type: "info",
                            message: [
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
                                "--- MRCS-only commands ---",
                                "/a blacklist &lt;id&gt;: blacklist a user from the IP check",
                                "/a addloginkey &lt;key&gt;: create a loginkey (requires the --require-loginkeys argument on server launch)",
                                "/a delloginkey &lt;key&gt;: delete a loginkey",
                                "",
                                "IDs can be obtained from /list."
                            ].join("<br />")
                        });
                    } else if (args[1] === "status") {
                        let targetUser = { data: msgroom_user, socket: socket, loginkey: auth.loginkey };

                        // If user is specified in args
                        if (args[2]) {
                            targetUser = [...this.USERS.values()].find(u => u.data.id === args[2]);

                            if (!targetUser) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    message: "User doesn't exist"
                                });
                                return;
                            }
                        }

                        socket.emit("sys-message", {
                            type: "info",
                            message: [
                                `User status:`,
                                `ID: <span class="bold-noaa">${targetUser.data.id}</span>`,
                                `All Flags: <span class="bold-noaa">${JSON.stringify(targetUser.data.flags)}</span>`,
                                // `IP: <span class="bold-noaa">${targetUser.ip}</span>`,
                                `Login Key: <span class="bold-noaa">${JSON.stringify(targetUser.loginkey)}</span>`
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
                                    message: "User doesn't exist"
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
                                    message: "User banned"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
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
                                message: "User unbanned"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
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
                                    message: "User doesn't exist"
                                });
                                return;
                            } else {
                                Object.keys(targetUsers).forEach(key => {
                                    targetUsers[key].socket.disconnect();
                                    shadowbanned.push(targetUsers[key].data.id);
                                });
                                this.saveDb();
                                socket.emit("sys-message", {
                                    type: "info",
                                    message: "User shadowbanned"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
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
                                message: "User shadowunbanned"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "whitelist") {
                        if (args[2]) {
                            for (var i = 0; i < ipblacklist.length; i++) {
                                if (args[2] === ipblacklist[i]) {
                                    ipblacklist.splice(i, 1);
                                    break;
                                }
                            }
                            if (ipwhitelist.includes(args[2])) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    message: "User already whitelisted"
                                });
                                return;
                            };
                            ipwhitelist.push(args[2]);
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                message: "User whitelisted"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
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
                                    message: "User doesn't exist"
                                });
                                return;
                            } else {
                                Object.keys(targetUsers).forEach(key => {
                                    targetUsers[key].socket.disconnect();
                                });
                                socket.emit("sys-message", {
                                    type: "info",
                                    message: "User disconnected"
                                });
                            }
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "blacklist") {
                        if (args[2]) {
                            for (var i = 0; i < ipwhitelist.length; i++) {
                                if (args[2] === ipwhitelist[i]) {
                                    ipwhitelist.splice(i, 1);
                                    break;
                                }
                            }
                            if (ipblacklist.includes(args[2])) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    message: "User already blacklisted"
                                });
                                return;
                            };
                            ipblacklist.push(args[2]);
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                message: "User blacklisted"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the ID"
                            });
                        }
                    } else if (args[1] === "addloginkey") {
                        if (args[2]) {
                            if (loginkeys.includes(args[2])) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    message: "Login Key already exists"
                                });
                                return;
                            };
                            loginkeys.push(args[2]);
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                message: "Login Key created"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the key"
                            });
                        }
                    } else if (args[1] === "delloginkey") {
                        if (args[2]) {
                            if (!loginkeys.includes(args[2])) {
                                socket.emit("sys-message", {
                                    type: "error",
                                    message: "Login Key doesn't exist"
                                });
                                return;
                            };
                            for (var i = 0; i < loginkeys.length; i++) {
                                if (args[2] === loginkeys[i]) {
                                    loginkeys.splice(i, 1);
                                    break;
                                }
                            }
                            this.saveDb();
                            socket.emit("sys-message", {
                                type: "info",
                                message: "Login Key deleted"
                            });
                        } else {
                            socket.emit("sys-message", {
                                type: "error",
                                message: "Please put the key"
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
                if (messagesPerSecond < this.params.ratelimit) {
                    if (data.content.length <= 2048) {
                        messagesPerSecond++;
                        let targetUsers = this.getUserListInChannel(channel);
                        Object.keys(targetUsers).forEach(key => {
                            targetUsers[key].socket.emit("message", {
                                type: 'text',
                                content: data.content,
                                user: msgroom_user.user,
                                color: msgroom_user.color,
                                id: msgroom_user.id,
                                session_id: msgroom_user.session_id,
                                date: new Date().toUTCString()
                            });
                        });
                        console.log(msgroom_user.user, "(" + msgroom_user.session_id + "):", data.content);
                    }
                } else {
                    socket.emit("sys-message", {
                        type: "error",
                        message: '<span class="bold-noaa">You are doing this too much - please wait!</span>'
                    });
                }
            });

            socket.on("block-user", (data) => {
                if (this.params.userKnowBlocks) {
                    let targetUsers = {};
                    this.USERS.forEach((value, key) => {
                        if (value.data.id === data.user) {
                            if (this.params.enableChannels) {
                                if (value.channel === channel) {
                                    targetUsers[value.data.session_id] = value;
                                }
                            } else {
                                targetUsers[value.data.session_id] = value;
                            }

                        }
                    });
                    if (Object.keys(targetUsers).length >= 1) {
                        Object.values(targetUsers).forEach(user => {
                            user.socket.emit("blocked", {
                                user: msgroom_user.id
                            });
                        });
                    }
                }
            });

            socket.on("unblock-user", (data) => {
                if (this.params.userKnowBlocks) {
                    let targetUsers = {};
                    this.USERS.forEach((value, key) => {
                        if (value.data.id === data.user) {
                            if (this.params.enableChannels) {
                                if (value.channel === channel) {
                                    targetUsers[value.data.session_id] = value;
                                }
                            } else {
                                targetUsers[value.data.session_id] = value;
                            }

                        }
                    });
                    if (Object.keys(targetUsers).length >= 1) {
                        Object.values(targetUsers).forEach(user => {
                            user.socket.emit("unblocked", {
                                user: msgroom_user.id
                            });
                        });
                    }
                }
            });

            socket.on("switch-channel", (data) => {
                if (!this.params.enableChannels) return;
                let targetUsers = this.getUserListInChannel(channel);
                Object.keys(targetUsers).forEach(key => {
                    targetUsers[key].socket.emit("user-leave", {
                        user: msgroom_user.user,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                    });
                });
                channel = data.channel;
                this.USERS.get(msgroom_user.session_id).channel = data.channel;
                targetUsers = this.getUserListInChannel(channel);
                Object.keys(targetUsers).forEach(key => {
                    targetUsers[key].socket.emit("user-join", {
                        user: msgroom_user.user,
                        color: msgroom_user.color,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                        flags: msgroom_user.flags
                    });
                });
            });

            socket.on("disconnect", () => {
                this.USERS.delete(msgroom_user.session_id);
                clearInterval(resetMessagesPerSecond);

                let targetUsers = this.getUserListInChannel(channel);
                Object.keys(targetUsers).forEach(key => {
                    targetUsers[key].socket.emit("user-leave", {
                        user: msgroom_user.user,
                        id: msgroom_user.id,
                        session_id: msgroom_user.session_id,
                    });
                });

                console.log("<- User", msgroom_user.user, "(" + msgroom_user.session_id + ") left the chat :(");
            });

            socket.emit("online", [...this.USERS.values()].map(u => {
                if (this.params.enableChannels) {
                    if (u.channel === channel) {
                        return u.data;
                    }
                    return;
                } else {
                    return u.data;
                }
            }).filter(Boolean));
        });

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