const API = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { msg = (await res.json()).detail || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// Models
export const fetchModels = () =>
  fetch(`${API}/models`, { headers: authHeaders() }).then(handleResponse)

// Chats
export const fetchChats = () =>
  fetch(`${API}/chats`, { headers: authHeaders() }).then(handleResponse)

export const createChat = (data) =>
  fetch(`${API}/chats`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse)

export const fetchChat = (id) =>
  fetch(`${API}/chats/${id}`, { headers: authHeaders() }).then(handleResponse)

export const updateChat = (id, data) =>
  fetch(`${API}/chats/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse)

export const deleteChat = (id) =>
  fetch(`${API}/chats/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse)

export const shareChat = (id) =>
  fetch(`${API}/chats/${id}/share`, {
    method: 'POST',
    headers: authHeaders(),
  }).then(handleResponse)

// Files
export const fetchDocuments = () =>
  fetch(`${API}/files`, { headers: authHeaders() }).then(handleResponse)

export const uploadDocument = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  }).then(handleResponse)
}

export const deleteDocument = (id) =>
  fetch(`${API}/files/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse)

// Admin
export const adminFetchUsers = () =>
  fetch(`${API}/admin/users`, { headers: authHeaders() }).then(handleResponse)

export const adminCreateUser = (data) =>
  fetch(`${API}/admin/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse)

export const adminUpdateUser = (id, data) =>
  fetch(`${API}/admin/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse)

export const adminDeleteUser = (id) =>
  fetch(`${API}/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse)

export const adminFetchStats = () =>
  fetch(`${API}/admin/stats`, { headers: authHeaders() }).then(handleResponse)

// Streaming — retourne un EventSource-like via fetch
export function streamMessage(chatId, content, useRag = false, ragDocIds = [], attachment = null) {
  return fetch(`${API}/chats/${chatId}/messages/stream`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      content: content || '',
      use_rag: useRag,
      rag_document_ids: ragDocIds,
      attachment: attachment || undefined,
    }),
  })
}

export { API, getToken }

export const truncateMessages = (chatId, messageId) =>
  fetch(`${API}/chats/${chatId}/messages/from/${messageId}`, {
    method: 'DELETE', headers: authHeaders(),
  }).then(handleResponse)

export const transcribeAudio = async (audioBlob, filename = 'recording.webm') => {
  const form = new FormData()
  form.append('file', audioBlob, filename)
  const res = await fetch(`${API}/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  if (!res.ok) throw new Error('Transcription échouée')
  return res.json()
}

// Pièces jointes dans le chat (images + documents)
export const uploadAttachment = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  }).then(handleResponse)
}
