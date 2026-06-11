import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Square, Share2, FileText, X, Check, Copy } from 'lucide-react'
import { fetchChat, fetchChats, shareChat, streamMessage, fetchDocuments } from '../api/client'
import { MessageBubble } from '../components/MessageBubble'
import { AttachmentButton, AttachmentPreview } from '../components/AttachmentButton'
import Sidebar from '../components/Sidebar'

export default function ChatPage() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [documents, setDocuments] = useState([])
  const [ragDocIds, setRagDocIds] = useState([])
  const [showRag, setShowRag] = useState(false)
  const [shareInfo, setShareInfo] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chats, setChats] = useState([])
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

  const reloadChats = async () => {
    try { const data = await fetchChats(); setChats(data) } catch (e) { console.error('[reloadChats]', e) }
  }

  useEffect(() => { reloadChats() }, [])

  useEffect(() => {
    setChat(null)
    setMessages([])
    setStreamingContent('')
    setAttachment(null)
    if (chatId) loadChat()
  }, [chatId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingContent])
  useEffect(() => { fetchDocuments().then(setDocuments).catch(() => {}) }, [])

  const loadChat = async () => {
    try {
      const data = await fetchChat(chatId)
      setChat(data); setMessages(data.messages)
      setShareInfo({ is_shared: data.is_shared, share_token: data.share_token })
    } catch { navigate('/') }
  }

  const getShareUrl = () => shareInfo?.share_token
    ? `${window.location.origin}/chat/shared/${shareInfo.share_token}` : ''

  const handleShare = async () => {
    const data = await shareChat(chatId)
    setShareInfo(data); setShowShareModal(true)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl())
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Voici une conversation IA : ${getShareUrl()}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const canSend = (input.trim() || attachment) && !streaming

  const handleSend = async () => {
    if (!canSend || !chatId) return

    const userContent = input.trim()
    const currentAttachment = attachment
    setInput(''); setAttachment(null); setStreaming(true); setStreamingContent('')

    // Message optimiste
    const optimisticMsg = {
      id: Date.now(), role: 'user',
      content: userContent || `[Fichier joint : ${currentAttachment?.filename}]`,
      extra_data: currentAttachment ? {
        type: currentAttachment.type,
        filename: currentAttachment.filename,
        data: currentAttachment.data,
        media_type: currentAttachment.media_type,
        word_count: currentAttachment.word_count,
      } : null,
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const res = await streamMessage(
        chatId, userContent,
        ragDocIds.length > 0, ragDocIds,
        currentAttachment
      )
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      abortRef.current = reader
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        console.log('[SSE chunk]', JSON.stringify(chunk))
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.token) setStreamingContent(prev => prev + json.token)
            if (json.done) {
              console.log('[SSE done]', json)
              if (json.title) {
                setChat(prev => prev ? { ...prev, title: json.title } : prev)
                setChats(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, title: json.title } : c))
              }
            }
          } catch {}
        }
      }
      console.log('[SSE end] buffer résiduel:', JSON.stringify(buffer))
      // Traiter le buffer résiduel (dernier chunk sans \n final)
      if (buffer.startsWith('data: ')) {
        try {
          const json = JSON.parse(buffer.slice(6))
          if (json.done) {
            console.log('[SSE residual done]', json)
            if (json.title) {
              setChat(prev => prev ? { ...prev, title: json.title } : prev)
              setChats(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, title: json.title } : c))
            }
          }
        } catch {}
      }
      await loadChat()
      await reloadChats()
    } catch (err) {
      console.error(err)
    } finally {
      setStreaming(false); setStreamingContent(''); abortRef.current = null
      textareaRef.current?.focus()
    }
  }

  const handleStop = () => { abortRef.current?.cancel(); setStreaming(false) }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Ne montrer les messages que si le chat chargé correspond au chatId actuel
  const isCurrentChat = chat && String(chat.id) === String(chatId)
  const allMessages = isCurrentChat ? [
    ...messages,
    ...(streamingContent ? [{ id: 'streaming', role: 'assistant', content: streamingContent }] : []),
  ] : []

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar onNewChat={reloadChats} chats={chats} setChats={setChats} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {chat && (
          <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-white flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-ink truncate">{chat.title}</span>
              <span className="text-[10px] px-2 py-0.5 bg-surface-3 border border-border rounded-full text-ink-3 flex-shrink-0">
                {chat.model}
              </span>
            </div>
            <button onClick={handleShare}
              className={`btn-ghost text-xs flex items-center gap-1.5 ${shareInfo?.is_shared ? 'text-accent' : ''}`}>
              <Share2 className="w-3.5 h-3.5" />
              {shareInfo?.is_shared ? 'Partagé' : 'Partager'}
            </button>
          </header>
        )}

        {/* Modal partage */}
        {showShareModal && shareInfo?.is_shared && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-border rounded-2xl w-full max-w-md shadow-xl">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-accent" /> Partager la conversation
                </h2>
                <button onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 flex items-center justify-center text-ink-4 hover:text-ink hover:bg-surface-3 rounded-lg transition-all text-xl">×</button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-ink-3 font-medium mb-2">Lien de partage</p>
                  <div className="flex items-center gap-2 p-3 bg-surface-1 border border-border rounded-xl">
                    <span className="flex-1 text-xs text-ink-3 truncate font-mono">{getShareUrl()}</span>
                    <button onClick={handleCopyLink}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 font-medium
                        ${copied
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-white border border-border hover:border-accent text-ink-3 hover:text-accent'}`}>
                      {copied ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                    </button>
                  </div>
                </div>
                <button onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                             bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#128C7E] font-medium text-sm transition-all">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Partager sur WhatsApp
                </button>
                <button onClick={async () => { await shareChat(chatId); setShareInfo({ is_shared: false, share_token: null }); setShowShareModal(false) }}
                  className="w-full text-xs text-ink-4 hover:text-red-500 transition-colors py-1">
                  Désactiver le partage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {!chatId && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20
                              flex items-center justify-center shadow-sm">
                <svg className="w-10 h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-ink tracking-tight">Ollama Chat</h2>
                <p className="text-sm text-ink-3 mt-2 max-w-xs leading-relaxed">
                  Sélectionnez un modèle dans la barre latérale et créez un nouveau chat pour commencer
                </p>
              </div>
            </div>
          )}

          {allMessages.map((msg, i) => (
            <MessageBubble key={msg.id || i} message={msg} isStreaming={msg.id === 'streaming'} />
          ))}

          {streaming && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white border border-border shadow-sm flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-4 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        {chatId && (
          <div className="flex-shrink-0 border-t border-border bg-surface-0 px-4 py-3">

            {/* Sélecteur RAG */}
            {showRag && documents.length > 0 && (
              <div className="mb-2 p-3 bg-white border border-border rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-ink-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    Documents RAG
                  </span>
                  <button onClick={() => setShowRag(false)}
                    className="text-ink-4 hover:text-ink transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5 max-h-36 overflow-y-auto">
                  {documents.map(doc => (
                    <label key={doc.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors">
                      <input type="checkbox" checked={ragDocIds.includes(doc.id)}
                        onChange={(e) => setRagDocIds(prev =>
                          e.target.checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id))}
                        className="accent-accent w-3.5 h-3.5" />
                      <FileText className="w-3 h-3 text-ink-4 flex-shrink-0" />
                      <span className="text-xs text-ink-2 truncate">{doc.filename}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Prévisualisation pièce jointe */}
            {attachment && (
              <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} />
            )}

            {/* Barre de saisie style Claude */}
            <div className="flex items-end gap-2 bg-white border border-border rounded-2xl
                            shadow-sm px-3 py-2 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
              {/* Bouton pièce jointe */}
              <AttachmentButton onAttach={setAttachment} disabled={streaming} />

              {/* Bouton RAG */}
              <button onClick={() => setShowRag(p => !p)}
                title="Documents RAG"
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                  ragDocIds.length > 0
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-4 hover:text-ink hover:bg-surface-3'}`}>
                <FileText className="w-4 h-4" />
              </button>

              {/* Textarea */}
              <textarea ref={textareaRef} value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder={attachment ? "Ajouter un message (optionnel)…" : "Envoyer un message à Ollama Chat…"}
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm text-ink
                           placeholder-ink-4 min-h-[32px] max-h-[200px] py-1.5 leading-relaxed"
                style={{ height: 'auto' }}
              />

              {/* Envoyer / Stop */}
              {streaming ? (
                <button onClick={handleStop}
                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 border border-red-200 rounded-lg transition-all flex-shrink-0">
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSend} disabled={!canSend}
                  className="p-1.5 rounded-lg transition-all flex-shrink-0 disabled:opacity-30
                             bg-accent hover:bg-accent-hover text-white disabled:bg-ink-4">
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            {ragDocIds.length > 0 && (
              <p className="text-[10px] text-accent mt-1.5 ml-2 font-medium">
                {ragDocIds.length} document{ragDocIds.length > 1 ? 's' : ''} RAG actif{ragDocIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
