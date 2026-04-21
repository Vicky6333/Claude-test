import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLES = [
  {
    label: '总部负责人',
    desc: '管理项目、发布素材、查看全局数据',
    username: 'admin',
    password: 'admin123',
    icon: '🏢',
    color: 'from-blue-600 to-blue-700',
  },
  {
    label: '区域BP',
    desc: '接收素材、提交执行、反馈区域数据',
    username: 'region_bj',
    password: 'region123',
    icon: '📍',
    color: 'from-emerald-600 to-emerald-700',
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState(null)
  const [error, setError] = useState('')

  const handleRoleSelect = async (role) => {
    setError('')
    setLoadingRole(role.username)
    try {
      await login(role.username, role.password)
      navigate('/projects')
    } catch {
      setError('登录失败，请刷新重试')
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">零售商品传播协同平台</h1>
          <p className="text-slate-400 mt-2">选择身份直接进入</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ROLES.map((role) => (
            <button
              key={role.username}
              onClick={() => handleRoleSelect(role)}
              disabled={!!loadingRole}
              className={`bg-gradient-to-br ${role.color} rounded-2xl p-8 text-white text-left transition-all duration-150 hover:scale-105 hover:shadow-2xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/40`}
            >
              <div className="text-4xl mb-4">{role.icon}</div>
              <div className="text-xl font-bold mb-2">{role.label}</div>
              <div className="text-sm opacity-80 leading-relaxed">{role.desc}</div>
              {loadingRole === role.username && (
                <div className="mt-4 text-xs opacity-70">进入中...</div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 text-red-400 text-sm text-center bg-red-900/30 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
