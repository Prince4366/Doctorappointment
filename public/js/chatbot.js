function $(id) {
  return document.getElementById(id);
}

const fab = $("pcChatFab");
const panel = $("pcChatPanel");
const closeBtn = $("pcChatClose");
const clearBtn = $("pcChatClear");
const form = $("pcChatForm");
const input = $("pcChatInput");
const messagesEl = $("pcChatMessages");
const typingEl = $("pcChatTyping");

if (fab && panel && closeBtn && clearBtn && form && input && messagesEl && typingEl) {
  const STORAGE_KEY = "primecare_chat_history_v1";
  const history = [];

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30)));
    } catch {
      // ignore quota / privacy mode
    }
  }

  function open() {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    input.focus();
    if (messagesEl.childElementCount === 0) bootstrap();
  }

  function close() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setTyping(on) {
    typingEl.style.display = on ? "flex" : "none";
    if (on) scrollToBottom();
  }

  function bubble(role, text) {
    const row = document.createElement("div");
    row.className = `pc-chat-row ${role === "user" ? "is-user" : "is-bot"}`;

    const b = document.createElement("div");
    b.className = `pc-chat-bubble ${role === "user" ? "is-user" : "is-bot"}`;
    b.textContent = text;

    row.appendChild(b);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function pushUser(text) {
    bubble("user", text);
    history.push({ role: "user", content: text });
    saveHistory();
  }

  function pushBot(text) {
    bubble("assistant", text);
    history.push({ role: "assistant", content: text });
    saveHistory();
  }

  function pushBotActions(actions) {
    if (!Array.isArray(actions) || actions.length === 0) return;

    const row = document.createElement("div");
    row.className = "pc-chat-row is-bot";

    const wrap = document.createElement("div");
    wrap.className = "pc-chat-actions";

    actions.forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pc-btn pc-btn-ghost";
      btn.textContent = a.label;
      btn.addEventListener("click", () => {
        window.location.href = a.href;
      });
      wrap.appendChild(btn);
    });

    row.appendChild(wrap);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  async function send(text) {
    pushUser(text);
    setTyping(true);

    try {
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(-10)
        })
      });

      const data = await resp.json();
      setTyping(false);

      if (!resp.ok) {
        pushBot(data?.reply || "Sorry — something went wrong. Please try again.");
        pushBotActions([
          { label: "Book Appointment", href: "/exploredoctors" },
          { label: "Start Video Consultation", href: "/doctors/video-consultation" }
        ]);
        return;
      }

      pushBot(data.reply || "Could you share more details (duration, severity, age)?");
      if (data.actions) pushBotActions(data.actions);
    } catch (e) {
      setTyping(false);
      pushBot("Sorry — I’m offline right now. If symptoms are severe or worsening, please consult a doctor.");
      pushBotActions([
        { label: "Book Appointment", href: "/exploredoctors" },
        { label: "Start Video Consultation", href: "/doctors/video-consultation" }
      ]);
    }
  }

  function clearMessages() {
    messagesEl.innerHTML = "";
    history.length = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    bootstrap();
  }

  function bootstrap() {
    const saved = loadHistory()
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-30);

    if (saved.length > 0) {
      saved.forEach((m) => {
        bubble(m.role === "user" ? "user" : "assistant", m.content);
        history.push({ role: m.role, content: m.content });
      });
      return;
    }

    pushBot(
      "Hi! Tell me your symptoms (e.g., fever, headache, cold). I’ll share general safe guidance and help you book an appointment if needed."
    );
    pushBotActions([
      { label: "Book Appointment", href: "/exploredoctors" },
      { label: "Start Video Consultation", href: "/doctors/video-consultation" }
    ]);
  }

  // Allow topbar links/buttons to open the widget
  document.querySelectorAll("[data-chat-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    });
  });

  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  clearBtn.addEventListener("click", clearMessages);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

