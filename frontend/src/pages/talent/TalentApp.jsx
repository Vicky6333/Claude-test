import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import TalentLanding from './TalentLanding'
import TalentAssessment from './TalentAssessment'
import TalentResult from './TalentResult'

export default function TalentApp() {
  return (
    <div className="talent-bg">
      <header className="max-w-3xl mx-auto px-4 pt-6">
        <Link to="/talent" className="inline-flex items-center gap-2 text-violet-700 font-semibold">
          <Sparkles className="h-5 w-5" />
          天赋探测仪
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Routes>
          <Route path="" element={<TalentLanding />} />
          <Route path="test" element={<TalentAssessment />} />
          <Route path="r/:id" element={<TalentResult />} />
          <Route path="*" element={<Navigate to="/talent" replace />} />
        </Routes>
      </main>
      <footer className="max-w-3xl mx-auto px-4 pb-10 text-center text-xs text-violet-400">
        天赋探测仪 · 陪你走过奥德赛时期，找到属于你的赛道
      </footer>
    </div>
  )
}
