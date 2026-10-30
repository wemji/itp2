const base = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
let csrfToken = '';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function clearApiSecurityState() {
  csrfToken = '';
}

export async function api(path, options = {}) {
  const { suppressSessionExpiry = false, ...fetchOptions } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  const response = await fetch(`${base}${path}`, {
    ...fetchOptions,
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(!safeMethods.has(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...fetchOptions.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (body.csrfToken) csrfToken = body.csrfToken;

  if (!response.ok) {
    if (response.status === 401 && !suppressSessionExpiry && !path.startsWith('/auth/login')) {
      clearApiSecurityState();
      window.dispatchEvent(new CustomEvent('onequeue:session-expired'));
    }
    throw new Error(body.error || 'Request failed.');
  }
  return body;
}
