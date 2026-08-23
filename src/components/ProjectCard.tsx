import Link from "next/link";

type Project = {
  title: string;
  description: string;
  techStack: string[];
  thumbnailUrl: string;
  links: {
    post?: string;
    github?: string;
    demo?: string;
    googlePlay?: string;
    appStore?: string;
  };
};

type ProjectCardProps = {
  project: Project;
};

/** 목록 행과 같은 규칙을 쓴다. 박스 카드와 pill 태그를 두지 않는다. */
export default function ProjectCard({ project }: ProjectCardProps) {
  // 썸네일이 없으면 2열로 두지 않는다. 빈 칸이 생기고 본문이 220px 로 눌린다.
  const hasThumbnail = Boolean(project.thumbnailUrl);

  return (
    <article
      className={`border-t border-mineral py-8${
        hasThumbnail ? " sm:grid sm:grid-cols-[220px_1fr] sm:gap-8" : ""
      }`}
    >
      {hasThumbnail && (
        <img
          src={project.thumbnailUrl}
          alt={project.title}
          className="mb-4 aspect-video w-full object-cover sm:mb-0"
        />
      )}

      <div>
        <p className="home-meta text-stone">{project.techStack.join(" · ")}</p>

        <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-[-0.02em] text-ink">
          {project.title}
        </h2>

        <p className="mt-2 text-[15px] leading-[1.7] text-stone">
          {project.description}
        </p>

        <div className="home-meta mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(project.links).map(([linkType, url]) =>
            url ? (
              <Link
                key={linkType}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent transition-colors hover:underline"
              >
                {linkType}
              </Link>
            ) : null,
          )}
        </div>
      </div>
    </article>
  );
}
