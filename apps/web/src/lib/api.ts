import axios from "axios";

type TokenGetter = () => Promise<string | null>;
let _getToken: TokenGetter | null = null;

export function registerTokenGetter(fn: TokenGetter) {
  _getToken = fn;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
});

api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
