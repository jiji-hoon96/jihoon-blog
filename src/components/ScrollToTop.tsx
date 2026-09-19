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

    window.addEventListener("scroll", toggleVisibility);
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
      className="fixed bottom-6 right-6 z-40 p-3 bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform motion-reduce:transition-none motion-reduce:hover:scale-100"
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
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
