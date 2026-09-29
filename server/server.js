require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json()); // lets us read JSON sent from React

// Simple check that the server is running
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/registrations", require("./routes/registrations"));

// Unknown API route
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found." }));

// Basic error handler for anything unexpected
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGO_URI or JWT_SECRET. Check your .env file.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () => console.log("Server running"));
  })
  .catch((err) => console.error("MongoDB connection failed:", err.message));
