import fs from "node:fs";
import path from "node:path";
import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
} from "@expo/config-plugins";

const NETWORK_SECURITY_CONFIG = "network_security_config.xml";
const NETWORK_SECURITY_RESOURCE = `@xml/${NETWORK_SECURITY_CONFIG.replace(
  /\.xml$/,
  "",
)}`;

// Permits cleartext HTTP traffic only to the on-device torrent daemon
// (127.0.0.1 / localhost). All API traffic stays HTTPS-only.
const withLocalhostCleartext: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (config) => {
    const mainApp = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    mainApp.$["android:networkSecurityConfig"] = NETWORK_SECURITY_RESOURCE;
    return config;
  });

  config = withDangerousMod(config, [
    "android",
    (config) => {
      const resXmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      fs.mkdirSync(resXmlDir, { recursive: true });
      fs.copyFileSync(
        path.join(
          config.modRequest.projectRoot,
          "plugins",
          NETWORK_SECURITY_CONFIG,
        ),
        path.join(resXmlDir, NETWORK_SECURITY_CONFIG),
      );
      return config;
    },
  ]);

  return config;
};

export default withLocalhostCleartext;
