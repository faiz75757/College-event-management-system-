import { Link, useNavigate } from "react-router-dom";
import { getUser, logout } from "../api";

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">B4 Events</Link>
      <div className="nav-right">
        {user && <span className="nav-user">{user.name} ({user.role})</span>}
        {user && <button className="btn small" onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}
