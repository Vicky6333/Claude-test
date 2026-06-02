import { useNavigate } from 'react-router-dom'
import { Sparkles, Compass, HeartHandshake, Wand2 } from 'lucide-react'

const FEATURES = [
  {
    icon: Compass,
    title: '找回你的赛道',
    desc: '从小时候最擅长的 20 件事里，反推出你天生的天赋线索。',
  },
  {
    icon: Wand2,
    title: 'AI 时代不慌',
    desc: '把天赋对应到 AI 时代有潜力的职业方向，与 AI 协作放大，而不是被取代。',
  },
  {
    icon: HeartHandshake,
    title: '被接住的出口',
    desc: '哪怕暂时迷茫，也给你温暖的回应和可以立刻迈出的一小步。',
  },
]

export default function TalentLanding() {
  const navigate = useNavigate()

  return (
    <div className="space-y-10">
      <section className="text-center pt-6">
        <span className="talent-chip mb-4">献给正在「奥德赛时期」的你</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          探索、漂泊、迷茫，<br className="sm:hidden" />都不是你出了问题
        </h1>
        <p className="mt-4 text-gray-600 max-w-xl mx-auto leading-relaxed">
          填下你小时候最擅长的事，让 AI 帮你看见藏在背后的天赋，
          对应到这个时代真正适合你的赛道——以及，一个温柔的出口。
        </p>
        <button onClick={() => navigate('/talent/test')} className="talent-cta mt-8">
          <Sparkles className="h-5 w-5" />
          开始探测我的天赋
        </button>
        <p className="mt-3 text-xs text-violet-400">免登录 · 约 5 分钟 · 结果可分享</p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="talent-card">
            <f.icon className="h-7 w-7 text-violet-500" />
            <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
