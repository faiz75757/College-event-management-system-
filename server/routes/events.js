const router = require("express").Router();
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { protect, only } = require("../middleware/auth");
const { promoteWaitlist } = require("../utils/waitlist");

// Reject ids that are not valid MongoDB ids
router.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid event id." });
  next();
});

// Shape of an event sent to React
const format = (e, waitlisted = 0) => ({
  _id: e._id,
  title: e.title,
  description: e.description,
  date: e.date,
  time: e.time,
  venue: e.venue,
  capacity: e.capacity,
  registered: e.registeredCount,
  available: e.capacity - e.registeredCount,
  waitlisted,
});

// Check event fields; returns an error message or null
function validateEvent({ title, description, date, time, venue, capacity }) {
  if (!title || !description || !date || !time || !venue || capacity === undefined || capacity === "")
    return "Title, description, date, time, venue and capacity are all required.";
  if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)
    return "Capacity must be a whole number greater than zero.";
  return null;
}

// GET /api/events   (?upcoming=true shows today and later only)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.upcoming === "true") {
      filter.date = { $gte: new Date().toISOString().slice(0, 10) };
    }
    const events = await Event.find(filter).sort({ date: 1, time: 1 });

    // Count waitlisted students per event
    const counts = await Registration.aggregate([
      { $match: { status: "Waitlisted" } },
      { $group: { _id: "$event", n: { $sum: 1 } } },
    ]);
    const waitMap = {};
    counts.forEach((c) => { waitMap[c._id.toString()] = c.n; });

    res.json(events.map((e) => format(e, waitMap[e._id.toString()] || 0)));
  } catch (err) {
    res.status(500).json({ message: "Could not load events." });
  }
});

// POST /api/events  (admin)
router.post("/", protect, only("admin"), async (req, res) => {
  try {
    const error = validateEvent(req.body);
    if (error) return res.status(400).json({ message: error });
    const { title, description, date, time, venue, capacity } = req.body;
    const event = await Event.create({ title, description, date, time, venue, capacity: Number(capacity) });
    res.status(201).json(format(event));
  } catch (err) {
    res.status(500).json({ message: "Could not create event." });
  }
});

// PUT /api/events/:id  (admin)
router.put("/:id", protect, only("admin"), async (req, res) => {
  try {
    const error = validateEvent(req.body);
    if (error) return res.status(400).json({ message: error });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const { title, description, date, time, venue, capacity } = req.body;
    if (Number(capacity) < event.registeredCount)
      return res.status(400).json({
        message: `${event.registeredCount} students already hold a seat. Capacity cannot go below that.`,
      });

    Object.assign(event, { title, description, date, time, venue, capacity: Number(capacity) });
    await event.save();

    await promoteWaitlist(event._id); // if capacity grew, waiting students get the new seats
    res.json({ message: "Event updated." });
  } catch (err) {
    res.status(500).json({ message: "Could not update event." });
  }
});

// DELETE /api/events/:id  (admin)
router.delete("/:id", protect, only("admin"), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });
    await Registration.deleteMany({ event: event._id });
    res.json({ message: "Event deleted." });
  } catch (err) {
    res.status(500).json({ message: "Could not delete event." });
  }
});

// POST /api/events/:id/register  (student) - take a seat if one is free
router.post("/:id/register", protect, only("student"), async (req, res) => {
  try {
    const existing = await Registration.findOne({ student: req.user.id, event: req.params.id });
    if (existing) {
      return res.status(400).json({
        message: existing.status === "Registered"
          ? "You are already registered for this event."
          : "You are already on the waiting list for this event.",
      });
    }

    // ONE atomic step: "add 1 to registeredCount only if seats are left".
    // MongoDB handles simultaneous requests one at a time, so no overbooking.
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, $expr: { $lt: ["$registeredCount", "$capacity"] } },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );

    if (!event) {
      const exists = await Event.exists({ _id: req.params.id });
      return res.status(exists ? 400 : 404).json({
        message: exists ? "This event is full. You can join the waiting list." : "Event not found.",
      });
    }

    try {
      await Registration.create({ student: req.user.id, event: event._id, status: "Registered" });
    } catch (err) {
      await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } }); // give the seat back
      if (err.code === 11000)
        return res.status(400).json({ message: "You are already registered for this event." });
      throw err;
    }

    res.status(201).json({ message: "You are registered for this event!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not register." });
  }
});

// POST /api/events/:id/waitlist  (student) - join the waiting list of a full event
router.post("/:id/waitlist", protect, only("student"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const existing = await Registration.findOne({ student: req.user.id, event: event._id });
    if (existing) {
      return res.status(400).json({
        message: existing.status === "Registered"
          ? "You are already registered for this event."
          : "You are already on the waiting list for this event.",
      });
    }

    if (event.registeredCount < event.capacity)
      return res.status(400).json({ message: "Seats are available. Please register directly." });

    let reg;
    try {
      reg = await Registration.create({
        student: req.user.id, event: event._id, status: "Waitlisted", waitlistJoinedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000)
        return res.status(400).json({ message: "You are already on the waiting list for this event." });
      throw err;
    }

    // In case a seat was freed while we were joining, promote right away
    await promoteWaitlist(event._id);
    const fresh = await Registration.findById(reg._id);
    res.status(201).json({
      message: fresh.status === "Registered"
        ? "A seat just opened up and you are registered!"
        : "You joined the waiting list.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not join the waiting list." });
  }
});

// DELETE /api/events/:id/register  (student) - cancel registration OR leave the waitlist
router.delete("/:id/register", protect, only("student"), async (req, res) => {
  try {
    const reg = await Registration.findOneAndDelete({ student: req.user.id, event: req.params.id });
    if (!reg) return res.status(404).json({ message: "You are not registered or waitlisted for this event." });

    if (reg.status === "Registered") {
      await Event.updateOne({ _id: req.params.id }, { $inc: { registeredCount: -1 } }); // free the seat
      await promoteWaitlist(req.params.id); // earliest waiting student gets it
      return res.json({ message: "Registration cancelled." });
    }
    // Waitlisted students just leave; registered students are not affected
    res.json({ message: "You left the waiting list." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not cancel." });
  }
});

// GET /api/events/:id/participants  (admin) - registered list + FIFO waiting list
router.get("/:id/participants", protect, only("admin"), async (req, res) => {
  try {
    const regs = await Registration.find({ event: req.params.id })
      .populate("student", "name email")
      .sort({ waitlistJoinedAt: 1, _id: 1 });

    const valid = regs.filter((r) => r.student);
    const registered = valid
      .filter((r) => r.status === "Registered")
      .map((r) => ({ regId: r._id, name: r.student.name, email: r.student.email, attendance: r.attendance }));
    const waitlisted = valid
      .filter((r) => r.status === "Waitlisted")
      .map((r, i) => ({ regId: r._id, position: i + 1, name: r.student.name, email: r.student.email, joinedAt: r.waitlistJoinedAt }));

    res.json({ registered, waitlisted });
  } catch (err) {
    res.status(500).json({ message: "Could not load participants." });
  }
});

module.exports = router;
