
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  }).trim();
}

try {
  // Lấy tag phiên bản mới nhất
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

  // Lấy nội dung commit từ tham số dòng lệnh
  const commitMessage =
    process.argv.slice(2).join(" ") ||
    `Release ${nextVersion}`;

  // Kiểm tra có thay đổi cần phát hành hay không
  const status = git(["status", "--porcelain"]);

  if (!status) {
    throw new Error("Không có thay đổi nào để commit.");
  }

  console.log(`\nPhiên bản hiện tại: ${latestTag}`);
  console.log(`Phiên bản tiếp theo: ${nextVersion}\n`);

  // Stage và commit
  git(["add", "."]);

  const staged = git(["diff", "--cached", "--name-only"]);

  if (!staged) {
    throw new Error("Không có file nào được stage để commit.");
  }

  git(["commit", "-m", commitMessage]);

  // Tạo tag cho commit vừa tạo
  git([
    "tag",
    "-a",
    nextVersion,
    "-m",
    `Release ${nextVersion}`,
  ]);

  // Đẩy commit và tag lên GitHub
  git(["push"]);
  git(["push", "origin", nextVersion]);

  console.log(`\n✓ Phát hành thành công ${nextVersion}`);
} catch (error) {
  console.error("\n✗ Phát hành thất bại.");
  console.error(error.message);
  process.exitCode = 1;
}