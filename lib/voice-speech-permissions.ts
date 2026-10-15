import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Alert, Platform } from "react-native";

/** Microphone + speech recognition (iOS needs both for voice ledger). */
export async function ensureVoiceSpeechPermissions(): Promise<boolean> {
  const mic = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (mic.restricted) {
    Alert.alert(
      "Speech restricted",
      "Speech recognition is restricted on this device (Screen Time or privacy settings).",
    );
    return false;
  }
  if (!mic.granted) {
    Alert.alert(
      "Microphone / speech",
      "Grant microphone and speech recognition in Settings to record by voice.",
    );
    return false;
  }

  if (Platform.OS === "ios") {
    const speech = await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync();
    if (!speech.granted) {
      const asked = await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
      if (asked.restricted) {
        Alert.alert(
          "Speech restricted",
          "Speech recognition is restricted on this device (Screen Time or privacy settings).",
        );
        return false;
      }
      if (!asked.granted) {
        Alert.alert(
          "Speech recognition",
          "Allow speech recognition in Settings → BakiMate to use voice entry.",
        );
        return false;
      }
    }
  }

  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
    Alert.alert(
      "Voice unavailable",
      Platform.OS === "ios"
        ? "Speech recognition is not available on this device. Check Settings and try again."
        : "Speech recognition is not available on this device.",
    );
    return false;
  }

  return true;
}
