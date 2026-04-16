"use client";

import { useEffect } from "react";

export default function CodeCopyButton() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll(".prose pre");

    codeBlocks.forEach((pre) => {
      // 이미 처리된 블록은 스킵
      if (pre.closest(".code-collapse")) return;

      const preEl = pre as HTMLElement;

      // 코드 언어 감지
      const code = pre.querySelector("code");
      const langClass = code?.className.match(/language-(\w+)/);
      const lang = langClass ? langClass[1] : "Code";

      // 줄 수 계산
      const lineCount = (code?.textContent || "").split("\n").length;

      // details/summary로 감싸기
      const details = document.createElement("details");
      details.className = "code-collapse";

      // 15줄 미만이면 기본 열림
      if (lineCount < 15) {
        details.open = true;
      }

      const summary = document.createElement("summary");
      summary.className = "code-collapse-summary";
      summary.textContent = lang;

      // pre를 details 안으로 이동
      preEl.parentNode?.insertBefore(details, preEl);
      details.appendChild(summary);
      details.appendChild(preEl);

      // copy 버튼 추가
      preEl.style.position = "relative";
      preEl.style.marginTop = "0";
      preEl.style.borderTopLeftRadius = "0";
      preEl.style.borderTopRightRadius = "0";

      const button = document.createElement("button");
      button.className = "copy-button";
      button.textContent = "COPY";
      button.title = "코드 복사";

      button.addEventListener("click", async () => {
        if (code) {
          await navigator.clipboard.writeText(code.textContent || "");
          button.textContent = "DONE";
          setTimeout(() => {
            button.textContent = "COPY";
          }, 2000);
        }
      });

      preEl.appendChild(button);
    });

    return () => {
      document.querySelectorAll(".copy-button").forEach((btn) => btn.remove());
    };
  }, []);

  return null;
}
