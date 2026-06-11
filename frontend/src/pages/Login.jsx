import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-accent/12 border border-accent/25 mb-5 shadow-sm">
            <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Ollama Chat</h1>
          <p className="text-sm text-ink-3 mt-1.5">Connectez-vous à votre espace</p>
        </div>

        {/* Carte */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200
                            rounded-lg text-red-600 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-base w-full" placeholder="vous@exemple.com" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-base w-full" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-2.5 mt-2 text-sm font-semibold">
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
