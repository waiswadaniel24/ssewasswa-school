import { isApiConfigured, schoolApi } from './apiClient.js';

function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload?.rows || payload?.students || payload?.items || [];
}

export async function listStudentsFromApi(filters = {}) {
  const payload = await schoolApi.students(filters);
  return unwrap(payload).map((student) => ({
    ...student,
    class_name: student.class_name || student.class?.name || student.stream?.name || '',
  }));
}

export async function listClassesFromApi() {
  return unwrap(await schoolApi.classes());
}

export function shouldUseApi() {
  return isApiConfigured();
}

export function normalizeApiError(error) {
  return error?.message || 'The school API is unavailable';
}

export const schoolDataSources = {
  api: {
    students: listStudentsFromApi,
    classes: listClassesFromApi,
  },
  local: {
    students: 'Electron SQLite or Supabase',
    classes: 'Electron SQLite or Supabase',
  },
};
