import { X, FileText, Music } from 'lucide-react'

export function AttachmentPreview({ attachments, onRemove }) {
  if (!attachments.length) return null
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((att, i) => (
        <div key={i} className="relative group flex items-center gap-2 px-3 py-2
                                 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700">
          {att.type === 'image' ? (
            <img src={`data:image/*;base64,${att.content}`}
              className="w-10 h-10 object-cover rounded-lg" alt={att.filename} />
          ) : att.type === 'audio' ? (
            <Music className="w-4 h-4 text-purple-500" />
          ) : (
            <FileText className="w-4 h-4 text-blue-500" />
          )}
          <span className="max-w-[120px] truncate">{att.filename}</span>
          <button onClick={() => onRemove(i)}
            className="ml-1 p-0.5 hover:text-red-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
