import { siteMetadata } from "@/lib/site-metadata";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About",
  description: `${siteMetadata.author.name}에 대해`,
};

export default function AboutPage() {
  return (
    <div className="py-8 sm:py-12">
      {/* Profile Section */}
      <section className="mb-10 sm:mb-14">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          {/* Profile Image */}
          <div className="flex-shrink-0 order-first w-full sm:w-auto border border-light-gray20 dark:border-dark-gray20 rounded-xl">
            <Image
              src="/images/jihoon.jpeg"
              alt={siteMetadata.author.name}
              width={300}
              height={400}
              className="rounded-xl object-cover w-full h-64 sm:w-56 sm:h-72"
              priority
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-6">
              {siteMetadata.author.name}
            </h1>

            {/* Contact Info */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2.5 text-sm text-light-gray80 dark:text-dark-gray80">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{siteMetadata.author.bio.residence}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-light-gray80 dark:text-dark-gray80">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a
                  href={`mailto:${siteMetadata.author.bio.email}`}
                  className="hover:text-light-black100 dark:hover:text-dark-black100 transition-colors"
                >
                  {siteMetadata.author.bio.email}
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              <a
                href={siteMetadata.author.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
                aria-label="GitHub"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href={siteMetadata.author.social.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href={siteMetadata.author.social.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg font-semibold bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors text-sm"
              >
                Resume
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Career Section */}
      <section className="mb-10 sm:mb-14">
        <div className="flex items-center gap-2 mb-5">
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
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <h2 className="text-xl sm:text-2xl font-bold">Career</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {siteMetadata.timestamps
            .filter((item) => item.category === "Career")
            .map((item, index) => (
              <div
                key={index}
                className="p-5 border border-light-gray20 dark:border-dark-gray20 rounded-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      {item.kr}
                    </h3>
                    <p className="text-sm text-light-gray60 dark:text-dark-gray60">
                      {item.en}
                    </p>
                  </div>
                  {item.date.includes("NOW") && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100">
                      현재
                    </span>
                  )}
                </div>
                <p className="text-sm text-light-gray80 dark:text-dark-gray80 mb-2">
                  {item.info}
                </p>
                <p className="text-xs text-light-gray60 dark:text-dark-gray60">
                  {item.date}
                </p>
              </div>
            ))}
        </div>
      </section>

      {/* Activity Section */}
      <section>
        <div className="flex items-center gap-2 mb-5">
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2 className="text-xl sm:text-2xl font-bold">Activity</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {siteMetadata.timestamps
            .filter((item) => item.category === "Activity")
            .map((item, index) => (
              <div
                key={index}
                className="p-5 border border-light-gray20 dark:border-dark-gray20 rounded-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-base">{item.kr}</h3>
                  {item.date.includes("NOW") && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100">
                      현재
                    </span>
                  )}
                </div>
                <p className="text-sm text-light-gray80 dark:text-dark-gray80 mb-2">
                  {item.info}
                </p>
                <p className="text-xs text-light-gray60 dark:text-dark-gray60">
                  {item.date}
                </p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
