import { useNetInfo } from "@react-native-community/netinfo";
import { Platform } from "react-native";

/**
 * While RevenueCat + `/shop` entitlement data is loading, recording buttons stay disabled on native.
 * When the device reports no connection, skip that block so users can queue transactions offline
 * without waiting for network timeouts.
 */
export function usePremiumEntitlementBootstrapBlocksUi(isPremiumQueryLoading: boolean): boolean {
  const net = useNetInfo();

  if (Platform.OS === "web" || !isPremiumQueryLoading) {
    return false;
  }

  const explicitlyOffline = net.isConnected === false || net.isInternetReachable === false;

  return !explicitlyOffline;
}
