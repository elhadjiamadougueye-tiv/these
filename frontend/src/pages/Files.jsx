import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Trash2, FileText, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchDocuments, uploadDocument, deleteDocument } from '../api/client'
import Sidebar from '../components/Sidebar'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function FilesPage() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const fileRef = useRef()
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    const data = await fetchDocuments()
    setDocuments(data)
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setUploadStatus(null)

    let success = 0, fail = 0
    for (const file of files) {
      try {
        await uploadDocument(file)
        success++
      } catch (err) {
        fail++
        console.error(err)
      }
    }

    setUploadStatus({ success, fail })
    setUploading(false)
    fileRef.current.value = ''
    await load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce document ?')) return
    await deleteDocument(id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const typeColors = {
    pdf: 'text-red-400', docx: 'text-blue-400', txt: 'text-gray-400',
    md: 'text-purple-400', csv: 'text-green-400', json: 'text-yellow-400',
    py: 'text-cyan-400', js: 'text-yellow-300', ts: 'text-blue-300',
  }

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar chats={[]} setChats={() => {}} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Documents & RAG
              </h1>
              <p className="text-xs text-ink0 mt-0.5">
                Indexez vos fichiers pour les utiliser dans vos conversations
              </p>
            </div>
          </div>

          {/* Upload zone */}
          <div
            className="border-2 border-dashed border-border hover:border-accent/40 rounded-2xl p-8
                       text-center transition-all cursor-pointer group mb-6 bg-surface-2/30 hover:bg-surface-2/60"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.json,.py,.js,.ts"
              onChange={handleUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-3 group-hover:bg-accent/15 border border-border
                              group-hover:border-accent/30 flex items-center justify-center transition-all">
                {uploading
                  ? <svg className="w-6 h-6 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  : <Upload className="w-6 h-6 text-ink0 group-hover:text-accent transition-colors" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-ink-2">
                  {uploading ? 'Indexation en cours…' : 'Glisser ou cliquer pour importer'}
                </p>
                <p className="text-xs text-ink0 mt-1">
                  PDF, DOCX, TXT, MD, CSV, JSON, PY, JS, TS · Max 50 Mo
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          {uploadStatus && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm border
              ${uploadStatus.fail > 0
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
              {uploadStatus.fail > 0
                ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
                : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              <span>
                {uploadStatus.success > 0 && `${uploadStatus.success} fichier(s) indexé(s) avec succès. `}
                {uploadStatus.fail > 0 && `${uploadStatus.fail} échec(s).`}
              </span>
            </div>
          )}

          {/* Documents list */}
          <div className="space-y-2">
            {documents.length === 0 && (
              <div className="text-center text-gray-600 text-sm py-12 bg-white rounded-2xl border border-border shadow-sm">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucun document indexé</p>
                <p className="text-xs mt-1 text-gray-700">Importez vos premiers fichiers ci-dessus</p>
              </div>
            )}
            {documents.map(doc => (
              <div key={doc.id}
                className="flex items-center gap-3 p-4 bg-white border border-border
                           rounded-xl hover:border-accent/30 hover:shadow-sm transition-all group">
                <FileText className={`w-5 h-5 flex-shrink-0 ${typeColors[doc.file_type] || 'text-ink0'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate font-medium"
                     title={doc.filename}>{doc.filename}</p>
                  <p className="text-xs text-ink0 mt-0.5">
                    {formatSize(doc.file_size)} · {doc.chunk_count} chunks · {' '}
                    <span className="uppercase text-gray-400">{doc.file_type}</span>
                  </p>
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">
                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                </span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400
                             hover:bg-red-500/10 rounded-lg transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {documents.length > 0 && (
            <p className="text-xs text-gray-600 text-center mt-4">
              {documents.length} document{documents.length !== 1 ? 's' : ''} indexé{documents.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
