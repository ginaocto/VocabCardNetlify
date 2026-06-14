import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserData {
  memorized_ids: string[];
  starred_ids: string[];
  streak_days: number;
  last_active_date: string;
  custom_words: any[];
  custom_scenarios: any[];
}

const DEFAULT_DATA: UserData = {
  memorized_ids: [],
  starred_ids: [],
  streak_days: 1,
  last_active_date: "",
  custom_words: [],
  custom_scenarios: [],
};

export function useUserData(user: User | null) {
  const [data, setData] = useState<UserData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef<UserData>(DEFAULT_DATA);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("user_data")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (row) {
        const loaded: UserData = {
          memorized_ids: row.memorized_ids || [],
          starred_ids: row.starred_ids || [],
          streak_days: row.streak_days || 1,
          last_active_date: row.last_active_date || "",
          custom_words: row.custom_words || [],
          custom_scenarios: row.custom_scenarios || [],
        };
        dataRef.current = loaded; // ← update ref BEFORE setting state
        setData(loaded);
      } else {
        await supabase.from("user_data").insert({ user_id: user.id, ...DEFAULT_DATA });
        dataRef.current = DEFAULT_DATA;
        setData(DEFAULT_DATA);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const save = useCallback(async (updates: Partial<UserData>) => {
    if (!user) return;
    const next = { ...dataRef.current, ...updates };
    dataRef.current = next; // ← update ref immediately before async call
    setData(next);
    await supabase
      .from("user_data")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }, [user]);

  return { data, save, loading };
}