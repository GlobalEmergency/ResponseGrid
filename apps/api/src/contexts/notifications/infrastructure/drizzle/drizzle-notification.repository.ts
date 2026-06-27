import { eq, desc } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { Notification, NotificationSnapshot } from '../../domain/notification';
import { NotificationId } from '../../domain/notification-id';
import { NotificationType } from '../../domain/notification-type';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { notificationsTable } from './schema';

type Row = typeof notificationsTable.$inferSelect;

function rowToSnapshot(row: Row): NotificationSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    emergencyId: row.emergencyId ?? null,
    type: row.type as NotificationType,
    message: row.message,
    link: row.link ?? null,
    read: row.read,
    createdAt: row.createdAt,
  };
}

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  async save(notification: Notification): Promise<void> {
    const s = notification.toSnapshot();
    await this.db
      .insert(notificationsTable)
      .values({
        id: s.id,
        userId: s.userId,
        emergencyId: s.emergencyId ?? null,
        type: s.type,
        message: s.message,
        link: s.link ?? null,
        read: s.read,
        createdAt: s.createdAt,
      })
      .onConflictDoUpdate({
        target: notificationsTable.id,
        set: { read: s.read },
      });
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    const rows = await this.db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id.value))
      .limit(1);
    return rows[0] ? Notification.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    const rows = await this.db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
    return rows.map((r) => Notification.fromSnapshot(rowToSnapshot(r)));
  }

  async markAllReadForUser(userId: string): Promise<void> {
    await this.db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.userId, userId));
  }
}
