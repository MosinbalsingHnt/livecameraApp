import { Eye, EyeOff, Loader2, Lock, Mail, MapPinned, Radar, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/services/api/axios'
import { homeFor, useAuthStore } from '@/store/authStore'
import { useLogin } from '../hooks/useAuth'

const FEATURES = [
  { icon: Radar, title: 'AI detection on every route', text: 'Dashcam footage becomes one tracked alert per heap, not one per frame.' },
  { icon: MapPinned, title: 'Live map and hotspots', text: 'See where garbage keeps coming back and send crews to the right ward.' },
  { icon: ShieldCheck, title: 'SLA you can prove', text: 'Cleared work is confirmed by the next camera pass, not just a tick box.' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const bgRef = useRef<HTMLDivElement>(null)

  // subtle parallax: the scene drifts opposite to the cursor (written straight to the DOM, no re-renders)
  const onMove = (e: MouseEvent) => {
    const el = bgRef.current
    if (!el) return
    const x = (e.clientX / window.innerWidth - 0.5) * -36
    const y = (e.clientY / window.innerHeight - 0.5) * -22
    el.style.transform = `translate(${x}px, ${y}px) scale(1.06)`
  }

  if (token && user) return <Navigate to={homeFor(user.role)} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email: email.trim(), password }, { onSuccess: (d) => navigate(homeFor(d.user.role), { replace: true }) })
  }

  const inputCls =
    'h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 text-sm text-white placeholder:text-white/40 transition focus:border-accent focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[#06130d] text-white" onMouseMove={onMove}>
      <div
        ref={bgRef}
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out"
        style={{ backgroundImage: "url('/login-bg.svg')", transform: 'scale(1.06)' }}
      />
      {/* darken left side for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06130d]/90 via-[#06130d]/55 to-[#06130d]/20" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-6 lg:grid-cols-[1.15fr_1fr] lg:px-10 xl:py-10 2xl:max-w-[90rem]">
        <section className="hidden lg:block">
          <div className="mb-10 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/30"><Trash2 className="size-6" /></span>
            <div className="leading-tight">
              <p className="text-lg font-bold">Garbage Control Room</p>
              <p className="text-xs text-white/60">PCMC · AI road detection</p>
            </div>
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Cleaner roads,<br />
            <span className="bg-gradient-to-r from-[#7ee08a] to-accent bg-clip-text text-transparent">found by AI,</span> cleared on time.
          </h1>
          <ul className="mt-8 max-w-lg space-y-4 xl:mt-10 xl:space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 backdrop-blur"><Icon className="size-5 text-[#7ee08a]" /></span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-brand-foreground"><Trash2 className="size-6" /></span>
            <p className="text-lg font-bold">Garbage Control Room</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-[#0b1a12]/60 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-white/60">Sign in to the control room</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-white/70">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/45" />
                  <input id="email" type="email" required autoFocus autoComplete="username" className={inputCls} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-white/70">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/45" />
                  <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" className={`${inputCls} pr-11`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {login.isError && (
                <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm font-medium text-red-200">{getErrorMessage(login.error)}</p>
              )}

              <button
                type="submit"
                disabled={login.isPending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-[#3d9c47] text-sm font-bold text-brand-foreground shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-60"
              >
                {login.isPending && <Loader2 className="size-4 animate-spin" />}
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-white/45">© Hare &amp; Turtle AI Solutions</p>
        </section>
      </div>
    </div>
  )
}
