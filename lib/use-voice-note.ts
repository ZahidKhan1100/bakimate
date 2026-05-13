import Constants, { AppOwnership } from "expo-constants";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useState } from "react";
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

  const speechAvailable =
    Platform.OS !== "web" && Constants.appOwnership !== AppOwnership.Expo;

  useSpeechRecognitionEvent("result", (event) => {
    if (!event.isFinal) {
      return;
    }
    const t = event.results[0]?.transcript?.trim();
    if (t) {
      onAppendFinal(t);
    }
  });

  useSpeechRecognitionEvent("error", () => {
    setListening(false);
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
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
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!p.granted) {
        Alert.alert(
          "Microphone / speech",
          "Grant microphone + speech recognition in Settings to dictate notes.",
        );

        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: locale,
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
