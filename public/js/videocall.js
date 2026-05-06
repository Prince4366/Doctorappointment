/* global io */

const els = {
  localVideo: document.getElementById("pcLocalVideo"),
  remoteVideo: document.getElementById("pcRemoteVideo"),
  micBtn: document.getElementById("pcMicBtn"),
  camBtn: document.getElementById("pcCamBtn"),
  endBtn: document.getElementById("pcEndBtn"),
  status: document.getElementById("pcCallStatus"),
  chatForm: document.getElementById("pcChatForm"),
  chatInput: document.getElementById("pcChatInput"),
  chatList: document.getElementById("pcChatList")
};

const roomId = window.__PRIMECARE_ROOM_ID__;
const user = window.__PRIMECARE_USER__;

const socket = io();

let pc;
let localStream;
let makingOffer = false;
let isMuted = false;
let isCameraOff = false;

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function appendChatMessage({ from, message, ts }) {
  const item = document.createElement("div");
  item.className = "pc-chat-message";
  const who = from?.name ? from.name : "User";
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  item.innerHTML = `
    <div class="pc-chat-meta">${escapeHtml(who)} <span class="pc-chat-time">${escapeHtml(time)}</span></div>
    <div class="pc-chat-text">${escapeHtml(message)}</div>
  `;
  els.chatList.appendChild(item);
  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  els.localVideo.srcObject = localStream;
  await els.localVideo.play().catch(() => {});
}

function createPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) {
      els.remoteVideo.srcObject = stream;
      els.remoteVideo.play().catch(() => {});
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc:ice-candidate", { roomId, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    setStatus(`Connection: ${pc.connectionState}`);
  };

  // "Perfect negotiation" lite
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { roomId, offer: pc.localDescription });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };
}

async function start() {
  setStatus("Connecting…");

  await initMedia();
  createPeerConnection();

  socket.emit("room:join", { roomId, user });
  setStatus("Waiting for the other participant…");

  socket.on("room:user-joined", () => {
    setStatus("Participant joined. Starting call…");
    // negotiationneeded will fire automatically once tracks exist
  });

  socket.on("webrtc:offer", async ({ offer }) => {
    try {
      const offerCollision = makingOffer || pc.signalingState !== "stable";
      if (offerCollision) return;

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, answer: pc.localDescription });
      setStatus("In call");
    } catch (err) {
      console.error(err);
      setStatus("Call error");
    }
  });

  socket.on("webrtc:answer", async ({ answer }) => {
    try {
      await pc.setRemoteDescription(answer);
      setStatus("In call");
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("webrtc:ice-candidate", async ({ candidate }) => {
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("chat:message", (payload) => appendChatMessage(payload));

  socket.on("room:user-left", () => {
    setStatus("Participant left");
    els.remoteVideo.srcObject = null;
  });
}

function toggleMic() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  els.micBtn.dataset.active = String(!isMuted);
  els.micBtn.querySelector(".pc-btn-label").textContent = isMuted ? "Unmute" : "Mute";
}

function toggleCamera() {
  if (!localStream) return;
  isCameraOff = !isCameraOff;
  localStream.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));
  els.camBtn.dataset.active = String(!isCameraOff);
  els.camBtn.querySelector(".pc-btn-label").textContent = isCameraOff ? "Camera on" : "Camera off";
}

function endCall() {
  try {
    socket.disconnect();
  } catch {}
  try {
    pc?.close();
  } catch {}
  try {
    localStream?.getTracks()?.forEach((t) => t.stop());
  } catch {}
  window.location.href = "/appointments/my";
}

els.micBtn?.addEventListener("click", toggleMic);
els.camBtn?.addEventListener("click", toggleCamera);
els.endBtn?.addEventListener("click", endCall);

els.chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = els.chatInput.value.trim();
  if (!msg) return;
  socket.emit("chat:message", { roomId, message: msg });
  els.chatInput.value = "";
});

start().catch((err) => {
  console.error(err);
  setStatus("Unable to access camera/mic");
});

