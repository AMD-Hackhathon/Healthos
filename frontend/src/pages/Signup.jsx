import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await signup(username.trim(), email, password);
      navigate("/profile", { state: { justSignedUp: true } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="w-5 h-5 text-accent" strokeWidth={2.5} />
          <span className="font-display font-semibold tracking-tight text-lg">
            HealthOS
          </span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="font-display text-2xl font-semibold mb-1">
            Create your account
          </h1>
          <p className="text-text-muted text-sm mb-6">
            Start tracking your health with AI.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                className="w-full bg-surface-raised border border-border-strong rounded-lg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-raised border border-border-strong rounded-lg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-surface-raised border border-border-strong rounded-lg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-alert bg-alert-dim border border-alert/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent text-bg font-medium rounded-lg py-2.5 text-sm hover:brightness-110 transition disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
