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

// cursor systems
const cursors = new Map();
const targets = new Map();

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
    if (targets.has(msg.id)) {
      targets.set(msg.id, { x: msg.x, y: msg.y });
    }
  }
};

// TEXT
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

// USERS + CURSORS
function updateUsers(users) {
  const seen = new Set();

  users.forEach(u => {
    if (u.username === username) return;

    seen.add(u.id);

    if (!cursors.has(u.id)) {
      const el = document.createElement("div");
      el.className = "cursor";

      const tag = document.createElement("div");
      tag.className = "cursor-tag";
      tag.textContent = u.username;

      el.appendChild(tag);
      cursorLayer.appendChild(el);

      cursors.set(u.id, el);
      targets.set(u.id, { x: u.x, y: u.y });
    }
  });

  for (const [id, el] of cursors) {
    if (!seen.has(id)) {
      el.remove();
      cursors.delete(id);
      targets.delete(id);
    }
  }
}

// SMOOTH ANIMATION (CANVA FEEL)
function animate() {
  for (const [id, el] of cursors) {
    const t = targets.get(id);
    if (!t) continue;

    let x = parseFloat(el.dataset.x || t.x);
    let y = parseFloat(el.dataset.y || t.y);

    x += (t.x - x) * 0.25;
    y += (t.y - y) * 0.25;

    el.style.transform = `translate(${x}px, ${y}px)`;

    el.dataset.x = x;
    el.dataset.y = y;
  }

  requestAnimationFrame(animate);
}
animate();

// MOUSE SEND (THROTTLED)
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