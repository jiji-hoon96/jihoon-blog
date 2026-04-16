"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  variant?: "default" | "sidebar";
}

export default function TableOfContents({ content, variant = "default" }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // HTML 문자열을 파싱하여 h2, h3 태그 추출
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
    if (toc.length === 0 || variant !== "sidebar") return;

    const headingElements = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    // 스크롤 기반으로 현재 활성 heading 추적
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
  }, [toc, variant]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // URL 업데이트
      window.history.pushState({}, "", `#${id}`);
    }
  };

  if (toc.length === 0) {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <nav className="text-sm">
        <h2 className="font-bold mb-3 text-light-black100 dark:text-dark-black100">
          목차
        </h2>
        <ul className="space-y-1 border-l-2 border-light-gray20 dark:border-dark-gray20">
          {toc.map((item) => (
            <li
              key={item.id}
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
    );
  }

  return (
    <nav className="mb-8 p-3 sm:p-4 rounded-lg bg-light-gray10 dark:bg-dark-gray10 border border-light-gray20 dark:border-dark-gray20">
      <h2 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 text-light-black100 dark:text-dark-black100">
        목차
      </h2>
      <ul className="space-y-1 text-xs sm:text-sm">
        {toc.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "ml-4" : ""}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`
                block py-1 px-2 rounded transition-colors
                ${
                  activeId === item.id
                    ? "text-light-black100 dark:text-dark-black100 bg-light-gray20 dark:bg-dark-gray20 font-medium"
                    : "text-light-gray80 dark:text-dark-gray80 hover:text-light-black100 dark:hover:text-dark-black100 hover:bg-light-gray20 dark:hover:bg-dark-gray20"
                }
              `}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
