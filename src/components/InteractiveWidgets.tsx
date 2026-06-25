"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import TokenEmbeddingPipeline from "./TokenEmbeddingPipeline";

/**
 * 본문(dangerouslySetInnerHTML)에 들어간 위젯 placeholder를 찾아
 * 해당 React 위젯 컴포넌트를 마운트한다.
 *
 * remark-widget 플러그인이 :::widget{name=xxx} 을
 * <div class="interactive-widget" data-widget="xxx"> placeholder로 변환해 둔다.
 */
const WIDGETS: Record<string, React.ComponentType> = {
  "token-pipeline": TokenEmbeddingPipeline,
};

export default function InteractiveWidgets() {
  useEffect(() => {
    const roots: Root[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(".interactive-widget[data-widget]");

    nodes.forEach((node) => {
      if (node.dataset.mounted === "true") return;
      const name = node.dataset.widget;
      const Comp = name ? WIDGETS[name] : undefined;
      if (!Comp) return;

      node.dataset.mounted = "true";
      const root = createRoot(node);
      root.render(<Comp />);
      roots.push(root);
    });

    return () => {
      roots.forEach((r) => r.unmount());
    };
  }, []);

  return null;
}
