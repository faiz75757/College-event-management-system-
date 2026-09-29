import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { getUser } from "./api";

// Only lets the right role open a page
function Protected({ role, children }) {
  const user = getUser();
  if (!user || user.role !== role) return <Navigate to={`/${role}/login`} />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student/register" element={<Register defaultRole="student" />} />
          <Route path="/admin/register" element={<Register defaultRole="admin" />} />
          <Route path="/student/login" element={<Login role="student" />} />
          <Route path="/admin/login" element={<Login role="admin" />} />
          <Route path="/student/dashboard" element={<Protected role="student"><StudentDashboard /></Protected>} />
          <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
