import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/projects')
    } catch (err) {
      setError(typeof err === 'string' ? err : '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">零售商品传播协同平台</h1>
          <p className="text-slate-400 text-sm mt-2">内部协同工具 · 请使用工作账号登录</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">用户名</label>
              <input
                type="text"
                className="input"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">密码</label>
              <input
                type="password"
                className="input"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-3">演示账号</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between bg-gray-50 px-3 py-1.5 rounded">
                <span>总部负责人</span>
                <span className="font-mono">admin / admin123</span>
              </div>
              <div className="flex justify-between bg-gray-50 px-3 py-1.5 rounded">
                <span>北京区域BP</span>
                <span className="font-mono">region_bj / region123</span>
              </div>
              <div className="flex justify-between bg-gray-50 px-3 py-1.5 rounded">
                <span>上海区域BP</span>
                <span className="font-mono">region_sh / region123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
