
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  }).trim();
}

function updateVersion(version) {
  mkdirSync("lib", { recursive: true });

  writeFileSync(
    "lib/version.ts",
    `/**
 * Phiên bản hiện tại của SV5T Form.
 * File này được tự động tạo trước khi phát hành.
 */
export const APP_VERSION = "${version}";
`,
    "utf8",
  );
}

function updateChangelog(version, message) {
  const filePath = "CHANGELOG.md";

  const date = new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const entry = `## ${version} — ${date}

${message}

`;

  const header = "# SV5T Form — Changelog";

  const oldContent = existsSync(filePath)
    ? readFileSync(filePath, "utf8")
    : `${header}\n\n`;

  const content = oldContent.startsWith(header)
    ? oldContent.slice(header.length).trimStart()
    : oldContent;

  writeFileSync(
    filePath,
    `${header}\n\n${entry}${content}`,
    "utf8",
  );
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

  // 3. Cập nhật APP_VERSION
  updateVersion(nextVersion);

  // 4. Cập nhật CHANGELOG
  updateChangelog(nextVersion, commitMessage);

  // 5. Stage và commit
  git(["add", "."]);

  const staged = git(["diff", "--cached", "--name-only"]);

  if (!staged) {
    throw new Error("Không có file nào được stage để commit.");
  }

  git(["commit", "-m", `${nextVersion}: ${commitMessage}`]);

  // 6. Tạo Git tag cho commit vừa tạo
  git([
    "tag",
    "-a",
    nextVersion,
    "-m",
    `${nextVersion}: ${commitMessage}`,
  ]);

  // 7. Push commit và tag
  git(["push"]);
  git(["push", "origin", nextVersion]);

  console.log(`\n✓ Phát hành thành công ${nextVersion}`);
  console.log("✓ CHANGELOG.md đã cập nhật");
} catch (error) {
  console.error("\n✗ Phát hành thất bại.");
  console.error(
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
