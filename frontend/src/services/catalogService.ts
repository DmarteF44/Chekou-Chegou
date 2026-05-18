import { ESTABLISHMENTS, COUPONS, PROMOTIONS } from "@/src/data/mock";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { Product, Store } from "@/src/types/domain";

export type { Product, Store };
export type StoreType = NonNullable<Store["type"]>;
export type ProductCategory = string;
export const PRODUCT_CATEGORIES = ["Mercado", "Mercearia", "Bebidas", "Farmácia", "Medicamentos", "Limpeza", "Higiene", "Padaria"];

const fallbackProducts: Product[] = [
  { id: "arroz-5kg", establishment_id: "tosta-2", name: "Arroz tipo 1 5kg", category: "Mercearia", price: 28.9, active: true, confirm_in_store: true },
  { id: "feijao-1kg", establishment_id: "tosta-2", name: "Feijão carioca 1kg", category: "Mercearia", price: 8.5, active: true, confirm_in_store: true },
  { id: "leite-1l", establishment_id: "mercadao", name: "Leite integral 1L", category: "Laticínios", price: 5.2, active: true, confirm_in_store: true },
  { id: "coca-2l", establishment_id: "mercadao", name: "Coca-Cola 2L", category: "Bebidas", price: 10.99, active: true, confirm_in_store: true },
  { id: "dipirona", establishment_id: "farmacia-parceira", name: "Dipirona 500mg", category: "Medicamentos", price: 7.9, active: true, confirm_in_store: true, notes: "Apenas itens sem retenção de receita" },
];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

function normalizeStore(store: Store): Store {
  return {
    ...store,
    image: store.image ?? store.image_url ?? "",
    image_url: store.image_url ?? store.image ?? "",
    deliveryTime: store.deliveryTime ?? store.delivery_time ?? "",
    delivery_time: store.delivery_time ?? store.deliveryTime ?? "",
    description: store.description ?? store.notes ?? "",
    notes: store.notes ?? store.description ?? "",
    baseFee: store.baseFee ?? Number(store.base_fee ?? 8),
    base_fee: store.base_fee ?? store.baseFee ?? 8,
  };
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    storeId: product.storeId ?? product.establishment_id,
    establishment_id: product.establishment_id ?? product.storeId ?? "",
    promoPrice: product.promoPrice ?? product.promo_price ?? null,
    promo_price: product.promo_price ?? product.promoPrice ?? null,
    confirmInStore: product.confirmInStore ?? product.confirm_in_store ?? true,
    confirm_in_store: product.confirm_in_store ?? product.confirmInStore ?? true,
  };
}

function storeToDb(store: Partial<Store>) {
  return {
    id: store.id || undefined,
    name: store.name,
    category: store.category,
    type: store.type,
    address: store.address,
    phone: store.phone,
    delivery_time: store.delivery_time ?? store.deliveryTime,
    rating: store.rating,
    base_fee: store.base_fee ?? store.baseFee,
    image_url: store.image_url ?? store.image,
    active: store.active,
    notes: store.notes ?? store.description,
  };
}

function productToDb(product: Partial<Product>) {
  return {
    id: product.id || undefined,
    establishment_id: product.establishment_id ?? product.storeId,
    name: product.name,
    category: product.category,
    price: product.price,
    promo_price: product.promo_price ?? product.promoPrice,
    image_url: product.image_url,
    active: product.active,
    confirm_in_store: product.confirm_in_store ?? product.confirmInStore,
    notes: product.notes,
  };
}

function mockStores(): Store[] {
  return ESTABLISHMENTS.map((e) => normalizeStore({
    id: e.id,
    name: e.name,
    category: e.category,
    delivery_time: e.deliveryTime,
    rating: e.rating,
    image_url: e.image,
    notes: e.description,
    base_fee: 8,
    active: true,
    type: "mais_pedido",
  }));
}

export const catalogService = {
  async listStores() {
    if (!isSupabaseConfigured()) return mockStores();
    const { data, error } = await supabase.from("establishments").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data as Store[]).map(normalizeStore);
  },

  async getStore(id: string) {
    if (!isSupabaseConfigured()) return mockStores().find((e) => e.id === id) ?? null;
    const { data, error } = await supabase.from("establishments").select("*").eq("id", id).single();
    if (error) throw error;
    return normalizeStore(data as Store);
  },

  async upsertStore(store: Partial<Store>) {
    if (!isSupabaseConfigured()) {
      notify();
      return normalizeStore(store as Store);
    }
    const { data, error } = await supabase.from("establishments").upsert(storeToDb(store)).select("*").single();
    if (error) throw error;
    notify();
    return normalizeStore(data as Store);
  },

  async deleteStore(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from("establishments").delete().eq("id", id);
    if (error) throw error;
    notify();
  },

  async listProducts(establishmentId?: string) {
    if (!isSupabaseConfigured()) return fallbackProducts.map(normalizeProduct).filter((p) => !establishmentId || p.establishment_id === establishmentId || p.storeId === establishmentId);
    let query = supabase.from("products").select("*").order("created_at", { ascending: true });
    if (establishmentId) query = query.eq("establishment_id", establishmentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as Product[]).map(normalizeProduct);
  },

  async getProduct(id: string) {
    if (!isSupabaseConfigured()) return normalizeProduct(fallbackProducts.find((p) => p.id === id) ?? fallbackProducts[0]);
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) throw error;
    return normalizeProduct(data as Product);
  },

  async upsertProduct(product: Partial<Product>) {
    if (!isSupabaseConfigured()) {
      notify();
      return normalizeProduct(product as Product);
    }
    const { data, error } = await supabase.from("products").upsert(productToDb(product)).select("*").single();
    if (error) throw error;
    notify();
    return normalizeProduct(data as Product);
  },

  async deleteProduct(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    notify();
  },

  async listCoupons() {
    if (!isSupabaseConfigured()) return COUPONS;
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async listPromotions() {
    if (!isSupabaseConfigured()) return PROMOTIONS;
    const { data, error } = await supabase.from("promotions").select("*, establishments(name)").order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
