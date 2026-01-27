"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch posts when modal opens
  useEffect(() => {
    if (isOpen && posts.length === 0) {
      setLoading(true);
      fetch("/api/search")
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
  }, [isOpen, posts.length]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const filtered = posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(searchQuery) ||
        post.excerpt?.toLowerCase().includes(searchQuery) ||
        post.category?.toLowerCase().includes(searchQuery)
    );
    setResults(filtered.slice(0, 10));
  }, [query, posts]);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close modal when clicking outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-light-gray10 dark:hover:bg-dark-gray10 rounded-lg transition-colors cursor-pointer"
        aria-label="검색"
      >
        <svg
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
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl mx-4 bg-light-white100 dark:bg-dark-white100 rounded-xl border border-light-gray20 dark:border-dark-gray20 shadow-2xl overflow-hidden"
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
                placeholder="검색어를 입력하세요..."
                className="flex-1 py-4 bg-transparent outline-none text-light-black100 dark:text-dark-black100 placeholder:text-light-gray60 dark:placeholder:text-dark-gray60"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 text-light-gray60 dark:text-dark-gray60 hover:text-light-black100 dark:hover:text-dark-black100"
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
                <div className="px-4 py-8 text-center text-light-gray60 dark:text-dark-gray60">
                  로딩 중...
                </div>
              )}
              {!loading && query && results.length === 0 && (
                <div className="px-4 py-8 text-center text-light-gray60 dark:text-dark-gray60">
                  &apos;{query}&apos;에 대한 검색 결과가 없습니다.
                </div>
              )}
              {results.length > 0 && (
                <ul className="py-2">
                  {results.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={post.slug}
                        onClick={() => setIsOpen(false)}
                        className="flex flex-col gap-1 px-4 py-3 hover:bg-light-gray10 dark:hover:bg-dark-gray10 transition-colors"
                      >
                        <span className="text-xs text-light-gray60 dark:text-dark-gray60">
                          {post.category}
                        </span>
                        <span className="font-medium text-light-black100 dark:text-dark-black100">
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
                  <p>제목, 내용, 카테고리로 검색할 수 있습니다.</p>
                  <p className="mt-2 text-xs">
                    <kbd className="px-1.5 py-0.5 bg-light-gray10 dark:bg-dark-gray10 rounded">⌘</kbd>
                    {" + "}
                    <kbd className="px-1.5 py-0.5 bg-light-gray10 dark:bg-dark-gray10 rounded">K</kbd>
                    {" 로 언제든 검색할 수 있습니다."}
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
