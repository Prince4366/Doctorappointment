const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const isAdmin = require("../middleware/isAdmin");
const Appointment = require("../models/Appointment");


// Admin dashboard
router.get("/dashboard", isAdmin, async (req, res) => {
  const appointments = await Appointment.find();

  res.render("admin/dashboard", {
    layout: "admin/layout",
    appointments,
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    pending: appointments.filter(a => a.status === "pending").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length
  });
});

// Show add doctor form
router.get("/add-doctor", isAdmin, (req, res) => {
  res.render("admin/addDoctor", {
    layout: "admin/layout"   
  });
});

// Handle add doctor
router.post("/add-doctor", isAdmin, async (req, res) => {
  try {
    const {
      name,
      degree,
      specialization,
      experience,
      consultationFee,
      state,
      district,
      clinicAddress,
      lat,
      lng,
      dailyLimit,
      about,
      imageUrl
    } = req.body;

    if (!name || !specialization || !consultationFee || !state || !district || !lat || !lng) {
      return res.send("Missing required fields");
    }

    const doctor = new Doctor({
      name,
      degree,
      specialization,
      experience,
      consultationFee,
      state,
      district,
      clinicAddress,
      clinicLocation: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)]
      },
      dailyLimit,
      about,
      image: {
        url: imageUrl || "https://via.placeholder.com/150",
        filename: "default"
      },
      isVerified: true
    });

    await doctor.save();

    req.session.success = "Doctor added successfully";
    res.redirect("/admin/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding doctor");
  }
});
module.exports = router;