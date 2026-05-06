const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

function buildFallbackReply(message) {
  const text = String(message || "").toLowerCase();
  const seriousFlags = [
    "chest pain",
    "shortness of breath",
    "difficulty breathing",
    "faint",
    "unconscious",
    "seizure",
    "stroke",
    "severe bleeding",
    "blood vomiting",
    "suicid",
    "pregnan",
    "severe headache",
    "stiff neck",
    "confusion",
    "blue lips",
    "severe abdominal"
  ];
let severity = "mild";

if (seriousFlags.some(k => text.includes(k))) {
  severity = "emergency";
} else if (
  text.includes("fever") && text.includes("3 days")
) {
  severity = "moderate";
} else if (
  text.includes("severe pain") || text.includes("persistent")
) {
  severity = "urgent";
}

  const common =
    "I can share general, safe guidance, but I can’t diagnose. If symptoms feel severe, sudden, or worsening, please seek medical care promptly.";

  if (severity) {
    return [
      "These symptoms can be serious.",
      "Please seek urgent medical help now (local emergency services / nearest hospital).",
      common,
      "You can also book a doctor appointment from PrimeCare."
    ].join(" ");
  }

  const hasFever = text.includes("fever") || text.includes("temperature");
  const hasCold = text.includes("cold") || text.includes("cough") || text.includes("sore throat");
  const hasHeadache = text.includes("headache") || text.includes("migraine");

  const tips = [];
  if (hasFever) tips.push("For fever: rest, fluids/ORS, light meals, and monitor temperature.");
  if (hasCold) tips.push("For cold/cough: warm fluids, steam inhalation, honey (if age-appropriate), and rest.");
  if (hasHeadache) tips.push("For headache: hydrate, rest in a dark/quiet room, and avoid screen strain.");
  if (tips.length === 0) tips.push("General: rest, hydration, and monitor symptoms over the next 24–48 hours.");

  return [
  "⚠️ Possible serious condition detected.",
  "Symptoms like chest pain or breathing difficulty may indicate a critical issue.",
  "👉 Please go to the nearest hospital immediately.",
  "Do not rely on home remedies for this.",
  common
].join(" ");
}

router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body || {};
    const userMessage = String(message || "").trim();
    if (!userMessage) return res.status(400).json({ error: "Message is required" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: buildFallbackReply(userMessage),
        actions: [
          { label: "Book Appointment", href: "/exploredoctors" },
          { label: "Start Video Consultation", href: "/doctors/video-consultation" }
        ],
        meta: { provider: "fallback" }
      });
    }

    const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

    const systemPrompt = [
      "You are PrimeCare, a patient-facing healthcare assistant inside a web app.",
      "CRITICAL SAFETY RULES:",
      "- Do NOT diagnose or provide strong/unsafe medical advice.",
      "- Do NOT recommend prescription drugs, dosages, or treatment plans.",
      "- Provide only general, safe home-care guidance (rest, hydration, monitoring).",
      "- If symptoms are serious, sudden, severe, worsening, or include red flags (chest pain, trouble breathing, fainting, severe bleeding, confusion, stroke signs), advise urgent in-person care/emergency services.",
      "- If user is pregnant, a child, elderly, immunocompromised, or has chronic disease, recommend clinician evaluation sooner.",
      "- Always encourage booking a doctor appointment in the app when appropriate.",
      "",
      "OUTPUT STYLE:",
      "- Be concise (4–10 sentences max).",
      "- Use simple language.",
      "- Ask 1–2 clarifying questions if needed (duration, severity, age, red flags).",
      "- End with suggested next step: book appointment or video consult.",
      "",
      "APP NAVIGATION:",
      "- Booking: /exploredoctors",
      "- Video consultation doctors: /doctors/video-consultation"
    ].join("\n");

    const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];
    const messages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage }
    ];

    const completion = await client.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages,
  temperature: 0.3
});

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "I’m here to help with general guidance. Could you share your age and how long you’ve had these symptoms?";

    res.json({
      reply,
      actions: [
        { label: "Book Appointment", href: "/exploredoctors" },
        { label: "Start Video Consultation", href: "/doctors/video-consultation" }
      ],
      meta: { provider: "groq" }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply:
        "Sorry — I’m having trouble right now. For safety, if symptoms are severe or worsening, please consult a doctor or seek urgent care. You can book an appointment in PrimeCare.",
      actions: [
        { label: "Book Appointment", href: "/exploredoctors" },
        { label: "Start Video Consultation", href: "/doctors/video-consultation" }
      ],
      meta: { provider: "error" }
    });
  }
});
router.get("/chat", (req, res) => {
  res.render("chat");   
});

module.exports = router;

