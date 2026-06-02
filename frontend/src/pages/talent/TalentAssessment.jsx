import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Sparkles, Loader2 } from 'lucide-react'
import { talentApi } from '../../api/talent'

const INITIAL_ROWS = 10
const MAX_ROWS = 20
const MIN_FILLED = 5

const REFLECTIONS = [
  { key: 'flow', label: '做什么事会让你忘记时间？', placeholder: '那种一抬头几个小时就过去了的状态…' },
  { key: 'asked_for', label: '身边的人，常常找你帮什么忙？', placeholder: '别人默认「这事找你准没错」的那类事…' },
  { key: 'proud_moment', label: '至今想起来仍有成就感的高光时刻？', placeholder: '不一定是大事，是你打心底为自己骄傲的瞬间…' },
]

export default function TalentAssessment() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [skills, setSkills] = useState(Array(INITIAL_ROWS).fill(''))
  const [reflections, setReflections] = useState({ flow: '', asked_for: '', proud_moment: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filledCount = skills.filter((s) => s.trim()).length

  const setSkill = (i) => (e) =>
    setSkills((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))
  const addRow = () => setSkills((arr) => (arr.length < MAX_ROWS ? [...arr, ''] : arr))
  const removeRow = (i) => setSkills((arr) => arr.filter((_, idx) => idx !== i))
  const setReflection = (k) => (e) => setReflections((r) => ({ ...r, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const childhood_skills = skills.map((s) => s.trim()).filter(Boolean)
    if (childhood_skills.length < MIN_FILLED) {
      setError(`再多回想几件吧～至少填 ${MIN_FILLED} 件，天赋画像会更准`)
      return
    }
    setError('')
    setLoading(true)
    try {
      const report = await talentApi.create({
        nickname: nickname.trim() || null,
        childhood_skills,
        reflections,
      })
      navigate(`/talent/r/${report.id}`, { state: { report } })
    } catch (err) {
      setLoading(false)
      setError(typeof err === 'string' ? err : '生成失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <div className="talent-card text-center py-16">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mx-auto" />
        <h2 className="mt-5 text-xl font-semibold text-gray-900">正在读懂你…</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
          AI 正在从你填写的经历里，提炼那条贯穿始终的天赋线索，并为你寻找属于这个时代的赛道。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">写下你小时候最擅长的事</h1>
        <p className="mt-2 text-sm text-gray-600">
          不用是「成就」，只要是你做起来比别人轻松、又乐在其中的事。越具体越好。
        </p>
      </div>

      <div className="talent-card">
        <label className="label">你的昵称（可选，会出现在结果卡片上）</label>
        <input
          className="talent-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="怎么称呼你？"
          maxLength={20}
        />
      </div>

      <div className="talent-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">小时候最擅长的事</h2>
          <span className="text-xs text-violet-500">已填 {filledCount} / 建议 {MAX_ROWS}</span>
        </div>
        {skills.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-sm text-violet-400">{i + 1}</span>
            <input
              className="talent-input"
              value={value}
              onChange={setSkill(i)}
              placeholder="例：编故事讲给同学听 / 把房间收拾得井井有条 / 修好坏掉的玩具…"
            />
            {skills.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="shrink-0 text-gray-300 hover:text-rose-400 transition-colors"
                aria-label="删除这一项"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {skills.length < MAX_ROWS && (
          <button type="button" onClick={addRow} className="talent-ghost">
            <Plus className="h-4 w-4" />
            再加一项
          </button>
        )}
      </div>

      <div className="talent-card space-y-5">
        <h2 className="font-semibold text-gray-900">再聊几句（可选，但会让画像更准）</h2>
        {REFLECTIONS.map((r) => (
          <div key={r.key}>
            <label className="label">{r.label}</label>
            <textarea
              className="talent-input min-h-[72px] resize-y"
              value={reflections[r.key]}
              onChange={setReflection(r.key)}
              placeholder={r.placeholder}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="text-rose-600 text-sm bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl text-center">
          {error}
        </div>
      )}

      <div className="text-center">
        <button type="submit" className="talent-cta">
          <Sparkles className="h-5 w-5" />
          生成我的天赋报告
        </button>
      </div>
    </form>
  )
}
