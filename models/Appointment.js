const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },

  tokenNumber: Number,

  // 🔥 ADD THIS
  estimatedTime: {
    type: String // e.g. "09:40"
  },

  date: String,

  type: {
    type: String,
    enum: ["normal", "emergency"],
    default: "normal"
  },

  // 🔥 ADD THIS (for live tracking)
  status: {
    type: String,
    enum: ["waiting", "in-progress", "completed", "emergency"],
    default: "waiting"
  }
});

module.exports = mongoose.model("Appointment", appointmentSchema);
