const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface RequestOptions extends RequestInit {
  token?: string
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers || {})
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}

// Auth endpoints
export const auth = {
  register: (data: {
    email: string
    password: string
    imapPass: string
    smtpPass: string
    fromEmail: string
  }) =>
    apiCall<{ token: string; user: { id: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    apiCall<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (token: string) =>
    apiCall('/auth/logout', {
      method: 'POST',
      token,
    }),
}

// User endpoints
export const user = {
  getProfile: (token: string) =>
    apiCall('/user/profile', { token }),

  getCredentials: (token: string) =>
    apiCall('/user/credentials', { token }),

  updateCredentials: (token: string, data: any) =>
    apiCall('/user/credentials', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
}

// Email endpoints
export const email = {
  getFolders: (token: string) =>
    apiCall<any[]>('/folders', { token }),

  getMessages: (token: string, folder: string = 'INBOX', page: number = 1, limit: number = 20) =>
    apiCall<any[]>(`/messages?folder=${folder}&page=${page}&limit=${limit}`, { token }),

  getMessage: (token: string, id: string, folder: string = 'INBOX') =>
    apiCall<any>(`/messages/${id}?folder=${folder}`, { token }),

  sendEmail: (token: string, data: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    bodyText?: string
  }) =>
    apiCall('/compose', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  markAsRead: (token: string, id: string, folder: string = 'INBOX') =>
    apiCall(`/messages/${id}/read?folder=${folder}`, {
      method: 'PUT',
      token,
    }),

  deleteEmail: (token: string, id: string, folder: string = 'INBOX') =>
    apiCall(`/messages/${id}?folder=${folder}`, {
      method: 'DELETE',
      token,
    }),
}
