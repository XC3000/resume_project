const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestInterceptor = {
  onStart: () => void;
  onEnd: () => void;
};

let interceptor: RequestInterceptor | null = null;

export function registerApiInterceptor(apiInterceptor: RequestInterceptor) {
  interceptor = apiInterceptor;
}

async function request(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (interceptor) {
    interceptor.onStart();
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errorMessage = `API Request failed with status ${res.status}`;
      try {
        const errJson = await res.clone().json();
        errorMessage = errJson.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }
    
    if (res.status === 204) {
      return null;
    }

    return await res.json();
  } finally {
    if (interceptor) {
      interceptor.onEnd();
    }
  }
}

export const api = {
  get: (path: string, options?: RequestInit) => request(path, { ...options, method: 'GET' }),
  post: (path: string, body?: any, options?: RequestInit) =>
    request(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any, options?: RequestInit) =>
    request(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string, options?: RequestInit) => request(path, { ...options, method: 'DELETE' }),
  put: (path: string, body?: any, options?: RequestInit) =>
    request(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
};
