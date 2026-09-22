import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const SESSION = { userId: "user_1", role: "CUSTOMER", profileComplete: true };
const PLAN_ID = "plan_1";
const PLAN_AMOUNT = new Prisma.Decimal(50);

type LedgerRow = { id: string; type: string; amount: Prisma.Decimal; balanceAfter: Prisma.Decimal; reference: string; reason?: string };
type OrderRow = { id: string; userId: string; planId: string; amount: Prisma.Decimal; currency: string; status: string; failureReason?: string | null };

type Options = {
  balance?: number;
  failSubscription?: boolean;
  orderStatusOnReload?: string;
};

function createDb(options: Options = {}) {
  const wallet = { id: "wallet_1", userId: SESSION.userId, currency: "KES", balance: new Prisma.Decimal(options.balance ?? 0), version: 0 };
  const ledger: LedgerRow[] = [];
  const orders: OrderRow[] = [];
  let seq = 0;

  const walletApi = {
    findUniqueOrThrow: async ({ where }: { where: { userId: string } }) => {
      if (where.userId !== wallet.userId) throw new Error("Wallet not found");
      return { ...wallet };
    },
    update: async ({ where, data }: { where: { id: string }; data: { balance?: Prisma.Decimal; version?: { increment: number } } }) => {
      if (where.id !== wallet.id) throw new Error("Wallet not found");
      if (data.balance !== undefined) wallet.balance = data.balance;
      if (data.version) wallet.version += data.version.increment;
      return { ...wallet };
    },
  };

  const walletLedgerApi = {
    findUnique: async ({ where }: { where: { reference: string } }) => ledger.find((row) => row.reference === where.reference) ?? null,
    create: async ({ data }: { data: Omit<LedgerRow, "id"> }) => {
      const row: LedgerRow = { id: `ledger_${++seq}`, ...data };
      ledger.push(row);
      return row;
    },
  };

  const txApi = { wallet: walletApi, walletLedger: walletLedgerApi };

  return {
    wallet,
    ledger,
    orders,
    prisma: {
      ...txApi,
      $transaction: async (fn: (tx: typeof txApi) => unknown) => fn(txApi),
      user: {
        findUniqueOrThrow: async () => ({ id: SESSION.userId, profile: { countryId: "country_1" } }),
      },
      planPrice: {
        findUnique: async () => ({ amount: PLAN_AMOUNT, currency: "KES", plan: { active: true, billingDays: 30 } }),
      },
      order: {
        create: async ({ data }: { data: Omit<OrderRow, "id" | "status"> }) => {
          const order: OrderRow = { id: `order_${++seq}`, status: "PENDING", ...data };
          orders.push(order);
          return order;
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const order = orders.find((row) => row.id === where.id);
          if (!order) return null;
          return options.orderStatusOnReload ? { ...order, status: options.orderStatusOnReload } : order;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<OrderRow> }) => {
          const order = orders.find((row) => row.id === where.id);
          if (!order) throw new Error("Order not found");
          Object.assign(order, data);
          return order;
        },
      },
      subscription: {
        create: async () => {
          if (options.failSubscription) throw new Error("Provisioning failed");
          return { id: "subscription_1" };
        },
      },
    },
  };
}

type Db = ReturnType<typeof createDb>;

async function purchase(db: Db, body: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getSession: async () => SESSION, createSession: async () => undefined }));
  vi.doMock("@/lib/prisma", () => ({ prisma: db.prisma }));
  const [route, wallet] = await Promise.all([import("./route"), import("@/lib/wallet")]);
  const res = await route.POST(
    new Request("http://localhost/api/panels/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json(), postLedger: wallet.postLedger };
}

describe("panel purchase refunds", () => {
  it("leaves the wallet and ledger untouched when the debit fails", async () => {
    const db = createDb({ balance: 0 });

    const res = await purchase(db, { planId: PLAN_ID });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Insufficient balance" });
    expect(db.wallet.balance.toString()).toBe("0");
    expect(db.ledger).toHaveLength(0);
  });

  it("refunds exactly once when provisioning fails after the debit committed", async () => {
    const db = createDb({ balance: 50, failSubscription: true });

    const res = await purchase(db, { planId: PLAN_ID });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Provisioning failed" });
    expect(db.ledger.map((row) => row.type)).toEqual(["PANEL_PURCHASE", "REFUND"]);
    expect(db.ledger.filter((row) => row.type === "REFUND")).toHaveLength(1);
    expect(db.wallet.balance.toString()).toBe("50");
    expect(db.orders[0].status).toBe("REFUNDED");
  });

  it("cannot refund the same order twice", async () => {
    const db = createDb({ balance: 50, failSubscription: true });

    const res = await purchase(db, { planId: PLAN_ID });
    await res.postLedger(SESSION.userId, PLAN_AMOUNT, "REFUND", `refund:${db.orders[0].id}`, "Automatic reversal after provisioning failure");

    expect(db.ledger.filter((row) => row.type === "REFUND")).toHaveLength(1);
    expect(db.wallet.balance.toString()).toBe("50");
  });

  it("does not refund an order that is already reversed", async () => {
    const db = createDb({ balance: 50, failSubscription: true, orderStatusOnReload: "REFUNDED" });

    const res = await purchase(db, { planId: PLAN_ID });

    expect(res.status).toBe(400);
    expect(db.ledger.map((row) => row.type)).toEqual(["PANEL_PURCHASE"]);
    expect(db.wallet.balance.toString()).toBe("0");
  });
});
