import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { topicsApi } from '../api/topics'
import { projectsApi } from '../api/projects'
import { materialsApi } from '../api/materials'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TopicStatusBadge, AlignmentBadge } from '../components/StatusBadge'

const CHANNELS = ['小红书', '视频号', '微信图文', '本地媒体']
const ACCOUNT_TYPES = ['KOL', 'KOC', '区域媒体官方账号']

function TopicFormModal({ projects, onClose, onCreated, defaultProjectId }) {
  const [form, setForm] = useState({
    project_id: defaultProjectId || (projects[0]?.id || ''),
    channel: CHANNELS[0],
    account_type: ACCOUNT_TYPES[0],
    direction: '',
    account_avg_likes: '',
    account_avg_comments: '',
    account_avg_shares: '',
    estimated_cost: '',
    material_ids: [],
    platform_content_info: '',
  })
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (form.project_id) {
      materialsApi.list({ project_id: form.project_id }).then(setMaterials)
    }
  }, [form.project_id])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleMaterial = (id) =>
    setForm((f) => ({
      ...f,
      material_ids: f.material_ids.includes(id)
        ? f.material_ids.filter((m) => m !== id)
        : [...f.material_ids, id],
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = {
        ...form,
        account_avg_likes: parseInt(form.account_avg_likes) || 0,
        account_avg_comments: parseInt(form.account_avg_comments) || 0,
        account_avg_shares: parseInt(form.account_avg_shares) || 0,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
      }
      const topic = await topicsApi.create(data)
      onCreated(topic)
    } catch (err) {
      setError(typeof err === 'string' ? err : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">提交选题</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">所属项目 *</label>
            <select className="input" value={form.project_id} onChange={set('project_id')} required>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">传播渠道 *</label>
              <select className="input" value={form.channel} onChange={set('channel')}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">账号类型 *</label>
              <select className="input" value={form.account_type} onChange={set('account_type')}>
                {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">选题方向（200字以内）*</label>
            <textarea
              className="input h-24 resize-none"
              placeholder="计划做的内容方向描述..."
              value={form.direction}
              onChange={set('direction')}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="label">账号历史互动均值</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input className="input" type="number" placeholder="点赞" value={form.account_avg_likes} onChange={set('account_avg_likes')} min="0" />
                <div className="text-xs text-gray-400 mt-1 text-center">点赞</div>
              </div>
              <div>
                <input className="input" type="number" placeholder="评论" value={form.account_avg_comments} onChange={set('account_avg_comments')} min="0" />
                <div className="text-xs text-gray-400 mt-1 text-center">评论</div>
              </div>
              <div>
                <input className="input" type="number" placeholder="转发" value={form.account_avg_shares} onChange={set('account_avg_shares')} min="0" />
                <div className="text-xs text-gray-400 mt-1 text-center">转发/收藏</div>
              </div>
            </div>
          </div>

          <div>
            <label className="label">预估花费（元）</label>
            <input className="input" type="number" placeholder="含投流预算" value={form.estimated_cost} onChange={set('estimated_cost')} min="0" />
          </div>

          <div>
            <label className="label">平台同类内容情况（可选，供AI参考）</label>
            <textarea
              className="input h-16 resize-none"
              placeholder="如：在小红书搜索'蓝莓'，前三名内容互动量约2k-5k，主要是种草测评类..."
              value={form.platform_content_info}
              onChange={set('platform_content_info')}
            />
          </div>

          {materials.length > 0 && (
            <div>
              <label className="label">参考物料（可多选）</label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {materials.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={form.material_ids.includes(m.id)}
                      onChange={() => toggleMaterial(m.id)}
                    />
                    <span>{m.name}</span>
                    <span className="text-gray-400 text-xs">({m.type})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '提交中...' : '提交选题'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TopicsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultProjectId = searchParams.get('project_id') || ''

  const [topics, setTopics] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterProject, setFilterProject] = useState(defaultProjectId)
  const [filterStatus, setFilterStatus] = useState('')

  const STATUSES = ['草稿', '已评估', '执行中', '已完成', '已放弃']

  const fetchTopics = () => {
    const params = {}
    if (filterProject) params.project_id = filterProject
    if (filterStatus) params.status = filterStatus
    topicsApi.list(params).then(setTopics)
  }

  useEffect(() => {
    projectsApi.list().then(setProjects).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTopics() }, [filterProject, filterStatus])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选题工作台</h1>
          <p className="text-gray-500 text-sm mt-0.5">提交传播选题，AI 辅助评估选题质量与 ROI</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />提交选题
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input w-44" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">全部项目</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input w-32" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">全部状态</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="加载中..." />
      ) : topics.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">💡</div>
          <div>暂无选题，点击右上角提交</div>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => {
            const lastEval = t.evaluations?.[t.evaluations.length - 1]
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/topics/${t.id}`)}
                className="card p-4 w-full text-left hover:shadow-md hover:border-sky-200 transition-all group flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <TopicStatusBadge status={t.status} />
                    <span className="text-xs text-gray-500">{t.channel}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{t.account_type}</span>
                    {lastEval && <AlignmentBadge score={lastEval.alignment_score} />}
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{t.direction}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>预估 ¥{t.estimated_cost?.toLocaleString()}</span>
                    {lastEval?.cpm_prediction_min && (
                      <span>预测 CPM ¥{lastEval.cpm_prediction_min}–{lastEval.cpm_prediction_max}</span>
                    )}
                    <span>by {t.creator?.display_name || t.creator?.username}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-500 transition-colors mt-1 shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {showModal && (
        <TopicFormModal
          projects={projects}
          defaultProjectId={filterProject}
          onClose={() => setShowModal(false)}
          onCreated={(t) => { setTopics((ts) => [t, ...ts]); setShowModal(false) }}
        />
      )}
    </div>
  )
}
