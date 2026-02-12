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
        setError(data.error || 'Operation failed')
        return
      }

      // MFA verification required
      if (data.needsMfa) {
        setTempToken(data.tempToken)
        setShowMfaInput(true)
        setError('')
        return
      }

      // Save token to localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to dashboard
      router.push('/dashboard')

    } catch {
      setError('Network error, please try again')
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
        setError(data.error || 'Invalid verification code')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-2m0-14V3m-7 8H3m18 0h-2M7.05 7.05L5.636 5.636m12.728 12.728L16.95 16.95M7.05 16.95l-1.414 1.414M18.364 5.636L16.95 7.05" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Banking Platform
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Secure Digital Banking
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          {showMfaInput ? (
            <>
              <div className="mb-6">
                <h2 className="text-base font-medium text-white">Two-Factor Authentication</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Verification Code</label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-[0.3em] font-mono"
                    placeholder="------"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaInput(false)
                    setTempToken('')
                    setMfaCode('')
                    setError('')
                  }}
                  className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="flex border-b border-slate-700 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                    isLogin 
                      ? 'text-white border-blue-500' 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                    !isLogin 
                      ? 'text-white border-blue-500' 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-slate-400 text-sm mb-1.5 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="John Smith"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  )
}
