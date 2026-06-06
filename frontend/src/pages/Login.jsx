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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-accent/10 border border-accent/20 mb-4">
            <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Ollama Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre espace</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200
                            rounded-lg text-red-600 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-base w-full" placeholder="vous@exemple.com" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-base w-full" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
