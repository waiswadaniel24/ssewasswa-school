import { isApiConfigured, schoolApi } from './apiClient.js';

const unwrap = (payload) => payload?.data || payload?.rows || payload?.items || payload || [];

export async function loadAcademicModule(query = {}) {
  const [exams, reportCards, attendance] = await Promise.all([
    schoolApi.exams(query),
    schoolApi.reportCards(query),
    schoolApi.attendance(query),
  ]);
  return { exams: unwrap(exams), reportCards: unwrap(reportCards), attendance: unwrap(attendance) };
}

export async function loadFinanceModule(query = {}) {
  const fees = await schoolApi.fees(query);
  return { fees: unwrap(fees) };
}

export async function loadOperationsModule(query = {}) {
  const [staff, notifications] = await Promise.all([
    schoolApi.staff(query),
    schoolApi.notifications(),
  ]);
  return { staff: unwrap(staff), notifications: unwrap(notifications) };
}

export function getModuleDataSource() {
  return isApiConfigured() ? 'ssewasswa-api' : 'existing-local-or-supabase';
}
