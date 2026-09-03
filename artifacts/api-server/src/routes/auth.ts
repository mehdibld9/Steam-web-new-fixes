// @ts-nocheck
import express from "express";
import { getSetting } from "../lib/settings";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, ipBansTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  sendEmail,
  twoFactorEmailHtml,
  passwordChangeEmailHtml,
  registrationCodeEmailHtml,
} from "../lib/email";

const router = express.Router();

function normalizePremiumVisuals(user: any) {
  const active =
    user.premiumTier &&
    user.premiumExpiresAt &&
    new Date(user.premiumExpiresAt) > new Date();

  return {
    ...user,
    premiumTier: active ? user.premiumTier : null,
    nameColor: active ? user.nameColor : null,
    badgeType: active ? user.badgeType : null,
    badgeIconUrl: active ? user.badgeIconUrl : null,
    badgeIconLink: active ? user.badgeIconLink : null,
  };
}

function getClientIp(req: Parameters<typeof router.post>[1] extends (req: infer R, ...a: any[]) => any ? R : never): string {
  const forwarded = (req as any).headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return (req as any).socket?.remoteAddress ?? "unknown";
}

const ALLOWED_EMAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "yahoo.fr", "yahoo.co.uk", "hotmail.fr", "hotmail.co.uk", "live.com", "msn.com"];

function createVerificationCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, email, password } = parsed.data;

  // Only allow trusted email providers to reduce throwaway/bot accounts
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
    res.status(400).json({ error: "Only Gmail, Outlook, Hotmail, and Yahoo email addresses are accepted." });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

  // Check if IP is banned
  const [ipBan] = await db.select().from(ipBansTable).where(eq(ipBansTable.ip, ip)).limit(1);
  if (ipBan) {
    res.status(403).json({ error: "Registration is not available from your network." });
    return;
  }


  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existingEmail.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const startingPoints = await getSetting("points_registration");

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      email,
      passwordHash,
      registrationIp: ip,
      points: startingPoints,
      emailVerified: false,
    })
    .returning();

  const verificationCode = createVerificationCode();
  const codeHash = await bcrypt.hash(verificationCode, 10);
  await db.update(usersTable)
    .set({
     twoFactorCode: codeHash,
     twoFactorCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    .where(eq(usersTable.id, user.id));

  try {
    const verifyUrl = `${req.protocol}://${req.get("host")}/register`;
    await sendEmail(user.email, "Verify your Steam Family account", registrationCodeEmailHtml(verificationCode, user.username, verifyUrl));
  } catch (emailErr: any) {
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    const message = emailErr?.message ?? "";
    res.status(500).json({
     error: message.includes("SMTP is not configured")
       ? "Email delivery is not configured. Contact an administrator."
       : "We couldn't send the verification code. Please try again.",
    });
    return;
  }

  req.session.regenerate((err: any) => {
    if (err) { res.status(500).json({ error: "Session error" }); return; }
    (req.session as any).pendingRegistrationUserId = user.id;
    req.session.save((saveErr: any) => {
     if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
     res.status(201).json({
       requiresRegistrationTwoFactor: true,
       requiresEmailVerification: true,
       email: user.email,
     });
    });
  });
});

