// Map userId (client's persistent ID) to socket.id
const userIdToSocket = {};
const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const messageHistory = [];

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const users = new Set();

const roomWaiters = {};

io.on('connection', (socket) => {
    users.add(socket.id);
    io.emit("online", Array.from(users));

    socket.emit("chatHistory", messageHistory);

    // Register client ID mapping
    socket.on("registerClientId", (clientId) => {
        userIdToSocket[clientId] = socket.id;
    });

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

    socket.on("privateJoinRequest", ({ roomId, myName }) => {
        if (!roomWaiters[roomId]) {
            roomWaiters[roomId] = [{ id: socket.id, name: myName }];
        } else {
            roomWaiters[roomId].push({ id: socket.id, name: myName });
            // Notify both users that the room is ready
            roomWaiters[roomId].forEach(user => {
                io.to(user.id).emit("privateReady", { confirmed: true });
            });
            delete roomWaiters[roomId];
        }
    });

    socket.on("privateMsg", ({ roomId, msgObj }) => {
        io.to(roomId).emit("privateMsg", msgObj);
    });

    socket.on('privateInvite', ({ toId, roomId, fromName }) => {
        const actualSocketId = userIdToSocket[toId];
        console.log("Invite target myId:", toId);
        console.log("Resolved to socket ID:", actualSocketId);
        if (actualSocketId) {
            io.to(actualSocketId).emit('privateInvite', { roomId, fromName, fromId: socket.id });
        } else {
            console.log("No socket ID found for clientId:", toId);
        }
    });

    socket.on('privateAccept', ({ roomId, fromId }) => {
        socket.join(roomId);
        const senderSocket = io.sockets.sockets.get(fromId);
        if (senderSocket) senderSocket.join(roomId);
        io.to(roomId).emit("privateChatStarted", { roomId });
    });

    socket.on('privateDecline', ({ fromId, receiverName }) => {
        const senderSocket = io.sockets.sockets.get(fromId);
        if (senderSocket) {
            senderSocket.emit('inviteDeclined', { receiverName });
        }
    });

    socket.on('leavePrivateRoom', ({ roomId, userName }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('userLeftPrivateChat', { userName });
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