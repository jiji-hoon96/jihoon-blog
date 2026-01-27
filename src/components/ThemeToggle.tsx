"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="fixed top-4 right-4 z-50 p-3 rounded-full cursor-pointer  dark:bg-dark-gray10 transition-colors"
        aria-label="Toggle theme"
      >
        <span className="text-xl">🌓</span>
      </button>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 hover:scale-120 transition-transform right-4 z-50 p-3 rounded-full cursor-pointer  dark:bg-dark-gray10transition-colors"
      aria-label="Toggle theme"
    >
      <span className="text-xl ">{resolvedTheme === "dark" ? "🌞" : "🌙"}</span>
    </button>
  );
}
