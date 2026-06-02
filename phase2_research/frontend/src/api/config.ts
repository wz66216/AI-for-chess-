// 统一 API 地址：生产环境通过 VITE_API_BASE 指定；本地默认走 IPv4，避免 Windows 上 localhost 优先解析到 IPv6。
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
