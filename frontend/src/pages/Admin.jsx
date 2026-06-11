import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, Trash2, Shield,
  UserCheck, UserX, RefreshCw, Activity, FileText, AlertCircle
} from 'lucide-react'
import {
  adminFetchUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminFetchStats, API, getToken
} from '../api/client'
import Sidebar from '../components/Sidebar'

function StatCard({ label, value, color = 'text-accent' }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <p className="text-xs text-ink-4 mb-1 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

function UserModal({ onClose, onSave, editUser }) {
  const [form, setForm] = useState({
    username: editUser?.username || '',
    email: editUser?.email || '',
    full_name: editUser?.full_name || '',
    password: '',
    is_admin: editUser?.is_admin || false,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editUser) {
        const data = {}
        if (form.username) data.username = form.username
        if (form.full_name) data.full_name = form.full_name
        if (form.password) data.password = form.password
        data.is_admin = form.is_admin
        await adminUpdateUser(editUser.id, data)
      } else {
        if (!form.password) throw new Error('Mot de passe requis')
        await adminCreateUser(form)
      }
      onSave()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            {editUser ? "Modifier l'utilisateur" : 'Créer un utilisateur'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink0
                       hover:text-ink-2 hover:bg-surface-3/80 transition-all text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Username *</label>
              <input value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))}
                className="input-base w-full" required={!editUser} placeholder="johndoe" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Nom complet</label>
              <input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}
                className="input-base w-full" placeholder="John Doe" />
            </div>
          </div>
          {!editUser && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                className="input-base w-full" required placeholder="john@exemple.com" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">
              Mot de passe {editUser ? <span className="text-gray-600 font-normal">(laisser vide pour ne pas changer)</span> : '*'}
            </label>
            <input type="password" value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))}
              className="input-base w-full" required={!editUser} minLength={6}
              placeholder={editUser ? '••••••••' : 'Min. 6 caractères'} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-3/80 transition-colors">
            <input type="checkbox" checked={form.is_admin}
              onChange={e => setForm(p => ({...p, is_admin: e.target.checked}))}
              className="accent-accent w-4 h-4" />
            <div>
              <span className="text-sm text-ink-2 font-medium">Administrateur</span>
              <p className="text-xs text-ink0 mt-0.5">Accès complet à la gestion des utilisateurs et documents</p>
            </div>
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Sauvegarde…' : editUser ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [allDocs, setAllDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [reindexing, setReindexing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [u, s] = await Promise.all([adminFetchUsers(), adminFetchStats()])
      setUsers(u)
      setStats(s)
      const res = await fetch(`${API}/admin/documents`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) setAllDocs(await res.json())
    } catch {}
    setLoading(false)
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const res = await fetch(`${API}/admin/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      alert(`Réindexation terminée :\n✅ ${data.success?.length || 0} succès\n❌ ${data.failed?.length || 0} échecs`)
      load()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setReindexing(false)
    }
  }

  const toggleActive = async (user) => {
    await adminUpdateUser(user.id, { is_active: !user.is_active })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement cet utilisateur et toutes ses données ?')) return
    await adminDeleteUser(id)
    load()
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
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5" title="Retour">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Administration
              </h1>
              <p className="text-xs text-ink0 mt-0.5">Gestion des utilisateurs et documents</p>
            </div>
            <button onClick={load} disabled={loading}
              className="btn-ghost p-1.5" title="Rafraîchir">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'users' && (
              <button onClick={() => { setEditUser(null); setShowModal(true) }}
                className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Nouvel utilisateur
              </button>
            )}
            {activeTab === 'documents' && (
              <button onClick={handleReindex} disabled={reindexing}
                className="btn-primary flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${reindexing ? 'animate-spin' : ''}`} />
                {reindexing ? 'Réindexation…' : 'Réindexer tout'}
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatCard label="Utilisateurs" value={stats.users} />
              <StatCard label="Conversations" value={stats.chats} color="text-blue-400" />
              <StatCard label="Messages" value={stats.messages} color="text-green-400" />
              <StatCard label="Documents" value={stats.documents} color="text-purple-400" />
            </div>
          )}

          {/* Onglets */}
          <div className="flex gap-1 mb-4 bg-surface-2 border border-border rounded-xl p-1 w-fit">
            <button onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === 'users'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-ink-2 hover:bg-surface-3/80'}`}>
              Utilisateurs ({users.length})
            </button>
            <button onClick={() => setActiveTab('documents')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === 'documents'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-ink-2 hover:bg-surface-3/80'}`}>
              Documents RAG ({allDocs.length})
            </button>
          </div>

          {/* Tableau Utilisateurs */}
          {activeTab === 'users' && (
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-ink-2">Liste des utilisateurs</span>
                <span className="ml-auto text-xs text-ink0 bg-surface-3/80 px-2 py-0.5 rounded-full">
                  {users.length} compte{users.length !== 1 ? 's' : ''}
                </span>
              </div>
              {loading ? (
                <div className="px-4 py-10 text-center text-ink0 text-sm">Chargement…</div>
              ) : users.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-600 text-sm">Aucun utilisateur</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Créé le', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ink0 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-surface-1 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/25 flex items-center justify-center text-accent text-[11px] font-bold flex-shrink-0">
                              {user.username[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="text-ink font-medium text-xs">{user.username}</span>
                              {user.full_name && (
                                <p className="text-[10px] text-ink0 mt-0.5">{user.full_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-2 text-xs">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.is_admin
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent rounded-full text-[10px] font-semibold border border-accent/25">
                                <Shield className="w-2.5 h-2.5" /> Admin
                              </span>
                            : <span className="text-xs text-ink0">Utilisateur</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full
                            ${user.is_active
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-gray-500/10 text-ink0 border border-gray-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-gray-500'}`} />
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink0">
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditUser(user); setShowModal(true) }}
                              className="p-1.5 hover:bg-surface-4 rounded-lg text-ink0 hover:text-ink transition-all"
                              title="Modifier">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button onClick={() => toggleActive(user)}
                              className={`p-1.5 rounded-lg transition-all ${
                                user.is_active
                                  ? 'hover:bg-orange-500/10 text-ink0 hover:text-orange-400'
                                  : 'hover:bg-green-500/10 text-ink0 hover:text-green-400'}`}
                              title={user.is_active ? 'Désactiver' : 'Activer'}>
                              {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleDelete(user.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-ink0 hover:text-red-400 transition-all"
                              title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tableau Documents RAG */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-ink-2">
                  Documents indexés
                </span>
                <span className="ml-auto text-xs text-ink0 bg-surface-3/80 px-2 py-0.5 rounded-full">
                  {allDocs.length} fichier{allDocs.length !== 1 ? 's' : ''}
                </span>
              </div>
              {loading ? (
                <div className="px-4 py-10 text-center text-ink0 text-sm">Chargement…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Fichier', 'Type', 'Utilisateur', 'Chunks', 'Indexé', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ink0 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {allDocs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-600 text-sm">
                          Aucun document indexé
                        </td>
                      </tr>
                    )}
                    {allDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-surface-1 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 flex-shrink-0 ${typeColors[doc.file_type] || 'text-ink0'}`} />
                            <span className="text-ink text-xs font-medium truncate max-w-[200px]" title={doc.filename}>
                              {doc.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 bg-surface-3/80 border border-border rounded-full text-gray-300 uppercase font-medium">
                            {doc.file_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-300 font-medium">{doc.user}</td>
                        <td className="px-4 py-3 text-xs text-gray-300 text-center font-mono">{doc.chunk_count}</td>
                        <td className="px-4 py-3">
                          {doc.indexed
                            ? <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Oui
                              </span>
                            : <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                                <AlertCircle className="w-3 h-3" /> Non
                              </span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink0">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </main>

      {showModal && (
        <UserModal
          editUser={editUser}
          onClose={() => setShowModal(false)}
          onSave={load}
        />
      )}
    </div>
  )
}
