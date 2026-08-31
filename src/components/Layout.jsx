import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Keyboard,
  ClipboardCheck,
  ShieldCheck,
  LogOut,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NAV_BY_ROLE = {
  analista: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck },
    { to: '/entrevistador2', label: 'Etapa 2 · Teste', icon: Keyboard },
    { to: '/entrevistador3', label: 'Etapa 3 · Decisão', icon: ClipboardCheck },
    { to: '/admin', label: 'Administração', icon: ShieldCheck },
  ],
  entrevistador1: [{ to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck }],
  entrevistador2: [{ to: '/entrevistador2', label: 'Etapa 2 · Teste', icon: Keyboard }],
  entrevistador3: [{ to: '/entrevistador3', label: 'Etapa 3 · Decisão', icon: ClipboardCheck }],
}

const ROLE_LABEL = {
  analista: 'Analista de People Analytics',
  entrevistador1: 'Entrevistador(a) 1',
  entrevistador2: 'Entrevistador(a) 2',
  entrevistador3: 'Entrevistador(a) 3',
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV_BY_ROLE[profile?.role] || []

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:w-64 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-navy-100 bg-white">
        <div className="flex flex-col lg:h-screen lg:sticky lg:top-0">
          <div className="px-6 py-6 border-b border-navy-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center">
                <Users size={17} className="text-amber-400" />
              </div>
              <div>
                <p className="font-display text-[17px] leading-none text-navy-900">Hub RH</p>
                <p className="text-[11px] text-navy-400 mt-0.5">People Analytics</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-800 text-white'
                      : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                  }`
                }
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-navy-100">
            <p className="px-2 text-xs text-navy-400 mb-2 truncate">
              {profile?.nome} · {ROLE_LABEL[profile?.role]}
            </p>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
