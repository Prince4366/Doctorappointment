const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const HealthTip = require("../models/HealthtTip");




router.post("/feedback", (req, res) => {
  const { title, reaction } = req.body;

  healthTipsPosts.forEach(post => {
    if (post.title === title) {
      if (reaction === "helpful") post.helpful++;
      if (reaction === "somewhat") post.somewhatHelpful++;
      if (reaction === "nothelpful") post.notHelpful++;
    }
  });

  res.redirect("/healthtips");
});



router.get("/", async (req, res) => {
  // Seed a few starter tips into DB if empty, so PrimeCare never looks blank.
  // This keeps your app demo-ready without requiring manual admin actions.
  try {
    const count = await HealthTip.countDocuments();
    if (count === 0) {
      const doctor = await Doctor.findOne();
      const doctorId = doctor?._id;
      await HealthTip.insertMany([
        {
          doctorId,
          title: "Hydration basics: how much water is enough?",
          summary:
            "Most adults do well with regular hydration throughout the day. Aim for pale-yellow urine, add more fluids in heat/exercise, and limit sugary drinks."
        },
        {
          doctorId,
          title: "7-day posture reset for desk workers",
          summary:
            "Take micro-breaks every 30–45 minutes, keep your monitor at eye level, and do 2 minutes of neck + upper-back mobility to reduce strain headaches."
        },
        {
          doctorId,
          title: "When to see a doctor for fever",
          summary:
            "Seek medical help if fever lasts >3 days, is above 103°F (39.4°C), or comes with breathlessness, chest pain, confusion, dehydration, or rash."
        },
        {
          doctorId,
          title: "Skincare routine for acne-prone skin",
          summary:
            "Use a gentle cleanser, non-comedogenic moisturizer, and sunscreen daily. Avoid harsh scrubs. If acne is persistent, consult a dermatologist for targeted therapy."
        }
      ]);
    }

    const tips = await HealthTip.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("doctorId");

    // Normalize to the existing EJS shape so the view stays simple.
    const posts = tips.map((t) => {
      const d = t.doctorId || {};
      return {
        doctorId: d._id || "",
        doctorName: d.name ? `Dr. ${d.name}` : "PrimeCare Doctor",
        degree: d.degree || "MBBS",
        specialization: d.specialization || "General",
        location: [d.district, d.state].filter(Boolean).join(", ") || "India",
        experience: d.experience || 0,
        rating: d.rating || 4.5,
        doctorPhoto: d.image?.url || "https://randomuser.me/api/portraits/men/32.jpg",
        title: t.title,
        summary: t.summary,

        image: t.image,
        helpful: 12,
        somewhatHelpful: 4,
        notHelpful: 1
      };
    });

    res.render("healthtips/index", { posts });
  } catch (err) {
    console.error(err);
    // fallback to existing in-memory posts
    res.render("healthtips/index", { posts: healthTipsPosts });
  }
});

module.exports = router;
