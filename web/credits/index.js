const cardContainer = document.querySelector(".card-container");
const API_URL = "https://discordlookup.mesavirep.xyz/v1/user/";

const users = {
    "544207551219105792": {
        "name": "nolanwhy",
        "bio": "Owner, Developer",
        "links": {
            "Discord": "https://discords.com/bio/p/nolanwhy",
            "GitHub": "https://github.com/nolanwhy",
            "Windows 96 Repo": "http://nolanwhy.github.io/w96-repo"
        }
    },
    "465943316538589194": {
        "name": "Kelbaz",
        "bio": "Co-Owner, Developer, Dasagner, Cool-guy, combat helicopter",
        "links": {
            "Discord": "https://discordapp.com/users/465943316538589194",
            "GitHub": "https://github.com/kelbazz",
            "Codeberg": "https://codeberg.org/kelbaz",
            "Windows 96 Repo": "http://onofficiel.github.io/w96",
            "Website": "https://kelbazz.github.io",
        }
    },
    "517237145828851713": {
        "name": "Windows 96 Team",
        "bio": "Creators of MsgRoom",
        "links": {
            "Discord": "https://discord.gg/YW5wAe9R94",
            "Windows 96": "https://windows96.net",
            "OG MsgRoom": "https://msgroom.windows96.net",
            "Website": "https://sys36.net/",
        }
    }
}

for (const [id, user] of Object.entries(users)) {
    // Settling of the api
    const userData = await fetch(API_URL + id).then(res => res.json());

    // Creation of the creditor's card
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
    <img class="avatar" alt="${user.name}'s avatar" src="${userData.avatar.link}">
    <div class="info">
      <div class="header">
        <div class="name">${user.name}</div>
        <span class="bio">${user.bio}</span>
      </div>
      <div class='links'></div>
    </div>
  `;

    // Creation of the creditor's links
    for (const [label, url] of Object.entries(user.links)) {
        const container = card.querySelector(".links");
        const element = document.createElement("a");
        element.innerText = label;
        element.href = url;
        container.appendChild(element);
    }

    cardContainer.appendChild(card);
}