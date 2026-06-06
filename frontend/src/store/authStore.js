import { create } from 'zustand'

const API = import.meta.env.VITE_API_URL || '/chat/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      set({ isLoading: false })
      throw new Error(err.detail || 'Connexion échouée')
    }
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    set({ token: data.access_token, user: data.user, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    const token = get().token
    if (!token) return
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { get().logout(); return }
      const user = await res.json()
      set({ user })
    } catch { get().logout() }
  },
}))
