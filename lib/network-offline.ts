import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import axios from "axios";

/** True when NetInfo reports no usable connection (airplane mode, no Wi‑Fi/cellular data). */
export function isNetInfoOffline(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/** True when we should attempt API / outbox sync (connected; reachable may still be null while iOS checks). */
export function isNetInfoOnline(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export async function fetchIsDeviceOffline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return isNetInfoOffline(net);
}

/** Axios / generic errors that usually mean the device cannot reach the API right now. */
export function looksOfflineError(e: unknown): boolean {
  if (axios.isAxiosError(e)) {
    if (e.code === "ERR_NETWORK" || !e.response) {
      return true;
    }
  }
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e as { message?: unknown }).message)
      : "";

  return /network/i.test(msg);
}
