import { db, messagesTable } from "@workspace/db";
import { lt } from "drizzle-orm";
import { logger } from "./logger";

const MESSAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function deleteExpiredMessages(): Promise<number> {
  const cutoff = new Date(Date.now() - MESSAGE_RETENTION_MS);
  const result = await db
    .delete(messagesTable)
    .where(lt(messagesTable.createdAt, cutoff));
  return result.rowCount ?? 0;
}

export function startMessageCleanupScheduler(): void {
  logger.info("Message cleanup scheduler started (retention: 7 days)");

  const run = async () => {
    try {
      const deletedCount = await deleteExpiredMessages();
      if (deletedCount > 0) logger.info({ deletedCount }, "Deleted expired messages");
    } catch (err) {
      logger.error({ err }, "Message cleanup failed");
    }
  };

  void run();
  setInterval(() => void run(), CLEANUP_INTERVAL_MS);
}
