import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Keyboard,
  ClipboardCheck,
  ShieldCheck,
  LogOut,
  Users,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTema } from '../lib/useTema'

const NAV_BY_ROLE = {
  analista: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck },
    { to: '/entrevistador2', label: 'Etapa 2 · Teste', icon: Keyboard },
    { to: '/entrevistador3', label: 'Etapa 3 · Decisão', icon: ClipboardCheck },
    { to: '/admin', label: 'Administração', icon: ShieldCheck },
  ],
  entrevistador1: [{ to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck }],
  entrevistador2: [
    { to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck },
    { to: '/entrevistador2', label: 'Etapa 2 · Teste', icon: Keyboard },
  ],
  entrevistador3: [
    { to: '/entrevistador1', label: 'Etapa 1 · Entrevista', icon: UserCheck },
    { to: '/entrevistador2', label: 'Etapa 2 · Teste', icon: Keyboard },
    { to: '/entrevistador3', label: 'Etapa 3 · Decisão', icon: ClipboardCheck },
  ],
}

const ROLE_LABEL = {
  analista: 'Analista de People Analytics',
  entrevistador1: 'Entrevistador(a) 1',
  entrevistador2: 'Entrevistador(a) 2',
  entrevistador3: 'Entrevistador(a) 3',
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const [escuro, setEscuro] = useTema()
  const navigate = useNavigate()
  const items = NAV_BY_ROLE[profile?.role] || []

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:flex bg-white dark:bg-navy-950">
      <aside className="no-print lg:w-64 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900">
        <div className="flex flex-col lg:h-screen lg:sticky lg:top-0">
          <div className="px-6 py-6 border-b border-navy-100 dark:border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-navy-700 flex items-center justify-center">
                <Users size={17} className="text-amber-400" />
              </div>
              <div>
                <p className="font-display text-[17px] leading-none text-navy-900 dark:text-white">Hub RH</p>
                <p className="text-[11px] text-navy-400 mt-0.5">People Analytics</p>
              </div>
            </div>
            <button
              onClick={() => setEscuro((e) => !e)}
              title={escuro ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800 hover:text-navy-700 dark:hover:text-white transition-colors"
            >
              {escuro ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
                      ? 'bg-navy-700 text-white'
                      : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800 hover:text-navy-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-navy-100 dark:border-navy-800">
            <p className="px-2 text-xs text-navy-400 mb-2 truncate">
              {profile?.nome} · {ROLE_LABEL[profile?.role]}
            </p>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800"
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
