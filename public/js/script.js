// const socket = io("https://chat-n8s4.onrender.com");
const socket = io();
// Generate or retrieve a unique sender ID for this client
const myId = localStorage.getItem('myId') || (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('myId', id);
    return id;
})();
const msg = document.getElementById('msg');
const sndbtn = document.getElementById('sndbtn');
const screen = document.getElementById('screen');
const displayCont = document.getElementById('display-cont');

// Load messages from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
    savedMessages.forEach(msgObj => renderMessage(msgObj));
});

function saveMessage(msg) {
    const current = JSON.parse(localStorage.getItem('chatHistory')) || [];
    current.push(msg);
    localStorage.setItem('chatHistory', JSON.stringify(current));
}

function renderMessage(msgObj) {
    const { content, sender } = msgObj;
    const p = document.createElement("p");

    if (content.startsWith("data:image")) {
        const img = document.createElement("img");
        img.src = content;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";
        p.appendChild(img);
    } else {
        p.innerText = content;
    }

    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');

    let isAm = "AM";
    let hour = h;
    
    if (h === 0) {
        hour = 12;
        isAm = "AM";
    } else if (h === 12) {
        hour = 12;
        isAm = "PM";
    } else if (h > 12) {
        hour = h - 12;
        isAm = "PM";
    } else {
        isAm = "AM";
    }
    const span = document.createElement("span");
    span.textContent = `${hour}:${m} ${isAm}`;
    p.appendChild(span);

    if (content.trim() === "") {
        p.style.display = "none";
    } else {
        p.style.display = "flex";
    }

    p.style.borderLeftWidth = "2px";
    p.style.borderLeftStyle = "solid";
    p.style.borderLeftColor = sender === "me" ? "red" : "blue";

    displayCont.appendChild(p);
    p.scrollIntoView({ behavior: "smooth", block: "center" });
}

socket.on("msgs", (msgObj) => {
    const isMine = msgObj.senderId === myId;
    const displaySender = isMine ? 'me' : 'other';
    const displayMsg = { ...msgObj, sender: displaySender };
    renderMessage(displayMsg);
    saveMessage(displayMsg);
});

const imgInput = document.getElementById('imgInput');

sndbtn.addEventListener('click', () => {
    const msgs = msg.value.trim();
    const file = imgInput.files[0];

    // If there's an image selected
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result;
            socket.emit('msg', { content: base64, senderId: myId });
            imgInput.value = ""; // Reset file input
        };
        reader.readAsDataURL(file);
    }

    // If there's a text message
    if (msgs !== "") {
        socket.emit('msg', { content: msgs, senderId: myId });
        msg.value = "";
        typeP.classList.remove('typing', 'typing-me', 'typing-other');
        typeP.textContent = "";
    }
});

// Optional: Double-click on textarea to open file picker
msg.addEventListener('dblclick', () => {
    imgInput.click();
});

msg.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sndbtn.click();
        msg.value = "";
    }
});

msg.addEventListener('input',isTyping);
const typeP = document.querySelector('.typeP');

function isTyping() {
    if (msg.value !== "") {
        socket.emit("typing", { senderId: myId });
        typeP.classList.add('typing', 'typing-me');
        typeP.classList.remove('typing-other');
        typeP.textContent = "typing...";
    } else {
        typeP.classList.remove('typing', 'typing-me', 'typing-other');
        typeP.textContent = "";
    }
}

socket.on("typing", ({ senderId }) => {
    if (senderId !== myId) {
        typeP.classList.add('typing', 'typing-other');
        typeP.classList.remove('typing-me');
        typeP.textContent = "typing...";
        clearTimeout(typeP.timer);
        typeP.timer = setTimeout(() => {
            typeP.classList.remove('typing', 'typing-other');
            typeP.textContent = "";
        }, 2000);
    }
});