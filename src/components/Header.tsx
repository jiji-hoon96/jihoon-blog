"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { siteMetadata } from "@/lib/site-metadata";
import SearchModal from "./SearchModal";
import LanguageSelector from "./LanguageSelector";
import { getDictionary } from "@/i18n/dictionaries";
import { toPublicPath, type Locale } from "@/i18n/locales";

export default function Header({ locale }: { locale: Locale }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const dictionary = getDictionary(locale);
  const homePath = toPublicPath(locale, "/");
  const navLinks = [
    { href: `${homePath}#writing`, label: "Writing" },
    { href: toPublicPath(locale, "/about"), label: "About" },
    { href: toPublicPath(locale, "/posts"), label: "Index" },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const utilityClass =
    "home-meta text-[11px] uppercase tracking-[0.06em] text-stone transition-colors hover:text-tide";

  return (
    <header className="border-b border-mineral">
      <nav className="mx-auto max-w-[var(--width-shell)] px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between gap-8">
          <Link href={homePath} className="group min-w-0">
            <span className="block text-[15px] font-semibold tracking-[-0.015em] text-ink transition-colors group-hover:text-tide">
              {siteMetadata.author.name}
            </span>
            <span className="home-meta mt-1 block text-[10px] uppercase tracking-[0.08em] text-stone">
              Frontend Engineer
            </span>
          </Link>

          <ul className="hidden items-center gap-6 sm:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={utilityClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li><SearchModal locale={locale} trigger="text" /></li>
            <li><LanguageSelector locale={locale} /></li>
            <li>
              <button onClick={toggleTheme} className={utilityClass} aria-label={dictionary.actions.changeTheme}>
                {mounted ? (resolvedTheme === "dark" ? "Dark" : "Light") : "Light"}
              </button>
            </li>
          </ul>

          <button
            className={`${utilityClass} sm:hidden`}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={dictionary.actions.openMenu}
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {isMenuOpen && (
          <div className="mt-6 border-t border-mineral pt-5 sm:hidden">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={utilityClass} onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li><SearchModal locale={locale} trigger="text" /></li>
              <li><LanguageSelector locale={locale} /></li>
              <li>
                <button onClick={toggleTheme} className={utilityClass}>
                  {mounted ? (resolvedTheme === "dark" ? "Dark" : "Light") : "Light"}
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
