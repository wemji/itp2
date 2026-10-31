const base = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
let csrfToken = '';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', retryable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function statusMessage(status, body, path) {
  if (status === 400 || status === 409 || status === 422) {
    return body.error || 'Check the information you entered and try again.';
  }
  if (status === 401) {
    return path.startsWith('/auth/login')
      ? (body.error || 'The email or password you entered is incorrect.')
      : 'Your session expired. Please sign in again.';
  }
  if (status === 403) return path.startsWith('/auth/login')
    ? (body.error || 'Unable to sign in with these credentials.')
    : 'You don’t have permission to perform this action.';
  if (status === 404) return body.error || 'The requested information could not be found.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return body.error || 'We couldn’t complete that request. Please try again.';
}

function requestError(error) {
  if (error?.name === 'AbortError') {
    return new ApiError('The request took too long. Check your connection and try again.', { code: 'TIMEOUT', retryable: true });
  }
  if (!navigator.onLine) {
    return new ApiError('You appear to be offline. Reconnect to the internet and try again.', { code: 'OFFLINE', retryable: true });
  }
  return new ApiError('We couldn’t connect to ONEQUEUE. Check your internet connection and try again.', { code: 'NETWORK', retryable: true });
}

export function clearApiSecurityState() {
  csrfToken = '';
}

export async function api(path, options = {}) {
  const { suppressSessionExpiry = false, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const externalSignal = fetchOptions.signal;
  const abortFromExternalSignal = () => controller.abort();
  externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });

  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...fetchOptions,
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(!safeMethods.has(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    throw requestError(error);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }

  const body = await response.json().catch(() => ({}));
  if (body.csrfToken) csrfToken = body.csrfToken;

  if (!response.ok) {
    if (response.status === 401 && !suppressSessionExpiry && !path.startsWith('/auth/login')) {
      clearApiSecurityState();
      window.dispatchEvent(new CustomEvent('onequeue:session-expired'));
    }
    throw new ApiError(statusMessage(response.status, body, path), {
      status: response.status,
      code: `HTTP_${response.status}`,
      retryable: response.status === 429 || response.status >= 500,
    });
  }
  return body;
}
