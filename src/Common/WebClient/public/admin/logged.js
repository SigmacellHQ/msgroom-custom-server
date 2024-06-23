
// Elements
const mainContainer = document.querySelector("main");
const cardContainer = document.querySelector(".card-container");

window.logout = () => {
    if(confirm("Are you sure that you wanna Log Out?")) {
        document.cookie = "passkey=; expires=-1";
        location.reload();
    }
}

const bearer = document.cookie.split("; ").find(row => row.startsWith("passkey=")).split("=")[1];

const keyList = await fetch("/api/keys/list", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${bearer}`,
        }
    })
    .then(r => r.json())
    .then(r => r.keys)
    .catch(() => {
        alert("An error occurred while loading key list.");
    });

for (const [secret, ids] of Object.entries(keyList)) {
    console.log(secret, ids);

    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
        <div class="header">
            <span class="name">${secret}</span>
        </div>
        <ul>
            ${ids.map(id => `<li>${id}</li>`).join("")}
        </ul>
        <div class="links">
            <a href="javascript:logout()">Log Out</a>
        </div>
    `;

    cardContainer.appendChild(card);
}