const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "healthos_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Central place any part of the app can call to react to a 401 — set once
// from AuthContext so this module doesn't need to import React itself.
let onUnauthorized = () => {};
export function registerUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    onUnauthorized();
    throw new ApiError(401, "Session expired");
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && data.detail && typeof data.detail === "string" && data.detail) ||
      (data && Array.isArray(data.detail) && data.detail[0]?.msg) ||
      "Something went wrong. Please try again.";
    throw new ApiError(res.status, message, data);
  }

  return data;
}

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  getProfile: () => request("/users/me"),
  updateProfile: (payload) => request("/users/me", { method: "PUT", body: payload }),

  listReports: () => request("/reports"),
  getReport: (id) => request(`/reports/${id}`),
  getReportFileUrl: async (id) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/reports/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load the original file");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  uploadReport: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/reports/upload", { method: "POST", body: form, isForm: true });
  },

  getDashboard: () => request("/dashboard"),

  sendChat: (message, reportId) =>
    request("/chat", { method: "POST", body: { message, report_id: reportId ?? null } }),
};
