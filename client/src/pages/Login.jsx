import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function Login({ role }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { ...form, role });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate(`/${res.data.user.role}/dashboard`); // go to the dashboard for this role
    } catch (err) {
      setError(errorMessage(err));
    }
    setLoading(false);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>{role === "admin" ? "Admin" : "Student"} Login</h2>
      {error && <p className="msg error">{error}</p>}
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="btn" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      <p>No account? <Link to={`/${role}/register`}>Register here</Link></p>
    </form>
  );
}
