import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // "account" | "user"
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  isActioned: boolean("is_actioned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("reports_account_reporter_target_idx")
    .on(t.reporterId, t.targetId)
    .where(sql`${t.targetType} = 'account'`),
]);

export type Report = typeof reportsTable.$inferSelect;
