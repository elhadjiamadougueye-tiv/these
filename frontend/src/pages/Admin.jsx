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
    <div className="bg-surface-2 border border-border rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">
            {editUser ? "Modifier l'utilisateur" : 'Créer un utilisateur'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Username *</label>
              <input value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))}
                className="input-base w-full" required={!editUser} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom complet</label>
              <input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}
                className="input-base w-full" />
            </div>
          </div>
          {!editUser && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                className="input-base w-full" required />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Mot de passe {editUser ? '(laisser vide pour ne pas changer)' : '*'}
            </label>
            <input type="password" value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))}
              className="input-base w-full" required={!editUser} minLength={6} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_admin}
              onChange={e => setForm(p => ({...p, is_admin: e.target.checked}))}
              className="accent-accent" />
            <span className="text-sm text-gray-300">Administrateur</span>
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

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar refreshTrigger={0} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Administration
              </h1>
            </div>
            <button onClick={load} className="btn-ghost p-1.5" title="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
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
                ${activeTab === 'users' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              Utilisateurs ({users.length})
            </button>
            <button onClick={() => setActiveTab('documents')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === 'documents' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              Documents RAG ({allDocs.length})
            </button>
          </div>

          {/* Tableau Utilisateurs */}
          {activeTab === 'users' && (
            <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-300">Utilisateurs ({users.length})</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Username','Email','Rôle','Statut','Créé le','Actions'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                            {user.username[0]?.toUpperCase()}
                          </div>
                          <span className="text-gray-200 font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.is_admin
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent rounded text-[10px] font-medium border border-accent/20">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          : <span className="text-xs text-gray-500">Utilisateur</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditUser(user); setShowModal(true) }}
                            className="p-1.5 hover:bg-surface-4 rounded-lg text-gray-500 hover:text-gray-200 transition-all"
                            title="Modifier">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => toggleActive(user)}
                            className={`p-1.5 rounded-lg transition-all ${user.is_active ? 'hover:bg-orange-500/10 text-gray-500 hover:text-orange-400' : 'hover:bg-green-500/10 text-gray-500 hover:text-green-400'}`}
                            title={user.is_active ? 'Désactiver' : 'Activer'}>
                            {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(user.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                            title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau Documents RAG */}
          {activeTab === 'documents' && (
            <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-300">
                  Tous les documents indexés ({allDocs.length})
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Fichier','Type','Utilisateur','Chunks','Indexé','Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">
                        Aucun document indexé
                      </td>
                    </tr>
                  )}
                  {allDocs.map(doc => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-surface-3/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-200 text-xs truncate max-w-[220px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-3 rounded text-gray-400 uppercase">
                          {doc.file_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{doc.user}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-center">{doc.chunk_count}</td>
                      <td className="px-4 py-3">
                        {doc.indexed
                          ? <span className="text-green-400 text-xs font-medium">✓ Oui</span>
                          : <span className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Non
                            </span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
