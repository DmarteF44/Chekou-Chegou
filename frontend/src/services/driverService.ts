import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { authService } from "@/src/services/authService";

export type DriverLevel = 1 | 2 | 3 | 4;
export type DriverApplication = {
  id: string;
  userId?: string;
  user_id?: string;
  fullName: string;
  full_name?: string;
  cpf: string;
  phone?: string;
  email?: string;
  vehicleType: string;
  vehicle_type?: string;
  plate?: string;
  vehicle_plate?: string;
  cnh?: string;
  region: string;
  pixKey: string;
  pix_key?: string;
  status?: "pending" | "approved" | "rejected" | "blocked";
  submittedAt: number;
  created_at?: string;
};

export const DRIVER_LEVELS: Record<DriverLevel, { name: string; limit: number; color: string; description: string }> = {
  1: { name: "Inicial", limit: 50, color: "#64748B", description: "Limite inicial para compras pequenas." },
  2: { name: "Confiável", limit: 100, color: "#2563EB", description: "Limite ampliado após bom histórico." },
  3: { name: "Avançado", limit: 200, color: "#059669", description: "Para motoristas com operação consistente." },
  4: { name: "Master", limit: 350, color: "#D97706", description: "Maior limite operacional." },
};

async function currentProfileId() {
  return (await authService.getCurrentProfile())?.id ?? null;
}

function normalizeApplication(app: any): DriverApplication | null {
  if (!app) return null;
  return {
    ...app,
    userId: app.userId ?? app.user_id,
    fullName: app.fullName ?? app.full_name ?? "",
    cpf: app.cpf ?? "",
    vehicleType: app.vehicleType ?? app.vehicle_type ?? "",
    plate: app.plate ?? app.vehicle_plate,
    pixKey: app.pixKey ?? app.pix_key,
    region: app.region ?? "",
    submittedAt: app.submittedAt ?? (app.created_at ? new Date(app.created_at).getTime() : Date.now()),
  };
}

function applicationToDb(application: Record<string, any>, userId: string | null) {
  return {
    user_id: application.userId ?? userId,
    full_name: application.fullName,
    cpf: application.cpf,
    phone: application.phone,
    vehicle_type: application.vehicleType,
    vehicle_plate: application.plate,
    cnh: application.cnh,
    region: application.region,
    pix_key: application.pixKey,
    status: "pending",
  };
}

export const driverService = {
  async applyAsDriver(application: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return normalizeApplication({ id: `mock_driver_app_${Date.now()}`, status: "pending", submittedAt: Date.now(), ...application });
    const userId = await currentProfileId();
    const { data, error } = await supabase
      .from("driver_applications")
      .insert(applicationToDb(application, userId))
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("profiles").update({ role: "driver_pending", driver_status: "pending" }).eq("id", userId);
    return normalizeApplication(data);
  },

  async getDriverApplication(userId?: string) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from("driver_applications").select("*").eq("user_id", userId ?? await currentProfileId()).maybeSingle();
    if (error) throw error;
    return normalizeApplication(data);
  },

  async listPendingDrivers() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from("driver_applications").select("*, profiles(*)").eq("status", "pending").order("created_at");
    if (error) throw error;
    return (data ?? []).map(normalizeApplication);
  },

  async approveDriver(userId: string, notes?: string) {
    if (!isSupabaseConfigured()) return;
    await supabase.from("profiles").update({ role: "driver", driver_status: "approved", is_blocked: false }).eq("id", userId);
    await supabase.from("driver_applications").update({ status: "approved", reviewed_by: await currentProfileId(), reviewed_at: new Date().toISOString(), notes }).eq("user_id", userId);
    await supabase.from("driver_wallets").upsert({ driver_id: userId });
  },

  async rejectDriver(userId: string, notes?: string) {
    if (!isSupabaseConfigured()) return;
    await supabase.from("profiles").update({ role: "client", driver_status: "rejected" }).eq("id", userId);
    await supabase.from("driver_applications").update({ status: "rejected", reviewed_by: await currentProfileId(), reviewed_at: new Date().toISOString(), notes }).eq("user_id", userId);
  },

  async blockDriver(userId: string) {
    if (!isSupabaseConfigured()) return;
    await supabase.from("profiles").update({ driver_status: "blocked", is_blocked: true }).eq("id", userId);
  },

  async unblockDriver(userId: string) {
    if (!isSupabaseConfigured()) return;
    await supabase.from("profiles").update({ driver_status: "approved", is_blocked: false }).eq("id", userId);
  },

  async updateDriverLevel(userId: string, driverLevel: number) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from("profiles").update({ driver_level: driverLevel }).eq("id", userId);
    if (error) throw error;
  },

  async submitApplication(application: Record<string, unknown>) {
    return this.applyAsDriver(application);
  },

  async getApplication(userId?: string) {
    return this.getDriverApplication(userId);
  },

  async approve(userId: string, notes?: string) {
    return this.approveDriver(userId, notes);
  },

  async reject(userId: string, notes?: string) {
    return this.rejectDriver(userId, notes);
  },

  async block(userId: string) {
    return this.blockDriver(userId);
  },

  async unblock(userId: string) {
    return this.unblockDriver(userId);
  },

  async setLevel(userId: string, level: DriverLevel) {
    return this.updateDriverLevel(userId, level);
  },
};
