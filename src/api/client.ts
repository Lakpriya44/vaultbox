const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('vaultbox_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    let errData: any = null;
    try {
      errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.error;
      }
    } catch {
      // not json
    }
    throw new ApiError(errorMsg, response.status, errData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

/**
 * Downloads a binary blob with response headers for encrypted payloads
 */
export async function apiDownloadBlob(
  endpoint: string
): Promise<{
  blob: Blob;
  headers: Headers;
}> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    let errorMsg = `Download failed (${response.status})`;
    try {
      const err = await response.json();
      if (err && err.error) errorMsg = err.error;
    } catch {}
    throw new ApiError(errorMsg, response.status);
  }

  const blob = await response.blob();
  return {
    blob,
    headers: response.headers,
  };
}
