import { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { storage } from "@/src/utils/storage";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { Profile } from "@/src/types/domain";

const MOCK_PROFILE_KEY = "chekou_mock_profile_v1";

export type User = Profile & {
  email: string;
  phone: string;
  driverStatus: Profile["driver_status"];
  driverLevel: number;
};

const defaultMockProfile: Profile = {
  id: "mock-client",
  name: "Maria Cliente",
  email: "cliente@chekou.local",
  role: "client",
  driver_status: "none",
  driver_level: 1,
  is_blocked: false,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function toUser(profile: Profile | null): User | null {
  if (!profile) return null;
  return {
    ...profile,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    driverStatus: profile.driver_status,
    driverLevel: profile.driver_level ?? 1,
  };
}

async function setMockProfile(profile: Profile) {
  await storage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile));
  notify();
  return profile;
}

export const authService = {
  async signUp(params: { email: string; password: string; name: string; phone?: string }) {
    if (!isSupabaseConfigured()) {
      return setMockProfile({ ...defaultMockProfile, id: `mock_${Date.now()}`, email: params.email, name: params.name, phone: params.phone });
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { data: { name: params.name, phone: params.phone } },
    });
    if (error) throw error;
    return data.user;
  },

  async login(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      const role = email.includes("admin") ? "super_admin" : email.includes("driver") ? "driver" : "client";
      return setMockProfile({
        ...defaultMockProfile,
        id: role === "driver" ? "driver_1" : role === "super_admin" ? "mock-admin" : "mock-client",
        email,
        name: role === "driver" ? "João Entregador" : role === "super_admin" ? "Admin Master" : "Maria Cliente",
        role,
        driver_status: role === "driver" ? "approved" : "none",
      } as Profile);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!isSupabaseConfigured()) {
      await storage.removeItem(MOCK_PROFILE_KEY);
      notify();
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    notify();
  },

  async getSession(): Promise<User | null> {
    return toUser(await this.getCurrentProfile());
  },

  async getSupabaseSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser(): Promise<SupabaseUser | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async getCurrentProfile(): Promise<Profile | null> {
    if (!isSupabaseConfigured()) {
      const raw = await storage.getItem<string>(MOCK_PROFILE_KEY, "");
      if (!raw) return defaultMockProfile;
      try {
        return JSON.parse(raw) as Profile;
      } catch {
        return defaultMockProfile;
      }
    }

    const user = await this.getCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    return data as Profile;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent | "MOCK", session: Session | null) => void) {
    if (!isSupabaseConfigured()) {
      callback("MOCK", null);
      return { data: { subscription: { unsubscribe() {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },

  async signup(params: { email: string; password: string; name: string; phone?: string }) {
    return this.signUp(params);
  },

  async getAllUsers(): Promise<User[]> {
    if (!isSupabaseConfigured()) {
      const me = toUser(await this.getCurrentProfile());
      return me ? [me] : [];
    }
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Profile[]).map((profile) => toUser(profile)!);
  },

  async getById(id: string): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      const users = await this.getAllUsers();
      return users.find((user) => user.id === id) ?? null;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return toUser(data as Profile | null);
  },

  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
