import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackToProjects from "../../components/BackToProjects";
import ProjectMedia from "../../components/ProjectMedia";
import SiteFooter from "../../components/SiteFooter";
import { AUTHOR, STORIES } from "../../components/projectStories";
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

  const story = STORIES[project.id];
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
      </header>

      <ProjectMedia project={project} className="project-media" priority />

      <div className="project-layout">
        <article className="project-main">
          {story && (
            <section className="project-section">
              <h2>Overview</h2>
              {story.overview.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          )}

          {story?.goal && (
            <section className="project-section">
              <h2>The goal</h2>
              <p className="project-goal">{story.goal}</p>
            </section>
          )}

          {story && story.how.length > 0 && (
            <section className="project-section">
              <h2>How it works</h2>
              <ol className="project-steps">
                {story.how.map((step) => (
                  <li key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(project.metrics.length > 0 || project.points.length > 0) && (
            <section className="project-section">
              <h2>Highlights</h2>
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
                      <h3>{point.label}</h3>
                      <p>{point.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </article>

        <aside className="project-facts" aria-label="Project details">
          <dl>
            <div>
              <dt>Author</dt>
              <dd>{AUTHOR}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                {project.role}
                {project.place && ` · ${project.place}`}
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{project.dates}</dd>
            </div>
            {story?.status && (
              <div>
                <dt>Status</dt>
                <dd>{story.status}</dd>
              </div>
            )}
            {project.tools.length > 0 && (
              <div>
                <dt>Tech stack</dt>
                <dd>
                  <ul className="project-stack">
                    {project.tools.map((tool) => (
                      <li key={tool.name}>
                        <span className="project-stack-name">{tool.name}</span>
                        {story?.stack[tool.name] && (
                          <span className="project-stack-use">{story.stack[tool.name]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {project.links.length > 0 && (
              <div>
                <dt>Links</dt>
                <dd className="project-links">
                  {project.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 17 17 7M8 7h9v9" />
                      </svg>
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <footer className="project-foot">
        <Link href={`/projects/${next.id}`}>
          <span>Next</span>
          {next.name}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </footer>
      <SiteFooter />
    </main>
  );
}
