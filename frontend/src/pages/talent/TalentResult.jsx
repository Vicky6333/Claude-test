import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import {
  Sparkles, Compass, HeartHandshake, Rocket, DoorOpen,
  Link2, Download, RotateCcw, Check, Loader2,
} from 'lucide-react'
import { talentApi } from '../../api/talent'

export default function TalentResult() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [report, setReport] = useState(location.state?.report || null)
  const [loading, setLoading] = useState(!location.state?.report)
  const [error, setError] = useState('')

  useEffect(() => {
    if (report) return
    let active = true
    talentApi
      .get(id)
      .then((r) => active && setReport(r))
      .catch((e) => active && setError(typeof e === 'string' ? e : '报告不存在或已过期'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <div className="talent-card text-center py-16">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-600">正在打开你的天赋报告…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="talent-card text-center py-16">
        <p className="text-gray-700">{error || '没有找到这份报告'}</p>
        <button onClick={() => navigate('/talent')} className="talent-cta mt-6">
          回到首页重新探测
        </button>
      </div>
    )
  }

  const result = report.result || {}
  const themes = result.talent_themes || []
  const tracks = result.career_tracks || []
  const narrative = result.odyssey_narrative || ''
  const card = result.share_card || {}
  const name = report.nickname || ''

  return (
    <div className="space-y-8">
      <header className="text-center pt-2">
        <span className="talent-chip mb-3">{name ? `${name} 的天赋报告` : '你的天赋报告'}</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
          {card.headline || '你身上，藏着一条独特的天赋线索'}
        </h1>
      </header>

      {result._degraded && (
        <div className="text-amber-700 text-sm bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl text-center">
          这次没能完整连上 AI，先给你一份简版结果。稍后可以再生成一次完整报告。
        </div>
      )}

      {/* 1 · 核心天赋主题画像 */}
      <section className="talent-card">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="section-title">你的核心天赋</h2>
        </div>
        <div className="space-y-5">
          {themes.map((t, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-900">{t.name}</span>
                <span className="text-sm text-violet-500 font-medium">{t.strength ?? ''}{t.strength != null && '%'}</span>
              </div>
              {t.strength != null && (
                <div className="mt-1.5 h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-violet-500 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, t.strength))}%` }}
                  />
                </div>
              )}
              {t.one_liner && <p className="mt-2 text-sm text-gray-700">{t.one_liner}</p>}
              {Array.isArray(t.evidence) && t.evidence.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {t.evidence.map((ev, j) => (
                    <li key={j} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-violet-300">·</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2 · AI 时代职业赛道 */}
      <section className="talent-card">
        <div className="flex items-center gap-2 mb-5">
          <Compass className="h-5 w-5 text-violet-500" />
          <h2 className="section-title">AI 时代，适合你的赛道</h2>
        </div>
        <div className="space-y-4">
          {tracks.map((c, i) => (
            <div key={i} className="rounded-2xl border border-violet-100 bg-white/60 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900 text-lg">{c.title}</h3>
                {c.fit != null && (
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-violet-600 leading-none">{c.fit}%</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">契合度</div>
                  </div>
                )}
              </div>
              {c.why && <p className="mt-2 text-sm text-gray-700">{c.why}</p>}
              {c.ai_era_angle && (
                <div className="mt-3 text-sm text-violet-800 bg-violet-50 rounded-xl px-3 py-2 flex gap-2">
                  <Rocket className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{c.ai_era_angle}</span>
                </div>
              )}
              {Array.isArray(c.first_steps) && c.first_steps.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">现在可以做的第一步</div>
                  <ul className="space-y-1">
                    {c.first_steps.map((s, j) => (
                      <li key={j} className="text-sm text-gray-700 flex gap-1.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(c.exits) && c.exits.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <DoorOpen className="h-3.5 w-3.5" /> 一个低门槛的出口
                  </div>
                  <ul className="space-y-1">
                    {c.exits.map((s, j) => (
                      <li key={j} className="text-sm text-gray-600 flex gap-1.5">
                        <span className="text-violet-300">·</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3 · 奥德赛情绪陪伴叙事 */}
      {narrative && (
        <section className="talent-card bg-gradient-to-br from-violet-50/80 to-rose-50/80">
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="h-5 w-5 text-rose-400" />
            <h2 className="section-title">想对此刻的你说</h2>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{narrative}</p>
        </section>
      )}

      {/* 4 · 可分享结果卡片 */}
      <ShareCard card={card} name={name} />

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button onClick={() => navigate('/talent/test')} className="talent-ghost">
          <RotateCcw className="h-4 w-4" /> 重新测一次
        </button>
      </div>
    </div>
  )
}

function ShareCard({ card, name }) {
  const cardRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const topTalents = card.top_talents || []

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const savePng = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = '我的天赋探测报告.png'
      link.href = dataUrl
      link.click()
    } catch {
      // 忽略导出失败，用户仍可截图
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="h-5 w-5 text-violet-500" />
        <h2 className="section-title">把这份天赋，分享出去</h2>
      </div>

      {/* 用纯色渐变（非 backdrop-blur）以保证导出 PNG 干净 */}
      <div
        ref={cardRef}
        className="rounded-3xl p-7 text-white bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 shadow-xl"
      >
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Sparkles className="h-4 w-4" /> 天赋探测仪
        </div>
        <h3 className="mt-4 text-2xl font-bold leading-snug">
          {card.headline || '我找到了属于自己的天赋线索'}
        </h3>
        {card.signature_track && (
          <p className="mt-3 text-white/90">
            我的主赛道：<span className="font-semibold">{card.signature_track}</span>
          </p>
        )}
        {topTalents.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {topTalents.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-sm bg-white/20 backdrop-blur-sm">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-white/20 text-sm text-white/70">
          {name ? `${name} · ` : ''}陪你走过奥德赛时期 · 找到你的赛道
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        <button onClick={copyLink} className="talent-ghost">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
          {copied ? '链接已复制' : '复制分享链接'}
        </button>
        <button onClick={savePng} className="talent-ghost" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {saving ? '生成中…' : '保存图片'}
        </button>
      </div>
    </section>
  )
}
