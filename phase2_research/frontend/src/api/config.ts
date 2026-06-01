// 统一 API 地址：生产环境通过 VITE_API_BASE 环境变量指定，开发环境默认 localhost:8000
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
