"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Plus, UserRoundPlus, Check, ExternalLink, LogOut, ShieldCheck, Sparkles, UserRound, Clock3, X } from "lucide-react";
import { createHabitAction, checkInAction, inviteFriendAction, respondToFriendRequestAction, logoutAction, type ActionState } from "@/app/actions";
import type { DashboardData, HabitView } from "@/lib/queries";
import { useActionState } from "react";

const initialState: ActionState = { ok: false };

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [proofTarget, setProofTarget] = useState<string | null>(null);
  const [isLoggingOut, startLogout] = useTransition();

  const [habitState, habitFormAction, habitPending] = useActionState(createHabitAction, initialState);
  const [friendState, friendFormAction, friendPending] = useActionState(inviteFriendAction, initialState);
  const [responseState, responseFormAction, responsePending] = useActionState(respondToFriendRequestAction, initialState);

  const todayLabel = useMemo(() => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);
  const myCompleted = initialData.myHabits.filter((habit) => Boolean(habit.today_completion)).length;
  const myPercent = initialData.myHabits.length ? Math.round((myCompleted / initialData.myHabits.length) * 100) : 0;
  const friendCompleted = initialData.friendHabits.filter((habit) => Boolean(habit.today_completion)).length;
  const friendPercent = initialData.friendHabits.length ? Math.round((friendCompleted / initialData.friendHabits.length) * 100) : 0;

  useEffect(() => {
    if (habitState.ok) setShowHabitForm(false);
    if (habitState.ok || friendState.ok || responseState.ok) router.refresh();
  }, [habitState.ok, friendState.ok, responseState.ok, router]);

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f7f7f5]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-black text-white shadow-sm"><Flame size={20} /></div><div><div className="text-sm font-bold">Stride</div><div className="text-xs text-neutral-500">Habit accountability</div></div></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 sm:flex"><UserRound size={15} /> @{initialData.me.username}</div>
            <button disabled={isLoggingOut} onClick={() => startLogout(async () => { await logoutAction(); window.location.assign("/login"); })} className="grid size-10 place-items-center rounded-xl border border-black/5 bg-white text-neutral-600 transition hover:bg-neutral-50" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[1.75rem] border border-black/5 bg-[#171a18] p-6 text-white shadow-[0_20px_70px_-35px_rgba(0,0,0,0.4)] sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300"><Sparkles size={15} /> Today's focus</div><h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{greeting(initialData.me.display_name)} Keep showing up.</h1><p className="mt-3 text-sm text-white/60">{todayLabel} · {myCompleted} of {initialData.myHabits.length} habits complete</p></div>
              <div className="hidden size-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold sm:grid"><span>{myPercent}%</span></div>
            </div>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${myPercent}%` }} /></div>
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Accountability buddy</div><div className="mt-2 text-xl font-semibold">{initialData.friend ? initialData.friend.display_name : "No buddy yet"}</div>{initialData.friend && <div className="text-sm text-neutral-500">@{initialData.friend.username}</div>}</div><div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck size={22} /></div></div>
            {initialData.friend ? <div className="mt-6 rounded-2xl bg-neutral-50 p-4"><div className="flex items-center justify-between text-xs font-medium text-neutral-500"><span>Today's progress</span><span>{friendPercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${friendPercent}%` }} /></div><p className="mt-2 text-xs text-neutral-500">{friendCompleted} of {initialData.friendHabits.length} habits checked in.</p></div> : <button onClick={() => setShowFriendForm(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"><UserRoundPlus size={17} /> Invite a buddy</button>}
          </div>
        </section>

        {initialData.pendingIncoming.length > 0 && (
          <section className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4"><div><div className="font-semibold">Friend requests</div><div className="mt-1 text-sm text-neutral-600">Someone wants to become your accountability buddy.</div></div><div className="text-xs font-semibold text-orange-700">{initialData.pendingIncoming.length} pending</div></div>
            <div className="mt-4 grid gap-3">
              {initialData.pendingIncoming.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold">{request.requester.display_name}</div><div className="text-xs text-neutral-500">@{request.requester.username}</div></div><div className="flex gap-2"><form action={responseFormAction}><input type="hidden" name="friendship_id" value={request.id} /><input type="hidden" name="status" value="accepted" /><button disabled={responsePending} className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white">Accept</button></form><form action={responseFormAction}><input type="hidden" name="friendship_id" value={request.id} /><input type="hidden" name="status" value="declined" /><button disabled={responsePending} className="rounded-lg border border-black/8 px-3 py-2 text-xs font-semibold">Decline</button></form></div></div>)}
            </div>
          </section>
        )}
        {responseState.error && <p className="mt-3 text-sm text-red-600">{responseState.error}</p>}

        <section className="mt-9">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Your habits</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">Today is a check-in day.</h2></div><div className="flex gap-2"><button onClick={() => setShowFriendForm(true)} className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 py-2.5 text-sm font-semibold shadow-sm hover:bg-neutral-50"><UserRoundPlus size={17} /> <span className="hidden sm:inline">Invite buddy</span></button><button onClick={() => setShowHabitForm((value) => !value)} className="flex items-center gap-2 rounded-xl bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800"><Plus size={17} /> Add habit</button></div></div>

          {showHabitForm && <div className="mb-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"><form action={habitFormAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Habit</label><input name="name" className={inputClass} placeholder="Gym, read 10 pages…" required /></div><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Why it matters</label><input name="description" className={inputClass} placeholder="Optional" /></div><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Daily goal</label><div className="flex gap-2"><input name="daily_goal" type="number" min="1" max="10" defaultValue="1" className={`${inputClass} w-24`} /><button disabled={habitPending} className="rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600">{habitPending ? "Saving…" : "Save"}</button></div></div></form>{habitState.error && <p className="mt-3 text-sm text-red-600">{habitState.error}</p>}{habitState.message && <p className="mt-3 text-sm text-emerald-600">{habitState.message}</p>}</div>}

          <div className="grid gap-3">
            {initialData.myHabits.length === 0 ? <EmptyState type="habit" /> : initialData.myHabits.map((habit) => <HabitCard key={habit.id} habit={habit} isOwn proofTarget={proofTarget} setProofTarget={setProofTarget} />)}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Buddy feed</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">See the proof.</h2></div>{initialData.friend && <div className="hidden text-xs font-medium text-neutral-500 sm:block">Only visible to your accountability partner</div>}</div>
          {initialData.friend ? <div className="grid gap-3">{initialData.friendHabits.length ? initialData.friendHabits.map((habit) => <HabitCard key={habit.id} habit={habit} isOwn={false} proofTarget={proofTarget} setProofTarget={setProofTarget} />) : <EmptyState type="friend" />}</div> : <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-600"><UserRoundPlus size={22} /></div><h3 className="mt-4 font-semibold">Invite someone who will actually check.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">Add a friend by username or email. Once they accept, both sides of the dashboard become visible.</p><button onClick={() => setShowFriendForm(true)} className="mt-5 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">Invite accountability buddy</button></div>}
        </section>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-400"><Clock3 size={14} /> Streaks keep counting until a full day is missed.</div>
      </div>

      {showFriendForm && <Modal title="Invite an accountability buddy" onClose={() => setShowFriendForm(false)}><form action={friendFormAction} className="space-y-4"><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Username or email</label><input name="identifier" className={inputClass} placeholder="friend_username or friend@email.com" required /></div>{friendState.error && <p className="text-sm text-red-600">{friendState.error}</p>}{friendState.message && <p className="text-sm text-emerald-600">{friendState.message}</p>}<button disabled={friendPending} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">{friendPending ? "Sending…" : "Send request"}</button></form></Modal>}
    </main>
  );
}

function HabitCard({ habit, isOwn, proofTarget, setProofTarget }: { habit: HabitView; isOwn: boolean; proofTarget: string | null; setProofTarget: (id: string | null) => void }) {
  const completed = Boolean(habit.today_completion);
  return <article className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${completed ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-400"}`}>{completed ? <Check size={19} strokeWidth={2.5} /> : <Flame size={19} />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{habit.name}</h3><span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">{habit.streak} day{habit.streak === 1 ? "" : "s"}</span></div><p className="mt-0.5 text-xs text-neutral-500">{habit.description || (isOwn ? "Make it easy to keep the promise." : `@${habit.owner.username}'s daily habit`)}</p></div></div></div><div className="flex flex-col items-stretch gap-2 sm:min-w-[250px] sm:items-end"><div className="flex items-center justify-between gap-3 text-xs text-neutral-500 sm:justify-end"><span className="font-semibold">{completed ? "Checked in" : "Not checked in"}</span><span>Goal {habit.daily_goal}/day</span></div><div className="flex w-full gap-2 sm:w-auto">{isOwn ? (completed ? <button onClick={() => setProofTarget(proofTarget === habit.id ? null : habit.id)} className="flex-1 rounded-xl border border-black/8 bg-white px-3 py-2.5 text-xs font-semibold hover:bg-neutral-50 sm:flex-none">{proofTarget === habit.id ? "Hide proof" : "View proof"}</button> : <button onClick={() => setProofTarget(proofTarget === habit.id ? null : habit.id)} className="flex-1 rounded-xl bg-black px-3 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 sm:flex-none">{proofTarget === habit.id ? "Close" : "Check in + proof"}</button>) : (completed ? <button onClick={() => setProofTarget(proofTarget === habit.id ? null : habit.id)} className="flex-1 rounded-xl border border-black/8 bg-white px-3 py-2.5 text-xs font-semibold hover:bg-neutral-50 sm:flex-none">{proofTarget === habit.id ? "Hide proof" : "View today's proof"}</button> : <span className="self-center text-[11px] text-neutral-400">No proof today</span>)}</div></div></div>{proofTarget === habit.id && <div className="mt-4 rounded-xl border border-black/5 bg-neutral-50 p-4">{isOwn && !completed ? <ProofForm habitId={habit.id} /> : <ProofDisplay completion={habit.today_completion} />}</div>}</article>
}

function ProofForm({ habitId }: { habitId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(checkInAction, initialState);
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  return <form action={action} className="space-y-3"><div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Proof</label><textarea name="proof" rows={3} className={inputClass} placeholder="e.g. Finished 10 pages — or paste an image URL" required /><input type="hidden" name="habit_id" value={habitId} /></div>{state.error && <p className="text-xs text-red-600">{state.error}</p>}{state.message && <p className="text-xs text-emerald-600">{state.message}</p>}<button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600">{pending ? "Saving…" : "Submit proof + check in"}<Check size={16} /></button></form>;
}

function ProofDisplay({ completion }: { completion: HabitView["today_completion"] }) {
  if (!completion) return <div className="text-sm text-neutral-500">No proof submitted today.</div>;
  const isUrl = /^https?:\/\//i.test(completion.proof);
  return <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"><ShieldCheck size={14} /> Proof submitted today</div><p className="mt-2 text-sm leading-6 text-neutral-700">{completion.proof}</p>{isUrl && <a className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-orange-700 hover:underline" href={completion.proof} target="_blank" rel="noreferrer">Open proof link <ExternalLink size={14} /></a>}</div>;
}

function EmptyState({ type }: { type: "habit" | "friend" }) { return <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center"><p className="font-semibold">{type === "habit" ? "No habits yet." : "Your buddy has no active habits."}</p><p className="mt-1 text-sm text-neutral-500">{type === "habit" ? "Add one small habit and start your streak." : "They can create one from their dashboard."}</p></div>; }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.5rem] border border-black/5 bg-white p-6 shadow-2xl"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{title}</h2><button onClick={onClose} className="grid size-9 place-items-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200" aria-label="Close"><X size={17} /></button></div><div className="mt-5">{children}</div></div></div>; }

function greeting(name: string) { const hour = new Date().getHours(); return `${hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,"} ${name}.`; }

const inputClass = "w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
