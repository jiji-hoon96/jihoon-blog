"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    // HTML 문자열을 파싱하여 h2, h3 태그 추출
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h2, h3");

    const items: TocItem[] = Array.from(headings).map((heading) => {
      const id = heading.id || heading.textContent?.trim().toLowerCase().replace(/\s+/g, "-") || "";
      const text = heading.textContent || "";
      const level = parseInt(heading.tagName.charAt(1));

      // heading에 id가 없으면 추가 (rehype-slug가 이미 처리했을 것임)
      if (!heading.id && id) {
        heading.id = id;
      }

      return { id, text, level };
    });

    setToc(items);

    // Intersection Observer로 현재 보이는 섹션 추적
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -80% 0px",
      }
    );

    headings.forEach((heading) => {
      if (heading.id) {
        observer.observe(heading);
      }
    });

    return () => {
      headings.forEach((heading) => {
        if (heading.id) {
          observer.unobserve(heading);
        }
      });
    };
  }, [content]);

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

  return (
    <nav className="mb-8 p-6 rounded-lg bg-light-gray10 dark:bg-dark-gray10 border border-light-gray20 dark:border-dark-gray20">
      <h2 className="text-xl font-bold mb-4 text-light-black100 dark:text-dark-black100">
        📋 목차
      </h2>
      <ul className="space-y-2">
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
                    ? "text-blue-600 dark:text-blue-400 bg-light-gray20 dark:bg-dark-gray20 font-medium"
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
