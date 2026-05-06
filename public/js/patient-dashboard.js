async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

function byId(id) {
  return document.getElementById(id);
}

function renderSimpleList(target, rows, emptyText, render) {
  target.innerHTML = "";
  if (!rows || rows.length === 0) {
    target.innerHTML = `<div class="pc-tip-summary">${emptyText}</div>`;
    return;
  }
  rows.forEach((r) => {
    const el = document.createElement("div");
    el.className = "pc-info";
    el.innerHTML = render(r);
    target.appendChild(el);
  });
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

function buildCharts(appointments) {
  const sorted = [...appointments].reverse();
  const labels = sorted.map((a) => (a.date || "").slice(5));
  const dataLine = sorted.map((_, i) => i + 1);

  const monthMap = {};
  sorted.forEach((a) => {
    const m = (a.date || "").slice(0, 7);
    monthMap[m] = (monthMap[m] || 0) + 1;
  });
  const barLabels = Object.keys(monthMap);
  const barData = Object.values(monthMap);

  const normal = appointments.filter((a) => a.type === "normal").length;
  const emergency = appointments.filter((a) => a.type === "emergency").length;

  new Chart(byId("appointmentsLineChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Appointments", data: dataLine, borderColor: "#2c7be5", tension: 0.35 }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });

  new Chart(byId("visitsBarChart"), {
    type: "bar",
    data: {
      labels: barLabels,
      datasets: [{ label: "Visits", data: barData, backgroundColor: "#93c5fd" }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });

  new Chart(byId("consultationPieChart"), {
    type: "pie",
    data: {
      labels: ["Normal", "Emergency"],
      datasets: [{ data: [normal, emergency], backgroundColor: ["#2c7be5", "#f59e0b"] }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

async function initDashboard() {
  const [
    appointments,
    consultations,
    prescriptions,
    records,
    myReviews,
    tips
  ] = await Promise.all([
    getJSON("/appointments"),
    getJSON("/consultations"),
    getJSON("/prescriptions"),
    getJSON("/records"),
    getJSON("/my-reviews"),
    getJSON("/tips")
  ]);

  byId("pcTotalAppointments").textContent = String(appointments.length);
  byId("pcTotalReviews").textContent = String(myReviews.length);

  const upcoming = appointments.find((a) => a.status !== "completed") || appointments[0];
  if (upcoming) {
    byId("pcNextAppointment").innerHTML = `
      <strong>Dr. ${upcoming.doctorName}</strong><br>
      ${formatDate(upcoming.date)} ${upcoming.estimatedTime ? `• ${upcoming.estimatedTime}` : ""}
    `;
    byId("pcJoinVideoBtn").href = upcoming.videoUrl || "/doctors/video-consultation";
  } else {
    byId("pcNextAppointment").textContent = "No upcoming appointments.";
  }

  renderSimpleList(
    byId("pcPastConsultations"),
    consultations,
    "No past consultations yet.",
    (c) => `<div class="pc-info-k">${c.doctorName} • ${formatDate(c.date)}</div><div class="pc-info-v">${c.summary}</div>`
  );

  renderSimpleList(
    byId("pcPrescriptions"),
    prescriptions,
    "No prescriptions yet.",
    (p) => `
      <div class="pc-info-k">${p.title}</div>
      <div class="pc-tip-summary">${p.notes || "-"}</div>
      <a class="pc-link" href="${p.fileUrl || "#"}" ${p.fileUrl ? 'target="_blank"' : ""}>${p.fileUrl ? "Download/View" : "View"}</a>
    `
  );

  renderSimpleList(
    byId("pcRecords"),
    records,
    "No records uploaded.",
    (r) => `
      <div class="pc-info-k">${r.fileName}</div>
      <div class="pc-tip-summary">${formatDate(r.uploadedAt)}</div>
      <a class="pc-link" href="${r.filePath}" target="_blank">Open file</a>
    `
  );

  renderSimpleList(
    byId("pcRatingsList"),
    myReviews,
    "No ratings yet.",
    (r) => `<div class="pc-info-k">Dr. ${r.doctorName} • ⭐ ${r.rating}/5</div><div class="pc-tip-summary">${r.comment || ""}</div>`
  );

  renderSimpleList(
    byId("pcTips"),
    tips,
    "No tips available.",
    (t) => `<div class="pc-info-k">${t.title}</div><div class="pc-tip-summary">${t.summary}</div>`
  );

  buildCharts(appointments);
}

const recordForm = byId("pcRecordForm");
if (recordForm) {
  recordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(recordForm);
    const res = await fetch("/upload-record", { method: "POST", body: fd });
    if (res.ok) {
      alert("Record uploaded");
      window.location.reload();
    } else {
      alert("Upload failed");
    }
  });
}

const ratingForm = byId("pcRatingForm");
if (ratingForm) {
  ratingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      doctorId: byId("pcRatingDoctorId").value.trim(),
      rating: byId("pcRatingValue").value,
      comment: byId("pcRatingComment").value.trim()
    };
    const res = await fetch("/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert("Rating submitted");
      window.location.reload();
    } else {
      alert("Could not submit rating");
    }
  });
}

initDashboard().catch(() => {
  const root = document.querySelector(".pc-dashboard-main");
  if (root) {
    const err = document.createElement("div");
    err.className = "pc-card";
    err.innerHTML = `<div class="pc-card-body"><div class="pc-tip-summary">Could not load dashboard data right now.</div></div>`;
    root.prepend(err);
  }
});

