import { useEffect, useState } from "react";

export default function AuthView({ onLogin, onRegister, loading, error, initialMode = "login", onClose }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "login") {
      await onLogin({ email: form.email, password: form.password });
    } else {
      await onRegister(form);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-backdrop" onClick={onClose} />
      <div className="auth-card auth-modal-card">
        <button className="auth-close-btn" onClick={onClose} type="button">
          x
        </button>
        <h1>AI Trading Simulation</h1>
        <p>Practice with virtual capital. AI helps you decide, you stay in control.</p>

        <div className="auth-toggle">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />

          {error ? <p className="error-msg">{error}</p> : null}

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
