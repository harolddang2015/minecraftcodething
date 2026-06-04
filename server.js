import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

let textState = { box1: "", box2: "" };
const users = new Map();

function broadcast(data, exclude = null) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1 && client !== exclude) {
      client.send(msg);
    }
  }
}

function getUsers() {
  return [...users.values()];
}

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2, 10);

  ws.send(JSON.stringify({
    type: "init",
    textData: textState
  }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "join") {
      const username = (msg.username || "").trim().slice(0, 15) || "Anonymous";

      users.set(ws, {
        id,
        username,
        x: 0,
        y: 0
      });

      broadcast({ type: "user_list", users: getUsers() });
    }

    if (msg.type === "update") {
      textState = { ...textState, ...msg.payload };
      broadcast({ type: "update", data: textState }, ws);
    }

    if (msg.type === "mouse_move") {
      const user = users.get(ws);
      if (!user) return;

      user.x = msg.x;
      user.y = msg.y;

      broadcast({
        type: "mouse_update",
        id,
        x: msg.x,
        y: msg.y
      }, ws);
    }
  });

  ws.on("close", () => {
    users.delete(ws);
    broadcast({ type: "user_list", users: getUsers() });
  });
});

server.listen(process.env.PORT || 3000);