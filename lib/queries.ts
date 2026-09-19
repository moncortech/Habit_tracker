import { calculateStreak, todayKey, addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  email: string;
};

export type Habit = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  daily_goal: number;
  active: boolean;
  created_at: string;
  owner: Profile;
};

export type Completion = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_on: string;
  proof: string;
};

export type HabitView = Habit & {
  completion_dates: string[];
  today_completion: Completion | null;
  streak: number;
};

export type DashboardData = {
  me: Profile;
  friend: Profile | null;
  pendingIncoming: Array<{ id: string; requester: Profile; created_at: string }>;
  myHabits: HabitView[];
  friendHabits: HabitView[];
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const today = todayKey();
  const windowStart = addDays(today, -90);

  const [meResult, friendResult, incomingResult, habitsResult, completionsResult] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, email").eq("id", userId).single(),
    supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("friendships")
      .select("id, created_at, requester:profiles!friendships_requester_id_fkey(id, username, display_name, email)")
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("habits")
      .select("id, owner_id, name, description, daily_goal, active, created_at, owner:profiles!habits_owner_id_fkey(id, username, display_name, email)")
      .eq("active", true),
    supabase
      .from("habit_completions")
      .select("id, habit_id, user_id, completed_on, proof")
      .gte("completed_on", windowStart)
      .lte("completed_on", today)
      .order("completed_on", { ascending: false }),
  ]);

  if (meResult.error || !meResult.data) throw new Error(meResult.error?.message ?? "Profile not found.");
  if (friendResult.error) throw new Error(friendResult.error.message);
  if (incomingResult.error) throw new Error(incomingResult.error.message);
  if (habitsResult.error) throw new Error(habitsResult.error.message);
  if (completionsResult.error) throw new Error(completionsResult.error.message);

  const friendship = friendResult.data?.[0] ?? null;
  let friend: Profile | null = null;

  if (friendship) {
    const friendId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
    const profileResult = await supabase
      .from("profiles")
      .select("id, username, display_name, email")
      .eq("id", friendId)
      .single();
    friend = profileResult.data ?? null;
  }

  const habits = (habitsResult.data ?? []) as unknown as Habit[];
  const completions = (completionsResult.data ?? []) as Completion[];
  const views: HabitView[] = habits.map((habit) => {
    const rows = completions.filter((completion) => completion.habit_id === habit.id);
    const dates = rows.map((completion) => completion.completed_on);
    const todayCompletion = rows.find((completion) => completion.completed_on === today) ?? null;
    return {
      ...habit,
      completion_dates: dates,
      today_completion: todayCompletion,
      streak: calculateStreak(dates, today),
    };
  });

  const pendingIncoming = (incomingResult.data ?? []).map((item) => ({
    id: item.id as string,
    created_at: item.created_at as string,
    requester: item.requester as unknown as Profile,
  }));

  return {
    me: meResult.data as Profile,
    friend,
    pendingIncoming,
    myHabits: views.filter((habit) => habit.owner_id === userId),
    friendHabits: friend ? views.filter((habit) => habit.owner_id === friend.id) : [],
  };
}
