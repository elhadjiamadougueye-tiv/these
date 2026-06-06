import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import ChatPage from './pages/Chat'
import FilesPage from './pages/Files'
import AdminPage from './pages/Admin'
import SharedChat from './pages/SharedChat'

function AuthGuard({ children }) {
  const { token, user, fetchMe } = useAuthStore()
  const location = useLocation()
  useEffect(() => { if (token && !user) fetchMe() }, [token])
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AdminGuard({ children }) {
  const { user } = useAuthStore()
  if (!user?.is_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter basename="/chat">
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/shared/:token"  element={<SharedChat />} />
        <Route path="/"               element={<AuthGuard><ChatPage /></AuthGuard>} />
        <Route path="/:chatId"        element={<AuthGuard><ChatPage /></AuthGuard>} />
        <Route path="/files"          element={<AuthGuard><FilesPage /></AuthGuard>} />
        <Route path="/admin"          element={
          <AuthGuard><AdminGuard><AdminPage /></AdminGuard></AuthGuard>
        } />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
