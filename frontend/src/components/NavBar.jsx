import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Activity, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/reports", label: "Reports" },
  { to: "/chat", label: "Chat" },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (user?.username || "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" strokeWidth={2.5} />
            <span className="font-display font-semibold tracking-tight text-lg">
              HealthOS
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-surface-raised text-text"
                      : "text-text-muted hover:text-text"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-9 h-9 rounded-full bg-surface-raised border border-border-strong flex items-center justify-center text-xs font-mono font-medium text-text-muted hover:text-text hover:border-accent transition-colors"
            title="Account menu"
          >
            {initials}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <nav className="sm:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-surface-raised text-text" : "text-text-muted"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
