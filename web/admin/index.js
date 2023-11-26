// Login System

const mainContainer = document.querySelector("main");

const loginForm = document.createElement("div");
loginForm.innerHTML = `
<div>
    <label for="passkey">Password:</label> <br />
    <input type="password" id="passkey" name="passkey" placeholder="Enter Your Password Here..." />
</div>
<input type="submit" value="Login" />
`;
loginForm.querySelector("input[type=\"submit\"]").addEventListener("click", (event) => {
    let pass = loginForm.querySelector("#passkey");
    if(pass.value) {
        let date = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = "passkey=" + pass.value + "; expires=" + date.toUTCString();
        location.reload();
    } else {
        alert("Please type a password.");
    }
})
mainContainer.appendChild(loginForm);