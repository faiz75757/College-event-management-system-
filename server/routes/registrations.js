const router = require("express").Router();
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const { protect, only } = require("../middleware/auth");

// GET /api/registrations/mine  (student) - my status for every event, with waitlist position
router.get("/mine", protect, only("student"), async (req, res) => {
  try {
    const regs = await Registration.find({ student: req.user.id });
    const result = [];
    for (const r of regs) {
      let position = null;
      if (r.status === "Waitlisted") {
        // Position = how many waitlisted students joined before me, plus one
        const ahead = await Registration.countDocuments({
          event: r.event,
          status: "Waitlisted",
          $or: [
            { waitlistJoinedAt: { $lt: r.waitlistJoinedAt } },
            { waitlistJoinedAt: r.waitlistJoinedAt, _id: { $lt: r._id } },
          ],
        });
        position = ahead + 1;
      }
      result.push({ eventId: r.event.toString(), status: r.status, position });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Could not load your registrations." });
  }
});

// PATCH /api/registrations/:id/attendance  (admin)
router.patch("/:id/attendance", protect, only("admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id." });
    const { attendance } = req.body;
    if (!["Attended", "Absent"].includes(attendance))
      return res.status(400).json({ message: "Attendance must be Attended or Absent." });

    // Only students who hold a seat can be marked
    const reg = await Registration.findOneAndUpdate(
      { _id: req.params.id, status: "Registered" },
      { attendance },
      { new: true }
    );
    if (!reg) return res.status(404).json({ message: "Registered student not found." });
    res.json({ message: `Marked as ${attendance}.` });
  } catch (err) {
    res.status(500).json({ message: "Could not update attendance." });
  }
});

module.exports = router;
