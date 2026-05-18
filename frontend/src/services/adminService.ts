import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { orderStore } from "@/src/data/orderStore";
import { Profile, UserRole } from "@/src/types/domain";

export const adminService = {
  async listUsers() {
    if (!isSupabaseConfigured()) return [] as Profile[];
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Profile[];
  },

  async updateUserRole(userId: string, role: UserRole, actor?: Profile | null) {
    if (!isSupabaseConfigured()) return;
    if (role === "super_admin" && actor?.role !== "super_admin") {
      throw new Error("Apenas super_admin pode promover outro super_admin.");
    }
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) throw error;
  },

  async blockUser(userId: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from("profiles").update({ is_blocked: true, role: "blocked" }).eq("id", userId);
    if (error) throw error;
  },

  async unblockUser(userId: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from("profiles").update({ is_blocked: false, role: "client" }).eq("id", userId);
    if (error) throw error;
  },

  async dashboardSummary() {
    if (!isSupabaseConfigured()) {
      const orders = await orderStore.getAll();
      return {
        totalUsers: 3,
        totalOrders: orders.length,
        inProgressOrders: orders.filter((o) => o.status !== "Entregue").length,
        gmv: orders.reduce((sum, order) => sum + order.total, 0),
        pendingDrivers: 0,
      };
    }

    const [{ count: totalUsers }, { data: orders }, { count: pendingDrivers }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total_paid,status"),
      supabase.from("driver_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    return {
      totalUsers: totalUsers ?? 0,
      totalOrders: orders?.length ?? 0,
      inProgressOrders: orders?.filter((o) => o.status !== "Entregue").length ?? 0,
      gmv: orders?.reduce((sum, order) => sum + Number(order.total_paid ?? 0), 0) ?? 0,
      pendingDrivers: pendingDrivers ?? 0,
    };
  },

  async stats() {
    const summary = await this.dashboardSummary();
    const users = await this.listUsers();
    return {
      ...summary,
      totalDrivers: users.filter((user) => user.role === "driver" || user.role === "driver_pending").length,
      ordersInProgress: summary.inProgressOrders,
      ordersDone: Math.max(0, summary.totalOrders - summary.inProgressOrders),
    };
  },
};
