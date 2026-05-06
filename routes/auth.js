const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const router = express.Router();

/* ================= SIGNUP ================= */
router.get("/signup", (req, res) => {
  res.render("auth/signup");
});

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      aadhar,
      age,
      mobile,
      email,
      address,
      password
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      aadhar,
      age,
      mobile,
      email,
      address,
      password: hashedPassword,
      role: "user" 
    });

    await user.save();
    res.redirect("/auth/login");

  } catch (err) {
    console.error(err);
    res.send("User already exists or invalid data");
  }
});

/* ================= LOGIN ================= */
router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Wrong password");

    // ✅ store minimal session data
    req.session.user = {
      id: user._id,
      role: user.role || "user",
      name: user.name
    };

    // 🔀 role-based redirect
    if (user.role === "admin") return res.redirect("/admin/dashboard");
    if (user.role === "doctor") return res.redirect("/doctor/dashboard");

    return res.redirect("/doctors");

  } catch (err) {
    console.error(err);
    res.send("Login failed");
  }
});

/* ================= LOGOUT ================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
  res.clearCookie("connect.sid");
  res.redirect("/auth/login");
});
});

module.exports = router;
