const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const getFranchises = () => request('/franchises');
export const createRoom = (payload) => request('/rooms', { method: 'POST', body: JSON.stringify(payload) });
export const getRoom = (id) => request(`/rooms/${id}`);
export const getHealth = () => request('/health');

export const listSavedGames = () => request('/games');
export const saveGameSnapshot = (game) => request(`/games/${encodeURIComponent(game.id)}`, { method: 'PUT', body: JSON.stringify(game) });
export const deleteGameSnapshot = (id) => request(`/games/${encodeURIComponent(id)}`, { method: 'DELETE' });

export async function importPlayerFile(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/imports/players`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Player import failed');
  return data;
}
