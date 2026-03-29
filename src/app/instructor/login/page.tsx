import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>
          Econ 177
        </p>
        <h1 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
          Instructor Access
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Sign in with your Supabase account to view bid data.
        </p>
        <LoginForm />
      </div>
    </div>
  )
}
