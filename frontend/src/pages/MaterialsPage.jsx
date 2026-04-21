import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ExternalLink, Search, Trash2 } from 'lucide-react'
import { materialsApi } from '../api/materials'
import { projectsApi } from '../api/projects'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

const TYPES = ['传播策略文档', '通讯长文', '官方图文', '图片素材', '视频素材', '参考案例']
const CHANNELS = ['小红书', '视频号', '微信图文', '都市媒体']

const TYPE_ICON = {
  '传播策略文档': '📋', '通讯长文': '📝', '官方图文': '🖼️',
  '图片素材': '📷', '视频素材': '🎬', '参考案例': '⭐',
}

function MaterialFormModal({ projectId, projects, onClose, onCreated }) {
  const [form, setForm] = useState({
    project_id: projectId || (projects[0]?.id || ''),
    type: TYPES[0], name: '', description: '',
    channels: [], link: '', usage_note: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleChannel = (ch) =>
    setForm((f) => ({
      ...f, channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const m = await materialsApi.create(form)
      onCreated(m)
    } catch (err) {
      setError(typeof err === 'string' ? err : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">添加物料</h2>
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
              <label className="label">物料类型 *</label>
              <select className="input" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">物料名称 *</label>
              <input className="input" value={form.name} onChange={set('name')} required placeholder="简短的物料名称" />
            </div>
          </div>

          <div>
            <label className="label">简介（100字以内）</label>
            <textarea className="input h-16 resize-none" value={form.description} onChange={set('description')} maxLength={100} />
          </div>

          <div>
            <label className="label">适用渠道</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CHANNELS.map((ch) => (
                <button
                  type="button" key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.channels.includes(ch)
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400'
                  }`}
                >{ch}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">跳转链接 *</label>
            <input className="input" type="url" value={form.link} onChange={set('link')} required placeholder="https://..." />
          </div>

          <div>
            <label className="label">使用提示（可选）</label>
            <textarea className="input h-16 resize-none" value={form.usage_note} onChange={set('usage_note')} placeholder="如：请勿直接转发，请摘取后结合区域特色二次创作" />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '添加中...' : '添加物料'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MaterialsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initProjectId = searchParams.get('project_id') || ''

  const [materials, setMaterials] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterProject, setFilterProject] = useState(initProjectId)
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')

  const fetchMaterials = () => {
    const params = {}
    if (filterProject) params.project_id = filterProject
    if (filterType) params.type = filterType
    if (search) params.q = search
    materialsApi.list(params).then(setMaterials)
  }

  useEffect(() => {
    projectsApi.list().then(setProjects).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchMaterials() }, [filterProject, filterType, search])

  const handleDelete = async (id) => {
    if (!confirm('确认删除该物料？')) return
    await materialsApi.delete(id)
    setMaterials((ms) => ms.filter((m) => m.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">物料中心</h1>
          <p className="text-gray-500 text-sm mt-0.5">查阅总部传播物料，点击链接访问云盘</p>
        </div>
        {user?.role === 'headquarters' && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />添加物料
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8 w-48"
            placeholder="搜索物料..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-40" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">全部项目</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input w-40" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">全部类型</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="加载中..." />
      ) : materials.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <div>暂无物料{user?.role === 'headquarters' ? '，点击右上角添加' : ''}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {materials.map((m) => (
            <div key={m.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_ICON[m.type] || '📄'}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.type}</span>
                </div>
                {user?.role === 'headquarters' && (
                  <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{m.name}</h3>
              {m.description && <p className="text-sm text-gray-500 mb-3 flex-1">{m.description}</p>}

              {m.channels?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {m.channels.map((ch) => (
                    <span key={ch} className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded">{ch}</span>
                  ))}
                </div>
              )}

              {m.usage_note && (
                <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                  💡 {m.usage_note}
                </div>
              )}

              <a
                href={m.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                <ExternalLink size={13} />
                访问物料链接
              </a>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MaterialFormModal
          projectId={filterProject}
          projects={projects}
          onClose={() => setShowModal(false)}
          onCreated={(m) => { setMaterials((ms) => [m, ...ms]); setShowModal(false) }}
        />
      )}
    </div>
  )
}
