"use client";

import { useEffect } from "react";

export default function CodeCopyButton() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll(".prose pre");

    codeBlocks.forEach((pre) => {
      // 이미 버튼이 있으면 스킵
      if (pre.querySelector(".copy-button")) return;

      // pre를 relative로 설정
      (pre as HTMLElement).style.position = "relative";

      const button = document.createElement("button");
      button.className = "copy-button";
      button.textContent = "COPY";
      button.title = "코드 복사";

      button.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        if (code) {
          await navigator.clipboard.writeText(code.textContent || "");
          button.textContent = "DONE";
          setTimeout(() => {
            button.textContent = "COPY";
          }, 2000);
        }
      });

      pre.appendChild(button);
    });

    return () => {
      document.querySelectorAll(".copy-button").forEach((btn) => btn.remove());
    };
  }, []);

  return null;
}
