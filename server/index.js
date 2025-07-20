const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST"],
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

let drawnNumbers = [];
let players = {};
let winner = null;
let intervalId = null;

function pickRandomNumber() {
  const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
    (n) => !drawnNumbers.includes(n)
  );
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

function startDrawing() {
  intervalId = setInterval(() => {
    if (winner) {
      clearInterval(intervalId);
      return;
    }
    const num = pickRandomNumber();
    if (num === null) {
      clearInterval(intervalId);
      return;
    }
    drawnNumbers.push(num);
    io.emit("number-drawn", num);
    io.emit("drawn-numbers", drawnNumbers);
  }, 5000);
}

app.get("/restart", (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Unauthorized");
  }

  drawnNumbers = [];
  players = {};
  winner = null;
  clearInterval(intervalId);
  startDrawing();
  io.emit("game-restarted");
  res.send("Game restarted");
});

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.emit("drawn-numbers", drawnNumbers);

  socket.emit("players-update", players);

  if (winner) {
    socket.emit("winner-update", winner);
  }

  socket.on("join", (name) => {
    players[socket.id] = { name, matchedCount: 0 };
    io.emit("players-update", players);
    console.log(`${name} joined`);
  });

  socket.on("matched-count", (count) => {
    if (!players[socket.id]) return;
    players[socket.id].matchedCount = count;
    io.emit("players-update", players);

    if (count >= 5 && !winner) {
      winner = players[socket.id].name;
      io.emit("winner-update", winner);
      clearInterval(intervalId);
      console.log(`Winner is ${winner}`);
    }
  });

  socket.on("disconnect", () => {
    if (players[socket.id]) {
      console.log(`${players[socket.id].name} disconnected`);
      delete players[socket.id];
      io.emit("players-update", players);
    }
  });
});

startDrawing();

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
