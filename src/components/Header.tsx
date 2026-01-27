"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { siteMetadata } from "@/lib/site-metadata";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "/posts", label: "Posts" },
    { href: "/guestbook", label: "Guestbook" },
    { href: "/about", label: "About" },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const SunIcon = () => (
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
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );

  const MoonIcon = () => (
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  return (
    <header className="border-b border-light-gray20 dark:border-dark-gray20 mb-8">
      <nav className="mx-auto max-w-[1200px] px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-lg sm:text-2xl font-bold hover:opacity-70 transition-opacity"
          >
            {siteMetadata.title}
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-light-gray60 dark:hover:text-dark-gray60 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-light-gray10 dark:hover:bg-dark-gray10 rounded-lg transition-colors cursor-pointer"
                aria-label="테마 변경"
              >
                {mounted ? (
                  resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />
                ) : (
                  <div className="w-5 h-5" />
                )}
              </button>
            </li>
          </ul>

          {/* Mobile: Theme Toggle + Hamburger */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-light-gray10 dark:hover:bg-dark-gray10 rounded-lg transition-colors cursor-pointer"
              aria-label="테마 변경"
            >
              {mounted ? (
                resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />
              ) : (
                <div className="w-5 h-5" />
              )}
            </button>
            <button
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="메뉴 열기"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span
                  className={`block h-0.5 bg-current transition-transform duration-200 ${
                    isMenuOpen ? "rotate-45 translate-y-1.5" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 bg-current transition-opacity duration-200 ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 bg-current transition-transform duration-200 ${
                    isMenuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <ul className="sm:hidden mt-4 pt-4 border-t border-light-gray20 dark:border-dark-gray20 flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-1 hover:text-light-gray60 dark:hover:text-dark-gray60 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}
