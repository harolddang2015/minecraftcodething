const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(wsProtocol + "://" + location.host);

const login = document.getElementById("login");
const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("join");

const box1 = document.getElementById("box1");
const box2 = document.getElementById("box2");

const cursorLayer = document.getElementById("cursors");

let username = "";
let joined = false;
let cursors = new Map();
let lastMouse = 0;

// JOIN
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  ws.send(JSON.stringify({
    type: "join",
    username
  }));

  login.style.display = "none";
  joined = true;
};

// RECEIVE
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (msg.type === "init") {
    box1.value = msg.textData.box1;
    box2.value = msg.textData.box2;
  }

  if (msg.type === "update") {
    if (document.activeElement !== box1) box1.value = msg.data.box1;
    if (document.activeElement !== box2) box2.value = msg.data.box2;
  }

  if (msg.type === "user_list") {
    updateUsers(msg.users);
  }

  if (msg.type === "mouse_update") {
    const el = cursors.get(msg.id);
    if (el) {
      el.style.left = msg.x + "px";
      el.style.top = msg.y + "px";
    }
  }
};

// SEND TEXT
function sendText() {
  if (!joined) return;

  ws.send(JSON.stringify({
    type: "update",
    payload: {
      box1: box1.value,
      box2: box2.value
    }
  }));
}

box1.addEventListener("input", sendText);
box2.addEventListener("input", sendText);

// CURSORS
function updateUsers(users) {
  const seen = new Set();

  users.forEach(u => {
    if (u.username === username) return;

    seen.add(u.id);

    let el = cursors.get(u.id);

    if (!el) {
      el = document.createElement("div");
      el.className = "cursor";

      const label = document.createElement("span");
      label.textContent = u.username;

      el.appendChild(label);
      cursorLayer.appendChild(el);

      cursors.set(u.id, el);
    }

    el.style.left = u.x + "px";
    el.style.top = u.y + "px";
  });

  // remove old
  for (const [id, el] of cursors) {
    if (!seen.has(id)) {
      el.remove();
      cursors.delete(id);
    }
  }
}

// MOUSE TRACK (THROTTLED)
window.addEventListener("mousemove", (e) => {
  const now = Date.now();
  if (!joined || now - lastMouse < 30) return;

  lastMouse = now;

  ws.send(JSON.stringify({
    type: "mouse_move",
    x: e.clientX,
    y: e.clientY
  }));
});