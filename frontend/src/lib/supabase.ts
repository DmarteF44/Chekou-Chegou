import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

const memoryStorage = {
  async getItem() {
    return null;
  },
  async setItem() {},
  async removeItem() {},
};

const authStorage = typeof window === "undefined" ? memoryStorage : AsyncStorage;

export const supabase = createClient(supabaseUrl || "https://localhost.supabase.co", supabasePublishableKey || "public-anon-key", {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
