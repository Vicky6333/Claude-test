import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Calendar, MapPin } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'

const STATUS_LABEL = { active: '进行中', completed: '已结束', draft: '草稿' }
const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  draft: 'bg-amber-100 text-amber-700',
}

function ProjectFormModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', product: '', start_date: '', end_date: '',
    cities: '', main_narrative: '', key_memory_points: '',
    brand_mind_goal: '', hq_content_summary: '', budget: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = {
        ...form,
        cities: form.cities.split(/[，,、\n]/).map((c) => c.trim()).filter(Boolean),
        key_memory_points: form.key_memory_points.split(/[，,、\n]/).map((k) => k.trim()).filter(Boolean),
        budget: parseFloat(form.budget) || 0,
      }
      const project = await projectsApi.create(data)
      onCreated(project)
    } catch (err) {
      setError(typeof err === 'string' ? err : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">新建传播项目</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">项目名称 *</label>
              <input className="input" placeholder="如：2026冬季花香蓝莓传播" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">商品/品类 *</label>
              <input className="input" placeholder="如：花香蓝莓" value={form.product} onChange={set('product')} required />
            </div>
            <div>
              <label className="label">总预算（元）</label>
              <input className="input" type="number" placeholder="0" value={form.budget} onChange={set('budget')} />
            </div>
            <div>
              <label className="label">传播开始日期 *</label>
              <input className="input" type="date" value={form.start_date} onChange={set('start_date')} required />
            </div>
            <div>
              <label className="label">传播结束日期 *</label>
              <input className="input" type="date" value={form.end_date} onChange={set('end_date')} required />
            </div>
          </div>

          <div>
            <label className="label">覆盖城市（逗号分隔）</label>
            <input className="input" placeholder="北京, 上海, 广州, 深圳" value={form.cities} onChange={set('cities')} />
          </div>

          <div>
            <label className="label">传播主线（300字以内）</label>
            <textarea className="input h-20 resize-none" placeholder="总部传播的核心方向与逻辑..." value={form.main_narrative} onChange={set('main_narrative')} />
          </div>

          <div>
            <label className="label">核心记忆点（逗号分隔，最多8个）</label>
            <input className="input" placeholder="高原果, 厚霜果, 社区冰箱" value={form.key_memory_points} onChange={set('key_memory_points')} />
          </div>

          <div>
            <label className="label">品牌心智目标</label>
            <input className="input" placeholder="希望在目标用户中建立的认知" value={form.brand_mind_goal} onChange={set('brand_mind_goal')} />
          </div>

          <div>
            <label className="label">总部已发内容摘要（供AI差异化判断参考）</label>
            <textarea className="input h-20 resize-none" placeholder="总部新媒体已发内容简要说明..." value={form.hq_content_summary} onChange={set('hq_content_summary')} />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '创建中...' : '创建项目'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    projectsApi.list().then(setProjects).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目总览</h1>
          <p className="text-gray-500 text-sm mt-0.5">每个传播活动作为独立项目管理</p>
        </div>
        {user?.role === 'headquarters' && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            新建项目
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="加载中..." />
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div>暂无项目{user?.role === 'headquarters' ? '，点击右上角新建' : ''}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="card p-5 text-left hover:shadow-md hover:border-sky-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[p.status] || p.status}
                </span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-500 transition-colors mt-0.5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
              <p className="text-sm text-sky-600 mb-3">{p.product}</p>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {p.start_date} → {p.end_date}
                </div>
                {p.cities?.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    {p.cities.slice(0, 4).join('、')}{p.cities.length > 4 ? `等${p.cities.length}城市` : ''}
                  </div>
                )}
              </div>
              {p.key_memory_points?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.key_memory_points.slice(0, 4).map((pt) => (
                    <span key={pt} className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded">{pt}</span>
                  ))}
                  {p.key_memory_points.length > 4 && (
                    <span className="text-xs text-gray-400">+{p.key_memory_points.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectFormModal
          onClose={() => setShowModal(false)}
          onCreated={(p) => { setProjects((ps) => [p, ...ps]); setShowModal(false) }}
        />
      )}
    </div>
  )
}
