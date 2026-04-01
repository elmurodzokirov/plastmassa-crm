import client from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface SettingData {
  _id: string;
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  label: string;
  group: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API Client ───────────────────────────────────────────────────────

export const settingsApi = {
  getSettings: () =>
    client.get<SettingData[]>('/settings').then((r) => r.data),

  getSetting: (key: string) =>
    client.get<SettingData>(`/settings/${key}`).then((r) => r.data),

  updateSetting: (key: string, value: string | number | boolean) =>
    client.put<SettingData>(`/settings/${key}`, { value }).then((r) => r.data),

  seedSettings: () =>
    client.post<{ message: string }>('/settings/seed').then((r) => r.data),
};
