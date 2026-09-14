// @ts-nocheck
import express from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();

// GET /api/notifications — latest 30 for current user
router.get("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);
  res.json(rows);
});

// GET /api/notifications/unread/count
router.get("/unread/count", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.set("Cache-Control", "private, max-age=30");
  res.json({ count: Number(count) });
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

// DELETE /api/notifications/:id — remove a notification after it is viewed
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const notificationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(notificationId)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId),
      ),
    );
  res.json({ ok: true });
});

export default router;
