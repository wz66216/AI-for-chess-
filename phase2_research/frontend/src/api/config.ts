// Production sets VITE_API_BASE. Local development defaults to IPv4 because
// Windows can resolve localhost to IPv6 while the backend is bound to 127.0.0.1.
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
