const Event = require("../models/Event");
const Registration = require("../models/Registration");

// Fills any free seats with the earliest waitlisted students (FIFO).
// Called after a cancellation, after capacity increases, and after joining the waitlist.
async function promoteWaitlist(eventId) {
  while (true) {
    // Step 1: atomically take one free seat (does nothing if the event is full)
    const event = await Event.findOneAndUpdate(
      { _id: eventId, $expr: { $lt: ["$registeredCount", "$capacity"] } },
      { $inc: { registeredCount: 1 } }
    );
    if (!event) return; // no free seat

    // Step 2: atomically pick the student who joined the waitlist first
    const promoted = await Registration.findOneAndUpdate(
      { event: eventId, status: "Waitlisted" },
      { status: "Registered", waitlistJoinedAt: null }, // leaves the waiting list
      { sort: { waitlistJoinedAt: 1, _id: 1 } }
    );

    if (!promoted) {
      // Nobody is waiting, so give the seat back
      await Event.updateOne({ _id: eventId }, { $inc: { registeredCount: -1 } });
      return;
    }
  }
}

module.exports = { promoteWaitlist };
