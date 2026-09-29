const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  status: { type: String, enum: ["Registered", "Waitlisted"], required: true },
  waitlistJoinedAt: { type: Date, default: null }, // used for first-come, first-served order
  attendance: { type: String, enum: ["Not Marked", "Attended", "Absent"], default: "Not Marked" },
});

// One row per student per event: blocks duplicate registrations and waitlist entries
registrationSchema.index({ student: 1, event: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
