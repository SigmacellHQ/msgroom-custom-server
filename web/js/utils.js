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
    // <div class="ctx-menu" style="left: 319px; top: 372px;"><div class="item">Block User</div><div class="sep"></div><div class="item">Copy ID</div></div>
    const ctx = document.createElement("div");
    ctx.className = "ctx-menu";
    ctx.style.left = cursorPos.x + "px";
    ctx.style.top = cursorPos.y + "px";

    ctx.innerHTML = `<div class="item">Block User</div><div class="sep"></div><div class="item">Copy ID</div>`;

    ctx.querySelectorAll(".item")[0].addEventListener("click", () => {
        alert("Sorry, this is not done yet.");
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