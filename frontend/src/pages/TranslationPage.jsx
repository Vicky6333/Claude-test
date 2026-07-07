import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Loader, Play, Square } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { client } from '../api/client'

const ALLOWED_TYPES = ['.epub', '.fb2', '.txt']

export function TranslationPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [deepseekKey, setDeepseekKey] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const fileInputRef = useRef(null)

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await client.get('/api/translations')
      setTasks(response.data.tasks || [])
    } catch (err) {
      setError(err.response?.data?.detail || '获取任务失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // 每5秒刷新一次，检查进度
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`不支持的文件类型。支持: ${ALLOWED_TYPES.join(', ')}`)
      return
    }

    setUploadFile(file)
    setError('')
  }

  // 上传文件
  const handleUpload = async () => {
    if (!uploadFile) {
      setError('请选择文件')
      return
    }

    if (!deepseekKey) {
      setShowKeyModal(true)
      return
    }

    const formData = new FormData()
    formData.append('file', uploadFile)

    try {
      setUploading(true)
      setError('')
      const response = await client.post('/api/translations/upload', formData)
      setTasks([response.data, ...tasks])
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.detail || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  // 启动翻译
  const handleStartTranslation = async (taskId) => {
    if (!deepseekKey) {
      setShowKeyModal(true)
      setSelectedTask(taskId)
      return
    }

    try {
      setError('')
      await client.post(`/api/translations/${taskId}/start`, {
        deepseek_api_key: deepseekKey
      })
      // 立即刷新任务列表
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.detail || '启动翻译失败')
    }
  }

  // 停止翻译
  const handleStopTranslation = async (taskId) => {
    try {
      setError('')
      await client.post(`/api/translations/${taskId}/stop`)
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.detail || '停止翻译失败')
    }
  }

  // 下载文件
  const handleDownload = async (taskId, filename) => {
    try {
      const response = await client.get(`/api/translations/${taskId}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `translated_${filename}`)
      document.body.appendChild(link)
      link.click()
      link.parentElement.removeChild(link)
    } catch (err) {
      setError(err.response?.data?.detail || '下载失败')
    }
  }

  // 删除任务
  const handleDelete = async (taskId) => {
    if (!window.confirm('确定要删除该任务吗？')) return

    try {
      setError('')
      await client.delete(`/api/translations/${taskId}`)
      setTasks(tasks.filter(t => t.task_id !== taskId))
    } catch (err) {
      setError(err.response?.data?.detail || '删除失败')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'text-gray-500',
      'processing': 'text-blue-500',
      'completed': 'text-green-500',
      'failed': 'text-red-500',
      'stopped': 'text-yellow-500'
    }
    return colors[status] || 'text-gray-500'
  }

  const getStatusText = (status) => {
    const text = {
      'pending': '待处理',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败',
      'stopped': '已停止'
    }
    return text[status] || status
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* 密钥输入模态框 */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">输入 DeepSeek API 密钥</h3>
            <input
              type="password"
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowKeyModal(false)
                  if (selectedTask) handleStartTranslation(selectedTask)
                  setSelectedTask(null)
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                确认
              </button>
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">📚 外文原著翻译</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 上传区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">上传文件</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              支持格式: EPUB, FB2, TXT
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".epub,.fb2,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block mb-4"
            >
              选择文件
            </button>
            {uploadFile && (
              <p className="text-gray-700">
                已选择: <strong>{uploadFile.name}</strong>
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                上传文件
              </>
            )}
          </button>
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">翻译任务</h2>

          {loading && !tasks.length ? (
            <LoadingSpinner />
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无任务</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {task.filename}
                      </h3>
                      <p className={`text-sm ${getStatusColor(task.status)} font-semibold`}>
                        {getStatusText(task.status)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(task.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>

                  {/* 进度条 */}
                  {task.status === 'processing' && (
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      {task.current_step && (
                        <p className="text-sm text-gray-600 mt-2">
                          当前步骤: {task.current_step}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 错误消息 */}
                  {task.error_message && (
                    <div className="mb-4 text-sm text-red-600">
                      错误: {task.error_message}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 flex-wrap">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStartTranslation(task.task_id)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4" />
                        开始翻译
                      </button>
                    )}

                    {task.status === 'processing' && (
                      <button
                        onClick={() => handleStopTranslation(task.task_id)}
                        className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                      >
                        <Square className="w-4 h-4" />
                        停止
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(task.task_id, task.filename)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <Download className="w-4 h-4" />
                        下载
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(task.task_id)}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
