import clsx from 'clsx'

const TOPIC_STATUS = {
  草稿: 'bg-gray-100 text-gray-600',
  已评估: 'bg-blue-100 text-blue-700',
  执行中: 'bg-amber-100 text-amber-700',
  已完成: 'bg-green-100 text-green-700',
  已放弃: 'bg-red-100 text-red-600',
}

const CPM_STATUS = {
  pass: 'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-700',
  fail: 'bg-red-100 text-red-600',
  pending: 'bg-gray-100 text-gray-600',
}

const CPM_LABEL = {
  pass: '✅ 达标',
  warn: '⚠️ 临界',
  fail: '❌ 未达标',
  pending: '待提交',
}

const ALIGNMENT = {
  高: 'bg-green-100 text-green-700',
  中: 'bg-amber-100 text-amber-700',
  低: 'bg-red-100 text-red-600',
}

const CONCLUSION = {
  通过: 'bg-green-100 text-green-700',
  部分通过: 'bg-amber-100 text-amber-700',
  不通过: 'bg-red-100 text-red-600',
}

const GRADE = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-red-100 text-red-600',
}

export function TopicStatusBadge({ status }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', TOPIC_STATUS[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

export function CpmStatusBadge({ status }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', CPM_STATUS[status] || 'bg-gray-100 text-gray-600')}>
      {CPM_LABEL[status] || status}
    </span>
  )
}

export function AlignmentBadge({ score }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', ALIGNMENT[score] || 'bg-gray-100 text-gray-600')}>
      对齐度：{score}
    </span>
  )
}

export function ConclusionBadge({ conclusion }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', CONCLUSION[conclusion] || 'bg-gray-100 text-gray-600')}>
      {conclusion}
    </span>
  )
}

export function GradeBadge({ grade }) {
  return (
    <span className={clsx('inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold', GRADE[grade] || 'bg-gray-100 text-gray-600')}>
      {grade}
    </span>
  )
}
