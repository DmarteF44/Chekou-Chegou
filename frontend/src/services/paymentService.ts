// Mercado Pago Access Token nunca deve ficar no app.
// Pagamento real deve ser criado por backend/Edge Function.
// Confirmação real deve vir por webhook.
// O app apenas exibe status recebido do backend.

export type PaymentIntent = {
  id: string;
  status: "pending" | "approved" | "rejected";
  amount: number;
};

export const paymentService = {
  async createPaymentIntent(amount: number): Promise<PaymentIntent> {
    return { id: `mock_payment_${Date.now()}`, status: "pending", amount };
  },

  async approvePayment(intentId: string) {
    return { id: intentId, status: "approved" as const };
  },

  async rejectPayment(intentId: string) {
    return { id: intentId, status: "rejected" as const };
  },

  async requestComplementPayment(orderId: string, amount: number) {
    return { orderId, amount, status: "pending" as const };
  },

  async approveComplementPayment(orderId: string) {
    return { orderId, status: "approved" as const };
  },

  async refundDifference(orderId: string, amount: number) {
    return { orderId, amount, status: "refund_simulated" as const };
  },

  async releaseDriverPayment(orderId: string, driverId: string, amount: number) {
    return { orderId, driverId, amount, status: "released_simulated" as const };
  },

  async holdOperationalBalance(driverId: string, amount: number) {
    return { driverId, amount, status: "held_simulated" as const };
  },

  calculateSplit(totalPaid: number, deliveryFee: number, platformFee: number) {
    return {
      driver: deliveryFee,
      platform: platformFee,
      purchaseReserve: Math.max(0, totalPaid - deliveryFee - platformFee),
    };
  },
};
