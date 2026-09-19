"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/locales";

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
}

export default function SearchModal({
  locale,
  trigger = "icon",
}: {
  locale: Locale;
  trigger?: "icon" | "text";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dictionary = getDictionary(locale);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    if (posts.length === 0) setLoading(true);
  }, [posts.length]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    // 닫은 뒤 포커스를 열었던 버튼으로 되돌린다. 그러지 않으면 body 로 떨어져서
    // 키보드 사용자가 Tab 을 문서 처음부터 다시 눌러야 한다. (WCAG 2.4.3)
    triggerRef.current?.focus();
  }, []);

  // Fetch posts when modal opens
  useEffect(() => {
    if (isOpen && posts.length === 0) {
      fetch(`/api/search?locale=${encodeURIComponent(locale)}`)
        .then((res) => res.json())
        .then((data) => {
          setPosts(data.posts || []);
        })
        .catch((err) => {
          console.error("Search API error:", err);
          setPosts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, locale, posts.length]);

  // Search logic
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const searchQuery = query.toLowerCase();
    const filtered = posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(searchQuery) ||
        post.excerpt?.toLowerCase().includes(searchQuery) ||
        post.category?.toLowerCase().includes(searchQuery)
    );
    return filtered.slice(0, 10);
  }, [query, posts]);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") {
        closeSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, openSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 모달 안에 포커스를 가둔다. 그러지 않으면 시각적으로는 오버레이가 떠 있는데
  // Tab 이 뒤 페이지의 헤더 링크로 빠져나간다. TableOfContents 와 GlossaryTerms 가
  // 이미 쓰는 패턴이고 검색 모달에만 빠져 있었다.
  useEffect(() => {
    if (!isOpen) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !modal.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Close modal when clicking outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeSearch();
    }
  }, [closeSearch]);

  return (
    <>
      {/* Search Button */}
      <button
        ref={triggerRef}
        onClick={openSearch}
        className={
          trigger === "text"
            ? "home-meta cursor-pointer text-stone transition-colors hover:text-accent"
            : "p-2 transition-colors hover:text-accent cursor-pointer"
        }
        aria-label={dictionary.actions.search}
      >
        {trigger === "text" ? dictionary.actions.search : <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>}
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="qa-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-[2px]"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={dictionary.actions.search}
            className="qa-rise-in mx-4 w-full max-w-xl overflow-hidden border border-light-gray20 bg-light-white100 shadow-2xl dark:border-dark-gray20 dark:bg-dark-white100"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b border-light-gray20 dark:border-dark-gray20">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-light-gray60 dark:text-dark-gray60 flex-shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={dictionary.search.placeholder}
                aria-label={dictionary.actions.search}
                className="flex-1 py-4 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] text-light-black100 dark:text-dark-black100 placeholder:text-light-gray60 dark:placeholder:text-dark-gray60"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label={dictionary.actions.clearSearch}
                  className="cursor-pointer p-1 text-light-gray60 hover:text-light-black100 dark:text-dark-gray60 dark:hover:text-dark-black100"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <kbd className="hidden sm:inline-flex px-2 py-1 text-xs text-light-gray60 dark:text-dark-gray60 bg-light-gray10 dark:bg-dark-gray10 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="qa-fade-in px-4 py-8 text-center text-light-gray60 dark:text-dark-gray60">
                  {dictionary.search.loading}
                </div>
              )}
              {!loading && query && results.length === 0 && (
                <div className="qa-fade-in px-4 py-8 text-center text-light-gray60 dark:text-dark-gray60">
                  &apos;{query}&apos;: {dictionary.search.empty}
                </div>
              )}
              {results.length > 0 && (
                <ul key={query} className="qa-list-in py-2">
                  {results.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={post.slug}
                        onClick={closeSearch}
                        className="flex flex-col gap-1 px-4 py-3 hover:bg-light-gray10 dark:hover:bg-dark-gray10 transition-colors"
                      >
                        <span className="text-xs text-light-gray60 dark:text-dark-gray60">
                          {post.category}
                        </span>
                        <span className="font-bold text-light-black100 dark:text-dark-black100">
                          {post.title}
                        </span>
                        {post.excerpt && (
                          <span className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-1">
                            {post.excerpt}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && !query && (
                <div className="px-4 py-8 text-center text-sm text-light-gray60 dark:text-dark-gray60">
                  <p>{dictionary.search.help}</p>
                  <p className="mt-2 text-xs">
                    <kbd className="px-1.5 py-0.5 bg-light-gray10 dark:bg-dark-gray10 rounded">⌘</kbd>
                    {" + "}
                    <kbd className="px-1.5 py-0.5 bg-light-gray10 dark:bg-dark-gray10 rounded">K</kbd>
                    {` ${dictionary.search.shortcut}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
