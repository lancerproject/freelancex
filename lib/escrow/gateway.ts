// Payment gateway = a DUMB PIPE. It is only ever asked to do two things:
//   1) pull money IN from a client (charge their saved method) when funding,
//   2) push money OUT (payout to a freelancer, or refund to a client).
// It owns NONE of the escrow/milestone/fee logic — that all lives in the
// database functions. This interface lets us build and test the whole system
// now with a simulated adapter, and drop in a real provider (Stripe/PayPal/
// Payoneer) later by implementing the same three methods.

export type GatewayResult =
  | { ok: true; reference: string }
  | { ok: false; error: string; retryable: boolean };

export interface PaymentGateway {
  // Pull money in from a client's saved method (funding a milestone / bonus).
  charge(input: {
    userId: string;
    amount: number; // milestone + client fee, already computed by the caller
    currency: string;
    methodToken: string; // gateway token, never a raw card/bank number
    idempotencyKey: string;
  }): Promise<GatewayResult>;

  // Push money out to a freelancer's payout method (withdrawal).
  payout(input: {
    userId: string;
    amount: number;
    currency: string;
    methodToken: string;
    idempotencyKey: string;
  }): Promise<GatewayResult>;

  // Return money to a client's original method (refund).
  refund(input: {
    amount: number;
    currency: string;
    originalReference: string | null;
    idempotencyKey: string;
  }): Promise<GatewayResult>;
}

// Simulated adapter — deterministic, no network. Approves everything and hands
// back a reference so the ledger and jobs can be exercised end-to-end today.
// Real providers replace this without touching any escrow logic.
class SimulatedGateway implements PaymentGateway {
  private ref(prefix: string, key: string) {
    return `sim_${prefix}_${key}`;
  }
  async charge(i: { idempotencyKey: string }): Promise<GatewayResult> {
    return { ok: true, reference: this.ref("ch", i.idempotencyKey) };
  }
  async payout(i: { idempotencyKey: string }): Promise<GatewayResult> {
    return { ok: true, reference: this.ref("po", i.idempotencyKey) };
  }
  async refund(i: { idempotencyKey: string }): Promise<GatewayResult> {
    return { ok: true, reference: this.ref("rf", i.idempotencyKey) };
  }
}

// Gateway selection is EXPLICIT via the PAYMENTS_MODE env var, so production
// can never silently run real-money flows on the simulator:
//   • PAYMENTS_MODE unset | "simulated" → SimulatedGateway (in production this
//     logs a loud warning so it can't go unnoticed).
//   • PAYMENTS_MODE = "live" (or anything else) → throws until a real provider
//     is wired here, rather than quietly approving fake charges/payouts.
function selectGateway(): PaymentGateway {
  const mode = (process.env.PAYMENTS_MODE || "simulated").toLowerCase();
  if (mode === "simulated") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[payments] SIMULATED gateway is active in PRODUCTION. No real money moves. " +
          "Set PAYMENTS_MODE=live and wire a real provider in lib/escrow/gateway.ts before taking real payments."
      );
    }
    return new SimulatedGateway();
  }
  throw new Error(
    `[payments] PAYMENTS_MODE="${mode}" but no live payment gateway is wired. ` +
      "Implement a real PaymentGateway in lib/escrow/gateway.ts and select it here."
  );
}

// The active gateway.
export const gateway: PaymentGateway = selectGateway();
