import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function getVersion() {
  // Khi build trên Vercel từ Git tag
  if (process.env.VERCEL_GIT_COMMIT_TAG) {
    return process.env.VERCEL_GIT_COMMIT_TAG;
  }

  // Khi build local từ Git
  try {
    return execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "v0.0.0";
  }
}

const version = getVersion();

const filePath = "lib/version.ts";

mkdirSync(dirname(filePath), { recursive: true });

const content = `/**
 * Phiên bản hiện tại của SV5T Form.
 * File này được tự động tạo trước khi build.
 */
export const APP_VERSION = "${version}";
`;

writeFileSync(filePath, content, "utf8");

console.log(`✓ APP_VERSION = ${version}`);