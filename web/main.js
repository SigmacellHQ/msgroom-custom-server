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
        color: "#00f",
        user: "System",
        content: "",
        flags: [],
        ...params,
    }
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
        let content = `<div class="sig"><span class="time">0:00 ??</span><span class="author">System</span></div><div class="content">-> User <span class="bold-noaa" style="color: ${DOMPurify.sanitize(data.color)};">${DOMPurify.sanitize(data.user)}</span> joined the chat :D</div>`;
        element.innerHTML = content;
        document.querySelector(".messages").appendChild(element);
        document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
    });
    socket.on("message", (data) => {
        const element = document.createElement("div");
        element.className = "message";
        let content = `<div class="sig"><span class="time">0:00 ??</span><span class="author" style="background-color: #9c27b0;">${DOMPurify.sanitize(data.user)}</span>`;
        /*if (data.flags.includes('staff')) {
            content += `<span class="tag staff">staff</span>`;
        } else if (data.flags.includes('bot')) {
            content += `<span class="tag bot">bot</span>`;
        }*/
        content += `</div><div class="content messageContentFix" style="color: #9c27b0;">${DOMPurify.sanitize(marked.parse(data.content)).replaceAll("\\n", "<br>")}</div>`;
        element.innerHTML = content;
        document.querySelector(".messages").appendChild(element);
        document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
    });
    socket.on("sys-message", (data) => {
        const element = document.createElement("div");
        element.className = "message system";
        element.classList.add(data.type);
        let content = `<div class="sig"><span class="time">0:00 ??</span><span class="author">System</span></div><div class="content">${data.content}</div>`;
        element.innerHTML = content;
        document.querySelector(".messages").appendChild(element);
        document.querySelector(".messages").scrollTo(0, document.querySelector(".messages").scrollHeight);
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