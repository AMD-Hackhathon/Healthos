import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, clearToken, registerUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        setUser(me);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const res = await api.login({ email, password });
    setToken(res.access_token);
    const me = await api.me();
    setUser(me);
    return me;
  }

  async function signup(username, email, password) {
    await api.signup({ username, email, password });
    return login(email, password);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
