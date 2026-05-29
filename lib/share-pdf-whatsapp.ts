import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import RNShare from "react-native-share";

import { normalizePhoneForWaMe } from "@/lib/phone-wa-me";

const PDF_MIME = "application/pdf";
const SHARE_FILENAME = "bakimate-document.pdf";

type SharePdfOpts = {
  whatsappPhone?: string | null;
};

function normalizeLocalFileUri(uri: string): string {
  return uri.startsWith("file://") ? uri : `file://${uri}`;
}

/**
 * iOS treats `file://` URLs as link text in WhatsApp (path pasted, not attached).
 * Share as base64 so UIActivityViewController sends a real PDF document.
 */
async function sharePdfOnIos(localUri: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await RNShare.open({
    url: `data:${PDF_MIME};base64,${base64}`,
    type: PDF_MIME,
    filename: SHARE_FILENAME,
    failOnCancel: false,
  });
}

/**
 * After a PDF is saved locally:
 * - **Android** + phone: WhatsApp chat for that number with PDF attached (`shareSingle`).
 * - **iOS**: base64 `Share.open` — avoids file-path-as-text in WhatsApp / Messages.
 */
export async function sharePdfFileWithWhatsAppTarget(fileUri: string, opts: SharePdfOpts = {}): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error("PDF share is not supported on web.");
  }

  const localUri = normalizeLocalFileUri(fileUri);
  const digits = normalizePhoneForWaMe(opts.whatsappPhone);

  if (Platform.OS === "ios") {
    await sharePdfOnIos(localUri);
    return;
  }

  if (digits) {
    try {
      const result = await RNShare.shareSingle({
        social: RNShare.Social.WHATSAPP,
        url: localUri,
        type: PDF_MIME,
        filename: SHARE_FILENAME,
        whatsAppNumber: digits,
      } as Parameters<typeof RNShare.shareSingle>[0]);

      if (result.success) {
        return;
      }
    } catch {
      /** Fall back to share sheet below. */
    }
  }

  const sharable = await Sharing.isAvailableAsync();
  if (!sharable) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(localUri, { mimeType: PDF_MIME, UTI: "com.adobe.pdf" });
}
