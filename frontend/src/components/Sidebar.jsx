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

  const truncate = (s, n = 28) => s?.length > n ? s.slice(0, n) + '…' : s

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Model Picker */}
        <div className="relative mb-3">
          <button onClick={() => setShowModelPicker(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100
                       border border-gray-200 rounded-lg text-sm transition-all">
            <Bot className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="flex-1 text-left truncate text-gray-800 font-medium text-xs">
              {selectedModel || 'Choisir un modèle'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showModelPicker && models.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
              {models.map(m => (
                <button key={m.name} onClick={() => handleSelectModel(m.name)}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors
                    ${m.name === selectedModel ? 'text-accent bg-indigo-50 font-medium' : 'text-gray-700'}`}>
                  <div className="font-medium">{m.name}</div>
                  {m.details?.parameter_size && (
                    <div className="text-gray-400 text-[10px]">{m.details.parameter_size}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleNewChat} disabled={!selectedModel}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2">
          <Plus className="w-4 h-4" />
          Nouveau chat
        </button>
      </div>

      {/* Chat List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {chats.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8 px-4">
            Aucune conversation.<br/>Choisissez un modèle et commencez.
          </p>
        )}
        {chats.map(chat => (
          <button key={chat.id} onClick={() => navigate(`/${chat.id}`)}
            className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                        transition-all text-xs
                        ${String(chatId) === String(chat.id)
                          ? 'bg-indigo-50 text-accent border border-indigo-100 font-medium'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 truncate">{truncate(chat.title)}</span>
            {chat.is_shared && <Share2 className="w-3 h-3 text-accent/60 flex-shrink-0" />}
            <button onClick={(e) => handleDelete(e, chat.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </button>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="p-2 border-t border-gray-200 space-y-0.5">
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
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500
                        border-t border-gray-200 mt-1 pt-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center
                          text-accent font-semibold text-[10px] flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="flex-1 truncate text-gray-700">{user?.username}</span>
          <button onClick={logout} className="p-1 hover:text-red-500 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
