import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, FileText } from 'lucide-react'
import { useState } from 'react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle}
      className="p-1 hover:text-ink text-ink-4 transition-colors rounded"
      title="Copier le code">
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-600" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function AttachmentDisplay({ extra_data, isUser }) {
  if (!extra_data) return null

  if (extra_data.type === 'image' && extra_data.data) {
    return (
      <div className="mb-3">
        <img
          src={`data:${extra_data.media_type || 'image/jpeg'};base64,${extra_data.data}`}
          alt={extra_data.filename}
          className="max-w-xs max-h-64 rounded-xl object-contain border border-white/20"
        />
        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/70' : 'text-ink-4'}`}>
          {extra_data.filename}
        </p>
      </div>
    )
  }

  if (extra_data.type === 'document') {
    return (
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl w-fit border
        ${isUser
          ? 'bg-white/15 border-white/20'
          : 'bg-surface-3 border-border'}`}>
        <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isUser ? 'text-white/80' : 'text-accent'}`} />
        <div>
          <p className={`text-xs font-medium ${isUser ? 'text-white' : 'text-ink-2'}`}>
            {extra_data.filename}
          </p>
          {extra_data.word_count && (
            <p className={`text-[10px] ${isUser ? 'text-white/60' : 'text-ink-4'}`}>
              {extra_data.word_count.toLocaleString()} mots
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}

// Convertit la notation LaTeX \[...\] et \(...\) en $$...$$ et $...$
// car remark-math ne reconnaît que la syntaxe dollar
function normalizeMath(text) {
  if (!text) return text
  return text
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, math) => `$$${math.trim()}$$`)
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, math) => `$${math.trim()}$`)
}

export function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user'
  const hasAttachment = message.extra_data && message.extra_data.type
  const textContent = message.content?.startsWith('[Fichier joint') && hasAttachment
    ? '' : message.content
  const normalizedContent = isUser ? message.content : normalizeMath(message.content)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-1 border
        ${isUser
          ? 'bg-accent/15 text-accent border-accent/25'
          : 'bg-white text-ink-3 border-border shadow-sm'}`}>
        {isUser ? 'U' : (
          <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        )}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-accent text-white shadow-sm'
            : 'bg-white border border-border text-ink shadow-sm'
          } ${isStreaming ? 'cursor-blink' : ''}`}
        >
          {/* Pièce jointe */}
          <AttachmentDisplay extra_data={message.extra_data} isUser={isUser} />

          {/* Contenu texte */}
          {isUser ? (
            textContent && (
              <p className="whitespace-pre-wrap text-white leading-relaxed">{textContent}</p>
            )
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1]
                    const code = String(children).replace(/\n$/, '')
                    if (!inline && lang) {
                      return (
                        <div className="relative my-3 rounded-xl overflow-hidden border border-border shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2
                                          bg-surface-1 border-b border-border">
                            <span className="text-[10px] text-ink-4 font-mono uppercase tracking-wider">
                              {lang}
                            </span>
                            <CopyButton text={code} />
                          </div>
                          <SyntaxHighlighter
                            language={lang}
                            style={oneLight}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              background: '#fafaf8',
                              borderRadius: 0,
                              fontSize: '12px',
                              lineHeight: '1.6',
                            }}
                            {...props}
                          >{code}</SyntaxHighlighter>
                        </div>
                      )
                    }
                    return (
                      <code style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.75rem',
                        color: '#c96442',
                        background: '#fef3ee',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid #f5d5c5',
                      }} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >{normalizedContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
