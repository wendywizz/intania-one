const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const androidSdkRoot =
  process.env.ANDROID_SDK_ROOT ||
  process.env.ANDROID_HOME ||
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

const pathParts = [
  path.join(androidSdkRoot, "platform-tools"),
  path.join(androidSdkRoot, "emulator"),
  process.env.Path || process.env.PATH || "",
];

const env = { ...process.env };
const adbCommand = path.join(
  androidSdkRoot,
  "platform-tools",
  process.platform === "win32" ? "adb.exe" : "adb",
);

function getAndroidApiBaseUrl() {
  if (env.EXPO_PUBLIC_API_BASE_URL) {
    return env.EXPO_PUBLIC_API_BASE_URL;
  }

  try {
    execFileSync(adbCommand, ["reverse", "tcp:1337", "tcp:1337"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });

    const reverseList = execFileSync(adbCommand, ["reverse", "--list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });

    if (reverseList.includes("tcp:1337 tcp:1337")) {
      console.log("ADB reverse active: tcp:1337 -> tcp:1337");
      return "http://localhost:1337";
    }
  } catch {
    // Fall back to emulator host bridge addresses.
  }

  try {
    const manufacturer = execFileSync(adbCommand, ["shell", "getprop", "ro.product.manufacturer"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();

    if (manufacturer.toLowerCase().includes("genymobile")) {
      console.log("Genymotion detected. Using host bridge 10.0.3.2.");
      return "http://10.0.3.2:1337";
    }
  } catch {
    // Expo may start an Android Studio emulator after this script begins.
  }

  return "http://10.0.2.2:1337";
}

function getAdbOutput(args, timeout = 3000) {
  return execFileSync(adbCommand, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout,
  });
}

function warnAboutAndroidOpenIdBrowser() {
  try {
    const packages = getAdbOutput(["shell", "pm", "list", "packages"]);

    if (packages.includes("package:com.android.chrome")) {
      return;
    }

    let webViewVersion = "unknown";

    try {
      const webViewInfo = getAdbOutput(["shell", "dumpsys", "package", "com.android.webview"], 3000);
      webViewVersion = webViewInfo.match(/versionName=([^\s]+)/)?.[1] || webViewVersion;
    } catch {
      // Keep the warning useful even if WebView package details are unavailable.
    }

    console.warn(
      [
        "OpenID Android warning: Chrome is not installed on this emulator.",
        `Detected Android System WebView: ${webViewVersion}.`,
        "PSU SSO may fail with window.customElements.getName on old emulator browser engines.",
        "Install/update Chrome or use an Android Studio emulator image with Play Store.",
      ].join("\n"),
    );
  } catch {
    // Expo may start an emulator after this script begins.
  }
}

delete env.PATH;
delete env.Path;

env.ANDROID_HOME = androidSdkRoot;
env.ANDROID_SDK_ROOT = androidSdkRoot;
env.EXPO_PUBLIC_API_BASE_URL = getAndroidApiBaseUrl();
env.EXPO_PACKAGER_HOSTNAME = env.EXPO_PACKAGER_HOSTNAME || "127.0.0.1";
env.Path = pathParts.filter(Boolean).join(path.delimiter);
warnAboutAndroidOpenIdBrowser();

const expoArgs = ["expo", "start", "--android", ...process.argv.slice(2)];
const command = process.platform === "win32" ? "cmd.exe" : "npx";
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", ["npx.cmd", ...expoArgs].join(" ")]
    : expoArgs;

console.log(`Using Scooba API: ${env.EXPO_PUBLIC_API_BASE_URL}`);

const child = spawn(command, commandArgs, {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
