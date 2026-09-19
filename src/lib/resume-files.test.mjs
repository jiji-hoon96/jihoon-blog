import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { RESUME_FILES, formatFileSize } from "./resume-files.ts";

test("formats sizes in the unit a reader can act on", () => {
  assert.equal(formatFileSize(206774), "202KB");
  assert.equal(formatFileSize(1940037), "1.9MB");
  assert.equal(formatFileSize(1024 * 1024), "1.0MB");
});

// 페이지가 링크하는 파일이 배포에 실제로 실리는지 본다. `public/` 에서 지워지면
// 이력서 링크가 조용히 404 가 되는데, 콘텐츠 이미지와 달리 이것을 보는 게이트가 없다.
test("every linked resume PDF exists and is a real PDF", () => {
  assert.ok(RESUME_FILES.length > 0, "이력서 파일 목록이 비었다");

  for (const file of RESUME_FILES) {
    const absolute = path.join(process.cwd(), "public", file.path);
    assert.ok(existsSync(absolute), `${file.path} 가 public/ 에 없다`);
    assert.ok(statSync(absolute).size > 0, `${file.path} 가 비었다`);
    assert.match(file.path, /\.pdf$/, `${file.path} 가 PDF 가 아니다`);
  }
});
