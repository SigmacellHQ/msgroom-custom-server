import { sleep, fixXSS, contextMenu, urlparams } from "./js/utils.js";

// Elements
const sendBtn = document.querySelector(".send");
const nicknameBtn = document.querySelector(".nickname");
const messageBox = document.querySelector(".message-box");
const messageList = document.querySelector(".messages");
const memberList = document.querySelector(".members>.list");
// Commands
const COMMANDS = [
    {
        name: "help",
        description: "List of commands.",
        exec: () => {
            let content = [
                "**List of commands**",
                ""
            ];
            COMMANDS.forEach(cmd => {
                if(cmd.name !== "a") content.push("/" + cmd.name + " - " + cmd.description);
            });
            createMessage({
                content: content.join("\n"),
                classes: ["system", "info"],
                allowHtml: true
            });
        }
    },
    {
        name: "about",
        description: "About MsgRoom.",
        exec: () => {
            createMessage({
                content: [
                    "**MsgRoom Custom Server**",
                    "Made with ❤️ and 🥖 by nolanwhy & Kelbaz",
                    "",
                    "Open source on <a href='https://github.com/nolanwhy/msgroom-custom-server' target='_blank'>GitHub 🡕</a>",
                ].join("\n"),
                classes: ["system", "info"],
                allowHtml: true
            });
        }
    },
    {
        name: "a",
        hidden: true,
        description: "Executes an admin action.",
        exec: ({ socket, args }) => {
            socket.emit("admin-action", { args })
        }
    },
    {
        name: "clear",
        description: "Clear the chat log.",
        exec: () => {
            messageList.innerHTML = "";
            createMessage({ content: "*The chat has been cleared.*", classes: ["system", "info"] });
        }
    },
    {
        name: "list",
        description: "View online memebers.",
        exec: () => {
            createMessage({
                content: "**Online Users**\n\n" + members.map(member => `${member.user} [source id: <code>${member.id}</code>]`).join("\n"),
                classes: ["system", "info"],
                allowHtml: true
            });
        }
    },
    {
        name: "block",
        description: "Blocks a user by ID. Use /list to retrieve user IDs.",
        exec: ({ args }) => {
            const id = args[1];

            if (!id) {
                createMessage({
                    content: "**No user ID specified to block. You can find user IDs with /list (NOT the username).**",
                    classes: ["system", "error"]
                });

                return;
            }

            if (JSON.parse(localStorage.blocked).some(user => user === id)) {
                createMessage({
                    content: `**This user is already blocked.**`,
                    classes: ["system", "error"]
                });

                return;
            }

            localStorage.setItem("blocked", JSON.stringify([...JSON.parse(localStorage.getItem("blocked") ?? "[]"), args[0]]));

            createMessage({
                content: `The user <strong>${members.find(m => m.id === id).user}</strong> is now blocked.`,
                classes: ["system", "info"],
                allowHtml: true
            });
        }
    },
    {
        name: "unblock",
        description: "Unblocks a blocked user by ID. Use /list to retrieve user IDs.",
        exec: ({ args }) => {
            const id = args[1];

            if (!id) {
                createMessage({
                    content: "**No user ID specified to unblock. You can find user IDs with /list (NOT the username).**",
                    classes: ["system", "error"]
                });

                return;
            }

            if (!JSON.parse(localStorage.blocked).some(user => user === id)) {
                createMessage({
                    content: `**This user is not blocked.**`,
                    classes: ["system", "error"]
                });

                return;
            }

            localStorage.setItem("blocked", JSON.stringify(JSON.parse(localStorage.getItem("blocked") ?? "[]").filter(user => user !== id)));

            createMessage({
                content: `The user <strong>${members.find(m => m.id === id).user}</strong> is now unblocked.`,
                classes: ["system", "info"],
                allowHtml: true
            });
        }
    }
]
// Config
const API_URL = `${(location.protocol === "https:" ? "https://" : "http://")}${window.location.hostname}:${window.location.port}`;
let members = [];
/**
 * Sends a text message.
 * @param {string} text The text to send.
 */
function sendTextMessage(text) {
    socket.emit('message', {
        type: "text",
        content: (typeof text === 'string') ? text : `${text}`
    });
};

/**
 * Creates a message element and appends it to the chat.
 * @param {Object} params The message parameters.
 */
