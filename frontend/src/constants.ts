export const COLORS = {
  bg: '#0A0A0A',
  surface: '#141414',
  elevated: '#1C1C1E',
  primary: '#FF3B30',
  primaryLight: '#FF5248',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF453A',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${BACKEND_URL}/api${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  post: async (path: string, body: any) => {
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  put: async (path: string, body: any) => {
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  del: async (path: string) => {
    const res = await fetch(`${BACKEND_URL}/api${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
};

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const PERSONAS: Record<string, { name: string; role: string; description: string; icon: string; color: string }> = {
  trainer: {
    name: 'Coach Iron',
    role: 'Personal Trainer',
    description: 'Analyzes your workouts, suggests improvements, and creates training plans based on your daily logs.',
    icon: 'barbell',
    color: '#FF3B30',
  },
  nutritionist: {
    name: 'Dr. Fuel',
    role: 'Sports Nutritionist',
    description: 'Analyzes your meals & mess menu screenshots, counts calories, and optimizes your diet.',
    icon: 'leaf',
    color: '#34C759',
  },
  buddy: {
    name: 'BroFit',
    role: 'Fitness Buddy',
    description: 'Your uncensored gym bro for all fitness questions. No topic is off-limits.',
    icon: 'people',
    color: '#FF9F0A',
  },
};

export const getToday = () => new Date().toISOString().split('T')[0];
