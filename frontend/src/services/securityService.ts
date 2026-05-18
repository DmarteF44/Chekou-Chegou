import { OrderLike, Profile } from "@/src/types/domain";

// Validações reais devem existir também no banco/backend.
export function isBlocked(profile?: Profile | null) {
  return Boolean(profile?.is_blocked || profile?.role === "blocked");
}

export function isSuperAdmin(profile?: Profile | null) {
  return profile?.role === "super_admin" && !isBlocked(profile);
}

export function canAccessAdmin(profile?: Profile | null) {
  return Boolean(profile && !isBlocked(profile) && ["admin", "super_admin"].includes(profile.role));
}

export function canDriverAcceptOrder(profile?: Profile | null, order?: OrderLike | null) {
  return Boolean(
    profile &&
      order &&
      profile.role === "driver" &&
      profile.driver_status === "approved" &&
      !isBlocked(profile) &&
      !order.driver_id,
  );
}

export function validateOrderLimit(order: OrderLike, actualValue: number) {
  const limit = Number(order.authorized_purchase_limit ?? 0);
  return {
    ok: actualValue <= limit,
    extraPaymentRequired: Math.max(0, +(actualValue - limit).toFixed(2)),
  };
}
