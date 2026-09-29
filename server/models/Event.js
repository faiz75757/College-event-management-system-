const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  time: { type: String, required: true }, // "HH:MM"
  venue: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  // How many students currently hold a seat. Updated with atomic operations
  // so two students can never take the same last seat.
  registeredCount: { type: Number, default: 0, min: 0 },
});

module.exports = mongoose.model("Event", eventSchema);
