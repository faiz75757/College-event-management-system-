// Adds 3 sample events (only if there are no events yet).  Run with: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("./models/Event");

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  if ((await Event.countDocuments()) > 0) {
    console.log("Events already exist. Nothing added.");
  } else {
    await Event.insertMany([
      { title: "Tech Talk: Intro to AI", description: "A beginner-friendly talk on how AI works.", date: inDays(7), time: "10:00", venue: "Seminar Hall A", capacity: 50 },
      { title: "Coding Contest", description: "Solve problems and win prizes.", date: inDays(14), time: "14:00", venue: "Computer Lab 2", capacity: 2 },
      { title: "Cultural Fest Meeting", description: "Planning meeting for the annual cultural fest.", date: inDays(21), time: "16:30", venue: "Main Auditorium", capacity: 100 },
    ]);
    console.log("3 sample events added. (Coding Contest has 2 seats, good for testing the waitlist.)");
  }
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err.message); process.exit(1); });
