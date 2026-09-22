import { prisma } from "./prisma";
import { deployApi } from "./deploy-api";

export type BotField = { key: string; label: string; type: "text" | "password" | "textarea" | "select"; required?: boolean; placeholder?: string; options?: string[] | { label: string; value: string }[] };
export type CatalogueBot = { key: string; name: string; label: string; description?: string; category?: string; fields: BotField[] };

function normalize(raw: unknown): CatalogueBot[] {
  const source = (raw as { data?: unknown; bots?: unknown })?.data ?? (raw as { bots?: unknown })?.bots ?? raw;
  if (!Array.isArray(source)) return [];
  return source.map((item: unknown) => {
    const b = item as Record<string, unknown>;
    return { key: String(b.key ?? b.id ?? ""), name: String(b.name ?? b.label ?? b.key ?? "Bot"), label: String(b.label ?? b.name ?? b.key ?? "Bot"), description: typeof b.description === "string" ? b.description : undefined, category: typeof b.category === "string" ? b.category : undefined, fields: Array.isArray(b.fields) ? b.fields as BotField[] : [] };
  }).filter(b => b.key);
}

export async function getBotCatalogue() {
  try {
    const bots = normalize(await deployApi.catalogue());
    if (bots.length) {
      await prisma.setting.upsert({ where: { key: "bot_catalogue_cache" }, create: { key: "bot_catalogue_cache", value: bots }, update: { value: bots } }).catch(() => null);
      return { bots, cached: false };
    }
  } catch {}
  const cached = await prisma.setting.findUnique({ where: { key: "bot_catalogue_cache" } }).catch(() => null);
  return { bots: normalize(cached?.value), cached: true };
}

export async function getDeploymentPrice(countryId: string, botKey: string) {
  return await prisma.deploymentPrice.findFirst({ where: { countryId, botKey, active: true } }) ?? await prisma.deploymentPrice.findFirst({ where: { countryId, botKey: null, active: true } });
}
