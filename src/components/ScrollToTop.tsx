"use client";

import { useState, useEffect } from "react";

import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/locales";

export default function ScrollToTop({ locale }: { locale: Locale }) {
  const [isVisible, setIsVisible] = useState(false);
  const dictionary = getDictionary(locale);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    // OS 에서 모션 감소를 켠 사용자에게는 긴 글에서 화면 전체가 흐른다.
    // CSS 의 감소 모션 블록은 이 스크립트 호출에 닿지 않으므로 여기서 본다.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="qa-pop-in group fixed bottom-6 right-6 z-40 rounded-full bg-light-black100 p-3 text-light-white100 shadow-lg transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-dark-black100 dark:text-dark-white100"
      aria-label={dictionary.actions.backToTop}
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
        className="transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
