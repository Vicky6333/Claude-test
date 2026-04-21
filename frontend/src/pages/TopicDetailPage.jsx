import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { topicsApi } from '../api/topics'
import { submissionsApi } from '../api/submissions'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TopicStatusBadge, AlignmentBadge, CpmStatusBadge } from '../components/StatusBadge'

const STATUS_OPTIONS = ['草稿', '已评估', '执行中', '已完成', '已放弃']

function EvalSection({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!content) return null
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</div>}
    </div>
  )
}

function SubmissionFormModal({ topicId, onClose, onCreated }) {
  const [form, setForm] = useState({
    topic_id: topicId,
    content_link: '', account_name: '', account_type: '',
    impressions: '', interactions: '', actual_cost: '',
    comment_self_review: '',
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
        impressions: parseInt(form.impressions) || 0,
        interactions: parseInt(form.interactions) || 0,
        actual_cost: parseFloat(form.actual_cost) || 0,
      }
      const sub = await submissionsApi.create(data)
      onCreated(sub)
    } catch (err) {
      setError(typeof err === 'string' ? err : '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">提交传播成果</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">传播链接 *</label>
            <input className="input" type="url" placeholder="发布内容的平台链接" value={form.content_link} onChange={set('content_link')} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">账号名称</label>
              <input className="input" placeholder="账号昵称" value={form.account_name} onChange={set('account_name')} />
            </div>
            <div>
              <label className="label">账号类型</label>
              <select className="input" value={form.account_type} onChange={set('account_type')}>
                <option value="">请选择</option>
                {['KOL', 'KOC', '区域媒体官方账号'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">曝光量 *</label>
              <input className="input" type="number" placeholder="总曝光" value={form.impressions} onChange={set('impressions')} required min="0" />
            </div>
            <div>
              <label className="label">互动量 *</label>
              <input className="input" type="number" placeholder="赞+评+藏+转" value={form.interactions} onChange={set('interactions')} required min="0" />
            </div>
            <div>
              <label className="label">实际花费 *</label>
              <input className="input" type="number" placeholder="元" value={form.actual_cost} onChange={set('actual_cost')} required min="0" />
            </div>
          </div>
          <div>
            <label className="label">评论区自评</label>
            <textarea className="input h-20 resize-none" placeholder="评论区质量说明，是否出现品牌心智相关内容..." value={form.comment_self_review} onChange={set('comment_self_review')} />
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '提交中...' : '提交成果'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TopicDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [topic, setTopic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [evalError, setEvalError] = useState('')

  const fetchTopic = () => topicsApi.get(id).then(setTopic)

  useEffect(() => {
    fetchTopic().finally(() => setLoading(false))
  }, [id])

  const handleEvaluate = async () => {
    setEvaluating(true)
    setEvalError('')
    try {
      await topicsApi.evaluate(id)
      await fetchTopic()
    } catch (err) {
      setEvalError(typeof err === 'string' ? err : 'AI评估失败，请重试')
    } finally {
      setEvaluating(false)
    }
  }

  const handleStatusChange = async (status) => {
    const updated = await topicsApi.update(id, { status })
    setTopic((t) => ({ ...t, status }))
  }

  if (loading) return <LoadingSpinner text="加载选题..." />
  if (!topic) return <div className="p-6 text-gray-500">选题不存在</div>

  const lastEval = topic.evaluations?.[topic.evaluations.length - 1]
  const latestSub = topic.submissions?.[topic.submissions?.length - 1]

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/topics')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ChevronLeft size={16} />返回选题列表
      </button>

      {/* Header */}
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TopicStatusBadge status={topic.status} />
            <span className="text-sm text-gray-600">{topic.channel}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-600">{topic.account_type}</span>
          </div>
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1"
            value={topic.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <p className="text-gray-800 leading-relaxed mb-4">{topic.direction}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">预估花费</div>
            <div className="font-semibold">¥{topic.estimated_cost?.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">均值点赞</div>
            <div className="font-semibold">{topic.account_avg_likes?.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">均值评论</div>
            <div className="font-semibold">{topic.account_avg_comments?.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">均值转发</div>
            <div className="font-semibold">{topic.account_avg_shares?.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* AI Evaluation */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Sparkles size={18} className="text-sky-500" />
            AI 选题评估
          </h2>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="btn-primary text-xs"
          >
            <Sparkles size={13} />
            {evaluating ? '评估中...' : lastEval ? '重新评估' : '立即评估'}
          </button>
        </div>

        {evalError && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-3">{evalError}</div>}

        {evaluating && <LoadingSpinner text="AI 正在分析选题，请稍候..." />}

        {!evaluating && lastEval && (
          <div className="space-y-3">
            {/* Summary row */}
            <div className="flex items-center gap-3 flex-wrap">
              <AlignmentBadge score={lastEval.alignment_score} />
              {lastEval.cpm_prediction_min && (
                <span className="text-sm text-gray-600">
                  预测 CPM：<strong>¥{lastEval.cpm_prediction_min}–{lastEval.cpm_prediction_max}</strong>
                </span>
              )}
              {lastEval.min_exposure_for_pass && (
                <span className="text-sm text-gray-600">
                  达标需 <strong>{lastEval.min_exposure_for_pass?.toLocaleString()}</strong> 曝光
                </span>
              )}
            </div>

            {/* ROI note */}
            {lastEval.roi_note && (
              <div className="text-sm bg-blue-50 text-blue-800 px-4 py-3 rounded-lg">{lastEval.roi_note}</div>
            )}

            {/* Suggestions */}
            {lastEval.suggestions?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800 mb-2">优化建议</div>
                <ul className="space-y-1.5">
                  {lastEval.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-green-700 flex gap-2">
                      <span className="shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk */}
            {lastEval.risk_note && (
              <div className="text-sm bg-amber-50 text-amber-800 px-4 py-3 rounded-lg">
                ⚠️ {lastEval.risk_note}
              </div>
            )}

            {/* Collapsible detail sections */}
            <EvalSection title="主线对齐度详情" content={lastEval.alignment_note} defaultOpen />
            <EvalSection title="差异化分析" content={lastEval.differentiation} />
            <EvalSection title="平台内容环境" content={lastEval.platform_environment} />
            <EvalSection title="号段匹配分析" content={lastEval.account_match} />
          </div>
        )}

        {!evaluating && !lastEval && (
          <div className="text-center py-8 text-gray-400 text-sm">
            点击「立即评估」触发 AI 对该选题进行综合分析
          </div>
        )}
      </div>

      {/* Submission */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">传播成果</h2>
          {!latestSub && (
            <button className="btn-primary text-xs" onClick={() => setShowSubmitModal(true)}>
              提交成果
            </button>
          )}
        </div>

        {latestSub ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CpmStatusBadge status={latestSub.cpm_status} />
              {latestSub.cpm && (
                <span className="text-2xl font-bold text-gray-900">CPM ¥{latestSub.cpm?.toFixed(1)}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">曝光量</div>
                <div className="font-semibold">{latestSub.impressions?.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">互动量</div>
                <div className="font-semibold">{latestSub.interactions?.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">实际花费</div>
                <div className="font-semibold">¥{latestSub.actual_cost?.toLocaleString()}</div>
              </div>
            </div>
            {latestSub.content_link && (
              <a href={latestSub.content_link} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline">
                查看发布内容链接 →
              </a>
            )}
            {latestSub.acceptance && (
              <div className={`rounded-lg p-4 ${latestSub.acceptance.conclusion === '通过' ? 'bg-green-50' : latestSub.acceptance.conclusion === '部分通过' ? 'bg-amber-50' : 'bg-red-50'}`}>
                <div className="font-medium text-sm mb-1">
                  验收结论：{latestSub.acceptance.conclusion}
                </div>
                {latestSub.acceptance.approved_amount && (
                  <div className="text-sm">认定报销：¥{latestSub.acceptance.approved_amount?.toLocaleString()}</div>
                )}
                {latestSub.acceptance.notes && (
                  <div className="text-sm text-gray-600 mt-1">{latestSub.acceptance.notes}</div>
                )}
              </div>
            )}
            {!latestSub.acceptance && (
              <Link to={`/submissions?topic_id=${topic.id}`} className="text-sm text-sky-600 hover:underline">
                前往验收复盘 →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            传播完成后提交成果，系统自动计算 CPM
          </div>
        )}
      </div>

      {showSubmitModal && (
        <SubmissionFormModal
          topicId={topic.id}
          onClose={() => setShowSubmitModal(false)}
          onCreated={() => { fetchTopic(); setShowSubmitModal(false) }}
        />
      )}
    </div>
  )
}
