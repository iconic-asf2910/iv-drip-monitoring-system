export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface DeviceState {
  id: string;
  label: string;
  bedNumber: string;
  bagCapacityMl: number;
  fluidVolumeMl: number;
  fluidPct: number;
  weightGrams: number;
  emptyBagWeight: number;
  dropRate: number;
  targetDropRate: number;
  servoAngle: number;
  pressurePa: number;
  bubbleDetected: boolean;
  blockageDetected: boolean;
  flowStopped: boolean;
  connectivity: string;
  hardware: Array<{ name: string; status: string; note?: string }>;
  alerts: Array<{
    id: string;
    deviceId: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
    resolved: boolean;
  }>;
  history: Array<{
    timestamp: string;
    fluidPct: number;
    fluidVolumeMl: number;
    weightGrams: number;
    dropRate: number;
    servoAngle: number;
    pressurePa: number;
  }>;
  estTimeMinutes?: number;
  lastUpdate: string;
  emergencyStop: boolean;
  buzzerActive: boolean;
  ledStatus: string;
  oledStatus: string;
}

export interface AppStateResponse {
  devices: DeviceState[];
  alerts: any[];
  settings: any;
  simulation: { running: boolean; speed: number };
}

export async function apiFetch<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  health: () => apiFetch('/health'),
  state: () => apiFetch<AppStateResponse>('/api/state'),
  devices: () => apiFetch<DeviceState[]>('/api/devices'),
  device: (id: string) => apiFetch<DeviceState>(`/api/devices/${id}`),
  startSim: () => apiFetch('/api/simulation/start', { method: 'POST' }),
  pauseSim: () => apiFetch('/api/simulation/pause', { method: 'POST' }),
  resetSim: () => apiFetch('/api/simulation/reset', { method: 'POST' }),
  speed: (speed: number) => apiFetch('/api/simulation/speed', {
    method: 'POST',
    body: JSON.stringify({ speed }),
  }),
  scenario: (name: string, deviceId?: string) => {
    const q = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    return apiFetch(`/api/scenarios/${name}${q}`, { method: 'POST' });
  },
  settings: () => apiFetch<any>('/api/settings'),
  updateSettings: (s: any) => apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(s) }),
  ackAlert: (id: string) => apiFetch(`/api/alerts/${id}/ack`, { method: 'POST' }),
  eventsCsv: () => `${API_BASE}/api/reports/events.csv`,
  deviceControl: (id: string, payload: any) => apiFetch(`/api/devices/${id}/control`, { method: 'PATCH', body: JSON.stringify(payload) }),
};
