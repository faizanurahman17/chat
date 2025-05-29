// const socket = io("https://chat-n8s4.onrender.com");
const socket = io();
let lastSender = null;
const senderMap = {};
let anonCount = 1;
const anonColors = {};
const colorPalette = ["aqua", "green", "orange", "purple", "teal", "magenta", "gold", "navy", "olive", "maroon"];
// Generate or retrieve a unique sender ID for this client
const myId = localStorage.getItem('myId') || (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('myId', id);
    return id;
})();

const myName = localStorage.getItem('myName') || (() => {
    const rawName = prompt("Enter your name (leave empty to stay anonymous):") || "";
    const name = rawName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    localStorage.setItem('myName', name);
    if (name) {
        setTimeout(() => {
            alert(`Welcome, ${name}!`);
        }, 100);
    }
    return name;
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
    const { content, sender, _rawName } = msgObj;
    if (!senderMap[sender]) {
        if (_rawName) {
            senderMap[sender] = _rawName;
        } else {
            const label = `Anonymous ${anonCount++}`;
            senderMap[sender] = label;
        }
    }
    if (!anonColors[sender]) {
        anonColors[sender] = colorPalette[Object.keys(anonColors).length % colorPalette.length];
    }
    const rawName = senderMap[sender];
    const displayName = sender === myId ? `Me (${rawName})` : rawName;
    const p = document.createElement("p");
    p.classList.add('p');

    if (content.startsWith("data:image")) {
        const img = document.createElement("img");
        img.src = content;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";
        p.innerText = "";
        p.appendChild(img);
    } else {
        p.innerText = content;
    }

    if (sender !== lastSender) {
        const senderP = document.createElement("p");
        const avatar = document.createElement("span");

        const initials = rawName?.charAt(0).toUpperCase() || "?";
        const avatarColor = sender === myId ? "brown" : anonColors[sender] || "aqua";

        avatar.textContent = initials;
        avatar.classList.add('avatar');
        avatar.style.display = "flex";
        avatar.style.justifyContent = "center";
        avatar.style.alignItems = "center";
        avatar.style.width = "28px";
        avatar.style.height = "28px";
        avatar.style.borderRadius = "50%";
        avatar.style.backgroundColor = avatarColor;
        avatar.style.fontWeight = "bold";
        avatar.style.fontSize = "1rem";
        avatar.style.textAlign = "center";
        avatar.style.lineHeight = "28px";
        avatar.style.overflow = "hidden";

        if (avatarColor == "aqua") {
            avatar.style.color = "#000";
        } else {
            avatar.style.color = "#fff";
        }

        senderP.appendChild(avatar);
        senderP.append(` ${displayName}`);
        senderP.classList.add('sP');
        senderP.style.color = avatarColor;
        senderP.dataset.senderId = sender;
        if (sender === myId) {
            senderP.addEventListener("dblclick", () => {
                const newName = prompt("Enter new name:", rawName);
                if (newName && newName.trim()) {
                    const formattedName = newName.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                    socket.emit("rename", { senderId: sender, newName: formattedName });
                    localStorage.setItem('myName', formattedName);
                }
            });
        }
        displayCont.appendChild(senderP);
        lastSender = sender;
    }

    const messageTime = new Date(msgObj.timestamp || Date.now());

    let h = messageTime.getHours();
    const m = messageTime.getMinutes().toString().padStart(2, '0');
    let isAm = "AM";
    let hour = h;

    if (h === 0) {
        hour = 12;
    } else if (h === 12) {
        isAm = "PM";
    } else if (h > 12) {
        hour = h - 12;
        isAm = "PM";
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
    p.style.borderLeftColor = sender === myId ? "brown" : anonColors[sender] || "aqua";

    displayCont.appendChild(p);
    p.scrollIntoView({ behavior: "smooth", block: "center" });
}

socket.on("msgs", (msgObj) => {
    const { senderId, senderName } = msgObj;
    const displayMsg = {
        ...msgObj,
        sender: senderId,
        _rawName: senderName || null
    };
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
            const timestamp = Date.now();
            socket.emit('msg', { content: base64, senderId: myId, senderName: myName, timestamp });
            imgInput.value = ""; // Reset file input
        };
        reader.readAsDataURL(file);
    }

    // If there's a text message
    if (msgs !== "") {
        const timestamp = Date.now();
        socket.emit('msg', { content: msgs, senderId: myId, senderName: myName, timestamp });
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

socket.on("rename", ({ senderId, newName }) => {
    senderMap[senderId] = newName;
    // Update displayed names in the DOM
    document.querySelectorAll(`[data-sender-id="${senderId}"]`).forEach(el => {
        const isMine = senderId === myId;
        el.textContent = isMine ? `Me (${newName})` : newName;
        el.style.color = isMine ? "brown" : anonColors[senderId] || "aqua";
    });
});

// setInterval(() => location.reload(), 5000);