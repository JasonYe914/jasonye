import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackToProjects from "../../components/BackToProjects";
import ProjectMedia from "../../components/ProjectMedia";
import { PROJECTS, projectById } from "../../components/projects";

/*
 * One project, in full: what the gallery card leaves out. Built from its
 * entry in projects.ts, which for a village is its entry in villages.ts.
 */

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = projectById((await params).id);
  return project
    ? { title: `${project.name} · Jason Ye`, description: project.summary }
    : {};
}

export default async function ProjectPage({ params }: Props) {
  const project = projectById((await params).id);
  if (!project) notFound();

  const index = PROJECTS.indexOf(project);
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  return (
    <main className="project">
      <nav className="project-nav">
        <BackToProjects />
        {project.village && (
          <Link href={`/#${project.id}`} className="project-world">
            See it in the world
          </Link>
        )}
      </nav>

      <header className="project-head">
        <p className="project-meta">
          {project.kind} · {project.dates}
        </p>
        <h1>{project.name}</h1>
        <p className="project-role">
          {project.role}
          {project.place && ` · ${project.place}`}
        </p>
      </header>

      <ProjectMedia project={project} className="project-media" />

      <section className="project-body">
        <p className="project-summary">{project.summary}</p>

        {project.metrics.length > 0 && (
          <dl className="project-numbers">
            {project.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {project.points.length > 0 && (
          <ul className="project-points">
            {project.points.map((point) => (
              <li key={point.label}>
                <h2>{point.label}</h2>
                <p>{point.text}</p>
              </li>
            ))}
          </ul>
        )}

        {project.tools.length > 0 && (
          <ul className="project-tools" aria-label="Built with">
            {project.tools.map((tool) => (
              <li key={tool.name} data-core={tool.core ? "" : undefined}>
                {tool.name}
              </li>
            ))}
          </ul>
        )}

        {project.links && project.links.length > 0 && (
          <p className="project-links">
            {project.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </p>
        )}
      </section>

      <footer className="project-foot">
        <Link href={`/projects/${next.id}`}>
          <span>Next</span>
          {next.name}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </footer>
    </main>
  );
}
