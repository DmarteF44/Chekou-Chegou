import AsyncStorage from "@react-native-async-storage/async-storage";
import { FORCE_LOCAL_MODE } from "@/src/config/runtime";

type SupabaseClient = any;

declare const require: (moduleName: string) => { createClient: (url: string, key: string, options: unknown) => SupabaseClient };

function normalizeSupabaseUrl(value?: string) {
  return (value ?? "")
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

function getValidSupabaseUrl(value?: string) {
  const normalized = normalizeSupabaseUrl(value);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getValidPublishableKey(value?: string) {
  const key = value?.trim() ?? "";
  if (!key || key.length < 20 || /\s/.test(key)) return "";
  return key;
}

const supabaseUrl = getValidSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const validSupabasePublishableKey = getValidPublishableKey(supabasePublishableKey);

export function isSupabaseConfigured() {
  if (FORCE_LOCAL_MODE) return false;
  return Boolean(supabaseUrl && validSupabasePublishableKey);
}

export function getSupabaseConfigStatus() {
  return {
    configured: isSupabaseConfigured(),
    forceLocalMode: FORCE_LOCAL_MODE,
    url: Boolean(supabaseUrl),
    rawUrl: Boolean(rawSupabaseUrl),
    publishableKey: Boolean(validSupabasePublishableKey),
  };
}

const memoryStorage = {
  async getItem() {
    return null;
  },
  async setItem() {},
  async removeItem() {},
};

const authStorage = typeof window === "undefined" ? memoryStorage : AsyncStorage;

function createUnavailableClient() {
  return new Proxy({}, {
    get() {
      throw new Error("Supabase não configurado. Usando modo local/mock.");
    },
  }) as SupabaseClient;
}

function createSupabaseClient() {
  if (!isSupabaseConfigured()) return createUnavailableClient();
  try {
    const { createClient } = require("@supabase/supabase-js");
    return createClient(supabaseUrl, validSupabasePublishableKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return createUnavailableClient();
  }
}

export const supabase = createSupabaseClient();
