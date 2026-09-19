import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const USERS = [
  { email: "buddy@stride.local", password: "BuddyTest2026!", username: "buddy", display_name: "Buddy", role: "admin" },
  { email: "buddys@stride.local", password: "BuddysTest2026!", username: "buddys", display_name: "Buddys", role: "admin" },
];

async function getOrCreateUser(input) {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing;

  const created = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { username: input.username, display_name: input.display_name },
    app_metadata: { provider: "email", providers: ["email"], role: input.role },
  });
  if (created.error) throw created.error;
  return created.data.user;
}

function dateKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const [buddyUser, buddysUser] = await Promise.all(USERS.map(getOrCreateUser));

for (const input of USERS) {
  const user = input.username === "buddy" ? buddyUser : buddysUser;
  const updated = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { provider: "email", providers: ["email"], role: "admin" },
    user_metadata: { username: input.username, display_name: input.display_name },
  });
  if (updated.error) throw updated.error;
}

const profiles = await supabase.from("profiles").upsert([
  { id: buddyUser.id, email: USERS[0].email, username: USERS[0].username, display_name: USERS[0].display_name },
  { id: buddysUser.id, email: USERS[1].email, username: USERS[1].username, display_name: USERS[1].display_name },
]);
if (profiles.error) throw profiles.error;

const friendship = await supabase.from("friendships").upsert({
  requester_id: buddyUser.id,
  addressee_id: buddysUser.id,
  status: "accepted",
}, { onConflict: "requester_id,addressee_id" }).select("id").single();
if (friendship.error) throw friendship.error;

const habitsQuery = await supabase.from("habits").select("id,name,owner_id").in("owner_id", [buddyUser.id, buddysUser.id]);
if (habitsQuery.error) throw habitsQuery.error;
const existingHabits = habitsQuery.data ?? [];

async function findOrCreateHabit(ownerId, name, description) {
  const existing = existingHabits.find((habit) => habit.owner_id === ownerId && habit.name === name);
  if (existing) return existing;
  const result = await supabase.from("habits").insert({ owner_id: ownerId, name, description, daily_goal: 1 }).select("id,name,owner_id").single();
  if (result.error) throw result.error;
  existingHabits.push(result.data);
  return result.data;
}

const myHabits = await Promise.all([
  findOrCreateHabit(buddyUser.id, "Gym", "Strength training or a short workout"),
  findOrCreateHabit(buddyUser.id, "Read 10 pages", "A small reading target"),
]);
const buddyHabits = await Promise.all([
  findOrCreateHabit(buddysUser.id, "Morning walk", "20 minutes outside"),
  findOrCreateHabit(buddysUser.id, "No phone after 10 PM", "Protect the wind-down routine"),
]);

const completionRows = [];
for (const [habit, streak] of [[myHabits[0], 6], [myHabits[1], 3], [buddyHabits[0], 5], [buddyHabits[1], 2]]) {
  for (let i = 0; i < streak; i += 1) {
    const completedOn = dateKey(-i);
    completionRows.push({
      habit_id: habit.id,
      user_id: habit.owner_id,
      completed_on: completedOn,
      proof: i === 0 ? `Seed proof for ${completedOn} — ready to replace.` : `Completed ${completedOn}.`,
    });
  }
}

const completions = await supabase.from("habit_completions").upsert(completionRows, { onConflict: "habit_id,completed_on" });
if (completions.error) throw completions.error;

console.log("Seed complete.");
console.log("Admin test login 1: buddy@stride.local / BuddyTest2026!");
console.log("Admin test login 2: buddys@stride.local / BuddysTest2026!");
