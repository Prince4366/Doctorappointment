const express = require("express");
const router = express.Router();
const Clinic = require("../models/Clinic");

// show clinic details with map
router.get("/:id", async (req, res) => {
  const clinic = await Clinic.findById(req.params.id).populate("doctor");
  res.render("clinic/details", { clinic });
});

module.exports = router;

