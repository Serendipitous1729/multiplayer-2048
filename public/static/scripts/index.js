const socket = io();
socket.emit("join-lobby-updates");

socket.on("lobby-update", (update) => {
    console.log(update);
});

const usernameInput = document.getElementById("username");
const usernameMessage = document.getElementById("username-msg");
updateUsernameInput();
usernameInput.addEventListener("input", () => {
    updateUsernameLocalStorage();
});

function updateUsernameInput() {
    const username = localStorage.getItem("username");
    usernameInput.value = username === null ? "" : username;
    validateUsername(username);
}
function updateUsernameLocalStorage() {
    const username = usernameInput.value;
    if(validateUsername(username)){
        localStorage.setItem("username", usernameInput.value);
    }
}

function validateUsername(username) {
    let msg = "Your username (display name):";
    let isValid = true;
    if(username === null || username.trim() === "") {
        msg = "Please enter a username:";
        isValid = false;
    }
    else if(username.trim() !== username) {
        msg = "Please don't include whitespaces in your username."
        isValid = false;
    }
    else if(username.length > 20) {
        msg = "Your username must not exceed 20 characters, sorry."
        isValid = false;
    }
    usernameMessage.innerText = msg;
    return isValid;
}

document.getElementById("public-btn").addEventListener("click", () => {
    if(validateUsername(localStorage.getItem("username"))){
        window.location.href = "/match";
    } else {
        alert("Please set a valid username!");
    }
});

document.getElementById("private-btn").addEventListener("click", () => {
    if(validateUsername(localStorage.getItem("username"))){
        window.location.href = "/create-private-match";
    } else {
        alert("Please set a valid username!");
    }
});