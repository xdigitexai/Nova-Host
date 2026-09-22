import { Prisma, LedgerType } from "@prisma/client";
import { prisma } from "./prisma";

export async function postLedger(userId: string, amount: Prisma.Decimal | number, type: LedgerType, reference: string, reason?: string) {
  const delta = new Prisma.Decimal(amount);
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    const next = wallet.balance.add(delta);
    if (next.isNegative()) throw new Error("Insufficient balance");
    const exists = await tx.walletLedger.findUnique({ where: { reference } });
    if (exists) return exists;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: next, version: { increment: 1 } } });
    return tx.walletLedger.create({ data: { walletId: wallet.id, type, amount: delta, balanceAfter: next, reference, reason } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function creditVerifiedDeposit(transactionId: string) {
  const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } });
  if (transaction.status === "COMPLETED") return transaction;
  await postLedger(transaction.userId, transaction.amount, "DEPOSIT", `deposit:${transaction.id}`);
  return prisma.transaction.update({ where: { id: transaction.id }, data: { status: "COMPLETED", completedAt: new Date() } });
}
