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

  return (
    <header className="border-b border-light-gray20 dark:border-dark-gray20 mb-8">
      <nav className="mx-auto max-w-[720px] px-4 py-4 sm:py-6">
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
                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                aria-label="테마 변경"
              >
                <span className="text-xl">
                  {mounted ? (resolvedTheme === "dark" ? "🌞" : "🌙") : "🌓"}
                </span>
              </button>
            </li>
          </ul>

          {/* Mobile: Theme Toggle + Hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 hover:scale-110 transition-transform cursor-pointer"
              aria-label="테마 변경"
            >
              <span className="text-lg">
                {mounted ? (resolvedTheme === "dark" ? "🌞" : "🌙") : "🌓"}
              </span>
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
