"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Flame, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setError("Supabase is not configured. Please check the deployment environment variables.");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error")) {
      setError("Authentication callback failed. Try again.");
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not ready. Refresh the page and try again.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.assign("/dashboard");
      setLoading(false);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (normalizedUsername.length < 3) {
      setError("Username must be at least 3 letters/numbers/underscores.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: normalizedUsername, display_name: displayName.trim() || normalizedUsername },
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) setError(error.message);
    else if (data.session) window.location.assign("/dashboard");
    else setMessage("Account created. Check your email to confirm your address, then sign in.");
    setLoading(false);
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-black/5 bg-white/70 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[#171a18] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="relative">
            <div className="mb-12 flex items-center gap-2 text-sm font-semibold tracking-wide"><span className="grid size-9 place-items-center rounded-xl bg-white text-black"><Flame size={18} /></span> Stride</div>
            <p className="max-w-xl text-5xl font-semibold leading-[1.02] tracking-tight">Keep the streak. Show the proof.</p>
            <p className="mt-5 max-w-md text-base leading-7 text-white/65">A simple habit tracker built around accountability: check in every day, attach proof, and keep your buddy in the loop.</p>
          </div>
          <div className="relative grid gap-3 sm:grid-cols-3">
            {[{ icon: Flame, title: "Streaks", text: "See the fire build." }, { icon: ShieldCheck, title: "Proof", text: "Notes or image links." }, { icon: UsersRound, title: "Buddy", text: "Keep each other honest." }].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <Icon size={18} /><div className="mt-3 text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-white/55">{text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 lg:hidden"><div className="inline-flex items-center gap-2 text-sm font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-black text-white"><Flame size={18} /></span> Stride</div></div>
            <div className="mb-8">
              <p className="text-sm font-semibold text-orange-600">Accountability, simplified</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">{isSignup ? "Build your first streak." : "Welcome back."}</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-500">{isSignup ? "Create an account and add an accountability buddy." : "Sign in to see today's habits and your buddy's progress."}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {isSignup && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name"><input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" /></Field>
                  <Field label="Username"><input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alex_habits" required /></Field>
                </div>
              )}
              <Field label="Email"><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></Field>
              <Field label="Password">
                <div className="relative">
                  <input className={`${inputClass} pr-12`} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} autoComplete={isSignup ? "new-password" : "current-password"} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </Field>
              {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message && <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{message}</div>}
              <button disabled={loading || !supabase} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Working…" : isSignup ? "Create account" : "Sign in"}<ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
              </button>
            </form>
            <p className="mt-7 text-center text-sm text-neutral-500">{isSignup ? "Already have an account?" : "New to Stride?"} <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-neutral-900 hover:underline">{isSignup ? "Sign in" : "Create one"}</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
