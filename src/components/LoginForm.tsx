'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const e = email.trim()
    if (!e || !password) { setError('Please enter email and password.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email: e, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/instructor')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="email"
        className="w-full rounded-lg px-4 py-3 text-sm"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        autoFocus
      />
      <input
        type="password"
        className="w-full rounded-lg px-4 py-3 text-sm"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />
      {error && (
        <p className="text-xs" style={{ color: '#dc2626' }}>
          {error}
        </p>
      )}
      <button
        className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-1"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign In →'}
      </button>
    </div>
  )
}
