const mongoose = require("mongoose");

const healthTipSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },

  title: String,
  summary: String,

  image: {
    type: String
  },

  helpful: {
    type: Number,
    default: 0
  },
  somewhatHelpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("HealthTip", healthTipSchema);
