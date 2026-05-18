import { ORDER_STATUSES, Order, OrderStatus } from "@/src/data/mock";
import { generateCode, generateId, orderStore } from "@/src/data/orderStore";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { authService } from "@/src/services/authService";
import { validateOrderLimit } from "@/src/services/securityService";
import { CartItem } from "@/src/types/domain";

const DRIVER_ID = "driver_1";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function dbOrderToMock(row: any, items: any[] = [], chat: any[] = []): Order {
  return {
    id: row.id,
    storeId: row.establishment_id ?? "",
    storeName: row.establishments?.name ?? "Estabelecimento",
    items: row.items_text || items.map((i) => `${i.quantity}x ${i.name}`).join("\n"),
    notes: row.notes ?? "",
    estimatedValue: Number(row.estimated_value ?? 0),
    safetyMargin: Number(row.safety_margin ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    platformFee: Number(row.platform_fee ?? 0),
    total: Number(row.total_paid ?? 0),
    couponCode: row.coupon_code ?? undefined,
    discount: Number(row.discount ?? 0),
    status: row.status,
    createdAt: new Date(row.created_at ?? Date.now()).getTime(),
    confirmationCode: row.confirmation_code ?? "0000",
    actualValue: row.actual_value === null || row.actual_value === undefined ? undefined : Number(row.actual_value),
    invoicePhotoSent: Boolean(row.invoice_photo_sent),
    goodsPhotoSent: Boolean(row.goods_photo_sent),
    driverId: row.driver_id ?? undefined,
    chat: chat.map((m) => ({
      id: m.id,
      from: m.sender_role === "driver" ? "driver" : "client",
      text: m.message,
      at: new Date(m.created_at).getTime(),
    })),
    paid: Boolean(row.paid),
  };
}

async function currentProfileId() {
  return (await authService.getCurrentProfile())?.id ?? null;
}

export const orderService = {
  async createOrderWithItems(input: {
    storeId: string;
    storeName: string;
    items: CartItem[];
    notes?: string;
    deliveryFee: number;
    platformFee: number;
    discount: number;
    couponCode?: string;
  }) {
    const estimatedValue = +input.items.reduce((acc, item) => acc + item.totalEstimate, 0).toFixed(2);
    const safetyMargin = +Math.max(estimatedValue * 0.15, 10).toFixed(2);
    const authorizedPurchaseLimit = +(estimatedValue + safetyMargin).toFixed(2);
    const totalPaid = +(authorizedPurchaseLimit + input.deliveryFee + input.platformFee - input.discount).toFixed(2);
    const itemsText = input.items.map((i) => `${i.quantity}x ${i.name}`).join("\n");

    if (!isSupabaseConfigured()) {
      const order: Order = {
        id: generateId(),
        storeId: input.storeId,
        storeName: input.storeName,
        items: itemsText,
        notes: input.notes ?? "",
        estimatedValue,
        safetyMargin,
        deliveryFee: input.deliveryFee,
        platformFee: input.platformFee,
        total: totalPaid,
        couponCode: input.couponCode,
        discount: input.discount,
        status: "Aguardando entregador",
        createdAt: Date.now(),
        confirmationCode: generateCode(),
        invoicePhotoSent: false,
        goodsPhotoSent: false,
        chat: [],
        paid: true,
      };
      await orderStore.create(order);
      notify();
      return order;
    }

    const clientId = await currentProfileId();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_id: clientId,
        establishment_id: input.storeId,
        status: "Aguardando entregador",
        items_text: itemsText,
        notes: input.notes,
        catalog_subtotal: input.items.filter((i) => i.type === "catalog").reduce((a, i) => a + i.totalEstimate, 0),
        custom_subtotal: input.items.filter((i) => i.type === "custom").reduce((a, i) => a + i.totalEstimate, 0),
        estimated_value: estimatedValue,
        safety_margin: safetyMargin,
        authorized_purchase_limit: authorizedPurchaseLimit,
        delivery_fee: input.deliveryFee,
        platform_fee: input.platformFee,
        discount: input.discount,
        total_paid: totalPaid,
        coupon_code: input.couponCode,
        confirmation_code: generateCode(),
        paid: true,
      })
      .select("*, establishments(name)")
      .single();
    if (error) throw error;

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: order.id,
        type: item.type,
        product_id: item.type === "catalog" ? item.productId : null,
        name: item.name,
        quantity: item.quantity,
        unit_price_estimate: item.unitPriceEstimate,
        total_estimate: item.totalEstimate,
        store_id: item.storeId,
        notes: item.notes,
        allow_substitution: item.allowSubstitution,
        brand_preference: item.brandPreference,
      })),
    );
    if (itemsError) throw itemsError;
    notify();
    return dbOrderToMock(order);
  },

  async listMyOrders() {
    if (!isSupabaseConfigured()) return orderStore.getByClient();
    try {
      const id = await currentProfileId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(name)")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => dbOrderToMock(row));
    } catch {
      return orderStore.getByClient();
    }
  },

  async listAllOrders() {
    if (!isSupabaseConfigured()) return orderStore.getAll();
    try {
      const { data, error } = await supabase.from("orders").select("*, establishments(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => dbOrderToMock(row));
    } catch {
      return orderStore.getAll();
    }
  },

  async listAvailableOrders() {
    if (!isSupabaseConfigured()) return orderStore.getAvailable();
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(name)")
        .is("driver_id", null)
        .eq("status", "Aguardando entregador")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => dbOrderToMock(row));
    } catch {
      return orderStore.getAvailable();
    }
  },

  async listDriverActive(driverId = DRIVER_ID) {
    if (!isSupabaseConfigured()) return orderStore.getDriverActive(driverId);
    try {
      const id = await currentProfileId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(name)")
        .eq("driver_id", id)
        .neq("status", "Entregue")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => dbOrderToMock(row));
    } catch {
      return orderStore.getDriverActive(driverId);
    }
  },

  async listDriverHistory(driverId = DRIVER_ID) {
    if (!isSupabaseConfigured()) return orderStore.getDriverHistory(driverId);
    try {
      const id = await currentProfileId();
      if (!id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(name)")
        .eq("driver_id", id)
        .eq("status", "Entregue")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => dbOrderToMock(row));
    } catch {
      return orderStore.getDriverHistory(driverId);
    }
  },

  async getOrder(id: string) {
    if (!isSupabaseConfigured()) return orderStore.getById(id);
    try {
      const { data, error } = await supabase.from("orders").select("*, establishments(name)").eq("id", id).single();
      if (error) throw error;
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      const { data: chat } = await supabase.from("order_chats").select("*").eq("order_id", id).order("created_at");
      return dbOrderToMock(data, items ?? [], chat ?? []);
    } catch {
      return orderStore.getById(id);
    }
  },

  async acceptOrder(id: string) {
    if (!isSupabaseConfigured()) {
      const updated = await orderStore.update(id, { driverId: DRIVER_ID, status: "Entregador aceitou" });
      notify();
      return updated;
    }
    const driverId = await currentProfileId();
    const { data, error } = await supabase
      .from("orders")
      .update({ driver_id: driverId, status: "Entregador aceitou" })
      .eq("id", id)
      .is("driver_id", null)
      .select("*, establishments(name)")
      .single();
    if (error) throw error;
    notify();
    return dbOrderToMock(data);
  },

  async updateOrderStatus(id: string, status: OrderStatus | string) {
    if (!isSupabaseConfigured()) {
      await orderStore.setStatus(id, status as OrderStatus);
      notify();
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw error;
    await supabase.from("order_status_events").insert({ order_id: id, actor_id: await currentProfileId(), status });
    notify();
  },

  async addOrderMessage(id: string, message: string, senderRole: "client" | "driver" = "client") {
    if (!isSupabaseConfigured()) {
      await orderStore.addMessage(id, { id: `m_${Date.now()}`, from: senderRole, text: message, at: Date.now() });
      notify();
      return;
    }
    const { error } = await supabase.from("order_chats").insert({
      order_id: id,
      sender_id: await currentProfileId(),
      sender_role: senderRole,
      message,
    });
    if (error) throw error;
    notify();
  },

  async requestComplement(id: string, actualValue: number) {
    const order = await this.getOrder(id);
    if (!order) return null;
    const authorized = order.estimatedValue + order.safetyMargin;
    const extra = Math.max(0, +(actualValue - authorized).toFixed(2));
    if (!isSupabaseConfigured()) {
      const updated = await orderStore.update(id, { actualValue, status: extra > 0 ? "Comprando produtos" : order.status });
      notify();
      return updated;
    }
    const { error } = await supabase
      .from("orders")
      .update({
        actual_value: actualValue,
        over_limit_status: extra > 0 ? "pending_customer_approval" : "none",
        extra_payment_required: extra,
        complement_requested_at: extra > 0 ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) throw error;
    notify();
    return this.getOrder(id);
  },

  async approveComplement(id: string) {
    if (!isSupabaseConfigured()) return;
    const order = await this.getOrder(id);
    if (!order) return;
    const check = validateOrderLimit({ id, status: order.status, authorized_purchase_limit: order.estimatedValue + order.safetyMargin }, order.actualValue ?? 0);
    const { error } = await supabase
      .from("orders")
      .update({
        over_limit_status: "approved",
        authorized_purchase_limit: order.estimatedValue + order.safetyMargin + check.extraPaymentRequired,
        complement_approved_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    notify();
  },

  async rejectComplement(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from("orders")
      .update({ over_limit_status: "rejected", complement_rejected_at: new Date().toISOString(), status: "Comprando produtos" })
      .eq("id", id);
    if (error) throw error;
    notify();
  },

  async submitActualValue(id: string, actualValue: number) {
    const order = await this.getOrder(id);
    if (!order) return null;
    if (actualValue > order.estimatedValue + order.safetyMargin) return this.requestComplement(id, actualValue);
    if (!isSupabaseConfigured()) {
      const updated = await orderStore.update(id, { actualValue });
      notify();
      return updated;
    }
    const { error } = await supabase.from("orders").update({ actual_value: actualValue }).eq("id", id);
    if (error) throw error;
    notify();
    return this.getOrder(id);
  },

  async completeWithCode(id: string, code: string) {
    const order = await this.getOrder(id);
    if (!order || order.confirmationCode !== code) return false;
    await this.updateOrderStatus(id, ORDER_STATUSES[ORDER_STATUSES.length - 1]);
    return true;
  },

  async list() {
    return this.listAllOrders();
  },

  async driverHistory(driverId = DRIVER_ID) {
    return this.listDriverHistory(driverId);
  },

  async driverActive(driverId = DRIVER_ID) {
    return this.listDriverActive(driverId);
  },

  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async clearAll() {
    if (!isSupabaseConfigured()) {
      await orderStore.clearAll();
      notify();
    }
  },
};
