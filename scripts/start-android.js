const { spawn } = require("node:child_process");
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

delete env.PATH;
delete env.Path;

env.ANDROID_HOME = androidSdkRoot;
env.ANDROID_SDK_ROOT = androidSdkRoot;
env.Path = pathParts.filter(Boolean).join(path.delimiter);

const expoArgs = ["expo", "start", "--android", ...process.argv.slice(2)];
const command = process.platform === "win32" ? "cmd.exe" : "npx";
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", ["npx.cmd", ...expoArgs].join(" ")]
    : expoArgs;

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
