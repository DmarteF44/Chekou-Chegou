import { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { storage } from "@/src/utils/storage";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { Profile } from "@/src/types/domain";

const MOCK_PROFILE_KEY = "chekou_mock_profile_v1";
const FORCE_MOCK_AUTH_KEY = "chekou_force_mock_auth_v1";

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

async function getStoredMockProfile() {
  const raw = await storage.getItem<string>(MOCK_PROFILE_KEY, "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

async function isMockAuthForced() {
  return Boolean(await storage.getItem<boolean>(FORCE_MOCK_AUTH_KEY, false));
}

function buildMockProfile(role: "client" | "driver" | "admin", overrides: Partial<Profile> = {}): Profile {
  const profileByRole: Record<"client" | "driver" | "admin", Profile> = {
    client: {
      ...defaultMockProfile,
      id: "mock-client",
      name: "Maria Cliente",
      email: "cliente@chekou.local",
      role: "client",
      driver_status: "none",
    },
    driver: {
      ...defaultMockProfile,
      id: "driver_1",
      name: "João Entregador",
      email: "driver@chekou.local",
      role: "driver",
      driver_status: "approved",
    },
    admin: {
      ...defaultMockProfile,
      id: "mock-admin",
      name: "Admin Master",
      email: "admin@chekou.local",
      role: "super_admin",
      driver_status: "none",
    },
  };
  return { ...profileByRole[role], ...overrides };
}

export const authService = {
  async loginMock(role: "client" | "driver" | "admin" = "client") {
    await storage.setItem(FORCE_MOCK_AUTH_KEY, true);
    return setMockProfile(buildMockProfile(role));
  },

  async signUp(params: { email: string; password: string; name: string; phone?: string }) {
    await storage.removeItem(FORCE_MOCK_AUTH_KEY);
    if (!isSupabaseConfigured()) {
      return setMockProfile({ ...defaultMockProfile, id: `mock_${Date.now()}`, email: params.email, name: params.name, phone: params.phone });
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: { data: { name: params.name, phone: params.phone } },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Supabase signup failed", error);
      throw error;
    }
  },

  async login(email: string, password: string) {
    await storage.removeItem(FORCE_MOCK_AUTH_KEY);
    if (!isSupabaseConfigured()) {
      const role = email.includes("admin") ? "admin" : email.includes("driver") || email.includes("entregador") ? "driver" : "client";
      return setMockProfile(buildMockProfile(role, {
        email,
      }));
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Supabase login failed", error);
      throw error;
    }
  },

  async logout() {
    await storage.removeItem(MOCK_PROFILE_KEY);
    await storage.removeItem(FORCE_MOCK_AUTH_KEY);
    if (!isSupabaseConfigured()) {
      notify();
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      notify();
    } catch (error) {
      console.error("Supabase logout failed", error);
      throw error;
    }
  },

  async getSession(): Promise<User | null> {
    try {
      return toUser(await this.getCurrentProfile());
    } catch (error) {
      console.error("Get session failed", error);
      return null;
    }
  },

  async getSupabaseSession(): Promise<Session | null> {
    if (!isSupabaseConfigured() || (await isMockAuthForced())) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error("Get Supabase session failed", error);
      return null;
    }
  },

  async getCurrentUser(): Promise<SupabaseUser | null> {
    if (!isSupabaseConfigured() || (await isMockAuthForced())) return null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error("Get Supabase user failed", error);
      return null;
    }
  },

  async getCurrentProfile(): Promise<Profile | null> {
    const storedMock = await getStoredMockProfile();
    if (await isMockAuthForced()) {
      return storedMock ?? defaultMockProfile;
    }

    if (!isSupabaseConfigured()) {
      return storedMock ?? defaultMockProfile;
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data as Profile;
    } catch (error) {
      console.error("Get current profile failed", error);
      return null;
    }
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
    if (!isSupabaseConfigured() || (await isMockAuthForced())) {
      const me = toUser(await this.getCurrentProfile());
      return me ? [me] : [];
    }
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Profile[]).map((profile) => toUser(profile)!);
    } catch {
      const me = toUser(await this.getCurrentProfile());
      return me ? [me] : [];
    }
  },

  async getById(id: string): Promise<User | null> {
    if (!isSupabaseConfigured() || (await isMockAuthForced())) {
      const users = await this.getAllUsers();
      return users.find((user) => user.id === id) ?? null;
    }
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return toUser(data as Profile | null);
    } catch {
      return null;
    }
  },

  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
