
import { execSync } from "node:child_process";
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";

const filePath = "lib/version.ts";

function getVersion() {
  // 1. Vercel Git tag
  if (process.env.VERCEL_GIT_COMMIT_TAG) {
    return process.env.VERCEL_GIT_COMMIT_TAG;
  }

  // 2. Git tag
  try {
    return execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // 3. Giữ version đã commit
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");

      const match = content.match(
        /APP_VERSION\s*=\s*["']([^"']+)["']/,
      );

      if (match) return match[1];
    }

    return "v0.0.0";
  }
}

const version = getVersion();

mkdirSync(dirname(filePath), { recursive: true });

writeFileSync(
  filePath,
  `/**
 * Phiên bản hiện tại của SV5T Form.
 * File này được tự động tạo trước khi build.
 */
export const APP_VERSION = "${version}";
`,
  "utf8",
);

console.log(`✓ APP_VERSION = ${version}`);