// POST /auth/verify-registration — activate a new account with its email code
router.post("/verify-registration", async (req, res) => {
  const { code } = req.body as { code?: string };
  const pendingUserId = (req.session as any).pendingRegistrationUserId;

  if (!pendingUserId) {
    res.status(400).json({ error: "No pending registration. Please register again." });
    return;
  }
  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    res.status(400).json({ error: "Enter the 6-digit verification code." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pendingUserId)).limit(1);
  if (!user || user.emailVerified) {
    res.status(400).json({ error: "This registration is no longer pending." });
    return;
  }
  const codeMatches = user.twoFactorCode
    ? await bcrypt.compare(code.trim(), user.twoFactorCode).catch(() => false)
    : false;
  if (!codeMatches) {
    res.status(401).json({ error: "Incorrect verification code." });
    return;
  }
  if (!user.twoFactorCodeExpiresAt || new Date() > new Date(user.twoFactorCodeExpiresAt)) {
    res.status(401).json({ error: "Verification code expired. Please register again." });
    return;
  }

  const [activated] = await db.update(usersTable)
    .set({ emailVerified: true, twoFactorCode: null, twoFactorCodeExpiresAt: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  delete (req.session as any).pendingRegistrationUserId;
  req.session.userId = activated.id;
  req.session.isAdmin = activated.isAdmin;
  req.session.isModerator = activated.isModerator;
  req.session._banCheckedAt = Date.now();
  req.session.save((saveErr: any) => {
    if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
    const { passwordHash: _, ...safeUser } = activated;
    res.status(200).json(normalizePremiumVisuals(safeUser));
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;

  const loginIpRaw = (req.headers["x-forwarded-for"] as string || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

  // Check if IP is banned before even looking up the user
  const [loginIpBan] = await db.select().from(ipBansTable).where(eq(ipBansTable.ip, loginIpRaw)).limit(1);
  if (loginIpBan) {
    res.status(403).json({ error: "Access from your network has been restricted." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned && user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
    await db.update(usersTable)
      .set({ isBanned: false, banReason: null, banExpiresAt: null })
      .where(eq(usersTable.id, user.id));
    user.isBanned = false;
    user.banReason = null;
    user.banExpiresAt = null;
  }

  // Record last login IP and timestamp for audit trail
  await db.update(usersTable).set({ lastLoginIp: loginIpRaw, lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  // --- 2FA check ---
  if (user.twoFactorEnabled) {
    const code = createVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await db.update(usersTable)
      .set({ twoFactorCode: codeHash, twoFactorCodeExpiresAt: expiresAt })
      .where(eq(usersTable.id, user.id));

    try {
      await sendEmail(user.email, "Your login code", twoFactorEmailHtml(code, user.username));
    } catch (emailErr: any) {
      const msg: string = emailErr?.message ?? "";
      // If SMTP is simply not configured yet, fall through to a normal login
      // so the admin can set it up without locking users out.
      if (msg.includes("SMTP is not configured")) {
        const { passwordHash: _pw, ...safeUserFallback } = user;
        req.session.regenerate((err) => {
          if (err) { res.status(500).json({ error: "Session error" }); return; }
          req.session.userId = user.id;
          req.session.isAdmin = user.isAdmin;
          req.session.isModerator = user.isModerator;
          req.session._banCheckedAt = Date.now();
          req.session.save((saveErr) => {
            if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
            res.status(200).json(normalizePremiumVisuals(safeUserFallback));
          });
        });
        return;
      }
      res.status(500).json({ error: "Failed to send verification email. " + msg });
      return;
    }

    // Store pending user in session (not fully authenticated yet)
    req.session.regenerate((err) => {
      if (err) { res.status(500).json({ error: "Session error" }); return; }
      (req.session as any).pending2faUserId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
        res.status(200).json({ requiresTwoFactor: true });
      });
    });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;

  // Regenerate session ID after login to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) { res.status(500).json({ error: "Session error" }); return; }
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;
    req.session.isModerator = user.isModerator;
    req.session._banCheckedAt = Date.now();
    req.session.save((saveErr) => {
      if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
      res.status(200).json(normalizePremiumVisuals(safeUser));
    });
  });
});

// POST /auth/verify-2fa — complete login after 2FA code is entered
router.post("/verify-2fa", async (req, res) => {
  const pendingUserId = (req.session as any).pending2faUserId;
  if (!pendingUserId) {
    res.status(400).json({ error: "No pending 2FA session. Please log in again." });
    return;
  }

  const { code } = req.body as { code: string };
  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    res.status(400).json({ error: "Invalid code format." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pendingUserId)).limit(1);
  if (!user) {
    res.status(400).json({ error: "User not found." });
    return;
  }

  const codeMatches = user.twoFactorCode
    ? await bcrypt.compare(code.trim(), user.twoFactorCode).catch(() => false)
    : false;
  if (!codeMatches) {
    res.status(401).json({ error: "Incorrect code. Please try again." });
    return;
  }

  if (!user.twoFactorCodeExpiresAt || new Date() > new Date(user.twoFactorCodeExpiresAt)) {
    res.status(401).json({ error: "Code has expired. Please log in again." });
    return;
  }

  // Clear the code
  await db.update(usersTable)
    .set({ twoFactorCode: null, twoFactorCodeExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  const { passwordHash: _, ...safeUser } = user;

  req.session.regenerate((err) => {
    if (err) { res.status(500).json({ error: "Session error" }); return; }
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;
    req.session.isModerator = user.isModerator;
    req.session._banCheckedAt = Date.now();
    req.session.save((saveErr) => {
      if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
      res.status(200).json(normalizePremiumVisuals(safeUser));
    });
  });
});

// GET /auth/2fa-status — returns whether 2FA is enabled for the logged-in user
router.get("/2fa-status", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ twoFactorEnabled: usersTable.twoFactorEnabled })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);
  res.json({ enabled: user?.twoFactorEnabled ?? false });
});

// POST /auth/2fa/enable — enable 2FA for the logged-in user
router.post("/2fa/enable", requireAuth, async (req, res) => {
  await db.update(usersTable)
    .set({ twoFactorEnabled: true })
    .where(eq(usersTable.id, req.session.userId!));
  res.json({ message: "Two-factor authentication enabled." });
});

// DELETE /auth/2fa — disable 2FA for the logged-in user
router.delete("/2fa", requireAuth, async (req, res) => {
  await db.update(usersTable)
    .set({ twoFactorEnabled: false, twoFactorCode: null, twoFactorCodeExpiresAt: null })
    .where(eq(usersTable.id, req.session.userId!));
  res.json({ message: "Two-factor authentication disabled." });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid", { path: "/" });
    res.json({ message: "Logged out" });
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (user.isBanned && user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
    await db.update(usersTable)
      .set({ isBanned: false, banReason: null, banExpiresAt: null })
      .where(eq(usersTable.id, user.id));
    user.isBanned = false;
    user.banReason = null;
    user.banExpiresAt = null;
  }

  // Strip server-only fields that the frontend never needs
  const {
    passwordHash: _pw,
    registrationIp: _rip,
    lastLoginIp: _llip,
    twoFactorCode: _tfc,
    twoFactorCodeExpiresAt: _tfce,
    emailVerificationToken: _evt,
    emailVerificationExpiresAt: _evte,
    ...safeUser
  } = user;
  res.set("Cache-Control", "private, no-store");
  res.json(normalizePremiumVisuals(safeUser));
});

// Update avatar URL and/or display name
router.put("/profile", requireAuth, async (req, res) => {
  const { avatarUrl, displayName } = req.body;
  if (typeof avatarUrl !== "string" && avatarUrl !== null && avatarUrl !== undefined) {
    res.status(400).json({ error: "Invalid avatarUrl" });
    return;
  }
  // Only allow http/https URLs to prevent javascript: or data: URI injection
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    res.status(400).json({ error: "avatarUrl must be a valid http or https URL" });
    return;
  }
  // Block private/local IP ranges (SSRF prevention).
  // Attackers set avatar URLs to local IPs so every visitor's browser
  // silently probes their local network when loading the leaderboard.
  if (avatarUrl) {
    try {
      const { hostname } = new URL(avatarUrl);
      const isPrivate =
        hostname === "localhost" ||
        hostname === "::1" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        /^127\./.test(hostname) ||                         // 127.0.0.0/8
        /^10\./.test(hostname) ||                          // 10.0.0.0/8
        /^192\.168\./.test(hostname) ||                    // 192.168.0.0/16
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||   // 172.16.0.0/12
        /^169\.254\./.test(hostname) ||                    // 169.254.0.0/16
        /^0\./.test(hostname);                             // 0.0.0.0/8
      if (isPrivate) {
        res.status(400).json({ error: "avatarUrl cannot point to a private or local network address" });
        return;
      }
    } catch {
      res.status(400).json({ error: "avatarUrl is not a valid URL" });
      return;
    }
  }
  if (displayName !== undefined && typeof displayName !== "string") {
    res.status(400).json({ error: "Invalid displayName" });
    return;
  }
  const updates: Record<string, any> = {};
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
  if (displayName !== undefined) {
    const trimmed = displayName.trim();
    if (trimmed && (trimmed.length < 2 || trimmed.length > 30)) {
      res.status(400).json({ error: "Display name must be 2–30 characters" });
      return;
    }
    updates.displayName = trimmed || null;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.session.userId!))
    .returning();
  const { passwordHash: _, ...safeUser } = updated;
  res.json(normalizePremiumVisuals(safeUser));
});

// Request a password-change code after validating the current password.
router.put("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const code = createVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const codeExpiresAt = Date.now() + 10 * 60 * 1000;

  try {
    await sendEmail(
      user.email,
      "Confirm your Steam Family password change",
      passwordChangeEmailHtml(code, user.username),
    );
  } catch (emailErr: any) {
    const message = emailErr?.message ?? "";
    res.status(500).json({
      error: message.includes("SMTP is not configured")
        ? "Email delivery is not configured. Contact an administrator."
        : "We couldn't send the confirmation code. Please try again.",
    });
    return;
  }

  (req.session as any).pendingPasswordChangeUserId = user.id;
  (req.session as any).pendingPasswordChangeHash = newHash;
  (req.session as any).pendingPasswordChangeCodeHash = codeHash;
  (req.session as any).pendingPasswordChangeCodeExpiresAt = codeExpiresAt;
  req.session.save((saveErr: any) => {
    if (saveErr) {
      res.status(500).json({ error: "Session error" });
      return;
    }
    res.json({ requiresPasswordChangeTwoFactor: true, email: user.email });
  });
});

// Complete a password change with the one-time email code.
router.post("/change-password/confirm", requireAuth, async (req, res) => {
  const { code } = req.body as { code?: string };
  const pendingUserId = (req.session as any).pendingPasswordChangeUserId;
  const pendingPasswordHash = (req.session as any).pendingPasswordChangeHash;
  const pendingCodeHash = (req.session as any).pendingPasswordChangeCodeHash;
  const pendingCodeExpiresAt = (req.session as any).pendingPasswordChangeCodeExpiresAt;

  if (!pendingUserId || pendingUserId !== req.session.userId || !pendingPasswordHash || !pendingCodeHash) {
    res.status(400).json({ error: "No pending password change. Request a new code." });
    return;
  }
  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    res.status(400).json({ error: "Enter the 6-digit confirmation code." });
    return;
  }

  const codeMatches = await bcrypt.compare(code.trim(), pendingCodeHash).catch(() => false);
  if (!codeMatches) {
    res.status(401).json({ error: "Incorrect confirmation code." });
    return;
  }
  if (!pendingCodeExpiresAt || Date.now() > pendingCodeExpiresAt) {
    res.status(401).json({ error: "Confirmation code expired. Request a new code." });
    return;
  }

  await db.update(usersTable)
    .set({
      passwordHash: pendingPasswordHash,
    })
    .where(eq(usersTable.id, pendingUserId));

  delete (req.session as any).pendingPasswordChangeUserId;
  delete (req.session as any).pendingPasswordChangeHash;
  delete (req.session as any).pendingPasswordChangeCodeHash;
  delete (req.session as any).pendingPasswordChangeCodeExpiresAt;
  req.session.save(() => {
    res.json({ message: "Password updated successfully." });
  });
});

