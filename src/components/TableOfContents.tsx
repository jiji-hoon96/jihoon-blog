"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/toc";

interface TableOfContentsProps {
  /**
   * 서버에서 미리 뽑은 목차. 예전에는 본문 HTML 전체를 받아 DOMParser 로 파싱했는데,
   * 그 prop 때문에 같은 본문이 RSC flight 에 한 벌 더 실려 페이지가 크게 불었다.
   */
  toc: TocItem[];
  labels: {
    title: string;
    open: string;
    close: string;
  };
}

// OS 의 모션 감소 설정을 스크립트 스크롤에도 반영한다. CSS 의 감소 모션 블록은
// scrollIntoView 호출에 닿지 않는다.
function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "smooth";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export default function TableOfContents({ toc, labels }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [proximity, setProximity] = useState(0);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (toc.length === 0) return;

    const headingElements = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      let current = "";

      for (const el of headingElements) {
        if (el.offsetTop <= scrollY) {
          current = el.id;
        }
      }

      if (current) {
        setActiveId(current);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [toc]);

  useEffect(() => {
    if (!isOpen || !activeId) return;
    const el = itemRefs.current.get(activeId);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    }
  }, [activeId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    const NEAR = 80;
    const FAR = 240;
    const handleMove = (e: MouseEvent) => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = 1 - Math.min(1, Math.max(0, (dist - NEAR) / (FAR - NEAR)));
      setProximity(t);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      window.history.pushState({}, "", `#${id}`);
      setIsOpen(false);
    }
  };

  if (toc.length === 0) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onFocus={() => setProximity(1)}
        onBlur={() => setProximity(0)}
        aria-label={isOpen ? labels.close : labels.open}
        aria-expanded={isOpen}
        // 불투명도를 올리는 신호가 mousemove 하나뿐이면 키보드 사용자는 0.3 으로
        // 흐려진 컨트롤 위에 그려진 포커스 링을 봐야 한다. (WCAG 2.4.7)
        style={{ opacity: isOpen ? 1 : 0.3 + 0.7 * proximity }}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full shadow-lg bg-light-gray10 dark:bg-dark-gray10 border border-light-gray20 dark:border-dark-gray20 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-[opacity,background-color] duration-200 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-light-black100 dark:text-dark-black100"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`fixed right-0 top-0 z-50 h-screen w-[22rem] sm:w-96 max-w-[90vw] bg-white dark:bg-dark-gray10 shadow-xl border-l border-light-gray20 dark:border-dark-gray20 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray20 dark:border-dark-gray20">
          <h2 className="font-bold text-light-black100 dark:text-dark-black100">
            {labels.title}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={labels.close}
            className="p-1 rounded hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-light-black100 dark:text-dark-black100"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="px-5 py-4 overflow-y-auto h-[calc(100vh-4rem)] text-sm">
          <ul className="space-y-1 border-l-2 border-light-gray20 dark:border-dark-gray20">
            {toc.map((item) => (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(item.id, el);
                  } else {
                    itemRefs.current.delete(item.id);
                  }
                }}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className={`
                    block py-1 -ml-[2px] border-l-2 transition-colors overflow-hidden text-ellipsis whitespace-nowrap
                    ${item.level === 3 ? "pl-6" : "pl-3"}
                    ${
                      activeId === item.id
                        ? "border-light-black100 dark:border-dark-black100 text-light-black100 dark:text-dark-black100 font-bold"
                        : "border-transparent text-light-gray60 dark:text-dark-gray60 hover:text-light-black100 dark:hover:text-dark-black100"
                    }
                  `}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
