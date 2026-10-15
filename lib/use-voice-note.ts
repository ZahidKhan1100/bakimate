import { ensureVoiceSpeechPermissions } from "@/lib/voice-speech-permissions";
import Constants, { AppOwnership } from "expo-constants";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

type Params = {
  locale?: string;
  onAppendFinal: (text: string) => void;
};

/**
 * Speech-to-text (custom dev builds / standalone / dev client). Not available inside Expo Go.
 */
export function useVoiceNoteComposer({ locale = "en-US", onAppendFinal }: Params) {
  const [listening, setListening] = useState(false);
  const latestTranscriptRef = useRef("");

  const speechAvailable =
    Platform.OS !== "web" && Constants.appOwnership !== AppOwnership.Expo;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript?.trim() ?? "";
    if (!t) {
      return;
    }
    latestTranscriptRef.current = t;
    if (event.isFinal) {
      latestTranscriptRef.current = "";
      onAppendFinal(t);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    latestTranscriptRef.current = "";
    const msg = event.message?.trim();
    if (msg && event.error !== "aborted" && event.error !== "no-speech") {
      Alert.alert("Voice recognition", msg);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    const fallback = latestTranscriptRef.current.trim();
    if (fallback) {
      onAppendFinal(fallback);
    }
    latestTranscriptRef.current = "";
  });

  const toggleListening = useCallback(async () => {
    if (!speechAvailable) {
      Alert.alert("Voice notes", "Use a development/production build with native speech libraries (not Expo Go). You can still use the keyboard voice input when available.");
      return;
    }
    try {
      if (listening) {
        ExpoSpeechRecognitionModule.stop();

        return;
      }
      const ok = await ensureVoiceSpeechPermissions();
      if (!ok) {
        return;
      }

      if (Platform.OS === "ios") {
        ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(true, {
          notifyOthersOnDeactivation: true,
        });
      }

      latestTranscriptRef.current = "";
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        continuous: false,
        iosTaskHint: "dictation",
      });
      setListening(true);
    } catch (e) {
      Alert.alert("Voice recognition", String(e));
      setListening(false);
    }
  }, [listening, locale, speechAvailable]);

  return {
    speechAvailable,
    listening,
    toggleListening,
  };
}
