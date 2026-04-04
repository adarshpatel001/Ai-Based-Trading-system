import { useEffect, useState } from "react";

import AuthView from "./components/AuthView";
import LandingPage from "./components/LandingPage";
import Dashboard from "./pages/Dashboard";
import { api } from "./services/apiClient";

function App() {
  const [token, setToken] = useState(localStorage.getItem("sim_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .me(token)
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        localStorage.removeItem("sim_token");
        setToken("");
        setUser(null);
      });
  }, [token]);

  async function handleLogin(payload) {
    setLoading(true);
    setError("");
    try {
      const res = await api.login(payload);
      localStorage.setItem("sim_token", res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthMode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(payload) {
    setLoading(true);
    setError("");
    try {
      const res = await api.register(payload);
      localStorage.setItem("sim_token", res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthMode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("sim_token");
    setToken("");
    setUser(null);
  }

  if (!token || !user) {
    return (
      <>
        <LandingPage
          onOpenLogin={() => {
            setError("");
            setAuthMode("login");
          }}
          onOpenRegister={() => {
            setError("");
            setAuthMode("register");
          }}
        />
        {authMode ? (
          <AuthView
            onLogin={handleLogin}
            onRegister={handleRegister}
            loading={loading}
            error={error}
            initialMode={authMode}
            onClose={() => {
              if (loading) return;
              setAuthMode("");
              setError("");
            }}
          />
        ) : null}
      </>
    );
  }

  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

export default App;
