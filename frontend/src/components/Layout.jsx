import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import {
  LayoutDashboard, Package, FileText, CheckSquare, LogOut, Menu, X, Check, Edit2,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/projects', icon: LayoutDashboard, label: '项目总览', sub: 'M1' },
  { to: '/materials', icon: Package, label: '物料中心', sub: 'M2' },
  { to: '/topics', icon: FileText, label: '选题工作台', sub: 'M3' },
  { to: '/submissions', icon: CheckSquare, label: '验收复盘', sub: 'M4' },
]

function UserPanel({ user, updateUser }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => { setDraft(user?.responsible_person || ''); setEditing(true) }
  const save = async () => {
    const updated = await authApi.updateMe({ responsible_person: draft })
    updateUser({ responsible_person: updated.responsible_person })
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg text-slate-300">
      <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
        {user?.display_name?.[0] || user?.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{user?.display_name || user?.username}</div>
        <div className="text-xs text-slate-500">{user?.role === 'headquarters' ? '总部' : user?.region}</div>
        <div className="flex items-center gap-1 mt-1">
          {editing ? (
            <>
              <input
                className="text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-200 w-24 focus:outline-none"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
                autoFocus
                placeholder="输入负责人"
              />
              <button onClick={save} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
            </>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <Edit2 size={10} />
              {user?.responsible_person
                ? <span className="text-slate-400">{user.responsible_person}</span>
                : <span className="italic">设置负责人</span>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
      isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 bg-slate-900 flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="text-white font-bold text-sm leading-tight">零售商品</div>
          <div className="text-sky-400 font-bold text-sm">传播协同平台</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, sub }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-xs opacity-50">{sub}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700">
          <UserPanel user={user} updateUser={updateUser} />
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 flex items-center justify-between px-4 h-12">
        <div>
          <span className="text-white font-bold text-sm">零售传播协同平台</span>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="text-slate-300 p-1">
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 bg-slate-900 flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-sm">零售商品</div>
                <div className="text-sky-400 font-bold text-sm">传播协同平台</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV.map(({ to, icon: Icon, label, sub }) => (
                <NavLink key={to} to={to} className={navLinkClass} onClick={() => setDrawerOpen(false)}>
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  <span className="text-xs opacity-50">{sub}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-slate-700">
              <UserPanel user={user} updateUser={updateUser} />
              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
              >
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 flex">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors',
                isActive ? 'text-sky-400' : 'text-slate-400'
              )
            }
          >
            <Icon size={18} />
            <span className="text-[10px] leading-tight">{label.replace('工作台', '').replace('总览', '').replace('中心', '')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
