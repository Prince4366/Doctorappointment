const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  aadhar: {
    type: String,
    required: true,
    unique: true,
    length: 12
  },

  age: {
    type: Number,
    required: true
  },

  mobile: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  address: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["patient", "doctor", "admin"],
    default: "patient"
  }
});

module.exports = mongoose.model("User", userSchema);



