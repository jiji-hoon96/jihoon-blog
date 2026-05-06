"use client";

import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const parsedHeadings = doc.querySelectorAll("h2, h3");

    const items: TocItem[] = Array.from(parsedHeadings).map((heading) => {
      const id = heading.id || heading.textContent?.trim().toLowerCase().replace(/\s+/g, "-") || "";
      const text = heading.textContent || "";
      const level = parseInt(heading.tagName.charAt(1));

      return { id, text, level };
    });

    setToc(items);
  }, [content]);

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
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
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
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "목차 닫기" : "목차 열기"}
        aria-expanded={isOpen}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full shadow-lg bg-light-gray10 dark:bg-dark-gray10 border border-light-gray20 dark:border-dark-gray20 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors cursor-pointer"
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
        aria-label="목차"
        className={`fixed right-0 top-0 z-50 h-screen w-[22rem] sm:w-96 max-w-[90vw] bg-white dark:bg-dark-gray10 shadow-xl border-l border-light-gray20 dark:border-dark-gray20 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray20 dark:border-dark-gray20">
          <h2 className="font-bold text-light-black100 dark:text-dark-black100">
            목차
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="목차 닫기"
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
                        ? "border-light-black100 dark:border-dark-black100 text-light-black100 dark:text-dark-black100 font-medium"
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
