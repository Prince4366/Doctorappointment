const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const mongoose = require("mongoose");


const HealthTip = require("../models/HealthTip");
const Question = require("../models/Question");
const Appointment = require("../models/Appointment");

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}


/* ================= DOCTOR SEARCH PAGE ================= */
router.get("/", async (req, res) => {
  const { state, district, specialization, experience, rating } = req.query;

  const query = {};

  if (state) query.state = state;
  if (district) query.district = district;
  if (specialization) query.specialization = specialization;
  if (experience) query.experience = { $gte: Number(experience) };
  if (rating) query.rating = { $gte: Number(rating) };

  const doctors = await Doctor.find(query);

  const states = await Doctor.distinct("state");
  const districts = await Doctor.distinct("district");

  // Show latest health tips preview on the home page
  const HealthTip = require("../models/HealthTip");
  const tips = await HealthTip.find().sort({ createdAt: -1 }).limit(6);

  res.render("doctors/index", { doctors, states, districts, tips });
});

router.get("/video-consultation", async (req, res) => {
  try {
    const { specialization, experience, rating } = req.query;
    const query = { videoConsultation: true };
    if (specialization?.trim()) query.specialization = specialization.trim();
    if (experience) query.experience = { $gte: Number(experience) };
    if (rating) query.rating = { $gte: Number(rating) };

    const doctors = await Doctor.find(query);

    const specializations = await Doctor.distinct("specialization");

    const diseases = [
      "Fever",
      "Diabetes",
      "Skin Allergy",
      "Heart Pain",
      "Headache",
      "Cold & Cough"
    ];

    res.render("doctors/videoDoctors", {
      doctors,
      specializations,
      diseases,
      filters: req.query
    });

  } catch (err) {
    console.error(err);
    res.send("Error");
  }
});

// In-app WebRTC call screen for an appointment room
router.get("/video/:appointmentId", requireLogin, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate("doctorId")
      .populate("patientId");

    if (!appointment) return res.status(404).send("Appointment not found");

    const currentUser = req.session.user;
    const isPatient =
      currentUser?.role === "patient" &&
      String(appointment.patientId?._id) === String(currentUser._id);

    const isDoctorOrAdmin = currentUser?.role === "doctor" || currentUser?.role === "admin";
    if (!isPatient && !isDoctorOrAdmin) return res.status(403).send("Not allowed");

    res.render("doctors/videocall", {
      roomId: String(appointment._id),
      userName: currentUser?.name || "PrimeCare User",
      appointment,
      doctor: appointment.doctorId,
      patient: appointment.patientId,
      role: currentUser?.role || "patient"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error starting video consultation");
  }
});




/* ================= FILTER DOCTORS ================= */
router.get("/filter", async (req, res) => {
  try {
    const {
      state,
      district,
      specialization,
      experience,
      rating,
      degree
    } = req.query;

    const query = {};

    if (state?.trim()) query.state = new RegExp(`^${state.trim()}$`, "i");
    if (district?.trim()) query.district = new RegExp(`^${district.trim()}$`, "i");
    if (degree?.trim()) query.degree = new RegExp(degree.trim(), "i");
    if (specialization?.trim()) query.specialization = specialization;
    if (experience) query.experience = { $gte: Number(experience) };
    if (rating) query.rating = { $gte: Number(rating) };

    const doctors = await Doctor.find(query);
    const states = await Doctor.distinct("state");
    const districts = await Doctor.distinct("district");
    const specializations = await Doctor.distinct("specialization");

    res.render("doctors/index", {
      doctors,
      states,
      districts,
      specializations
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error filtering doctors");
  }
});



/* ================= DOCTORS BY SPECIALIZATION ================= */
router.get("/specialization/:type", async (req, res) => {
  try {
    const doctors = await Doctor.find({ specialization: req.params.type });
    res.render("doctors/list", { doctors, type: req.params.type });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading specialization doctors");
  }
});


/* ================= LOCATION ROUTES ================= */
router.get("/states", async (req, res) => {
  const states = await Doctor.distinct("state");
  res.render("location/states", { states });
});

router.get("/states/:state", async (req, res) => {
  const districts = await Doctor.distinct("district", { state: req.params.state });
  res.render("location/districts", { state: req.params.state, districts });
});

router.get("/states/:state/:district", async (req, res) => {
  const doctors = await Doctor.find({
    state: req.params.state,
    district: req.params.district
  });
  res.render("location/doctors", {
    doctors,
    state: req.params.state,
    district: req.params.district
  });
});

// Public API for clinic map/location on the doctor profile page
router.get("/api/:id/location", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const coords = doctor.clinicLocation?.coordinates || [];
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);

    res.json({
      id: doctor._id,
      name: `Dr. ${doctor.name}`,
      clinic: doctor.clinicAddress || "PrimeCare Clinic",
      lat: Number.isFinite(lat) ? lat : 28.6139,
      lng: Number.isFinite(lng) ? lng : 77.2090,
      address: doctor.clinicAddress || [doctor.district, doctor.state].filter(Boolean).join(", ") || "Delhi, India"
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid doctor ID" });
  }
});


/* ================= DOCTOR PROFILE (KEEP LAST) ================= */
router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).send("Doctor not found");

    // ⭐ Reviews (READ ONLY)
    const reviews = await Review.find({ doctorId: doctor._id })
      .populate("patientId", "name")
      .sort({ createdAt: -1 });

    // 🌿 Health tips by this doctor
    const healthTips = await HealthTip.find({
      doctorId: doctor._id
    }).sort({ createdAt: -1 });

    // ❓ Q & A
    const questions = await Question.find({
      doctorId: doctor._id
    })
      .populate("patientId", "name")
      .sort({ createdAt: -1 });

    res.render("doctors/profile", {
      doctor,
      reviews,
      healthTips,
      questions
    });

  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid doctor ID");
  }
});



module.exports = router;
