import { sleep, formatUTCTime } from "./js/utils.js";

// Elements
const sendBtn = document.querySelector(".send");
const nicknameBtn = document.querySelector(".nickname");
const messageBox = document.querySelector(".message-box");
const messageList = document.querySelector(".messages");
const memberList = document.querySelector(".members>.list");

// Config
const API_URL = (location.protocol === "https:" ? "https://" : "http://") + window.location.hostname;
let members = [];
window.members = members;

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

    console.debug(opts);

    const msg = document.createElement("div");
    msg.className = "message";
    msg.classList.add(...opts.classes);
    msg.innerHTML = `
        <div class="sig">
            <span class="time">${formatUTCTime(opts.date)}</span>
            <span class="author" ${opts.color ? `style="background-color: ${opts.color};"` : ""}>${DOMPurify.sanitize(opts.user)}</span>
            ${opts.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}
        </div>

        <div class="content messageContentFix" ${opts.color ? `style="color: ${opts.color};"` : ""}>
            ${params.id ? "<button onclick='try{navigator.clipboard.writeText(\"" + params.id + "\");}catch{alert(\"" + params.id + "\");};'>ID</button>" : ""}
            ${DOMPurify.sanitize(marked.parse(opts.content)).replaceAll("\\n", "<br>")}
        </div>
    `;

    messageList.appendChild(msg);
    messageList.scrollTo(0, messageList.scrollHeight);
}

/**
 * Reloads the member list.
 */
function reloadMemberList() {
    memberList.innerHTML = "";

    members.forEach(member => {
        memberList.innerHTML += `${member.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}<div class="member" ${member.color ? `style="color: ${member.color};"` : ""}>${DOMPurify.sanitize(member.user)}</div>`
    });
}

// Socket
const socket = io(API_URL, { transports: ['websocket'] });
socket.on("connect", () => {
    // Nickname
    let username = localStorage.nickname ?? prompt("Enter username");
    if (!username || username.length < 1 || username.length > 16) {
        username = "anon" + Math.floor(Math.random() * 99) + 1;
    } else {
        localStorage.nickname = username;
    }
    document.querySelector(".nickname").innerText = username;

    socket.on("online", (memberList) => {
        members = memberList;
        reloadMemberList();
    })

    // Authentication
    socket.emit("auth", { user: username });

    socket.once("auth-complete", async (userId, sessionId) => {
        // Join
        socket.on("user-join", (data) => {
            members.push({ user: data.user, color: data.color, flags: data.flags, id: data.id, session_id: data.session_id });
            reloadMemberList();
            createMessage({ content: `-> User <span class="bold-noaa" style="color: ${data.color};">${DOMPurify.sanitize(data.user)}</span> joined the chat :D`, classes: ["system", "info"], date: Date.now() });
        });

        // Leave
        socket.on("user-leave", (data) => {
            members = members.filter(member => member.session_id !== data.session_id);
            reloadMemberList();
            createMessage({ content: `<- User <span class="bold-noaa">${DOMPurify.sanitize(data.user)}</span> left the chat :(`, classes: ["system", "error"], date: Date.now() });
        });

        // Message handling
        socket.on("message", ({ user, content, id, color, date }) => {
            createMessage({ user, content, id, color, date });
        });

        // System message handling
        socket.on("sys-message", ({ content, type }) => {
            createMessage({ content, classes: ["system", type] });
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
                content: `User **${DOMPurify.sanitize(data.oldUser)}** changed their username to **${DOMPurify.sanitize(data.newUser)}**`,
                classes: ["system", "success"],
            });
        });
        nicknameBtn.addEventListener("click", () => {
            changeUsername();
        });
    });


});

function handleSend() {
    if (messageBox.value) {
        if (messageBox.value.startsWith('/a ')) {
            let all = messageBox.value.replace('/a ', '').split(' ');
            socket.emit("admin-action", ["a", all]);
            messageBox.value = "";
        } else {
            sendTextMessage(messageBox.value);
            messageBox.value = "";
        }
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

socket.on('disconnect', () => {
    location.reload();
});

function changeUsername(username = null) {
    if (!username) {
        let newUsername = prompt("Enter a new username");
        if (newUsername) {
            changeUsername(newUsername);
        }
    } else {
        if (username.length < 1 || username.length > 18) {
            createMessage({ content: "**This nickname is not allowed.**", classes: ["system", "error"], date: Date.now() });
        } else {
            document.querySelector(".nickname").innerText = username;
            socket.emit("nick-change", username);
            socket.on("nick-changed-success", (res) => {
                if (!res) {
                    changeUsername();
                } else {
                    localStorage.setItem("nickname", username);
                }
            });
        }
    }
}
function sendMessage(msg) {
    socket.emit("message", {});
}