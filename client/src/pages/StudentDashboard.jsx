import { useEffect, useState } from "react";
import api, { getUser, errorMessage } from "../api";

export default function StudentDashboard() {
  const user = getUser();
  const [events, setEvents] = useState([]);
  const [myRegs, setMyRegs] = useState({}); // eventId -> { status, position }
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function loadData() {
    try {
      const [ev, regs] = await Promise.all([
        api.get("/events?upcoming=true"),
        api.get("/registrations/mine"),
      ]);
      setEvents(ev.data);
      const map = {};
      regs.data.forEach((r) => { map[r.eventId] = r; });
      setMyRegs(map);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // Runs one action (register / waitlist / cancel), shows the result, then refreshes
  async function act(eventId, request) {
    setBusyId(eventId);
    try {
      const res = await request();
      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setBusyId(null);
    loadData();
  }

  return (
    <div>
      <h2>Welcome, {user.name}!</h2>
      {message.text && <p className={`msg ${message.type}`}>{message.text}</p>}
      {loading && <p>Loading...</p>}
      {!loading && events.length === 0 && <p>No upcoming events right now.</p>}

      <div className="grid">
        {events.map((ev) => {
          const mine = myRegs[ev._id];
          const status = mine ? mine.status : "Not Registered";
          const busy = busyId === ev._id;
          return (
            <div className="card" key={ev._id}>
              <h3>{ev.title}</h3>
              <p className="desc">{ev.description}</p>
              <p><b>Date:</b> {ev.date}</p>
              <p><b>Time:</b> {ev.time}</p>
              <p><b>Venue:</b> {ev.venue}</p>
              <p><b>Total Seats:</b> {ev.capacity}</p>
              <p><b>Available Seats:</b> {ev.available}</p>
              <p><b>Registered Students:</b> {ev.registered}</p>
              <p><b>Waiting:</b> {ev.waitlisted}</p>

              <p>
                <b>Your Status: </b>
                <span className={`badge ${status === "Registered" ? "green" : status === "Waitlisted" ? "orange" : "gray"}`}>
                  {status}
                </span>
                {status === "Waitlisted" && <span className="pos"> Position #{mine.position}</span>}
              </p>

              {status === "Registered" && (
                <button className="btn red" disabled={busy}
                  onClick={() => window.confirm("Cancel your registration?") && act(ev._id, () => api.delete(`/events/${ev._id}/register`))}>
                  Cancel Registration
                </button>
              )}
              {status === "Waitlisted" && (
                <button className="btn gray" disabled={busy}
                  onClick={() => act(ev._id, () => api.delete(`/events/${ev._id}/register`))}>
                  Leave Waitlist
                </button>
              )}
              {status === "Not Registered" && ev.available > 0 && (
                <button className="btn" disabled={busy}
                  onClick={() => act(ev._id, () => api.post(`/events/${ev._id}/register`))}>
                  Register
                </button>
              )}
              {status === "Not Registered" && ev.available <= 0 && (
                <button className="btn orange-btn" disabled={busy}
                  onClick={() => act(ev._id, () => api.post(`/events/${ev._id}/waitlist`))}>
                  Join Waitlist
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
