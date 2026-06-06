import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Share2, Copy, Check } from 'lucide-react'
import { API } from '../api/client'
import { MessageBubble } from '../components/MessageBubble'

export default function SharedChat() {
  const { token } = useParams()
  const [chat, setChat] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`${API}/chats/shared/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setChat)
      .catch(() => setError('Cette conversation n\'existe pas ou n\'est plus partagée.'))
  }, [token])

  const shareUrl = window.location.href

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Voici une conversation IA intéressante : ${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (error) return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-3">
          <Share2 className="w-5 h-5 text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  )

  if (!chat) return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="sticky top-0 bg-surface-1/90 backdrop-blur border-b border-border px-4 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-200 truncate">{chat.title}</h1>
            <p className="text-xs text-gray-500">{chat.model} · Conversation partagée · {chat.messages.length} messages</p>
          </div>

          {/* Actions partage */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                ${copied
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-surface-3 border-border text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
              {copied ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier le lien</>}
            </button>

            <button onClick={handleWhatsApp}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                         bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]
                         hover:bg-[#25D366]/25 transition-all">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {chat.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center">
        <p className="text-xs text-gray-600">
          Conversation partagée depuis{' '}
          <a href={`${window.location.origin}/chat`}
            className="text-accent hover:underline">Ollama Chat</a>
        </p>
      </div>
    </div>
  )
}
