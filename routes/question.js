const express = require("express");
const router = express.Router();
const Question = require("../models/Question");

// Patient asks a question
router.post("/ask/:doctorId", async (req, res) => {
  try {
    await Question.create({
      doctorId: req.params.doctorId,
      patientId: req.session.user._id,
      question: req.body.question
    });

    res.redirect(`/doctors/${req.params.doctorId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error asking question");
  }
});

module.exports = router;
