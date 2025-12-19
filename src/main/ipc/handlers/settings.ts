import { ipcMain, safeStorage } from "electron";
import { IPC_CHANNELS } from "../channels";
import { z } from "zod";
import { logger } from "../../lib/logger";
import { SettingsService } from "../../services/settings.service";
import type { Settings } from "../../db/schema";

const SettingsPayloadSchema = z.object({
  userId: z.string().optional(),
  apiKey: z.string().optional(),
  isSafeMode: z.boolean().optional(),
  isAdultConfirmed: z.boolean().optional(),
});

export const registerSettingsHandlers = (service: SettingsService) => {
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.GET);
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.SAVE);

  // GET Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async () => {
    try {
      return await service.getSettingsStatus();
    } catch (e) {
      logger.error("IPC: Error getting settings:", e);
      throw new Error("Failed to get settings");
    }
  });

  // SAVE Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS.SAVE, async (_, payload: unknown) => {
    const validation = SettingsPayloadSchema.safeParse(payload);

    if (!validation.success) {
      logger.error("Settings validation failed:", validation.error.issues);
      return false;
    }

    const { userId, apiKey, isSafeMode, isAdultConfirmed } = validation.data;

    let encryptedApiKey: string | undefined;

    if (apiKey) {
      if (!safeStorage.isEncryptionAvailable()) {
        logger.error("safeStorage is not available.");
        return false;
      }
      try {
        encryptedApiKey = safeStorage.encryptString(apiKey).toString("base64");
      } catch (e) {
        logger.error("Encryption failed:", e);
        return false;
      }
    }

    try {
      const updateData: Partial<Settings> = {};

      if (userId !== undefined) updateData.userId = userId;
      if (encryptedApiKey !== undefined)
        updateData.encryptedApiKey = encryptedApiKey;
      if (isSafeMode !== undefined) updateData.isSafeMode = isSafeMode;
      if (isAdultConfirmed !== undefined)
        updateData.isAdultConfirmed = isAdultConfirmed;

      const result = await service.updateSettings(updateData);

      logger.info("IPC: Settings saved.");
      return result;
    } catch (e) {
      logger.error("IPC: Error saving settings:", e);
      return false;
    }
  });
};
