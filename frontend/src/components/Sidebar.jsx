import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, Plus, Trash2, LogOut, ChevronDown,
         Bot, Share2, FileText, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { deleteChat, fetchModels, createChat } from '../api/client'

export default function Sidebar({ onNewChat, chats, setChats }) {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('selectedModel') || ''
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { chatId } = useParams()

  useEffect(() => { loadModels() }, [])

  const loadModels = async () => {
    try {
      const data = await fetchModels()
      const list = data.models || []
      setModels(list)
      const saved = localStorage.getItem('selectedModel')
      if (list.length > 0 && !saved) {
        setSelectedModel(list[0].name)
        localStorage.setItem('selectedModel', list[0].name)
      }
    } catch {}
  }

  const handleSelectModel = (name) => {
    setSelectedModel(name)
    localStorage.setItem('selectedModel', name)
    setShowModelPicker(false)
  }

  const handleNewChat = async () => {
    if (!selectedModel) return
    try {
      const chat = await createChat({ model: selectedModel })
      navigate(`/${chat.id}`)
      onNewChat?.()
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette conversation ?')) return
    try {
      await deleteChat(id)
      setChats(prev => prev.filter(c => c.id !== id))
      if (String(chatId) === String(id)) navigate('/')
    } catch {}
  }

  const truncate = (s, n = 30) => s?.length > n ? s.slice(0, n) + '…' : s

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-1 border-r border-border flex flex-col h-full">

      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25
                          flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-accent" style={{width:'18px',height:'18px'}}
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <span className="font-semibold text-ink text-sm tracking-tight">Ollama Chat</span>
        </div>

        {/* Model Picker */}
        <div className="relative mb-3">
          <button onClick={() => setShowModelPicker(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-surface-3
                       border border-border rounded-lg text-sm transition-all shadow-sm">
            <Bot className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="flex-1 text-left truncate text-ink-2 text-xs font-medium">
              {selectedModel || 'Choisir un modèle'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-4 transition-transform duration-200
              ${showModelPicker ? 'rotate-180' : ''}`} />
          </button>

          {showModelPicker && models.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border
                            rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
              {models.map(m => (
                <button key={m.name} onClick={() => handleSelectModel(m.name)}
                  className={`w-full px-3 py-2.5 text-left text-xs transition-colors
                    ${m.name === selectedModel
                      ? 'text-accent bg-accent/8 font-semibold'
                      : 'text-ink-2 hover:bg-surface-3'}`}>
                  <div className="font-medium">{m.name}</div>
                  {m.details?.parameter_size && (
                    <div className="text-ink-4 text-[10px] mt-0.5">{m.details.parameter_size}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleNewChat} disabled={!selectedModel}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Nouveau chat
        </button>
      </div>

      {/* Séparateur */}
      <div className="h-px bg-border mx-3" />

      {/* Chat List */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {chats.length === 0 && (
          <p className="text-xs text-ink-4 text-center mt-10 px-4 leading-relaxed">
            Aucune conversation.<br/>Choisissez un modèle et commencez.
          </p>
        )}
        {chats.map(chat => (
          <button key={chat.id} onClick={() => navigate(`/${chat.id}`)}
            className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                        transition-all text-xs
                        ${String(chatId) === String(chat.id)
                          ? 'bg-accent/12 text-accent font-semibold border border-accent/20'
                          : 'text-ink-3 hover:bg-surface-3 hover:text-ink'}`}>
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="flex-1 truncate">{truncate(chat.title)}</span>
            {chat.is_shared && <Share2 className="w-3 h-3 text-accent/50 flex-shrink-0" />}
            <button onClick={(e) => handleDelete(e, chat.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </button>
        ))}
      </nav>

      {/* Séparateur */}
      <div className="h-px bg-border mx-3" />

      {/* Bottom Nav */}
      <div className="px-2 py-2 space-y-0.5">
        <button onClick={() => navigate('/files')}
          className="btn-ghost w-full flex items-center gap-2 text-xs py-2">
          <FileText className="w-3.5 h-3.5" />
          Documents & RAG
        </button>
        {user?.is_admin && (
          <button onClick={() => navigate('/admin')}
            className="btn-ghost w-full flex items-center gap-2 text-xs py-2">
            <Shield className="w-3.5 h-3.5 text-accent" />
            Administration
          </button>
        )}

        {/* Profil utilisateur */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg
                        bg-surface-3/60 border border-border/50">
          <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30
                          flex items-center justify-center text-accent font-semibold text-[10px] flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="flex-1 truncate text-xs text-ink-2 font-medium">{user?.username}</span>
          <button onClick={logout}
            className="p-1 text-ink-4 hover:text-red-500 transition-colors"
            title="Se déconnecter">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
