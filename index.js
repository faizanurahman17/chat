const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    socket.on('msg', (msgObj) => {
        io.emit("msgs", msgObj);
    });
    socket.on('typing', ({ senderId }) => {
        socket.broadcast.emit('typing', { senderId });
    });
    socket.on('rename', ({ senderId, newName }) => {
        io.emit('rename', { senderId, newName });
    });

    socket.on("disconnect", () => {
    });
});

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`server is running at port:${PORT}`))