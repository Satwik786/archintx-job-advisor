import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Layers, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ConfirmDialog } from '../components/ui'

const link = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${isActive ? 'bg-white/15 text-white' : 'text-blue-100 hover:text-white'}`

export default function Layout() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand-900">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
            <Layers className="h-6 w-6 text-brand-500" aria-hidden="true" />
            Archint<span className="text-brand-500">X</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={link}>Jobs</NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/admin" end className={link}>Dashboard</NavLink>
                <button onClick={() => setConfirming(true)} className="ml-1 flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-blue-100 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                </button>
              </>
            ) : (
              <NavLink to="/admin/login" className={link}>Staff login</NavLink>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <span><strong className="text-brand-900">ARCHINTX</strong> · Job Apply &amp; Skill-Gap Advisor</span>
          <span>Internship capstone project</span>
        </div>
      </footer>
      {confirming && (
        <ConfirmDialog title="Log out?" message="You will need to sign in again to manage jobs." confirmLabel="Log out"
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); logout(); navigate('/') }} />
      )}
    </div>
  )
}
