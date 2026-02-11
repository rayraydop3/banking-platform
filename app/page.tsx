'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [showMfaInput, setShowMfaInput] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isLogin 
        ? '/api/auth/login' 
        : '/api/auth/register'
      
      const body = isLogin
        ? { email: form.email, password: form.password }
        : form

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '操作失败')
        return
      }

      // 需要MFA验证
      if (data.needsMfa) {
        setTempToken(data.tempToken)
        setShowMfaInput(true)
        setError('')
        return
      }

      // 保存token到localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // 跳转到dashboard
      router.push('/dashboard')

    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: mfaCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '验证码错误')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            🏦 Banking Platform
          </h1>
          <p className="text-gray-400 mt-2">
            Digital Banking for Everyone
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          {showMfaInput ? (
            /* MFA 验证表单 */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">双重验证</h2>
                <p className="text-gray-400 text-sm mt-1">
                  请输入 Google Authenticator 中的 6 位验证码
                </p>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">验证码</label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {loading ? '验证中...' : '验证'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaInput(false)
                    setTempToken('')
                    setMfaCode('')
                    setError('')
                  }}
                  className="w-full text-gray-400 hover:text-white text-sm py-2"
                >
                  返回重新登录
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tab切换 */}
              <div className="flex bg-gray-700 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    isLogin 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  登录
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    !isLogin 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  注册
                </button>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              {/* 表单 */}
              <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  姓名
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="text-gray-400 text-sm mb-1 block">
                邮箱
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">
                密码
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}