// Delete own account
router.delete("/account", requireAuth, async (req, res) => {
  const { password, code } = req.body ?? {};
  if (!password) {
    res.status(400).json({ error: "Password required to delete account" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Banned users cannot delete their account to evade bans
  if (user.isBanned) {
    const isActiveBan = !user.banExpiresAt || new Date() < new Date(user.banExpiresAt);
    if (isActiveBan) {
      res.status(403).json({ error: "Banned accounts cannot be deleted" });
      return;
    }
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  if (user.twoFactorEnabled) {
    const sixDigitCode = typeof code === "string" ? code.trim() : "";

    if (!sixDigitCode) {
      const verificationCode = createVerificationCode();
      const codeHash = await bcrypt.hash(verificationCode, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.update(usersTable)
        .set({ twoFactorCode: codeHash, twoFactorCodeExpiresAt: expiresAt })
        .where(eq(usersTable.id, user.id));

      try {
        await sendEmail(user.email, "Confirm account deletion", twoFactorEmailHtml(verificationCode, user.username));
      } catch (emailErr: any) {
        const message = emailErr?.message ?? "";
        res.status(500).json({
          error: message.includes("SMTP is not configured")
            ? "Email delivery is not configured. Contact an administrator."
            : "We couldn't send the confirmation code. Please try again.",
        });
        return;
      }

      res.status(202).json({ requiresTwoFactor: true, email: user.email });
      return;
    }

    if (!/^\d{6}$/.test(sixDigitCode)) {
      res.status(400).json({ error: "Enter the 6-digit confirmation code." });
      return;
    }

    const codeMatches = user.twoFactorCode
      ? await bcrypt.compare(sixDigitCode, user.twoFactorCode).catch(() => false)
      : false;

    if (!codeMatches) {
      res.status(401).json({ error: "Incorrect confirmation code." });
      return;
    }

    if (!user.twoFactorCodeExpiresAt || new Date() > new Date(user.twoFactorCodeExpiresAt)) {
      res.status(401).json({ error: "Confirmation code expired. Please try again." });
      return;
    }

    await db.update(usersTable)
      .set({ twoFactorCode: null, twoFactorCodeExpiresAt: null })
      .where(eq(usersTable.id, user.id));
  }

  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  req.session.destroy(() => {
    res.clearCookie("connect.sid", { path: "/" });
    res.json({ message: "Account deleted" });
  });
});

export default router;
