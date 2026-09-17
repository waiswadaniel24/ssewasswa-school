const API_BASE_URL = (import.meta.env.VITE_SSEWASSWA_API_URL || '').replace(/\/$/, '');

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('Ssewasswa API is not configured');
  const { query, body, headers, ...requestOptions } = options;
  const response = await fetch(buildUrl(path, query), {
    credentials: 'include',
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message ? payload.message : `API request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const schoolApi = {
  students: (query) => apiRequest('/api/students', { query }),
  createStudent: (body) => apiRequest('/api/students', { method: 'POST', body }),
  updateStudent: (id, body) => apiRequest(`/api/students/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteStudent: (id) => apiRequest(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  classes: () => apiRequest('/api/classes'),
  attendance: (query) => apiRequest('/api/attendance', { query }),
  exams: (query) => apiRequest('/api/exams', { query }),
  reportCards: (query) => apiRequest('/api/report-cards', { query }),
  fees: (query) => apiRequest('/api/fees', { query }),
  staff: (query) => apiRequest('/api/staff', { query }),
  notifications: () => apiRequest('/api/notifications'),
};

export default schoolApi;
