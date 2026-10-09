
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  }).trim();
}

function runVersionScript() {
  console.log("\nĐang cập nhật APP_VERSION...");
  execFileSync("node", ["scripts/update-version.mjs"], {
    stdio: "inherit",
  });
}

try {
  // 1. Lấy version hiện tại từ Git tag
  const latestTag = git([
    "describe",
    "--tags",
    "--abbrev=0",
  ]);

  const match = latestTag.match(/^v(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(`Tag không đúng định dạng: ${latestTag}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  const nextVersion = `v${major}.${minor}.${patch}`;

  const commitMessage =
    process.argv.slice(2).join(" ") ||
    `Release ${nextVersion}`;

  // 2. Kiểm tra thay đổi ban đầu
  const initialStatus = git(["status", "--porcelain"]);

  if (!initialStatus) {
    throw new Error("Không có thay đổi nào để phát hành.");
  }

  console.log(`\nPhiên bản hiện tại: ${latestTag}`);
  console.log(`Phiên bản tiếp theo: ${nextVersion}`);

  // 3. Cập nhật version.ts tự động
  // Dùng tag mới làm nguồn version trong lúc tạo file
  // update-version.mjs hiện lấy tag Git hiện tại,
  // nên tạo tag mới sau khi commit là chưa đủ.
  // Vì vậy, ta sẽ tạo file version.ts trực tiếp ở đây.

  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("lib", { recursive: true });

  writeFileSync(
    "lib/version.ts",
    `/**
 * Phiên bản hiện tại của SV5T Form.
 * File này được tự động tạo trước khi phát hành.
 */
export const APP_VERSION = "${nextVersion}";
`,
    "utf8",
  );

  console.log(`✓ APP_VERSION = ${nextVersion}`);

  // 4. Stage và commit
  git(["add", "."]);

  const staged = git(["diff", "--cached", "--name-only"]);

  if (!staged) {
    throw new Error("Không có file nào được stage để commit.");
  }

  git(["commit", "-m", commitMessage]);

  // 5. Tạo tag cho commit vừa tạo
  git([
    "tag",
    "-a",
    nextVersion,
    "-m",
    `Release ${nextVersion}`,
  ]);

  // 6. Push commit và tag
  git(["push"]);
  git(["push", "origin", nextVersion]);

  console.log(`\n✓ Phát hành thành công ${nextVersion}`);
} catch (error) {
  console.error("\n✗ Phát hành thất bại.");
  console.error(error.message);
  process.exitCode = 1;
}