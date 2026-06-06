import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, FileText } from 'lucide-react'
import { useState } from 'react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={handle} className="p-1 hover:text-gray-200 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function AttachmentDisplay({ extra_data }) {
  if (!extra_data) return null

  if (extra_data.type === 'image' && extra_data.data) {
    return (
      <div className="mb-2">
        <img
          src={`data:${extra_data.media_type || 'image/jpeg'};base64,${extra_data.data}`}
          alt={extra_data.filename}
          className="max-w-xs max-h-64 rounded-xl object-contain border border-border"
        />
        <p className="text-[10px] text-gray-500 mt-1">{extra_data.filename}</p>
      </div>
    )
  }

  if (extra_data.type === 'document') {
    return (
      <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface-0/50
                      border border-border rounded-xl w-fit">
        <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-300 font-medium">{extra_data.filename}</p>
          {extra_data.word_count && (
            <p className="text-[10px] text-gray-500">{extra_data.word_count.toLocaleString()} mots</p>
          )}
        </div>
      </div>
    )
  }

  return null
}

export function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user'
  const hasAttachment = message.extra_data && message.extra_data.type
  const textContent = message.content?.startsWith('[Fichier joint') && hasAttachment
    ? '' : message.content

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1
        ${isUser ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-gray-400 border border-border'}`}>
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-accent/15 border border-accent/20 text-gray-100'
            : 'bg-surface-2 border border-border text-gray-200'
          } ${isStreaming ? 'cursor-blink' : ''}`}
        >
          {/* Pièce jointe */}
          <AttachmentDisplay extra_data={message.extra_data} />

          {/* Contenu texte */}
          {isUser ? (
            textContent && <p className="whitespace-pre-wrap">{textContent}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1]
                    const code = String(children).replace(/\n$/, '')
                    if (!inline && lang) {
                      return (
                        <div className="relative my-3">
                          <div className="flex items-center justify-between px-4 py-2 bg-surface-0 border-b border-border rounded-t-xl">
                            <span className="text-[10px] text-gray-500 font-mono uppercase">{lang}</span>
                            <CopyButton text={code} />
                          </div>
                          <SyntaxHighlighter language={lang} style={oneDark}
                            customStyle={{ margin: 0, padding: '1rem', background: '#0f0f10', borderRadius: '0 0 12px 12px', fontSize: '12px' }}
                            {...props}>{code}</SyntaxHighlighter>
                        </div>
                      )
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                }}
              >{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
