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
    { href: toPublicPath(locale, "/posts"), label: dictionary.navigation.posts },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const utilityClass =
    "home-meta text-stone transition-colors hover:text-accent";

  // 음성 제어 사용자는 화면에 보이는 글자를 그대로 말한다. 접근 가능한 이름이
  // 그 글자를 포함하지 않으면 "Click Menu" 가 어떤 컨트롤에도 매칭되지 않는다.
  // (WCAG 2.5.3 Label in Name) 그래서 보이는 글자를 이름 앞에 둔다.
  const themeLabel = mounted && resolvedTheme === "dark" ? "Dark" : "Light";
  const menuLabel = isMenuOpen ? "Close" : "Menu";

  return (
    <header className="border-b border-mineral">
      <nav
        aria-label={dictionary.navigation.main}
        className="mx-auto max-w-[var(--width-shell)] px-4 py-5"
      >
        <div className="flex items-center justify-between gap-8">
          <Link
            href={homePath}
            aria-label={`${siteMetadata.brand} home`}
            className="group shrink-0"
          >
            <span className="block text-lg font-bold tracking-[-0.03em] text-ink transition-colors group-hover:text-accent">
              {siteMetadata.brand}
            </span>
          </Link>

          <ul className="hidden items-center gap-5 sm:flex">
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
              <button
                onClick={toggleTheme}
                className={utilityClass}
                aria-label={`${themeLabel}: ${dictionary.actions.changeTheme}`}
              >
                {themeLabel}
              </button>
            </li>
          </ul>

          <div className="flex items-center gap-4 sm:hidden">
            <button
              onClick={toggleTheme}
              className={utilityClass}
              aria-label={`${themeLabel}: ${dictionary.actions.changeTheme}`}
            >
              {themeLabel}
            </button>
            <button
              className={utilityClass}
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label={`${menuLabel}: ${
                isMenuOpen ? dictionary.actions.closeMenu : dictionary.actions.openMenu
              }`}
            >
              {menuLabel}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="mt-5 border-t border-mineral pt-5 sm:hidden">
            <ul className="grid grid-cols-3 gap-5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={utilityClass} onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li><SearchModal locale={locale} trigger="text" /></li>
              <li><LanguageSelector locale={locale} /></li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
