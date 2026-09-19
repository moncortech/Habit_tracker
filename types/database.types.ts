export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; username: string; display_name: string; created_at: string };
        Insert: { id: string; email: string; username: string; display_name?: string; created_at?: string };
        Update: { email?: string; username?: string; display_name?: string };
        Relationships: [];
      };
      friendships: {
        Row: { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" | "declined"; created_at: string };
        Insert: { id?: string; requester_id: string; addressee_id: string; status?: "pending" | "accepted" | "declined"; created_at?: string };
        Update: { status?: "pending" | "accepted" | "declined" };
        Relationships: [];
      };
      habits: {
        Row: { id: string; owner_id: string; name: string; description: string | null; daily_goal: number; active: boolean; created_at: string };
        Insert: { id?: string; owner_id: string; name: string; description?: string | null; daily_goal?: number; active?: boolean; created_at?: string };
        Update: { name?: string; description?: string | null; daily_goal?: number; active?: boolean };
        Relationships: [];
      };
      habit_completions: {
        Row: { id: string; habit_id: string; user_id: string; completed_on: string; proof: string; created_at: string };
        Insert: { id?: string; habit_id: string; user_id: string; completed_on: string; proof: string; created_at?: string };
        Update: { proof?: string };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
