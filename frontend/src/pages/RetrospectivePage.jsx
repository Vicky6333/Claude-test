import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Radio, TrendingUp, Eye, DollarSign, BarChart2 } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CpmStatusBadge, ConclusionBadge, GradeBadge } from '../components/StatusBadge'

function StatCard({ icon: Icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
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

function MemoryPointHits({ aiEval }) {
  const hits = aiEval?.memory_point_hits
  if (!hits) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hits.mentioned?.map((pt) => (
        <span key={pt} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ {pt}</span>
      ))}
      {hits.not_mentioned?.map((pt) => (
        <span key={pt} className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">○ {pt}</span>
      ))}
    </div>
  )
}

function SubmissionRow({ sub, rank }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b last:border-0 py-4">
      <div className="flex items-start gap-3">
        {/* rank */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
          rank === 1 ? 'bg-amber-400 text-white' : rank === 2 ? 'bg-gray-300 text-gray-700' : rank === 3 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'
        }`}>{rank}</div>

        <div className="flex-1 min-w-0">
          {/* top row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-gray-900 text-sm">{sub.account_name || '未知账号'}</span>
            {sub.account_type && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{sub.account_type}</span>
            )}
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{sub.channel}</span>
            {sub.region && <span className="text-xs text-gray-400">{sub.region}</span>}
            {sub.has_organic_coverage && (
              <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                <Radio size={10} />自来水
              </span>
            )}
          </div>

          {/* metrics */}
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1 text-gray-700 font-medium">
              <Eye size={13} className="text-gray-400" />
              {sub.impressions?.toLocaleString()}
            </span>
            {sub.cpm != null && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600">CPM ¥{sub.cpm.toFixed(1)}</span>
                <CpmStatusBadge status={sub.cpm_status} />
              </>
            )}
            {sub.conclusion && (
              <>
                <span className="text-gray-300">·</span>
                <ConclusionBadge conclusion={sub.conclusion} />
              </>
            )}
            {sub.ai_eval?.overall_grade && (
              <GradeBadge grade={sub.ai_eval.overall_grade} />
            )}
            <a
              href={sub.content_link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sky-500 hover:text-sky-700"
            >
              <ExternalLink size={13} />
            </a>
          </div>

          {/* organic note */}
          {sub.has_organic_coverage && sub.organic_coverage_note && (
            <div className="mt-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg">
              <Radio size={10} className="inline mr-1" />
              {sub.organic_coverage_note}
            </div>
          )}

          {/* expandable detail */}
          {(sub.comment_self_review || sub.ai_eval || sub.comment_screenshot_urls?.length > 0) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-sky-500 hover:text-sky-700"
            >
              {expanded ? '收起详情' : '展开详情'}
            </button>
          )}

          {expanded && (
            <div className="mt-2 space-y-2">
              {sub.comment_self_review && (
                <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                  <span className="font-medium text-gray-700">评论区自评：</span>
                  {sub.comment_self_review}
                </div>
              )}
              {sub.comment_screenshot_urls?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sub.comment_screenshot_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded"
                    >
                      <ExternalLink size={10} />截图 {i + 1}
                    </a>
                  ))}
                </div>
              )}
              {sub.ai_eval && (
                <div className="text-xs text-gray-600 bg-slate-50 rounded px-3 py-2 space-y-1.5">
                  {sub.ai_eval.grade_reason && (
                    <div><span className="font-medium text-gray-700">评级理由：</span>{sub.ai_eval.grade_reason}</div>
                  )}
                  {sub.ai_eval.performance_vs_baseline && (
                    <div><span className="font-medium text-gray-700">与均值对比：</span>{sub.ai_eval.performance_vs_baseline}</div>
                  )}
                  <MemoryPointHits aiEval={sub.ai_eval} />
                  {sub.ai_eval.memory_point_hits?.top10_brand_ratio && (
                    <div className="text-gray-500">前十条评论品牌相关占比：<span className="font-medium text-gray-700">{sub.ai_eval.memory_point_hits.top10_brand_ratio}</span></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RetrospectivePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    projectsApi.getRetrospective(id)
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner text="加载复盘数据..." />
  if (!data) return <div className="p-6 text-gray-500">数据不存在</div>

  const { project, overview, channel_breakdown, submissions } = data
  const organicSubs = submissions.filter((s) => s.has_organic_coverage)

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/projects/${id}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-5"
      >
        <ChevronLeft size={16} />返回项目详情
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">传播复盘</h1>
        <p className="text-sky-600 font-medium mt-0.5">{project.name} · {project.product}</p>
        {project.brand_mind_goal && (
          <p className="text-sm text-gray-500 mt-1">品牌心智目标：{project.brand_mind_goal}</p>
        )}
      </div>

      {/* 整体指标 */}
      <section className="mb-6">
        <h2 className="section-title mb-3">整体指标</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Eye}
            label="总曝光量"
            value={overview.total_impressions > 0 ? `${(overview.total_impressions / 10000).toFixed(1)}万` : '—'}
            sub={overview.total_impressions > 0 ? `${overview.total_impressions.toLocaleString()} 次` : undefined}
            color="sky"
          />
          <StatCard
            icon={TrendingUp}
            label="综合 CPM"
            value={overview.avg_cpm ? `¥${overview.avg_cpm.toFixed(1)}` : '—'}
            sub={`${overview.accepted_count}通过 ${overview.partial_count}部分`}
            color="green"
          />
          <StatCard
            icon={BarChart2}
            label="达标率"
            value={overview.pass_rate != null ? `${overview.pass_rate.toFixed(0)}%` : '—'}
            sub={`共${overview.total_submissions}条成果`}
            color="purple"
          />
          <StatCard
            icon={DollarSign}
            label="总花费"
            value={overview.total_cost > 0 ? `¥${overview.total_cost.toLocaleString()}` : '—'}
            sub={project.budget > 0 ? `预算 ¥${project.budget.toLocaleString()}` : undefined}
            color="amber"
          />
        </div>
      </section>

      {/* 渠道表现 */}
      {channel_breakdown.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">渠道表现</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b bg-gray-50">
                  <th className="px-4 py-2.5 font-medium">渠道</th>
                  <th className="px-4 py-2.5 font-medium text-right">条数</th>
                  <th className="px-4 py-2.5 font-medium text-right">曝光量</th>
                  <th className="px-4 py-2.5 font-medium text-right">均CPM</th>
                  <th className="px-4 py-2.5 font-medium text-right">达标</th>
                </tr>
              </thead>
              <tbody>
                {channel_breakdown.map((ch) => (
                  <tr key={ch.channel} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{ch.channel}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{ch.submissions}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{ch.impressions?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {ch.avg_cpm ? `¥${ch.avg_cpm.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={ch.pass_count === ch.submissions ? 'text-green-600 font-medium' : 'text-amber-600'}>
                        {ch.pass_count}/{ch.submissions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 传播亮点：自来水/有机覆盖 */}
      {organicSubs.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">
            <Radio size={14} className="inline mr-1.5 text-purple-500" />
            传播亮点 · 自来水覆盖
          </h2>
          <div className="space-y-3">
            {organicSubs.map((sub) => (
              <div key={sub.id} className="card p-4 border-l-4 border-purple-400">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium text-gray-900 text-sm">{sub.account_name}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{sub.channel}</span>
                  <span className="text-xs text-gray-400">{sub.region}</span>
                </div>
                <p className="text-sm text-purple-800 bg-purple-50 rounded px-3 py-2">
                  <Radio size={11} className="inline mr-1" />
                  {sub.organic_coverage_note}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 核心记忆点 */}
      {project.key_memory_points?.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">核心记忆点</h2>
          <div className="card p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {project.key_memory_points.map((pt) => (
                <span key={pt} className="text-sm bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-100">{pt}</span>
              ))}
            </div>
            {submissions.some((s) => s.ai_eval?.memory_point_hits) && (
              <div className="text-xs text-gray-500 mt-2">
                以下成果有AI记忆点植入分析（点击各条目展开详情）
              </div>
            )}
          </div>
        </section>
      )}

      {/* 全部传播成果 */}
      {submissions.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">传播成果明细</h2>
          <div className="card p-4">
            {submissions.map((sub, i) => (
              <SubmissionRow key={sub.id} sub={sub} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {submissions.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <div>暂无传播成果数据</div>
        </div>
      )}
    </div>
  )
}
