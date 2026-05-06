const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Appointment = require("../models/Appointment");
const Review = require("../models/Review");
const HealthTip = require("../models/HealthTip");
const Prescription = require("../models/Prescription");
const HealthRecord = require("../models/HealthRecord");

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

function toObjectIdLike(v) {
  return String(v || "");
}

const recordsDir = path.join(__dirname, "..", "public", "uploads", "records");
if (!fs.existsSync(recordsDir)) fs.mkdirSync(recordsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "record", ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});
const upload = multer({ storage });

// Dashboard page
router.get("/patient/dashboard", isLoggedIn, (req, res) => {
  res.render("patient/dashboard", { user: req.session.user });
});

// GET /appointments
router.get("/appointments", isLoggedIn, async (req, res) => {
  const patientId = req.session.user._id;
  const appointments = await Appointment.find({ patientId }).populate("doctorId").sort({ date: -1 });
  const data = appointments.map((a) => ({
    id: a._id,
    doctorName: a.doctorId?.name || "Doctor",
    specialization: a.doctorId?.specialization || "General",
    date: a.date,
    estimatedTime: a.estimatedTime || "",
    status: a.status || "waiting",
    type: a.type || "normal",
    videoUrl: `/doctors/video/${a._id}`
  }));
  res.json(data);
});

// GET /consultations
router.get("/consultations", isLoggedIn, async (req, res) => {
  const patientId = req.session.user._id;
  const appointments = await Appointment.find({ patientId }).populate("doctorId").sort({ date: -1 });
  const completed = appointments.filter((a) => ["completed", "in-progress"].includes(String(a.status)));
  const data = completed.map((a) => ({
    id: a._id,
    doctorName: a.doctorId?.name || "Doctor",
    date: a.date,
    summary: `Consultation for ${a.doctorId?.specialization || "general checkup"} (${a.type || "normal"}).`
  }));
  res.json(data);
});

// GET /prescriptions
router.get("/prescriptions", isLoggedIn, async (req, res) => {
  const patientId = req.session.user._id;
  let docs = await Prescription.find({ patientId }).sort({ createdAt: -1 }).populate("doctorId");

  // Seed minimal mock data for first-time users
  if (docs.length === 0) {
    await Prescription.create({
      patientId,
      title: "General Wellness Prescription",
      notes: "Hydration, balanced meals, and 30 mins daily walk for 2 weeks.",
      fileUrl: ""
    });
    docs = await Prescription.find({ patientId }).sort({ createdAt: -1 }).populate("doctorId");
  }

  res.json(
    docs.map((d) => ({
      id: d._id,
      title: d.title,
      notes: d.notes,
      doctorName: d.doctorId?.name || "PrimeCare Doctor",
      createdAt: d.createdAt,
      fileUrl: d.fileUrl
    }))
  );
});

// POST /upload-record
router.post("/upload-record", isLoggedIn, upload.single("record"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const patientId = req.session.user._id;
    const relativePath = `/uploads/records/${req.file.filename}`;
    const record = await HealthRecord.create({
      patientId,
      fileName: req.file.originalname,
      filePath: relativePath
    });
    res.json({ ok: true, record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET uploaded records helper for dashboard
router.get("/records", isLoggedIn, async (req, res) => {
  const patientId = req.session.user._id;
  const records = await HealthRecord.find({ patientId }).sort({ uploadedAt: -1 });
  res.json(records);
});

// POST /rating
router.post("/rating", isLoggedIn, async (req, res) => {
  try {
    const { doctorId, rating, comment } = req.body || {};
    if (!doctorId || !rating) return res.status(400).json({ error: "doctorId and rating are required" });
    const parsed = Math.max(1, Math.min(5, Number(rating)));
    if (!Number.isFinite(parsed)) return res.status(400).json({ error: "Invalid rating" });

    const existing = await Review.findOne({
      doctorId,
      patientId: req.session.user._id
    });

    if (existing) {
      existing.rating = parsed;
      existing.comment = String(comment || "");
      await existing.save();
      return res.json({ ok: true, review: existing, updated: true });
    }

    const review = await Review.create({
      doctorId,
      patientId: req.session.user._id,
      rating: parsed,
      comment: String(comment || "")
    });
    res.json({ ok: true, review, updated: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save rating" });
  }
});

// helper APIs for dashboard cards/charts
router.get("/my-reviews", isLoggedIn, async (req, res) => {
  const rows = await Review.find({ patientId: req.session.user._id }).populate("doctorId").sort({ createdAt: -1 });
  res.json(
    rows.map((r) => ({
      id: r._id,
      doctorId: toObjectIdLike(r.doctorId?._id),
      doctorName: r.doctorId?.name || "Doctor",
      rating: r.rating,
      comment: r.comment || "",
      createdAt: r.createdAt
    }))
  );
});

router.get("/tips", isLoggedIn, async (_req, res) => {
  const tips = await HealthTip.find().sort({ createdAt: -1 }).limit(5);
  res.json(tips);
});

module.exports = router;

