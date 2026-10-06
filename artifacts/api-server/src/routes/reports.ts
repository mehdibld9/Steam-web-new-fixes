// @ts-nocheck
import express from "express";
import { db, reportsTable, usersTable, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireModOrAdmin } from "../middlewares/auth";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { targetType, targetId, reason, details } = req.body as {
    targetType: string;
    targetId: number;
    reason: string;
    details?: string;
  };

  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: "targetType, targetId, and reason are required" });
    return;
  }

  if (targetType === "account") {
    const [existingReport] = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(and(
        eq(reportsTable.reporterId, req.session.userId!),
        eq(reportsTable.targetType, "account"),
        eq(reportsTable.targetId, targetId),
      ))
      .limit(1);

    if (existingReport) {
      res.status(409).json({ error: "You have already reported this account." });
      return;
    }
  }

  let report;
  try {
    [report] = await db
      .insert(reportsTable)
      .values({
        reporterId: req.session.userId!,
        targetType,
        targetId,
        reason,
        details: details ?? null,
      })
      .returning();
  } catch (error: any) {
    if (
      targetType === "account" &&
      error?.code === "23505" &&
      error?.constraint === "reports_account_reporter_target_idx"
    ) {
      res.status(409).json({ error: "You have already reported this account." });
      return;
    }
    throw error;
  }

  res.status(201).json(report);
});

router.patch("/:id/action", requireModOrAdmin, async (req, res) => {
  const reportId = parseInt(req.params.id, 10);

  const [report] = await db
    .update(reportsTable)
    .set({ isActioned: true, isDismissed: true })
    .where(eq(reportsTable.id, reportId))
    .returning();

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const [reporter] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, report.reporterId))
    .limit(1);

  if (reporter) {
    await db.insert(notificationsTable).values({
      userId: reporter.id,
      type: "admin_update",
      actorUsername: "Admin",
      message: `✅ Your report (#${report.id}) has been reviewed and actioned by our moderation team. Thank you for helping keep the community safe.`,
      linkUrl: null,
      isRead: false,
    });
  }

  res.json({ ok: true });
});

export default router;
