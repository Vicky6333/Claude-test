import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Edit2, Check, X, TrendingUp, Users, FileText, DollarSign } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

function StatCard({ icon: Icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function EditableField({ label, value, multiline, onSave, className }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  const save = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft(value || ''); setEditing(false) }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {!editing && <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-sky-500"><Edit2 size={13} /></button>}
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline
            ? <textarea className="input h-24 resize-none text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            : <input className="input text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          }
          <div className="flex gap-2">
            <button onClick={save} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"><Check size={13} />保存</button>
            <button onClick={cancel} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><X size={13} />取消</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{value || <span className="text-gray-400 italic">未填写</span>}</p>
      )}
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([projectsApi.get(id), projectsApi.getStats(id)])
      .then(([p, s]) => { setProject(p); setStats(s) })
      .finally(() => setLoading(false))
  }, [id])

  const updateField = (field) => async (value) => {
    if (user?.role !== 'headquarters') return
    const updated = await projectsApi.update(id, { [field]: value })
    setProject(updated)
  }

  if (loading) return <LoadingSpinner text="加载项目..." />
  if (!project) return <div className="p-6 text-gray-500">项目不存在</div>

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ChevronLeft size={16} />返回项目列表
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sky-600 font-medium mt-0.5">{project.product}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/materials?project_id=${id}`} className="btn-secondary text-xs">物料中心</Link>
            <Link to={`/topics?project_id=${id}`} className="btn-primary text-xs">选题工作台</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
          <span>传播周期：{project.start_date} → {project.end_date}</span>
          {project.cities?.length > 0 && <span>覆盖城市：{project.cities.join('、')}</span>}
          {project.budget > 0 && <span>总预算：¥{project.budget.toLocaleString()}</span>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={FileText} label="总选题数" value={stats.total_topics} color="sky" />
          <StatCard icon={TrendingUp} label="已发布" value={stats.published_topics} color="green" />
          <StatCard icon={Check} label="已验收" value={stats.accepted_topics} color="purple" />
          <StatCard
            icon={DollarSign}
            label="综合 CPM"
            value={stats.avg_cpm ? `¥${stats.avg_cpm.toFixed(1)}` : '—'}
            sub={stats.total_cost > 0 ? `总花费 ¥${stats.total_cost.toLocaleString()}` : undefined}
            color="amber"
          />
        </div>
      )}

      {/* City stats */}
      {stats?.city_stats?.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="section-title mb-4">城市传播进度</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium">城市</th>
                  <th className="pb-2 font-medium text-right">选题数</th>
                  <th className="pb-2 font-medium text-right">已发布</th>
                  <th className="pb-2 font-medium text-right">已验收</th>
                </tr>
              </thead>
              <tbody>
                {stats.city_stats.map((c) => (
                  <tr key={c.city} className="border-b last:border-0">
                    <td className="py-2 font-medium">{c.city}</td>
                    <td className="py-2 text-right">{c.topics}</td>
                    <td className="py-2 text-right">{c.published}</td>
                    <td className="py-2 text-right">{c.accepted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project details */}
      <div className="card p-5 space-y-5">
        <h2 className="section-title">项目详情</h2>

        <EditableField
          label="传播主线"
          value={project.main_narrative}
          multiline
          onSave={updateField('main_narrative')}
        />

        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">核心记忆点</div>
          <div className="flex flex-wrap gap-1.5">
            {project.key_memory_points?.length > 0
              ? project.key_memory_points.map((pt) => (
                  <span key={pt} className="text-sm bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-100">{pt}</span>
                ))
              : <span className="text-sm text-gray-400 italic">未填写</span>
            }
          </div>
        </div>

        <EditableField
          label="品牌心智目标"
          value={project.brand_mind_goal}
          onSave={updateField('brand_mind_goal')}
        />

        <EditableField
          label="总部已发内容摘要"
          value={project.hq_content_summary}
          multiline
          onSave={updateField('hq_content_summary')}
        />
      </div>
    </div>
  )
}
