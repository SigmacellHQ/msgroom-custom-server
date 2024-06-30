export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function fixXSS(string) {
    // this code is shit, who cares
    const tempElement = document.createElement("span");
    tempElement.innerText = string;
    let final = tempElement.innerHTML;
    tempElement.remove();
    return final;
}

export var cursorPos = {x: 0, y: 0};
document.onmousemove = (e) => {
    cursorPos = {x: e.clientX, y: e.clientY}
}

export function contextMenu(uid) {
    if(document.querySelector(".ctx-menu")) {
        document.querySelector(".ctx-menu").remove();
    }

    let blocked = localStorage.getItem("blocked") ?? "[]";
    blocked = JSON.parse(blocked);

    // <div class="ctx-menu" style="left: 319px; top: 372px;"><div class="item">Block User</div><div class="sep"></div><div class="item">Copy ID</div></div>
    const ctx = document.createElement("div");
    ctx.className = "ctx-menu";
    ctx.style.left = cursorPos.x + "px";
    ctx.style.top = cursorPos.y + "px";

    let html = `<div class="item">`;
    if(!blocked.includes(uid)) {
        html += "Block User";
    } else {
        html += "Unblock User";
    }
    html += `</div><div class="sep"></div><div class="item">Copy ID</div>`;
    ctx.innerHTML = html;

    ctx.querySelectorAll(".item")[0].addEventListener("click", () => {
        if(!blocked.includes(uid)) {
            blocked.push(uid);
            localStorage.setItem("blocked", JSON.stringify(blocked));
            socket.emit("block-user", {
                user: uid
            });
        } else {
            let newBlocked = [];
            blocked.forEach(user => {
                if(uid !== user) {
                    newBlocked.push(user);
                }
            });
            blocked = newBlocked;
            localStorage.setItem("blocked", JSON.stringify(blocked));
            socket.emit("unblock-user", {
                user: uid
            });
        }
    });
    ctx.querySelectorAll(".item")[1].addEventListener("click", () => {
        navigator.clipboard.writeText(uid);
    });
    document.body.appendChild(ctx);
    document.body.addEventListener("click", removeCTXMenu);
}

function removeCTXMenu() {
    if(document.querySelector(".ctx-menu")) {
        document.querySelector(".ctx-menu").remove();
    }
    document.body.removeEventListener("click", removeCTXMenu);
}

/**
 * Converts text to markdown.
 * @param {String} text The text to convert.
 */
export function textToMD(text, custom = {}, safety = true) {
    let newText = text;
    if (safety) newText = newText.replaceAll(/"/g, "&quot;");
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

export var urlparams = new URLSearchParams(window.location.search);