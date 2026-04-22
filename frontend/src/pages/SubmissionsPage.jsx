import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Sparkles, ExternalLink, CheckCircle } from 'lucide-react'
import { submissionsApi } from '../api/submissions'
import { topicsApi } from '../api/topics'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CpmStatusBadge, ConclusionBadge, GradeBadge } from '../components/StatusBadge'

function AcceptancePanel({ submission, onAccepted }) {
  const [form, setForm] = useState({
    conclusion: '通过',
    approved_impressions: submission.impressions || '',
    approved_amount: submission.actual_cost || '',
    notes: '',
  })
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleAIEval = async () => {
    setAiLoading(true)
    try {
      const result = await submissionsApi.aiEvaluate(submission.id)
      setAiResult(result)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'AI评估失败')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        approved_impressions: parseInt(form.approved_impressions) || null,
        approved_amount: parseFloat(form.approved_amount) || null,
      }
      if (aiResult) {
        data.ai_evaluation_result = aiResult
      }
      const existing = submission.acceptance
      const record = existing
        ? await submissionsApi.updateAcceptance(submission.id, data)
        : await submissionsApi.accept(submission.id, data)
      onAccepted(record)
    } catch (err) {
      setError(typeof err === 'string' ? err : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      {/* AI acceptance eval */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">AI 辅助验收评估</span>
          <button onClick={handleAIEval} disabled={aiLoading} className="btn-secondary text-xs">
            <Sparkles size={13} />
            {aiLoading ? '评估中...' : '触发AI评估'}
          </button>
        </div>
        {aiLoading && <LoadingSpinner size="sm" text="AI 正在分析传播效果..." />}
        {aiResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GradeBadge grade={aiResult.overall_grade} />
              <span className="text-sm text-gray-700">{aiResult.grade_reason}</span>
            </div>
            {aiResult.mind_penetration && (
              <div className="text-xs text-gray-600 bg-white rounded p-3 border">
                <strong>心智渗透：</strong>{aiResult.mind_penetration}
              </div>
            )}
            {aiResult.performance_vs_baseline && (
              <div className="text-xs text-gray-600 bg-white rounded p-3 border">
                <strong>与均值对比：</strong>{aiResult.performance_vs_baseline}
              </div>
            )}
            {aiResult.suggestions?.length > 0 && (
              <div className="text-xs text-green-700 bg-green-50 rounded p-3">
                <strong>改进建议：</strong>
                <ul className="mt-1 space-y-1">
                  {aiResult.suggestions.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acceptance form */}
      <div className="space-y-3">
        <div>
          <label className="label">验收结论</label>
          <div className="flex gap-2">
            {['通过', '部分通过', '不通过'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, conclusion: c }))}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  form.conclusion === c
                    ? c === '通过' ? 'bg-green-600 text-white border-green-600'
                      : c === '部分通过' ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >{c}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">认定曝光量</label>
            <input className="input" type="number" value={form.approved_impressions} onChange={set('approved_impressions')} />
          </div>
          <div>
            <label className="label">认定报销金额（元）</label>
            <input className="input" type="number" value={form.approved_amount} onChange={set('approved_amount')} />
          </div>
        </div>
        <div>
          <label className="label">备注</label>
          <textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} placeholder="特殊情况说明..." />
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
          <CheckCircle size={15} />
          {saving ? '保存中...' : '保存验收结论'}
        </button>
      </div>
    </div>
  )
}

function SubmissionCard({ submission, isHQ, onAccepted }) {
  const [showAccept, setShowAccept] = useState(false)
  const hasAcceptance = !!submission.acceptance

  return (
    <div className="card p-5">
      {/* CPM highlight */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl font-bold text-gray-900">
          {submission.cpm ? `¥${submission.cpm.toFixed(1)}` : '—'}
        </div>
        <div>
          <CpmStatusBadge status={submission.cpm_status} />
          <div className="text-xs text-gray-400 mt-0.5">CPM</div>
        </div>
        {hasAcceptance && (
          <div className="ml-auto">
            <ConclusionBadge conclusion={submission.acceptance.conclusion} />
          </div>
        )}
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-0.5">曝光量</div>
          <div className="font-semibold">{submission.impressions?.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-0.5">互动量</div>
          <div className="font-semibold">{submission.interactions?.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-0.5">实际花费</div>
          <div className="font-semibold">¥{submission.actual_cost?.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
        {submission.account_name && <span>{submission.account_name}</span>}
        {submission.account_type && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{submission.account_type}</span>}
        <a href={submission.content_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 hover:text-sky-700 ml-auto">
          <ExternalLink size={13} />查看内容
        </a>
      </div>

      {submission.comment_self_review && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
          <span className="font-medium text-gray-700">评论区自评：</span>{submission.comment_self_review}
        </div>
      )}

      {/* Acceptance result summary */}
      {hasAcceptance && (
        <div className={`rounded-lg p-3 text-sm mb-3 ${
          submission.acceptance.conclusion === '通过' ? 'bg-green-50 text-green-800'
          : submission.acceptance.conclusion === '部分通过' ? 'bg-amber-50 text-amber-800'
          : 'bg-red-50 text-red-800'
        }`}>
          <strong>验收结论：{submission.acceptance.conclusion}</strong>
          {submission.acceptance.approved_amount && ` · 认定报销 ¥${submission.acceptance.approved_amount?.toLocaleString()}`}
          {submission.acceptance.notes && <div className="mt-1 text-xs">{submission.acceptance.notes}</div>}
        </div>
      )}

      {/* AI acceptance result if stored */}
      {hasAcceptance && submission.acceptance.ai_evaluation_result && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <GradeBadge grade={submission.acceptance.ai_evaluation_result.overall_grade} />
          <span>{submission.acceptance.ai_evaluation_result.grade_reason}</span>
        </div>
      )}

      {isHQ && (
        <button
          onClick={() => setShowAccept(!showAccept)}
          className={`text-sm font-medium ${showAccept ? 'text-gray-500' : 'text-sky-600 hover:text-sky-700'}`}
        >
          {showAccept ? '收起' : hasAcceptance ? '修改验收结论' : '进行验收'}
        </button>
      )}

      {isHQ && showAccept && (
        <AcceptancePanel
          submission={submission}
          onAccepted={(record) => {
            setShowAccept(false)
            onAccepted(record)
          }}
        />
      )}
    </div>
  )
}

export default function SubmissionsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const topicIdParam = searchParams.get('topic_id')

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSubmissions = () => {
    const params = topicIdParam ? { topic_id: topicIdParam } : {}
    submissionsApi.list(params).then(setSubmissions).finally(() => setLoading(false))
  }

  useEffect(() => { fetchSubmissions() }, [topicIdParam])

  const handleAccepted = (subId) => (record) => {
    setSubmissions((subs) =>
      subs.map((s) => s.id === subId ? { ...s, acceptance: record } : s)
    )
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">验收复盘</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {user?.role === 'headquarters' ? '审核传播成果，AI 辅助验收评估' : '查看传播成果与验收结论'}
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="加载中..." />
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <div>暂无待验收的传播成果</div>
          <div className="text-sm mt-2 text-gray-400">
            {user?.role === 'headquarters' ? '等待区域提交执行成果后，在此进行验收评估' : '执行完成后，在选题工作台的选题详情中提交成果'}
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              isHQ={user?.role === 'headquarters'}
              onAccepted={handleAccepted(sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
