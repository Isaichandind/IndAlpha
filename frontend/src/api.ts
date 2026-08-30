import axios from 'axios';

// Use the environment variable if available, otherwise default to local development backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export default api;
