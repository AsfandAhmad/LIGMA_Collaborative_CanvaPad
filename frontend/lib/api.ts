// API Client for LIGMA Backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Helper to make authenticated requests
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// AUTH API
// ============================================================================

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    return fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  saveAuth: (token: string, user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================================================================
// CANVAS API
// ============================================================================

export interface CanvasNode {
  id: string;
  type: string;
  content: any;
  position: { x: number; y: number };
  intent?: string;
  locked?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CanvasState {
  roomId: string;
  nodes: CanvasNode[];
  version: number;
}

export const canvasApi = {
  getCanvas: async (roomId: string): Promise<CanvasState> => {
    return fetchWithAuth(`/api/canvas/${roomId}`);
  },

  resetCanvas: async (roomId: string): Promise<{ message: string }> => {
    return fetchWithAuth(`/api/canvas/${roomId}/reset`, {
      method: 'POST',
    });
  },

  exportCanvas: async (roomId: string): Promise<any> => {
    return fetchWithAuth(`/api/canvas/${roomId}/export`);
  },

  lockNode: async (nodeId: string, locked: boolean): Promise<any> => {
    return fetchWithAuth(`/api/nodes/${nodeId}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ locked }),
    });
  },

  setNodeAcl: async (nodeId: string, acl: any): Promise<any> => {
    return fetchWithAuth(`/api/nodes/${nodeId}/acl`, {
      method: 'PATCH',
      body: JSON.stringify({ acl }),
    });
  },
};

// ============================================================================
// TASKS API
// ============================================================================

export interface Task {
  id: string;
  roomId: string;
  nodeId: string;
  text: string;       // backend field name
  status: 'todo' | 'done';
  authorId: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export const tasksApi = {
  getTasks: async (roomId: string): Promise<Task[]> => {
    const res = await fetchWithAuth(`/api/tasks/${roomId}`);
    // Backend returns { tasks: [...] }
    return res.tasks ?? res;
  },

  updateTaskStatus: async (
    taskId: string,
    status: Task['status']
  ): Promise<Task> => {
    const res = await fetchWithAuth(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    // Backend returns { success: true, task: {...} }
    return res.task ?? res;
  },
};

// ============================================================================
// ROOMS API (if you add room management endpoints)
// ============================================================================

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export const roomsApi = {
  createRoom: async (name: string): Promise<Room> => {
    const res = await fetchWithAuth('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return res.room ?? res;
  },

  getRooms: async (): Promise<Room[]> => {
    const res = await fetchWithAuth('/api/rooms');
    return res.rooms ?? res;
  },

  getRoom: async (roomId: string): Promise<Room> => {
    const res = await fetchWithAuth(`/api/rooms/${roomId}`);
    return res.room ?? res;
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  auth: authApi,
  canvas: canvasApi,
  tasks: tasksApi,
  rooms: roomsApi,
};
