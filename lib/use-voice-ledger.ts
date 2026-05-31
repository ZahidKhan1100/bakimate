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
  const interimRef = useRef("");
  const finalResolver = useRef<((text: string) => void) | null>(null);

  const speechAvailable =
    Platform.OS !== "web" && Constants.appOwnership !== AppOwnership.Expo;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript?.trim() ?? "";
    if (!t) {
      return;
    }
    if (event.isFinal) {
      setInterimTranscript("");
      onInterim?.("");
      finalResolver.current?.(t);
      finalResolver.current = null;
    } else {
      setInterimTranscript(t);
      onInterim?.(t);
    }
  });

  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    setInterimTranscript("");
    finalResolver.current?.("");
    finalResolver.current = null;
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    if (finalResolver.current) {
      finalResolver.current(interimRef.current.trim());
      finalResolver.current = null;
    }
  });

  const listenOnce = useCallback(async (): Promise<string> => {
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

          const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (!p.granted) {
            Alert.alert(
              "Microphone / speech",
              "Grant microphone and speech recognition in Settings to record by voice.",
            );
            resolve("");
            return;
          }

          finalResolver.current = resolve;
          setInterimTranscript("");
          ExpoSpeechRecognitionModule.start({
            lang: locale,
            interimResults: true,
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
      ExpoSpeechRecognitionModule.stop();
    }
    setListening(false);
    setInterimTranscript("");
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
}