function createMessage(params) {
    const opts = {
        color: undefined,
        allowHtml: false,
        user: "System",
        content: "",
        classes: [],
        flags: [],
        date: new Date().toUTCString(),
        ...params,
    }

    let blocked = localStorage.getItem("blocked") ?? "[]";
    blocked = JSON.parse(blocked);

    if (opts.id && blocked.includes(opts.id)) return;

    const msg = document.createElement("div");
    msg.className = "message";
    msg.classList.add(...opts.classes);
    if (!opts.classes.includes("system")) {
        msg.innerHTML = `
            <div class="sig">
                <span class="time">${new Date(Date.parse(opts.date)).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                <span class="author" ${opts.color ? `style="background-color: ${opts.color};"` : ""}>${fixXSS(opts.user)}</span>
                ${opts.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}
            </div>

            <div class="content messageContentFix" ${opts.color ? `style="color: ${opts.color};"` : ""}>
                ${twemoji.parse(textToMD(fixXSS(opts.content)))}
            </div>
        `;
    } else {
        msg.innerHTML = `
            <div class="sig">
                <span class="time">${new Date(Date.parse(opts.date)).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                <span class="author" ${opts.color ? `style="background-color: ${opts.color};"` : ""}>${fixXSS(opts.user)}</span>
                ${opts.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}
            </div>

            <div class="content messageContentFix" ${opts.color ? `style="color: ${opts.color};"` : ""}>
                ${twemoji.parse(textToMD(opts.content, {}, false))}
            </div>
        `;
    }

    //TODO: Context menu
    msg.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (opts.id) contextMenu(opts.id);
    });
    messageList.appendChild(msg);
    messageList.scrollTo(0, messageList.scrollHeight);
}

/**
 * Reloads the member list.
 */
function reloadMemberList() {
    memberList.innerHTML = `<div class="member" ${user.color ? `style="color: ${user.color};"` : ""}>${user.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}${fixXSS(user.user)}</div>`
    members.forEach(member => {
        if(member.session_id !== user.session_id) memberList.innerHTML += `<div class="member" ${member.color ? `style="color: ${member.color};"` : ""}>${member.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}${fixXSS(member.user)}</div>`
    });
}

/**
 * Converts text to markdown.
 * @param {String} text The text to convert.
 */
