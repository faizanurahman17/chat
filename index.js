const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const messageHistory = [];

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const users = new Set();

io.on('connection', (socket) => {
    users.add(socket.id);
    io.emit("online", Array.from(users));

    socket.emit("chatHistory", messageHistory);

    socket.on('msg', (msgObj) => {
        messageHistory.push(msgObj);
        io.emit("msgs", msgObj);
    });
    socket.on('typing', ({ senderId }) => {
        socket.broadcast.emit('typing', { senderId });
    });
    socket.on('rename', ({ senderId, newName }) => {
        io.emit('rename', { senderId, newName });
    });

    socket.on("join", (id) => {
        users.add(id);
        io.emit("online", Array.from(users));
    });

    socket.on("joinPrivateRoom", ({ roomId }) => {
        socket.join(roomId);
    });

    socket.on("privateMsg", ({ roomId, msgObj }) => {
        io.to(roomId).emit("privateMsg", msgObj);
    });

    socket.on("privateInvite", ({ toId, roomId, fromName }) => {
        io.to(toId).emit("privateInvite", { roomId, fromName });
    });

    socket.on("disconnect", () => {
        users.delete(socket.id);
        io.emit("online", Array.from(users));
    });
});

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`server is running at port:${PORT}`))