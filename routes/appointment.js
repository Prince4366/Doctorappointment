const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const User = require("../models/User");

/* ================= TIME CALCULATION ================= */

// 9 AM start, 10 min per patient
function calculateEstimatedTime(tokenNumber) {
  const startHour = 9;
  const minutesPerPatient = 10;

  const totalMinutes = (tokenNumber - 1) * minutesPerPatient;

  const hour = startHour + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hour}:${minutes.toString().padStart(2, "0")}`;
}

/* ================= LOGIN CHECK ================= */

function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
}

/* ================= INDIA TIME ================= */

function getIndiaTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

/* ================= BOOKING AFTER 6 AM ================= */

function isBookingAllowed() {
  return getIndiaTime().getHours() >= 0;
}

/* ================= NORMAL BOOKING ================= */

router.post("/book/:doctorId", isLoggedIn, async (req, res) => {
  try {
    if (!isBookingAllowed()) {
      return res.send("Booking opens at 6 AM. Emergency available 24×7.");
    }

    const today = getIndiaTime().toISOString().split("T")[0];

    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
      return res.send("Doctor not found");
    }

    // Count today's normal appointments
    const count = await Appointment.countDocuments({
      doctorId: doctor._id,
      date: today,
      type: "normal"
    });

    if (count >= doctor.dailyLimit) {
      return res.send("All slots booked for today");
    }

    const tokenNumber = count + 1;
    const estimatedTime = calculateEstimatedTime(tokenNumber);

    const appointment = await Appointment.create({
      patientId: req.session.user._id,
      doctorId: doctor._id,
      tokenNumber,
      estimatedTime,
      date: today,
      type: "normal",
      status: "waiting"
    });

    const patient = await User.findById(req.session.user._id);

    res.json({
   success: true,
   redirectUrl: `/appointments/token/${appointment._id}`
});

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

/* ================= EMERGENCY BOOKING (24×7) ================= */

router.post("/emergency/:doctorId", isLoggedIn, async (req, res) => {
  try {
    const today = getIndiaTime().toISOString().split("T")[0];

    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
      return res.send("Doctor not found");
    }

    await Appointment.create({
      patientId: req.session.user._id,
      doctorId: doctor._id,
      date: today,
      type: "emergency",
      status: "emergency"
    });

    res.send("Emergency request sent. Reach hospital immediately.");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing emergency request");
  }
});




router.get("/my", isLoggedIn, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.session.user._id
    }).populate("doctorId");

    res.render("appointments/my", { appointments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading appointments");
  }
});


router.post("/verify", isLoggedIn, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      doctorId
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.json({ success: false });
    }

    const today = getIndiaTime().toISOString().split("T")[0];

    const count = await Appointment.countDocuments({
      doctorId,
      date: today,
      type: "normal"
    });

    const tokenNumber = count + 1;

const estimatedTime = calculateEstimatedTime(tokenNumber);

    const appointment = await Appointment.create({
      patientId: req.session.user._id,
      doctorId,
      tokenNumber,
      estimatedTime,
      date: today,
      type: "normal",
      status: "waiting",
      paymentId: razorpay_payment_id
    });

    const doctor = await Doctor.findById(doctorId);

    const patient = await User.findById(req.session.user._id);

    res.json({
   success: true,
   redirectUrl: `/appointments/token/${appointment._id}`
});

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/token/:id", isLoggedIn, async (req, res) => {

   const appointment = await Appointment.findById(req.params.id)
      .populate("doctorId")
      .populate("patientId");

   res.render("appointments/token", {
      appointment,
      doctor: appointment.doctorId,
      patient: appointment.patientId
   });

});
  

/* =================Razorpay ================= */

const razorpay = require("../config/razorpay");

router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ → paise
      currency: "INR"
    });

    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});
module.exports = router;
