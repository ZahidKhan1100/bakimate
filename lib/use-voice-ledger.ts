import { ensureVoiceSpeechPermissions } from "@/lib/voice-speech-permissions";
import Constants, { AppOwnership } from "expo-constants";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

type Params = {
  locale: string;
  contextualStrings?: string[];
  onInterim?: (text: string) => void;
};

/**
 * Speech-to-text for voice ledger (custom dev builds / standalone). Not available in Expo Go.
 */
export function useVoiceLedgerCapture({ locale, contextualStrings, onInterim }: Params) {
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const latestTranscriptRef = useRef("");
  const finalResolver = useRef<((text: string) => void) | null>(null);

  const speechAvailable =
    Platform.OS !== "web" && Constants.appOwnership !== AppOwnership.Expo;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript?.trim() ?? "";
    if (!t) {
      return;
    }
    latestTranscriptRef.current = t;
    if (event.isFinal) {
      setInterimTranscript("");
      onInterim?.("");
      latestTranscriptRef.current = "";
      finalResolver.current?.(t);
      finalResolver.current = null;
    } else {
      setInterimTranscript(t);
      onInterim?.(t);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setInterimTranscript("");
    latestTranscriptRef.current = "";
    if (finalResolver.current) {
      finalResolver.current("");
      finalResolver.current = null;
    }
    const msg = event.message?.trim();
    if (msg && event.error !== "aborted" && event.error !== "no-speech") {
      Alert.alert("Voice recognition", msg);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    if (finalResolver.current) {
      const fallback = latestTranscriptRef.current.trim();
      finalResolver.current(fallback);
      finalResolver.current = null;
      setInterimTranscript("");
      latestTranscriptRef.current = "";
    }
  });

  const listenOnce = useCallback(async (localeOverride?: string): Promise<string> => {
    const lang = localeOverride ?? locale;
    if (!speechAvailable) {
      Alert.alert("Voice", "Use a development or production build with speech recognition (not Expo Go).");
      return "";
    }

    return new Promise((resolve) => {
      void (async () => {
        try {
          if (listening) {
            ExpoSpeechRecognitionModule.stop();
            setListening(false);
            resolve("");
            return;
          }

          const ok = await ensureVoiceSpeechPermissions();
          if (!ok) {
            resolve("");
            return;
          }

          if (Platform.OS === "ios") {
            ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(true, {
              notifyOthersOnDeactivation: true,
            });
          }

          finalResolver.current = resolve;
          setInterimTranscript("");
          latestTranscriptRef.current = "";
          ExpoSpeechRecognitionModule.start({
            lang,
            interimResults: true,
            continuous: false,
            iosTaskHint: "confirmation",
            contextualStrings: contextualStrings?.length ? contextualStrings : undefined,
          });
          setListening(true);
        } catch (e) {
          Alert.alert("Voice recognition", String(e));
          setListening(false);
          finalResolver.current = null;
          resolve("");
        }
      })();
    });
  }, [contextualStrings, listening, locale, speechAvailable]);

  const cancelListening = useCallback(() => {
    if (listening) {
      ExpoSpeechRecognitionModule.abort();
    }
    setListening(false);
    setInterimTranscript("");
    latestTranscriptRef.current = "";
    finalResolver.current?.("");
    finalResolver.current = null;
  }, [listening]);

  return {
    speechAvailable,
    listening,
    interimTranscript,
    listenOnce,
    cancelListening,
  };
};
