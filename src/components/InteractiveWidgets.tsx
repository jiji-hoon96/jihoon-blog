"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { Locale } from "@/i18n/locales";

/**
 * 본문(dangerouslySetInnerHTML)에 들어간 위젯 placeholder를 찾아
 * 해당 React 위젯 컴포넌트를 마운트한다.
 *
 * remark-widget 플러그인이 :::widget-xxx 를
 * <div class="interactive-widget" data-widget="xxx"> placeholder로 변환해 둔다.
 *
 * 위젯은 각각 글 한 편씩만 쓰므로 동적 import 로 받는다. 정적 import 로 두면
 * 위젯을 쓰지 않는 글의 번들에도 실린다.
 *
 * lazy() + Suspense 를 쓰지 않는다. 이 컴포넌트는 부모 트리의 effect 안에서 별도의
 * root 를 만드는데, 그 root 가 suspend 한 채로 cleanup 이 돌면 React 가
 * "Attempted to synchronously unmount a root while React was already rendering" 으로 막는다.
 *
 * 중복 마운트 방지를 DOM 플래그로 하지 않는 이유도 같은 자리에 있다. 개발 모드의
 * effect 이중 호출에서 순서가 effect → cleanup → effect 인데, import 가 비동기라
 * 플래그를 미리 세우면 두 번째 effect 가 그것을 보고 건너뛴 뒤 첫 번째 import 가
 * 취소되어 아무것도 마운트되지 않는다. 그래서 실제로 root 를 가진 노드만 건너뛴다.
 */
// 위젯 문구는 `dictionaries.ts` 가 아니라 위젯 옆 모듈에 둔다. 그 파일은 Header 와
// Footer 가 import 해서 모든 페이지 번들에 실리는데, 위젯은 글 한 편씩만 쓰기 때문이다.
// 그래서 문구를 쓰는 데 필요한 것은 `locale` 하나이고, 그것만 내려준다.
type WidgetProps = { locale: Locale };

const WIDGETS: Record<string, () => Promise<{ default: React.ComponentType<WidgetProps> }>> = {
  "token-pipeline": () => import("./TokenEmbeddingPipeline"),
  "error-propagation": () => import("./ErrorPropagationPlayground"),
};

const MOUNTED = new WeakMap<HTMLElement, Root>();

export default function InteractiveWidgets({ locale }: WidgetProps) {
  useEffect(() => {
    let cancelled = false;
    const nodes = document.querySelectorAll<HTMLElement>(".interactive-widget[data-widget]");

    nodes.forEach((node) => {
      if (MOUNTED.has(node)) return;
      const name = node.dataset.widget;
      const load = name ? WIDGETS[name] : undefined;
      if (!load) return;

      void load().then(({ default: Comp }) => {
        if (cancelled || MOUNTED.has(node) || !node.isConnected) return;
        const root = createRoot(node);
        MOUNTED.set(node, root);
        root.render(<Comp locale={locale} />);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return null;
}
