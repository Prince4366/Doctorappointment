const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

function isDoctor(req, res, next) {
  if (!req.session.user || req.session.user.role !== "doctor") {
    return res.redirect("/auth/login");
  }
  next();
}

// DOCTOR DASHBOARD
router.get("/dashboard", isDoctor, async (req, res) => {
  const doctor = await Doctor.findOne({
    userId: req.session.user._id
  });

  if (!doctor) {
    return res.send("Doctor profile not found");
  }

  const today = new Date().toISOString().split("T")[0];

  const appointments = await Appointment.find({
    doctorId: doctor._id,
    date: today,
    status: "pending"
  })
    .sort({ tokenNumber: 1 })
    .populate("patientId");

  res.render("doctor/dashboard", {
    doctor,
    appointments
  });
});

// MARK COMPLETED
router.post("/complete/:id", isDoctor, async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, {
    status: "completed"
  });

  res.redirect("/doctor/dashboard");
});

// COMPLETED HISTORY
router.get("/completed", isDoctor, async (req, res) => {
  const doctor = await Doctor.findOne({
    userId: req.session.user._id
  });

  const completedAppointments = await Appointment.find({
    doctorId: doctor._id,
    status: "completed"
  })
    .sort({ tokenNumber: 1 })
    .populate("patientId");

  res.render("doctor/completed", {
    completedAppointments
  });
});

module.exports = router;
