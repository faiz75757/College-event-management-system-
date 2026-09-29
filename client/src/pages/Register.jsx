import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function Register({ defaultRole }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", role: defaultRole, adminCode: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const body = { ...form };
      if (form.role !== "admin") delete body.adminCode; // only admins send the secret code
      const res = await api.post("/auth/register", body);
      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setLoading(false);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      {message.text && <p className={`msg ${message.type}`}>{message.text}</p>}
      <input name="name" placeholder="Full Name" value={form.name} onChange={change} />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} />
      <input name="password" type="password" placeholder="Password" value={form.password} onChange={change} />
      <input name="confirmPassword" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={change} />
      <select name="role" value={form.role} onChange={change}>
        <option value="student">Student</option>
        <option value="admin">Admin</option>
      </select>
      {form.role === "admin" && (
        <input name="adminCode" type="password" placeholder="Admin Secret Code" value={form.adminCode} onChange={change} />
      )}
      <button className="btn" disabled={loading}>{loading ? "Please wait..." : "Register"}</button>
      {message.type === "success" && <p><Link to={`/${form.role}/login`}>Go to {form.role} login</Link></p>}
    </form>
  );
}
