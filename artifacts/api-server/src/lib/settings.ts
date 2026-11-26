import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const XP_DEFAULTS = {
  xp_upload_account: 50,
  points_upload_account: 50,
  xp_redeem_adlink: 20,
  xp_post_comment: 10,
  xp_like_comment: 5,
  xp_like_account: 5,
  points_registration: 100,
  premium_points_price: 500,
  premium_usd_cents: 999,
  pro_usd_cents: 1999,
  premium_discount_percent: 0,
} as const;

export type XpSettingKey = keyof typeof XP_DEFAULTS;

export async function isTwoFactorSystemEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "two_factor_system_enabled"))
    .limit(1);

  return row?.value !== "0";
}

export async function isRegistrationEmailVerificationEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "register_email_verification_enabled"))
    .limit(1);

  return row?.value !== "0";
}

// ── In-memory TTL cache ──────────────────────────────────────────────────────
// Avoids a DB round-trip on every user action (comments, likes, uploads, etc.).
// Settings changes take effect within 60 s without requiring a server restart.
const settingsCache = new Map<string, { value: number; expiresAt: number }>();
const SETTINGS_TTL = 60_000; // 60 seconds

/** Wipe the cache after admin updates so changes take effect immediately. */
export function invalidateSettingsCache(): void {
  settingsCache.clear();
}

export async function getSetting(key: XpSettingKey): Promise<number> {
  const now = Date.now();
  const hit = settingsCache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);

  const parsed = row ? parseInt(row.value, 10) : NaN;
  const result = isNaN(parsed) ? XP_DEFAULTS[key] : parsed;
  settingsCache.set(key, { value: result, expiresAt: now + SETTINGS_TTL });
  return result;
}

export async function getAllXpSettings(): Promise<typeof XP_DEFAULTS> {
  const now = Date.now();

  // Serve entirely from cache if every key is still fresh
  const keys = Object.keys(XP_DEFAULTS) as XpSettingKey[];
  const allFresh = keys.every((k) => {
    const hit = settingsCache.get(k);
    return hit && hit.expiresAt > now;
  });

  if (allFresh) {
    const result = { ...XP_DEFAULTS };
    for (const k of keys) (result as any)[k] = settingsCache.get(k)!.value;
    return result;
  }

  const rows = await db.select().from(siteSettingsTable);

  const result = { ...XP_DEFAULTS };
  for (const row of rows) {
    if (row.key in XP_DEFAULTS) {
      const parsed = parseInt(row.value, 10);
      if (!isNaN(parsed)) {
        (result as any)[row.key] = parsed;
        settingsCache.set(row.key, { value: parsed, expiresAt: now + SETTINGS_TTL });
      }
    }
  }
  return result;
}
