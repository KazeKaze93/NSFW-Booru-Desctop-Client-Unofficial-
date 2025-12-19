import { eq } from "drizzle-orm";
import { getDatabase } from "../db";
import { settings } from "../db/schema";
import type { Settings } from "../db/schema";

export interface SettingsResponse {
  userId: string;
  hasApiKey: boolean;
  isSafeMode: boolean;
  isAdultConfirmed: boolean;
}

export class SettingsService {
  private get db() {
    return getDatabase();
  }

  /**
   * Получает настройки. Если их нет — создает дефолтные.
   */
  async getSettings(): Promise<Settings> {
    const config = await this.db.query.settings.findFirst();

    if (!config) {
      const [newConfig] = await this.db.insert(settings).values({}).returning();
      return newConfig;
    }

    return config;
  }

  /**
   * Специальный метод для UI: возвращает статус, скрывая сам ключ
   */
  async getSettingsStatus(): Promise<SettingsResponse> {
    const data = await this.getSettings();
    return {
      userId: data.userId ?? "",
      hasApiKey: !!data.encryptedApiKey && data.encryptedApiKey.length > 0,
      isSafeMode: data.isSafeMode ?? true,
      isAdultConfirmed: data.isAdultConfirmed ?? false,
    };
  }

  /**
   * Обновляет настройки.
   */
  async updateSettings(changes: Partial<Settings>): Promise<boolean> {
    const current = await this.getSettings();

    const result = await this.db
      .update(settings)
      .set(changes)
      .where(eq(settings.id, current.id))
      .run();

    return result.changes > 0;
  }
}
