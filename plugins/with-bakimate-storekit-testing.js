const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

/**
 * Simulator IAP + RevenueCat: StoreKit resolves products from a local `.storekit` file when Run
 * is configured (path is relative to the `.xcodeproj` bundle, e.g. `../BakiMate.storekit`).
 *
 * Copies `storekit/BakiMate.storekit` → `ios/BakiMate.storekit` (source of truth in repo — `ios/`
 * is often gitignored) and wires the Debug `LaunchAction` so **Xcode Product → Run** attaches it.
 *
 * **Sandbox IAP (App Store Sandbox tester, real receipt validation)** — set
 * `BAKIMATE_SKIP_STOREKIT_SCHEME=1` when generating the native project so this plugin **does not**
 * attach the StoreKit Configuration to the scheme (RevenueCat needs real sandbox receipts, not local
 * `.storekit`). Re-run `npx expo prebuild` after changing this.
 *
 * Important: **`expo run:ios` does not attach StoreKit configs** — it installs via simctl without the
 * scheme’s Run environment. Simulator + local IAP still requires launching once from Xcode, or test
 * on device with Sandbox. See RevenueCat doc for empty offerings: https://rev.cat/why-are-offerings-empty
 */
module.exports = function withBakimateStoreKitTesting(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;

      const skipStoreKitScheme = ["1", "true", "yes"].includes(
        String(process.env.BAKIMATE_SKIP_STOREKIT_SCHEME || "").toLowerCase(),
      );

      const xcodeprojects = fs
        .readdirSync(iosRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.endsWith(".xcodeproj"))
        .map((d) => d.name.replace(/\.xcodeproj$/, ""));

      if (xcodeprojects.length === 0) {
        return cfg;
      }

      const projName = xcodeprojects[0];
      const schemePath = path.join(
        iosRoot,
        `${projName}.xcodeproj`,
        "xcshareddata",
        "xcschemes",
        `${projName}.xcscheme`,
      );

      const storeKitTracked = path.join(projectRoot, "storekit", "BakiMate.storekit");
      /** Keep filename stable so RevenueCat + docs match existing ASC product setup. */
      const storeKitDest = path.join(iosRoot, "BakiMate.storekit");

      if (fs.existsSync(storeKitTracked)) {
        fs.copyFileSync(storeKitTracked, storeKitDest);
      }

      const storeKitRefPath = "../BakiMate.storekit";
      const storekitSnippet = `\n      <StoreKitConfigurationFileReference\n         identifier = "${storeKitRefPath}">\n      </StoreKitConfigurationFileReference>`;

      if (!fs.existsSync(schemePath)) {
        return cfg;
      }

      let xml = fs.readFileSync(schemePath, "utf8");
      const blockRx = /<StoreKitConfigurationFileReference[\s\S]*?<\/StoreKitConfigurationFileReference>/;

      if (skipStoreKitScheme) {
        if (blockRx.test(xml)) {
          xml = xml.replace(blockRx, "");
          fs.writeFileSync(schemePath, xml);
        }
        return cfg;
      }

      if (blockRx.test(xml)) {
        xml = xml.replace(blockRx, storekitSnippet.trim());
      } else if (!xml.includes("StoreKitConfigurationFileReference")) {
        xml = xml.replace("</BuildableProductRunnable>", `</BuildableProductRunnable>${storekitSnippet}`);
      }

      fs.writeFileSync(schemePath, xml);
      return cfg;
    },
  ]);
};
