"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayKey } from "@/lib/dates";

export type ActionState = { ok: boolean; error?: string; message?: string };

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub as string | undefined };
}

export async function createHabitAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dailyGoal = Number(formData.get("daily_goal") ?? 1);

  if (!name) return { ok: false, error: "Give your habit a name." };
  if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 10) {
    return { ok: false, error: "Daily goal must be between 1 and 10." };
  }

  const { error } = await supabase.from("habits").insert({
    owner_id: userId,
    name,
    description: description || null,
    daily_goal: dailyGoal,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: "Habit created." };
}

export async function checkInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const habitId = String(formData.get("habit_id") ?? "");
  const proof = String(formData.get("proof") ?? "").trim();
  const completedOn = todayKey();

  if (!habitId) return { ok: false, error: "Habit is missing." };
  if (!proof) return { ok: false, error: "Add a short proof note or image URL before checking in." };
  if (proof.length > 500) return { ok: false, error: "Proof must be 500 characters or fewer." };

  const { error } = await supabase.from("habit_completions").upsert(
    { habit_id: habitId, user_id: userId, completed_on: completedOn, proof },
    { onConflict: "habit_id,completed_on" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: "Check-in saved." };
}

export async function inviteFriendAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { ok: false, error: "Enter a username or email." };

  const byUsername = await supabase.from("profiles").select("id").eq("username", identifier).neq("id", userId).maybeSingle();
  if (byUsername.error) return { ok: false, error: byUsername.error.message };

  let profile = byUsername.data;
  if (!profile) {
    const byEmail = await supabase.from("profiles").select("id").eq("email", identifier).neq("id", userId).maybeSingle();
    if (byEmail.error) return { ok: false, error: byEmail.error.message };
    profile = byEmail.data;
  }

  if (!profile) return { ok: false, error: "No user found with that username or email." };

  const friendId = profile.id as string;
  const existing = await supabase
    .from("friendships")
    .select("id, status")
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
    .maybeSingle();

  if (existing.data) {
    return { ok: false, error: existing.data.status === "accepted" ? "You are already accountability partners." : "A friend request already exists." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: userId,
    addressee_id: friendId,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: "Friend request sent." };
}

export async function respondToFriendRequestAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const friendshipId = String(formData.get("friendship_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!friendshipId || !["accepted", "declined"].includes(status)) {
    return { ok: false, error: "Invalid friend request." };
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId)
    .eq("addressee_id", userId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: status === "accepted" ? "Accountability partner added." : "Request declined." };
}

export async function logoutAction() {
  const { supabase } = await getUserId();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function deleteTodayCheckInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false, error: "You need to be signed in." };

  const habitId = String(formData.get("habit_id") ?? "");
  const completedOn = todayKey();
  const yesterday = addDays(completedOn, -1);
  void yesterday;

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("completed_on", completedOn);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: "Today's check-in removed." };
}
