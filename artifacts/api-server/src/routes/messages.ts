// @ts-nocheck
import express from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, sql, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();
const MESSAGES_DISABLED_ERROR =
  "Private messages are temporarily unavailable. Please join our Telegram group for support and community updates: https://t.me/steam_family_chat";

// Get all conversations (unique users I've chatted with)
router.get("/conversations", requireAuth, async (req, res) => {
  res.status(503).json({ error: MESSAGES_DISABLED_ERROR });
  return;

  // Pre-aggregate unread counts once, then join — avoids a correlated subquery per row
  const rows = await db.execute(sql`
    WITH unread_counts AS (
      SELECT sender_id, COUNT(*) AS unread_count
      FROM messages
      WHERE receiver_id = ${myId} AND is_read = FALSE
      GROUP BY sender_id
    ),
    latest_per_partner AS (
      SELECT DISTINCT ON (partner_id)
        partner_id,
        m.id,
        m.content,
        m.created_at,
        m.is_read,
        m.sender_id,
        COALESCE(u.display_name, u.username) AS partner_username,
        u.avatar_url    AS partner_avatar_url,
        u.is_admin      AS partner_is_admin,
        u.is_moderator  AS partner_is_moderator,
        u.name_color      AS partner_name_color,
        u.badge_type      AS partner_badge_type,
        u.badge_icon_url  AS partner_badge_icon_url,
        u.badge_icon_link AS partner_badge_icon_link,
        u.premium_tier    AS partner_premium_tier,
        u.premium_expires_at AS partner_premium_expires_at
      FROM (
        SELECT CASE WHEN sender_id = ${myId} THEN receiver_id ELSE sender_id END AS partner_id, id
        FROM messages
        WHERE sender_id = ${myId} OR receiver_id = ${myId}
      ) conv
      JOIN messages m ON m.id = conv.id
      JOIN users u ON u.id = partner_id
      ORDER BY partner_id, m.created_at DESC
    )
    SELECT lp.*, COALESCE(uc.unread_count, 0) AS unread_count
    FROM latest_per_partner lp
    LEFT JOIN unread_counts uc ON uc.sender_id = lp.partner_id
    ORDER BY lp.created_at DESC
  `);

  const now = new Date();
  res.json(
    rows.rows.map((row: any) => {
      const premiumActive =
        row.partner_premium_tier &&
        row.partner_premium_expires_at &&
        new Date(row.partner_premium_expires_at) > now;

      return {
        ...row,
        partner_premium_tier: premiumActive ? row.partner_premium_tier : null,
        partner_name_color: premiumActive ? row.partner_name_color : null,
        partner_badge_type: premiumActive ? row.partner_badge_type : null,
        partner_badge_icon_url: premiumActive ? row.partner_badge_icon_url : null,
        partner_badge_icon_link: premiumActive ? row.partner_badge_icon_link : null,
      };
    }),
  );
});

// Unread count — must be defined BEFORE /:userId to avoid route shadowing
router.get("/unread/count", requireAuth, async (req, res) => {
  res.json({ count: 0 });
});

// Get messages with a specific user
router.get("/:userId", requireAuth, async (req, res) => {
  res.status(503).json({ error: MESSAGES_DISABLED_ERROR });
});

// Delete a message (only own messages)
router.delete("/:messageId", requireAuth, async (req, res) => {
  res.status(503).json({ error: MESSAGES_DISABLED_ERROR });
});

// Send a message
router.post("/", requireAuth, async (req, res) => {
  res.status(503).json({ error: MESSAGES_DISABLED_ERROR });
});

export default router;