function textToMD(text, custom = {}, safety = true) {
    let newText = text;
    if(safety) newText = newText.replaceAll(/"/g, "&quot;");
    newText = newText
        // Bold
        .replaceAll(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replaceAll(/__(.*?)__/g, "<strong>$1</strong>")

        // Italic
        .replaceAll(/\*(.*?)\*/g, "<i>$1</i>")
        .replaceAll(/_(.*?)_/g, "<i>$1</i>")

        // Strike
        .replaceAll(/~~(.*?)~~/g, "<s>$1</s>")

        // Links
        .replaceAll(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, '<a style="cursor: pointer;" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

        // New Line
        .replaceAll("\n", "<br />")
        .replaceAll("\r", "<br />")
    Object.keys(custom).forEach(key => {
        newText = newText.replaceAll(key, custom[key]);
    });
    return newText
}

var errored = false;

var mrcsServerInfo = {
    version: null,
    automod: false
};

// Socket
var user = null;
const socket = io(API_URL, {
    reconnection: false
});
window.socket = socket;
socket.on("connect", () => {
    // Add the blocked array if its not already done
    if (!localStorage.getItem("blocked")) localStorage.setItem("blocked", "[]");
    // Nickname
    let username = localStorage.getItem("nickname") ?? prompt("Enter username");
    if (!username || username.length < 1 || username.length > 18) {
        username = "anon" + Math.floor(Math.random() * 99) + 1;
    } else {
        localStorage.setItem("nickname", username);
    }
    document.querySelector(".nickname").innerText = username;
    console.log("Username is", username);
    socket.on("online", (memberList) => {
        members = memberList;
        reloadMemberList();
    })
    // Authentication
    let loginkey = localStorage.getItem("loginkey") ?? null;
    socket.emit("auth", { user: username, loginkey: loginkey, disconnectAll: urlparams.has("disconnectAll") });

    // Set server info (using on instead of once because maybe an admin command to change)
    socket.on("mrcs-serverinfo", (info) => {
        mrcsServerInfo = info;
    });

    socket.once("mrcs-error", async (err) => {
        if(err === "loginkey") {
            loginkey = prompt("This MRCS instance requires you to put a loginkey. Please put one to proceed.\n\nDon't have one? Ask the owner of this MRCS instance to get one.");
            localStorage.setItem("loginkey", loginkey);
            if(loginkey) location.reload();
        } else if(err === "toomuchusers") {
            if(confirm("This MRCS instance is telling you that you have too much alt accounts connected. Please leave or wait some time.\n\nClick OK to disconnect every other alt while connecting."))
                window.location = "?disconnectAll";
        }
    });

    socket.once("auth-error", async (content) => {
        createMessage({ content, classes: ["system", "error"] });
    });

    socket.once("auth-complete", async (userId, sessionId) => {
        // Join
        socket.on("user-join", (data) => {
            if (!user) {
                user = data;
            }
            members.push({ user: data.user, color: data.color, flags: data.flags, id: data.id, session_id: data.session_id });
            reloadMemberList();
            createMessage({ content: `-> User <span class="bold-noaa" style="color: ${data.color};">${fixXSS(data.user)}</span> joined the chat :D`, classes: ["system", "info"], id: data.id, session_id: data.session_id });
        });

        // Leave
        socket.on("user-leave", (data) => {
            members = members.filter(member => member.session_id !== data.session_id);
            reloadMemberList();
            createMessage({ content: `<- User <span class="bold-noaa">${fixXSS(data.user)}</span> left the chat :(`, classes: ["system", "error"], id: data.id, session_id: data.session_id });
        });

        // Message handling
        socket.on("message", ({ user, content, id, session_id, color, date }) => {
            const flags = members.find(member => member.session_id === session_id)?.flags || [];
            createMessage({ user, content, id, session_id, flags, color, date });
        });

        // System message handling
        socket.on("sys-message", ({ message, type }) => {
            createMessage({ content: message, classes: ["system", type] });
        });

        // User update
        socket.on("user-update", (data) => {
            switch (data.type) {
                case "tag-add": {
                    if (!data.tag) break;

                    members = members.map(member => {
                        if (member.session_id === data.user) {
                            member.flags.push(data.tag);
                        }
                        return member;
                    });

                    reloadMemberList();
                    break;
                }

                case "tag-remove": {
                    if (!data.tag) break;

                    members = members.map(member => {
                        if (member.session_id === data.user) {
                            member.flags = member.flags.filter(flag => flag !== data.tag);
                        }
                        return member;
                    });

                    reloadMemberList();
                    break;
                }
            }
        });

        // Nickname change
        socket.on("nick-changed", (data) => {
            members = members.map(member => {
                if (member.session_id === data.session_id) {
                    member.user = data.newUser;
                }
                return member;
            })
            reloadMemberList();
            createMessage({
                content: `User **${fixXSS(data.oldUser)}** changed their username to **${fixXSS(data.newUser)}**`,
                classes: ["system", "success"],
                id: data.id,
                session_id: data.session_id
            });
        });
        nicknameBtn.addEventListener("click", () => {
            changeUsername();
        });
    });
});
function handleSend() {
    if (messageBox.value) {
        if (messageBox.value.startsWith("/")) {
            const args = messageBox.value.slice(1).split(" ");
            const cmd = COMMANDS.find(c => c.name === args[0]);
            if(cmd) {
                cmd.exec({ socket, args });
            } else {
                createMessage({
                    content: [
                        "Unknown command. **/help** for list of commands",
                    ].join("\n"),
                    classes: ["system", "error"],
                    allowHtml: true
                });
            }
        } else {
            if (messageBox.value.length <= 2048) {
                sendTextMessage(messageBox.value);
            } else {
                alert("Message > 2048");
            }
        }

        messageBox.value = "";
    }
}
// Event listeners for message sending
sendBtn.addEventListener("click", handleSend);
messageBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
    }
})

socket.on("connect_error", (err) => {
    if (!errored) {
        errored = true;
    }

    createMessage({
        content: `You have been disconnected from the server. Reason can be found on console. <a onclick="location.reload()">Click here to reconnect</a>`,
        classes: ["system", "error"],
        allowHtml: true
    });
});
socket.on('disconnect', () => {
    if (!errored) {
        errored = true;
    }

    createMessage({
        content: `You have been disconnected from the server. <a onclick="location.reload()">Click here to reconnect</a>`,
        classes: ["system", "error"],
        allowHtml: true
    });
});

