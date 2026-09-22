import crypto from "node:crypto";

export type PaymentRequest = { reference: string; amount: number; currency: string; gateway: string; email: string; phone: string; firstName: string; lastName: string };
export type PaymentResult = { providerReference: string; checkoutUrl?: string; status: "pending" | "processing" };

export interface PaymentGateway { initialize(input: PaymentRequest): Promise<PaymentResult>; verify(reference: string): Promise<{ paid: boolean; amount: number; currency: string }>; verifyWebhook(raw: string, signature: string | null): boolean }

class PaystackGateway implements PaymentGateway {
  private key = process.env.PAYSTACK_SECRET_KEY;
  private configured() { if (!this.key) throw new Error("Paystack is not configured"); }
  async initialize(i: PaymentRequest) {
    this.configured();
    const res = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: i.email, amount: Math.round(i.amount * 100), currency: i.currency, reference: i.reference, callback_url: `${process.env.NOVA_APP_URL}/wallet/callback` }) });
    if (!res.ok) throw new Error("Payment provider unavailable");
    const json = await res.json();
    return { providerReference: json.data.reference, checkoutUrl: json.data.authorization_url, status: "pending" } as PaymentResult;
  }
  async verify(reference: string) {
    this.configured();
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${this.key}` }, cache: "no-store" });
    if (!res.ok) throw new Error("Payment verification failed");
    const j = await res.json(); return { paid: j.data.status === "success", amount: j.data.amount / 100, currency: j.data.currency };
  }
  verifyWebhook(raw: string, signature: string | null) { return !!this.key && !!signature && crypto.createHmac("sha512", this.key).update(raw).digest("hex") === signature; }
}

class XdigitexGateway implements PaymentGateway {
  private key = process.env.XDIGITEX_PAY_API_KEY;
  private base = process.env.XDIGITEX_PAY_BASE_URL || "https://pay.xdigitex.space/api";
  private configured() { if (!this.key) throw new Error("Xdigitex Pay is not configured"); }
  async initialize(i: PaymentRequest) {
    this.configured();
    const res = await fetch(`${this.base}/payments/initiate`, { method: "POST", headers: { "X-API-Key": this.key!, "Content-Type": "application/json" }, body: JSON.stringify({ amount: i.amount, currency: i.currency, gateway: i.gateway, email: i.email, phone: i.phone, first_name: i.firstName, last_name: i.lastName, description: "Nova Host wallet deposit", callback_url: `${process.env.NOVA_APP_URL}/wallet/callback`, webhook_url: `${process.env.NOVA_APP_URL}/api/webhooks/xdigitex`, reference: i.reference }) });
    if (!res.ok) throw new Error("Payment provider unavailable");
    const j = await res.json(); return { providerReference: j.reference || j.data?.reference, checkoutUrl: j.checkout_url || j.data?.checkout_url, status: "pending" } as PaymentResult;
  }
  async verify(reference: string) {
    this.configured(); const res = await fetch(`${this.base}/payments/${encodeURIComponent(reference)}/status`, { headers: { "X-API-Key": this.key! }, cache: "no-store" });
    if (!res.ok) throw new Error("Payment verification failed"); const j = await res.json(); const d = j.data || j; return { paid: ["success", "completed", "paid"].includes(String(d.status).toLowerCase()), amount: Number(d.amount), currency: d.currency };
  }
  verifyWebhook(raw: string, signature: string | null) { const key = process.env.XDIGITEX_WEBHOOK_SECRET; return !!key && !!signature && crypto.createHmac("sha256", key).update(raw).digest("hex") === signature; }
}

export function resolvePaymentProvider(provider: "PAYSTACK" | "XDIGITEX"): PaymentGateway { return provider === "PAYSTACK" ? new PaystackGateway() : new XdigitexGateway(); }
