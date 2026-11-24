import {
  VILLAGES,
  type Board,
  type Link,
  type Metric,
  type Point,
  type Tool,
  type Village,
} from "./villages";
import { GITHUB } from "./contact";

/*
 * Everything in the Projects gallery, in the order it is shown. Each
 * village is a project, and so is each solo repo below, which has a card
 * and a page but no village in the world.
 */

export type MediaKind = Board["kind"];

export type Project = {
  id: string;
  name: string;
  kind: string;
  dates: string;
  role: string;
  /** Where, or empty when there is nowhere to say. */
  place: string;
  summary: string;
  metrics: Metric[];
  points: Point[];
  tools: Tool[];
  links: Link[];
  boards: Board[];
  /**
   * The picture's shape: its kind, and width / height. `board` picks which
   * of the boards pictures the project (the first, unless set).
   */
  media: { kind: MediaKind; aspect: number; board?: number };
  /** Whether it has a village in the world to visit. */
  village: boolean;
  /** Shown large across the top of the gallery, ahead of the rest. */
  featured?: boolean;
};

const VILLAGE_MEDIA: Record<Village["id"], Project["media"]> = {
  gofleet: { kind: "dash", aspect: 1284 / 594 },
  zendu: { kind: "photo", aspect: 946 / 652 },
  bankview: { kind: "dash", aspect: 1174 / 610 },
  // The logo, not the roadmap screenshot the village leads with.
  wayfinder: { kind: "photo", aspect: 765 / 486, board: 1 },
  getinto: { kind: "photo", aspect: 1 },
  playtoon: { kind: "photo", aspect: 810 / 746 },
  qadt: { kind: "photo", aspect: 1 },
  queens: { kind: "photo", aspect: 3 / 4 },
  engine: { kind: "photo", aspect: 340 / 522 },
};

function fromVillage(village: Village): Project {
  return {
    ...village,
    place: village.place === village.kind ? "" : village.place,
    links: village.links ?? [],
    media: VILLAGE_MEDIA[village.id],
    village: true,
  };
}


/**
 * A repo of one's own: no collaborators. These are placeholders, with
 * what the repo itself says and no more; write each one up properly,
 * add pictures as boards with `src`, and any numbers or points.
 */
type Repo = {
  id: string;
  name: string;
  repo: string;
  dates: string;
  summary: string;
  tools: string[];
  media: Project["media"];
  /** A picture for the card and the project's page, until a real one exists. */
  image?: { src: string; alt: string };
  /** Shown large across the top of the gallery. */
  featured?: boolean;
};

const REPOS: Repo[] = [
  {
    id: "java-neural-network",
    name: "Neural Network in Java",
    repo: "neural-network-java-ver",
    dates: "Mar 2026",
    summary: "A neural network, written in Java.",
    tools: ["Java"],
    media: { kind: "photo", aspect: 4 / 3 },
    image: {
      src: "/projects/nn-java.svg",
      alt: "A neural network diagram, layers of nodes joined by weighted connections",
    },
  },
  {
    id: "digit-classifier",
    name: "0 vs 1 Classifier",
    repo: "ML_Project_0_1",
    dates: "Jan 2026",
    summary: "A neural network built from scratch in NumPy that tells handwritten 0s from 1s.",
    tools: ["Python", "NumPy"],
    media: { kind: "photo", aspect: 1 },
    image: {
      src: "/projects/nn-python.svg",
      alt: "A neural network diagram ending in two outputs, 0 and 1",
    },
  },
  {
    id: "visualize",
    name: "Visualize",
    repo: "Copy-of-Desmos",
    dates: "Dec 2025",
    summary: "A graphing calculator in the browser, after Desmos.",
    tools: ["React", "JavaScript"],
    media: { kind: "dash", aspect: 1565 / 948 },
    image: {
      src: "/projects/desmos.webp",
      alt: "The Visualize home page: a graph of waves beside the 2D and 3D graph buttons, with Four Function, 3D, Graphing and Geometry tools below",
    },
  },
  {
    id: "flappy-bird",
    name: "Flappy Bird",
    repo: "FlappyBirdGame",
    dates: "Sep 2025",
    summary: "Flappy Bird played by a population of birds that learns to fly over generations, with a genetic algorithm.",
    tools: ["Java"],
    media: { kind: "photo", aspect: 4 / 3 },
    image: {
      src: "/projects/flappy-bird-ga.webp",
      alt: "Generation 6 of the Flappy Bird simulation: a population of birds nearing a pipe gap, most eliminated, three pipes ahead, with the generation's best score in the corner",
    },
  },
  {
    id: "valorant-team-select",
    name: "Valorant Team Select",
    repo: "ValorantTeamSelect",
    dates: "Sep 2025",
    summary: "Pick a \"perfect\" Valorant team from a database of players, after FIFA's team selection.",
    tools: ["React", "Java"],
    media: { kind: "dash", aspect: 1600 / 768 },
    image: {
      src: "/projects/valorant-team-select.jpg",
      alt: "The site's home page: VCT Champions 2025 in large gold lettering on black, under a gold-trimmed bar with Home, Search, Player Stats and Team Selection",
    },
  },
  {
    id: "solitaire",
    name: "Solitaire",
    repo: "Solitaire",
    dates: "Sep 2025",
    summary: "Solitaire, written in Java.",
    tools: ["Java"],
    media: { kind: "photo", aspect: 3 / 2 },
    image: {
      src: "/projects/solitaire.jpg",
      alt: "A game of Klondike solitaire in progress on green felt: the stock, the waste, four foundations and seven tableau columns",
    },
  },
  {
    id: "maze-solver",
    name: "Maze Solver",
    repo: "Maze-Solver",
    dates: "Oct 2025",
    summary: "A maze solver, written in Java.",
    tools: ["Java"],
    media: { kind: "photo", aspect: 1 },
    image: {
      src: "/projects/maze.svg",
      alt: "A square maze with a yellow line tracing the solved path from the entrance at the top left to the exit at the bottom right",
    },
  },
];

function fromRepo(repo: Repo): Project {
  return {
    id: repo.id,
    name: repo.name,
    kind: "Project",
    dates: repo.dates,
    role: "Personal project",
    place: "",
    summary: repo.summary,
    metrics: [],
    points: [],
    tools: repo.tools.map((name) => ({ name, core: true })),
    links: [{ label: "GitHub", href: `${GITHUB}/${repo.repo}` }],
    boards: repo.image
      ? [{ kind: "photo", caption: repo.name, detail: repo.summary, color: true, ...repo.image }]
      : [],
    media: repo.media,
    village: false,
    featured: repo.featured,
  };
}

/**
 * The project villages, newest first, then the solo repos, newest first.
 * Only projects belong here: education, internships and teams stay in the
 * world but never get a card.
 */
const VILLAGE_ORDER: Village["id"][] = ["bankview", "wayfinder", "getinto"];

export const PROJECTS: Project[] = [
  ...VILLAGE_ORDER.flatMap((id) => {
    const village = VILLAGES.find((v) => v.id === id);
    return village && village.kind === "Project" ? [fromVillage(village)] : [];
  }),
  ...REPOS.map(fromRepo),
];

export function projectById(id: string) {
  return PROJECTS.find((project) => project.id === id) ?? null;
}