export function changeUsername(username = null) {
    // Checking if there isn't an username
    if (!username) {
        // There isn't a username, ask one.
        let newUsername = prompt("Enter a new username");
        if (newUsername) {
            changeUsername(newUsername); // Recall the function
        }
    } else {
        // There is a username, checking if username is less than 1 character, bigger than 18 characters or "System"
        if (username.length < 1 || username.length > 18 || username === "System") {
            createMessage({ content: "**This nickname is not allowed.**", classes: ["system", "error"] });
        } else {
            // Emit to server that we changed our username
            socket.emit("change-user", username);

            // Setting default variables and setTimeout
            let changedSuccess = false;
            let checkTimeout = setTimeout(() => {
                clearTimeout(checkTimeout);
                changeUsername();
            }, 3000);

            // We received a nick change
            socket.on("nick-changed", (res) => {
                // Checking if it's us
                if (!changedSuccess && user.session_id === res.session_id) {
                    // It's us, clear timeout and set success to true. Also change nickname on html
                    clearTimeout(checkTimeout);
                    changedSuccess = true;
                    localStorage.setItem("nickname", username);
                    document.querySelector(".nickname").innerText = username;
                }
            });
        }
    }
}

// Bottom Right menu:
const menuItems = [
    {
        label: "Reset Blocked",
        type: "item",
        action: () => {
            if(confirm("This will reset your blocked users. Are you sure?")) localStorage.setItem("blocked", "[]");
        }
    },
    {
        label: "Clear Messages",
        type: "item",
        action: () => {
            messageList.innerHTML = "";
            createMessage({ content: "*The chat has been cleared.*", classes: ["system", "info"] });
        }
    },
    {
        label: "Delete Login Key",
        type: "item",
        action: () => {
            if(confirm("Are you sure? You will still be able to re-login using it.")) {
                localStorage.setItem("loginkey", null);
                location.reload();
            }
        }
    },
    {
        type: "separator",
    },
    {
        label: "Credits 🡕",
        type: "item",
        action: () => {
            window.open("credits/", "_blank");
        }
    },
    {
        label: "GitHub Repository 🡕",
        type: "item",
        action: () => {
            window.open("https://github.com/nolanwhy/msgroom-custom-server", "_blank");
        }
    },
    {
        type: "separator",
    },
    {
        label: "Server info",
        type: "item",
        action: () => {
            alert([
                "MRCS version " + (mrcsServerInfo.version || "unknown"),
                "AutoMod enabled: " + (mrcsServerInfo.automod.toString() || "unknown"),
            ].join("\n"));
        }
    }
]

const menuBtn = document.querySelector(".menu-btn");
let ctxMenu = null;
menuBtn.addEventListener("click", () => {
    if (ctxMenu) {
        ctxMenu.remove();
        ctxMenu = null;
        return;
    }

    // Create a context menu
    ctxMenu = document.createElement("div");
    ctxMenu.className = "ctx-menu";

    Object.assign(ctxMenu.style, {
        right: "10px",
        bottom: "20px",
        zIndex: 11
    });

    // Add menu items
    menuItems.forEach(item => {
        if (item.type === "separator") {
            const sep = document.createElement("div");
            sep.className = "sep";

            ctxMenu.appendChild(sep);
        } else if (item.type === "item") {
            const itemEl = document.createElement("div");
            itemEl.className = "item";
            itemEl.innerText = item.label;

            itemEl.addEventListener("click", () => {
                item.action();

                try{
                    ctxMenu.remove();
                    ctxMenu = null;
                } catch {}
            });

            ctxMenu.appendChild(itemEl);
        }
    });

    document.body.appendChild(ctxMenu);
});

// Mobile support
let currentlySelected = "Chat";
const mobTabBtns = document.querySelectorAll(".mob-tab-btns button");
mobTabBtns[0].addEventListener("click", () => {
    if (currentlySelected !== "Chat") {
        currentlySelected = "Chat";
        mobTabBtns.forEach(btnToDisable => {
            btnToDisable.classList.remove("active");
        });
        mobTabBtns[0].className = "active";
        document.querySelector('.members').classList.remove("mob-tab-cnt");
    }
});
mobTabBtns[1].addEventListener("click", () => {
    if (currentlySelected !== "Members") {
        currentlySelected = "Members";
        mobTabBtns.forEach(btnToDisable => {
            btnToDisable.classList.remove("active");
        });
        mobTabBtns[1].className = "active";
        document.querySelector('.members').classList.add("mob-tab-cnt");
    }
});

window.addEventListener("beforeunload", () => {
    socket.disconnect();
});