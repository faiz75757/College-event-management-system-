import { useEffect, useState } from "react";
import api, { getUser, errorMessage } from "../api";

const emptyForm = { title: "", description: "", date: "", time: "", venue: "", capacity: "" };

export default function AdminDashboard() {
  const user = getUser();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = adding a new event
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // { event, registered, waitlisted }

  async function loadEvents() {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setLoading(false);
  }

  async function loadPanel(ev) {
    try {
      const res = await api.get(`/events/${ev._id}/participants`);
      setPanel({ event: ev, ...res.data });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
  }

  useEffect(() => { loadEvents(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, form);
        setMessage({ type: "success", text: "Event updated." });
      } else {
        await api.post("/events", form);
        setMessage({ type: "success", text: "Event created." });
      }
      const openEvent = panel?.event;
      setForm(emptyForm);
      setEditingId(null);
      await loadEvents();
      if (openEvent) {
        const fresh = (await api.get("/events")).data.find((x) => x._id === openEvent._id);
        if (fresh) loadPanel(fresh);
      }
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
  }

  function startEdit(ev) {
    setEditingId(ev._id);
    setForm({ title: ev.title, description: ev.description, date: ev.date, time: ev.time, venue: ev.venue, capacity: ev.capacity });
    window.scrollTo(0, 0);
  }

  async function handleDelete(ev) {
    if (!window.confirm(`Delete "${ev.title}"? Its registrations will be removed too.`)) return;
    try {
      await api.delete(`/events/${ev._id}`);
      setMessage({ type: "success", text: "Event deleted." });
      if (panel?.event._id === ev._id) setPanel(null);
      loadEvents();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
  }

  async function mark(regId, attendance) {
    try {
      await api.patch(`/registrations/${regId}/attendance`, { attendance });
      loadPanel(panel.event);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
  }

  return (
    <div>
      <h2>Welcome, {user.name} (Admin)</h2>
      {message.text && <p className={`msg ${message.type}`}>{message.text}</p>}

      <form className="form wide" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit Event" : "Create Event"}</h3>
        <input name="title" placeholder="Event Name" value={form.title} onChange={change} />
        <textarea name="description" placeholder="Description" rows="3" value={form.description} onChange={change} />
        <input name="date" type="date" value={form.date} onChange={change} />
        <input name="time" type="time" value={form.time} onChange={change} />
        <input name="venue" placeholder="Venue" value={form.venue} onChange={change} />
        <input name="capacity" type="number" min="1" placeholder="Maximum Capacity" value={form.capacity} onChange={change} />
        <button className="btn">{editingId ? "Save Changes" : "Create Event"}</button>
        {editingId && (
          <button type="button" className="btn gray" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
            Cancel Edit
          </button>
        )}
      </form>

      <h3>All Events</h3>
      {loading && <p>Loading...</p>}
      {!loading && events.length === 0 && <p>No events yet. Create one above.</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Event</th><th>Date</th><th>Time</th><th>Venue</th><th>Capacity</th><th>Registered</th><th>Available</th><th>Waiting</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev._id}>
                <td>{ev.title}</td><td>{ev.date}</td><td>{ev.time}</td><td>{ev.venue}</td>
                <td>{ev.capacity}</td><td>{ev.registered}</td><td>{ev.available}</td><td>{ev.waitlisted}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => loadPanel(ev)}>View Students</button>
                  <button className="btn small" onClick={() => startEdit(ev)}>Edit</button>
                  <button className="btn small red" onClick={() => handleDelete(ev)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {panel && (
        <div className="card wide-card">
          <h3>{panel.event.title}: Students</h3>

          <h4>Registered and Attendance</h4>
          {panel.registered.length === 0 ? <p>No registered students yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Attendance</th><th>Mark</th></tr></thead>
                <tbody>
                  {panel.registered.map((r) => (
                    <tr key={r.regId}>
                      <td>{r.name}</td><td>{r.email}</td>
                      <td><span className={`badge ${r.attendance === "Attended" ? "green" : r.attendance === "Absent" ? "red-badge" : "gray"}`}>{r.attendance}</span></td>
                      <td className="actions">
                        <button className="btn small" onClick={() => mark(r.regId, "Attended")}>Attended</button>
                        <button className="btn small red" onClick={() => mark(r.regId, "Absent")}>Absent</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4>Waiting List (first come, first served)</h4>
          {panel.waitlisted.length === 0 ? <p>Nobody is waiting.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Joined At</th></tr></thead>
                <tbody>
                  {panel.waitlisted.map((w) => (
                    <tr key={w.regId}>
                      <td>{w.position}</td><td>{w.name}</td><td>{w.email}</td>
                      <td>{new Date(w.joinedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn small gray" onClick={() => setPanel(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
