function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let connected = false;
let url = (location.protocol === "https:" ? "https://" : "http://") + window.location.hostname;

// Utils
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

function createMessage(params) {
    const opts = {
        color: params.color,
        user: params.user ?? "System",
        content: params.content,
        flags: [],
        ...params,
    }
    
    const msg = document.querySelector("div");
    if(!params.system) {
        msg.className = "message";
        msg.innerHTML = `
            <div class="sig">
                <span class="time">0:00 ??</span>
                <span class="author" style="background-color: ${opts.color};">${DOMPurify.sanitize(opts.user)}</span>
                ${opts.flags.map(flag => `<span class="tag ${flag}">${flag}</span>`).join("")}
            </div>

            <div class="content messageContentFix" style="color: ${opts.color};">
                ${DOMPurify.sanitize(marked.parse(opts.content)).replaceAll("\\n", "<br>")}
            </div>
        `;
    } else {
        msg.className = "message system";
        msg.classList.add(params.system.type);
        msg.innerHTML = `
            <div class="sig">
                <span class="time">0:00 ??</span>
                <span class="author">System</span>
            </div>

            <div class="content messageContentFix">
                ${DOMPurify.sanitize(marked.parse(opts.content)).replaceAll("\\n", "<br>")}
            </div>
        `;
    }
    document.querySelector(".messages").appendChild(element);
    document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
}

// Elements
const sendBtn = document.querySelector(".send");
const nicknameBtn = document.querySelector(".nickname");
const messageBox = document.querySelector(".message-box");

const socket = io(url, { transports: ['websocket'] });
socket.on("connect", () => {
    if (connected)
        return location.reload();

    connected = true;
    let username = prompt("Enter username");
    if (!username || username.length < 1 || username.length > 16) {
        username = "anon" + Math.floor(Math.random() * 99) + 1;
    }
    document.querySelector(".nickname").innerText = username;
    socket.emit("auth", { user: username });
    socket.on("user-join", (data) => {
        const element = document.createElement("div");
        element.className = "message system info";
        let content = ``;
        element.innerHTML = content;
        
    });
    
    // Message handling
    socket.on("message", ({user, content, flags, color}) => {
        createMessage({ user, content, flags, color });
    });

    // System message handling
    socket.on("sys-message", ({ type, content }) => {
        createMessage({ content, system: { type: type } });
    });
    socket.on("nick-changed", (data) => {
        const element = document.createElement("div");
        element.className = "message system success";
        let content = `<div class="sig"><span class="time">0:00 ??</span><span class="author">System</span></div><div class="content">User <span class="bold-noaa">${DOMPurify.sanitize(data.oldUser)}</span> changed their username to <span class="bold-noaa">${DOMPurify.sanitize(data.newUser)}</span></div>`;
        element.innerHTML = content;
        document.querySelector(".messages").appendChild(element);
        document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
    });

    nicknameBtn.addEventListener("click", () => {
        changeUsername();
    });
});

function handleSend() {
    if (messageBox.value) {
        sendTextMessage(messageBox.value);
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

socket.on('disconnect', () => {
    location.reload();
});
function sendSysErrorMessage(html) {
    const element = document.createElement("div");
    element.className = "message system error";
    element.innerHTML = html;
    document.querySelector(".messages").appendChild(element);
    document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
    return true;
}
function changeUsername(username = null) {
    if (!username) {
        let newUsername = prompt("Enter a new username");
        if (newUsername) {
            changeUsername(newUsername);
        }
    } else {
        if (username.length < 1 || username.length > 18) {
            sendSysErrorMessage(`<div class="sig"><span class="time">0:00 ??</span><span class="author">System</span></div><div class="content"><span class="bold-noaa">This nickname is not allowed.</span></div>`);
        } else {
            document.querySelector(".nickname").innerText = username;
            socket.emit("nick-change", username);
            socket.on("nick-changed-success", (res) => {
                if (!res) {
                    changeUsername();
                }
            });
        }
    }
}
function sendMessage(msg) {
    socket.emit("message", {});
}