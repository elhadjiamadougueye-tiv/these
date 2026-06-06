import { useState, useRef } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadAttachment } from '../api/client'

const TYPE_COLORS = {
  pdf: 'text-red-400', docx: 'text-blue-400', doc: 'text-blue-400',
  xlsx: 'text-green-400', xls: 'text-green-400', csv: 'text-green-400',
  pptx: 'text-orange-400', txt: 'text-gray-400', md: 'text-purple-400',
}

export function AttachmentPreview({ attachment, onRemove }) {
  if (!attachment) return null
  const ext = attachment.filename?.split('.').pop()?.toLowerCase()

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex items-center gap-2 pl-3 pr-2 py-2 bg-surface-3 border border-border
                      rounded-xl text-xs group max-w-[280px]">
        {attachment.type === 'image' ? (
          <>
            <img
              src={`data:${attachment.media_type};base64,${attachment.data}`}
              alt={attachment.filename}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
            <span className="text-gray-300 truncate">{attachment.filename}</span>
          </>
        ) : (
          <>
            <FileText className={`w-4 h-4 flex-shrink-0 ${TYPE_COLORS[ext] || 'text-gray-400'}`} />
            <div className="min-w-0">
              <p className="text-gray-200 truncate font-medium">{attachment.filename}</p>
              {attachment.word_count && (
                <p className="text-gray-500">{attachment.word_count.toLocaleString()} mots</p>
              )}
            </div>
          </>
        )}
        <button onClick={onRemove}
          className="ml-1 p-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function AttachmentButton({ onAttach, disabled }) {
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const result = await uploadAttachment(file)
      onAttach(result)
    } catch (err) {
      alert(`Erreur pièce jointe : ${err.message}`)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" className="hidden"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md,.csv,.json,image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading || disabled}
        title="Joindre un fichier ou une image"
        className="p-2 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300
                   transition-all flex-shrink-0 disabled:opacity-40"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin text-accent" />
          : <Paperclip className="w-4 h-4" />}
      </button>
    </>
  )
}
