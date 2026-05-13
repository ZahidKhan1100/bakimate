const { withXcodeProject } = require("expo/config-plugins");

/**
 * iOS Xcode tweaks for CocoaPods + Expo prebuild:
 *
 * - ENABLE_USER_SCRIPT_SANDBOXING = NO — CocoaPods "[CP] Copy Pods Resources" writes under Pods/;
 *   with sandbox ON, Xcode errors: deny file-write-create …/Pods/resources-to-copy-*.txt
 *
 * - CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION = YES — on configurations that use BakiMate.entitlements.
 *   Expo / Sign in with Apple plugins merge entitlements during the build; Xcode 15+ errors if the
 *   entitlements file appears "modified" unless this flag is set on the app target.
 */
module.exports = function withIosXcodeBuildTweaks(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const section = project.pbxXCBuildConfigurationSection();

    if (!section || typeof section !== "object") {
      return mod;
    }

    for (const [key, entry] of Object.entries(section)) {
      if (key.endsWith("_comment")) {
        continue;
      }

      if (entry && typeof entry.buildSettings === "object" && entry.buildSettings !== null) {
        const bs = entry.buildSettings;
        bs.ENABLE_USER_SCRIPT_SANDBOXING = "NO";

        const entPath = bs.CODE_SIGN_ENTITLEMENTS;
        if (typeof entPath === "string" && entPath.includes("BakiMate.entitlements")) {
          bs.CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION = "YES";
        }
      }
    }

    return mod;
  });
};

