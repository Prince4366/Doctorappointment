const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Appointment = require("../models/Appointment");

function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

router.post("/add/:doctorId", isLoggedIn, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const doctorId = req.params.doctorId;

    // ✅ check if patient had appointment with doctor
    const appointment = await Appointment.findOne({
      doctorId,
      patientId: req.session.user._id,
      status: "completed"
    });

    if (!appointment) {
      return res.send("You can review only after consultation");
    }

    // prevent duplicate review
    const alreadyReviewed = await Review.findOne({
      doctorId,
      patientId: req.session.user._id
    });

    if (alreadyReviewed) {
      return res.send("You already reviewed this doctor");
    }

    await Review.create({
      doctorId,
      patientId: req.session.user._id,
      rating,
      comment
    });

    res.redirect(`/doctors/${doctorId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting review");
  }
});

module.exports = router;
