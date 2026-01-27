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

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="border border-light-gray20 dark:border-dark-gray20 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail Image */}
      {project.thumbnailUrl && (
        <div className="aspect-video bg-light-gray10 dark:bg-dark-gray10">
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Tech Stack Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {project.techStack.map((tech, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs rounded bg-light-gray10 dark:bg-dark-gray10 text-light-black100 dark:text-dark-black100"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-2">{project.title}</h3>

        {/* Description */}
        <p className="text-sm text-light-gray80 dark:text-dark-gray80 mb-4">
          {project.description}
        </p>

        {/* Links */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(project.links).map(([linkType, url]) =>
            url ? (
              <Link
                key={linkType}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {linkType}
              </Link>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
