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

function getAndroidApiBaseUrl() {
  if (env.EXPO_PUBLIC_API_BASE_URL) {
    return env.EXPO_PUBLIC_API_BASE_URL;
  }

  try {
    const manufacturer = execFileSync("adb", ["shell", "getprop", "ro.product.manufacturer"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();

    if (manufacturer.toLowerCase().includes("genymobile")) {
      return "http://10.0.3.2:1337";
    }
  } catch {
    // Expo may start an Android Studio emulator after this script begins.
  }

  try {
    execFileSync("adb", ["reverse", "tcp:1337", "tcp:1337"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });

    return "http://localhost:1337";
  } catch {
    // Fall back to the Android Studio emulator host bridge.
  }

  return "http://10.0.2.2:1337";
}

delete env.PATH;
delete env.Path;

env.ANDROID_HOME = androidSdkRoot;
env.ANDROID_SDK_ROOT = androidSdkRoot;
env.EXPO_PUBLIC_API_BASE_URL = getAndroidApiBaseUrl();
env.Path = pathParts.filter(Boolean).join(path.delimiter);

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
