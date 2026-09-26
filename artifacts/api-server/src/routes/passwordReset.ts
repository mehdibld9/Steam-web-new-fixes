// @ts-nocheck
import express from "express";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail, passwordResetOtpEmailHtml } from "../lib/email";

const router = express.Router();

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Normalize to lowercase + trim so lookup matches regardless of how the
  // email was stored at registration (case-insensitive comparison)
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!user) {
    // Don't reveal whether email exists
    res.json({ message: "If an account with that email exists, a reset code has been sent." });
    return;
  }

  // Generate a 6-digit OTP code
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    token: code,
    expiresAt,
  });

  try {
    await sendEmail(user.email, "SteamFamily: Confirm your password change", passwordResetOtpEmailHtml(code, user.username));
  } catch (emailErr: any) {
    // Log to server so SMTP issues are visible, but don't leak details to the client
    console.error("[forgot-password] Failed to send reset email to", user.email, ":", emailErr?.message ?? emailErr);
  }

  res.json({ message: "If an account with that email exists, a reset code has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Code and new password (min 6 chars) are required" });
    return;
  }

  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, String(token)),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!resetToken || resetToken.usedAt) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, resetToken.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, resetToken.id));

  res.json({ message: "Password reset successfully. You can now log in." });
});

export default router;
