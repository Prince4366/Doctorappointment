const mongoose = require("mongoose");

const clinicSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  clinicName: String,
  address: String,
  city: String,
  visitingDays: [String],
  visitingTime: String,
  fee: Number,
  location: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model("Clinic", clinicSchema);
