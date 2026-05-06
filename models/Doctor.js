const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },

  degree: String,

  specialization: {
    type: String,
    required: true,
    enum: [
      "Orthopedist",
      "Gynecologist",
      "Dentist",
      "Cardiologist",
      "Pediatrician",
      "Dermatologist",
      "Neurologist"
    ]
  },

  experience: { 
    type: Number, 
    default: 0 
  },

  consultationFee: { 
    type: Number, 
    required: true 
  },

  rating: { 
    type: Number, 
    default: 0 
  },

  patientsCount: { 
    type: Number, 
    default: 0 
  },

  state: { 
    type: String, 
    required: true 
  },

  district: { 
    type: String, 
    required: true 
  },

  clinicAddress: String,

  // 🌍 GeoJSON location for nearby doctor search
  clinicLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },

  dailyLimit: { 
    type: Number, 
    default: 20 
  },

  availability: [
    {
      day: String, // Monday, Tuesday...
      slots: [String] // ["10:00 AM", "10:30 AM"]
    }
  ],

  reviews: [
    {
      user: String,
      stars: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],

  isVerified: { 
    type: Boolean, 
    default: false 
  },
  videoConsultation: {
  type: Boolean,
  default: true
},

  about: String,

  image: {
    url: String,
    filename: String
  }

}, { timestamps: true });


// 🚀 INDEXES (important for speed)
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ state: 1, district: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ clinicLocation: "2dsphere" });

module.exports = mongoose.model("Doctor", doctorSchema);
