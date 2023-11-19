// Login System

const mainContainer = document.querySelector("main");

if (!localStorage.getItem("passkey")) {
    console.debug(localStorage.getItem("passkey"));
    const loginForm = document.createElement("form");
    loginForm.innerHTML = `
        <div>
            <label for="passkey">Password:</label> <br />
            <input type="password" id="passkey" name="passkey" placeholder="Enter Your Password Here..." />
        </div>

        <input type="submit" value="Login" />
    `;

    loginForm.addEventListener("submit", (event) => {
        console.log(event)
    })

    mainContainer.appendChild(loginForm);
}

