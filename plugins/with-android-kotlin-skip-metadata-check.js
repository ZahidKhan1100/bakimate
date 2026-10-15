const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * react-native-google-mobile-ads pulls in Google's play-services-ads, a prebuilt binary compiled
 * with newer Kotlin metadata than this project's default Kotlin compiler can read ("Module was
 * compiled with an incompatible version of Kotlin"). Forcing the whole project's Kotlin Gradle
 * Plugin version up to match breaks OTHER native modules (e.g. react-native-gesture-handler) that
 * weren't built against that newer Kotlin — so instead, just suppress the metadata-version check
 * project-wide, exactly as Kotlin's own error message suggests, leaving every module's actual
 * compiler version untouched.
 */
const SUBPROJECTS_BLOCK = `
subprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      freeCompilerArgs += ["-Xskip-metadata-version-check"]
    }
  }
}
`;

module.exports = function withAndroidKotlinSkipMetadataVersionCheck(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === "groovy" && !mod.modResults.contents.includes("-Xskip-metadata-version-check")) {
      mod.modResults.contents += SUBPROJECTS_BLOCK;
    }

    return mod;
  });
};
