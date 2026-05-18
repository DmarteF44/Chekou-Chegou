import { OrderStatus } from "@/src/data/mock";

export type UserRole =
  | "client"
  | "driver_pending"
  | "driver"
  | "store_owner"
  | "admin"
  | "super_admin"
  | "blocked";

export type DriverStatus = "none" | "pending" | "approved" | "rejected" | "blocked";

export type Profile = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  driver_status: DriverStatus;
  driver_level?: number | null;
  is_blocked?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Store = {
  id: string;
  name: string;
  category: string;
  type?: "mais_pedido" | "parceiro_oficial" | "teste" | "em_breve";
  address?: string | null;
  phone?: string | null;
  neighborhood?: string | null;
  opening_hours?: string | null;
  delivery_time?: string | null;
  rating?: number | null;
  base_fee?: number | null;
  image_url?: string | null;
  active?: boolean | null;
  notes?: string | null;
  image?: string;
  deliveryTime?: string;
  description?: string;
  baseFee?: number;
};

export type Product = {
  id: string;
  establishment_id?: string;
  name: string;
  category: string;
  price: number;
  promo_price?: number | null;
  image_url?: string | null;
  active?: boolean | null;
  confirm_in_store?: boolean | null;
  stock_simulated?: number | null;
  notes?: string | null;
  storeId?: string;
  promoPrice?: number | null;
  confirmInStore?: boolean | null;
};

export type CatalogCartItem = {
  id: string;
  type: "catalog";
  name: string;
  quantity: number;
  unitPriceEstimate: number;
  totalEstimate: number;
  storeId: string;
  productId: string;
  notes?: string;
  allowSubstitution: boolean;
  brandPreference?: string;
};

export type CustomCartItem = {
  id: string;
  type: "custom";
  name: string;
  quantity: number;
  unitPriceEstimate: number;
  totalEstimate: number;
  storeId: string;
  notes?: string;
  allowSubstitution: boolean;
  brandPreference?: string;
};

export type CartItem = CatalogCartItem | CustomCartItem;

export type OrderLike = {
  id: string;
  client_id?: string | null;
  driver_id?: string | null;
  establishment_id?: string | null;
  status: OrderStatus | string;
  authorized_purchase_limit?: number | null;
  actual_value?: number | null;
};
