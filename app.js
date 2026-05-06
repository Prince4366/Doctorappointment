require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const http = require("http");
const clinicRoutes = require("./routes/clinic");
const { attachRealtime } = require("./realtime/socket");



const app = express();
const server = http.createServer(app);

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected ✅"))
  .catch(err => console.log(err));

// ================= VIEW =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/clinics", clinicRoutes);

app.use(session({
  secret: "doctor-secret",
  resave: false,
  saveUninitialized: false
}));

// make user available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;

  // ✅ flash message
  res.locals.success = req.session.success;
  delete req.session.success;

  next();
});

app.get("/exploredoctors", async (req, res) => {
  const Doctor = require("./models/Doctor");
  const { state, district, specialization, experience, rating } = req.query;
  const query = {};

  if (state) query.state = state;
  if (district) query.district = district;
  if (specialization) query.specialization = specialization;
  if (experience) query.experience = { $gte: Number(experience) };
  if (rating) query.rating = { $gte: Number(rating) };

  const doctors = await Doctor.find(query);
  const states = await Doctor.distinct("state");
  const districts = await Doctor.distinct("district");
  const specializations = await Doctor.distinct("specialization");
  
  res.render("exploredoctors", { doctors, states, districts, specializations, filters: req.query });
});


app.use(express.static(path.join(__dirname, "public")));


const expressLayouts = require("express-ejs-layouts");

app.use(expressLayouts);

// ================= ROUTES =================
const authRoutes = require("./routes/auth");
const doctorRoutes = require("./routes/doctor");
const appointmentRoutes = require("./routes/appointment");
const adminRoutes = require("./routes/admin");
const doctorDashboardRoutes = require("./routes/doctorDashboard");
const healthtipsRoutes = require("./routes/healthtips");
const reviewRoutes = require("./routes/review");
const questionRoutes = require("./routes/question");
const chatRoutes = require("./routes/chat");
const patientDashboardRoutes = require("./routes/patientDashboard");




app.use("/auth", authRoutes);
app.use("/doctors", doctorRoutes);          // patient view
app.use("/appointments", appointmentRoutes);
app.use("/admin", adminRoutes);             // admin panel
app.use("/doctor", doctorDashboardRoutes);  // doctor dashboard
app.use("/healthtips", healthtipsRoutes);
app.use("/reviews", reviewRoutes);
app.use("/questions", questionRoutes);
app.use(chatRoutes);
app.use(patientDashboardRoutes);





// ================= HOME =================
app.get("/", (req, res) => {
  if (req.session.user?.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  return res.redirect("/doctors");
});

// ================= SERVER =================
attachRealtime(server);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
