/*
 * The villages: one for each part of the résumé. Each one is a 16 × 16 lot
 * kept nearly empty: an image or two floating over it, and its name, a
 * short line and its dates on the floor. The rest of each entry here is
 * shown in the village's sheet, not built on the lot.
 */

/** Which village, and which emblem it wears. */
export type SceneId =
  | "queens"
  | "qadt"
  | "playtoon"
  | "getinto"
  | "wayfinder"
  | "gofleet"
  | "zendu"
  | "bankview"
  | "engine";

/** One headline number, listed in the sheet. Size marks its importance. */
export type Metric = {
  value: string;
  label: string;
  size: "s" | "m" | "l";
  /** The full sentence, shown when standing beside the tower. */
  detail: string;
};

/** One technology, listed in the sheet. Core tools are marked. */
export type Tool = { name: string; core?: boolean; detail?: string };

/** A résumé point, listed in the sheet. */
export type Point = { label: string; text: string };

/**
 * An image, floating flat over the lot. It takes the image's shape: "dash"
 * is a wide screenshot, "portrait" a phone capture, "photo" a 4:3 picture,
 * "form" a smaller dialog. Without `src`, a placeholder is drawn.
 */
export type Board = {
  caption: string;
  kind: "dash" | "form" | "portrait" | "photo";
  src?: string;
  /**
   * The picture as shown upright in the sheet, when `src` suits the floor
   * but not the sheet: pre-slanted to lie flat, or a logo with so much
   * margin, or a screenshot so wide, that it reads poorly at sheet width.
   */
  flatSrc?: string;
  /** Width over height of the picture, when it doesn't match its kind. */
  aspect?: number;
  /** Keep the picture's own colours rather than greying it like the world. */
  color?: boolean;
  /** A short loop played over the picture (see signinDemo.ts). */
  demo?: "signin";
  alt: string;
  detail: string;
};

export type Link = { label: string; href: string };

export type Village = {
  id: SceneId;
  /** Full name, and the short one used on the map and the lot. */
  name: string;
  short: string;
  /** Written on the lot in place of `short`, when given. */
  heading?: string;
  role: string;
  dates: string;
  place: string;
  kind: "Education" | "Experience" | "Team" | "Project";
  /**
   * The village's own hue, soft enough to sit on the white floor: its
   * floating panels and their shadow, its emblem and its minimap mark.
   */
  color: string;
  /** Grid position of the middle of the lot. Placed by hand, loosely. */
  col: number;
  row: number;
  /** One line, for the card shown on arrival. */
  summary: string;
  /**
   * A line of your own, painted under the name on the lot. Not from the
   * résumé: what it was about, in a few words. Keep it under about 32
   * characters.
   */
  tagline: string;
  /**
   * A few short lines painted under the name once the chicken is inside
   * the lot, and taken away when it leaves. Fragments, not sentences:
   * keep each under about 30 characters, and keep to three or so.
   */
  facts: string[];
  /** Headline numbers, listed in the sheet. */
  metrics: Metric[];
  /** Technologies, listed in the sheet. */
  tools: Tool[];
  /** Résumé points, listed in the sheet. */
  points: Point[];
  /** Images. The first floats large in the middle of the lot; the rest,
   *  smaller, are layered over its back corner or set beside it. */
  boards: Board[];
  /** Hours spent, shown in the sheet when known. */
  hours?: number;
  /** Team size, shown in the sheet when known; `you` is your part. */
  team?: { size: number; you: string };
  /** Links, opened from the sheet. */
  links?: Link[];
};

/** Side of a lot, in tiles. */
export const LOT = 16;

export const VILLAGES: Village[] = [
  {
    id: "queens",
    name: "Queen's University",
    short: "QUEEN'S",
    role: "B.Sc. Eng, Mechanical Engineering",
    dates: "Sep 2024 – Present",
    place: "Kingston, ON",
    kind: "Education",
    col: -13,
    row: -21,
    color: "#4c7bd9",
    summary: "Mechanical Engineering at Queen's, where it all started.",
    tagline: "Learning how things are built.",
    facts: ["Mechanical Engineering", "3rd year", "Kingston, ON"],
    metrics: [],
    tools: [],
    points: [
      {
        label: "MECHANICAL ENGINEERING",
        text: "Studying Mechanical Engineering at Queen's University in Kingston, Ontario, since September 2024.",
      },
    ],
    boards: [
      {
        caption: "QUEEN'S UNIVERSITY",
        kind: "dash",
        src: "/villages/queens/logo.webp",
        aspect: 607 / 225,
        color: true,
        alt: "The Queen's University crest and wordmark",
        detail: "Queen's University, Kingston, Ontario.",
      },
      {
        caption: "CAMPUS",
        kind: "photo",
        src: "/villages/queens/campus.jpg",
        aspect: 606 / 363,
        color: true,
        alt: "Aerial view of the Queen's campus and Richardson Stadium by Lake Ontario",
        detail: "The campus on the shore of Lake Ontario.",
      },
      {
        caption: "MITCHELL HALL",
        kind: "photo",
        src: "/villages/queens/building.jpg",
        aspect: 566 / 340,
        color: true,
        alt: "A glass-fronted engineering building beside an older limestone hall at dusk",
        detail: "Engineering at Queen's.",
      },
    ],
  },
  {
    id: "qadt",
    name: "Queen's Aerospace Design Team",
    short: "AERO TEAM",
    role: "Software Engineer, Team Member",
    dates: "Sep 2025 – May 2026",
    place: "Kingston, ON",
    kind: "Team",
    col: -27,
    row: -8,
    color: "#2a9d8f",
    summary: "Python drone-control scripts on ROS2 and PX4.",
    tagline: "Teaching drones to fly themselves.",
    facts: ["Software engineer", "Drone autonomy", "ROS2 · PX4 · Python"],
    metrics: [],
    tools: [
      { name: "ROS2", core: true },
      { name: "PX4", core: true },
      { name: "Python", core: true },
      { name: "Docker" },
      { name: "Git" },
    ],
    points: [
      {
        label: "FLIGHT SCRIPTS",
        text: "Developed Python drone control scripts using ROS2 and PX4 for reliable flight-module communication.",
      },
      {
        label: "DOCKERIZED SIM",
        text: "Maintained a Dockerized Linux environment for simulation testing, with version control through Git and GitHub.",
      },
    ],
    boards: [
      {
        caption: "QUEEN'S AEROSPACE",
        kind: "photo",
        src: "/villages/qadt/logo.webp",
        aspect: 392 / 225,
        color: true,
        alt: "The Queen's Aerospace logo: white lettering and a cyan arrow on navy",
        detail: "Queen's Aerospace Design Team, Kingston, Ontario.",
      },
    ],
  },
  {
    id: "playtoon",
    name: "Playtoon It Inc",
    short: "PLAYTOON",
    heading: "SWE @PLAYTOON",
    role: "Full-Stack Software Engineering Intern",
    dates: "Sep 2025 – Jan 2026",
    place: "Remote",
    kind: "Experience",
    col: 19,
    row: 2,
    color: "#8b6cdb",
    summary: "Autosave and publishing APIs for a chapter editor.",
    tagline: "So no chapter ever gets lost.",
    facts: ["Full-stack intern", "Autosave + publishing APIs", "React · PostgreSQL"],
    metrics: [
      {
        value: "5 MIN",
        label: "autosave",
        size: "m",
        detail: "An autosave system syncs user input to PostgreSQL every 5 minutes, so work in progress isn't lost.",
      },
    ],
    tools: [
      { name: "React", core: true },
      { name: "Redux Toolkit", core: true },
      { name: "PostgreSQL", core: true },
      { name: "REST APIs" },
    ],
    points: [
      {
        label: "REST ENDPOINTS",
        text: "Designed and integrated RESTful API endpoints connecting the chapter editor to backend publishing services.",
      },
      {
        label: "SCHEMA FIXES",
        text: "Resolved schema validation bugs, improving data consistency across the application.",
      },
    ],
    boards: [
      {
        caption: "PLAYTOON.IT",
        kind: "photo",
        src: "/villages/playtoon/logo.webp",
        flatSrc: "/villages/playtoon/logo-flat.webp",
        aspect: 810 / 746,
        color: true,
        alt: "The Playtoon.it logo: white and black lettering on an orange open book",
        detail: "Playtoon It Inc.",
      },
    ],
  },
  {
    id: "getinto",
    name: "Get-Into.Tech",
    short: "GET-INTO.TECH",
    role: "AI interview assistant",
    dates: "Jan 2026",
    place: "Project",
    kind: "Project",
    col: -33,
    row: -1,
    color: "#e0705a",
    summary: "An AI interview coach that reads speech, eye contact and vocabulary.",
    tagline: "Practice before the real thing.",
    facts: ["AI interview coach", "Speech, eye contact, vocab", "Gemini · OpenCV · Flask"],
    metrics: [
      {
        value: "3",
        label: "signals",
        size: "m",
        detail: "Analyses speech, eye contact and vocabulary, then gives automated spoken feedback.",
      },
    ],
    tools: [
      { name: "Gemini API", core: true },
      { name: "OpenCV", core: true },
      { name: "AssemblyAI" },
      { name: "ElevenLabs" },
      { name: "Flask", core: true },
      { name: "React" },
      { name: "TypeScript" },
      { name: "Python" },
    ],
    points: [
      {
        label: "EYE CONTACT",
        text: "Uses OpenCV to track eye contact while you answer practice questions.",
      },
      {
        label: "VOICE FEEDBACK",
        text: "AssemblyAI and ElevenLabs turn the analysis into automated spoken feedback.",
      },
      {
        label: "VIDEO TO GEMINI",
        text: "The backend breaks recorded video down and sends it to Gemini through the API for analysis.",
      },
    ],
    boards: [
      {
        caption: "GET-INTO.TECH",
        kind: "photo",
        src: "/villages/getinto/icon.webp",
        flatSrc: "/villages/getinto/icon-flat.webp",
        aspect: 1,
        color: true,
        alt: "The Get-Into.Tech app icon: white concentric rings on a purple gradient",
        detail: "Get-Into.Tech.",
      },
    ],
  },
  {
    id: "wayfinder",
    name: "Wayfinder",
    short: "WAYFINDER",
    role: "Goal-to-roadmap generator",
    dates: "Feb 2026",
    place: "Project",
    kind: "Project",
    col: -23,
    row: 9,
    color: "#e2a33b",
    summary: "Turns a goal into a roadmap where each step unlocks after its prerequisites.",
    tagline: "Big goals, one step at a time.",
    facts: ["Goal-to-roadmap generator", "Steps unlock in order", "Gemini · React · Flask"],
    metrics: [
      {
        value: "6–12",
        label: "milestones",
        size: "l",
        detail: "Gemini generates 6 to 12 milestones from a single goal, with more than one path to it.",
      },
    ],
    tools: [
      { name: "Gemini API", core: true },
      { name: "React", core: true },
      { name: "Flask", core: true },
      { name: "TypeScript" },
      { name: "Python" },
    ],
    points: [
      {
        label: "DEPENDENCY UNLOCKS",
        text: "Each milestone unlocks only after its prerequisites are completed.",
      },
      {
        label: "MULTIPLE PATHS",
        text: "Roadmaps branch, so there's more than one route to the goal.",
      },
    ],
    boards: [
      {
        caption: "ROADMAP",
        kind: "dash",
        src: "/villages/wayfinder/roadmap.webp",
        flatSrc: "/villages/wayfinder/roadmap-flat.webp",
        aspect: 1309 / 455,
        color: true,
        alt: "A WayFinder roadmap for a software engineer, branching from Programming Fundamentals, with that step's tasks open beside it",
        detail: "A generated roadmap, with a step's tasks and proof open beside it.",
      },
      {
        caption: "WAYFINDER",
        kind: "photo",
        src: "/villages/wayfinder/logo.webp",
        aspect: 765 / 486,
        color: true,
        alt: "The WayFinder logo: a winding road rising to an arrow, inside a circle",
        detail: "WayFinder.",
      },
    ],
  },
  {
    id: "gofleet",
    name: "GoFleet Corporation",
    short: "GOFLEET",
    heading: "PRODUCT @GOFLEET",
    role: "Product Engineering Intern",
    dates: "Jun 2026 – Present",
    place: "Mississauga, ON",
    kind: "Experience",
    col: 16,
    row: 15,
    color: "#3f9e5b",
    summary: "A Driver Qualification platform that authorizes drivers by certification.",
    tagline: "The right drivers on the road.",
    facts: ["Product engineering intern", "Driver qualification", "React · Supabase · Redis"],
    metrics: [
      {
        value: "~2 S",
        label: "faster per reload",
        size: "m",
        detail: "Redis caching and CDN delivery together cut about 2 seconds from every reload.",
      },
    ],
    tools: [
      { name: "React", core: true },
      { name: "Express", core: true },
      { name: "Supabase", core: true },
      {
        name: "Redis",
        detail: "A single Redis instance caches reads, part of what cut about 2 seconds from every reload.",
      },
      { name: "CDN", detail: "CDN delivery, the other half of the reload speed-up." },
    ],
    points: [
      {
        label: "CERTIFICATION CHECKS",
        text: "A driver is authorized only while every certification their work requires is still valid.",
      },
      {
        label: "SUPERVISOR OVERRIDES",
        text: "Built real-time authorization and supervisor override workflows that check certification requirements and expiry dates.",
      },
    ],
    boards: [
      {
        caption: "GOFLEET",
        kind: "dash",
        src: "/villages/gofleet/banner.webp",
        aspect: 1284 / 594,
        color: true,
        alt: "The GoFleet logo over a sketch of a Geotab GO telematics device: powerful plug and play solutions",
        detail: "GoFleet: powerful plug and play solutions.",
      },
    ],
  },
  {
    id: "zendu",
    name: "ZenduIT",
    short: "ZENDUIT",
    heading: "SWE @ZENDUIT",
    role: "Software Engineering Intern",
    dates: "Jun 2026 – Present",
    place: "Mississauga, ON",
    kind: "Experience",
    col: -4,
    row: 33,
    color: "#3aa0c9",
    summary: "An indoor patient-tracking proof of concept with live geofences.",
    tagline: "Knowing where everyone is.",
    facts: ["Software engineering intern", "Indoor patient tracking", "Next.js · Leaflet"],
    metrics: [
      {
        value: "3",
        label: "end-to-end scenarios",
        size: "s",
        detail: "Validated across 3 end-to-end movement scenarios using 2 tracking devices.",
      },
      {
        value: "3",
        label: "geofenced zones",
        size: "m",
        detail: "A real-time dashboard and floor plan monitor patient location across 3 geofenced zones.",
      },
      {
        value: "2×",
        label: "alert rate on exit",
        size: "l",
        detail: "Location alerts automatically double in frequency when a patient leaves a zone.",
      },
    ],
    tools: [
      { name: "Next.js", core: true },
      { name: "Leaflet", core: true },
      {
        name: "Oyster 3",
        core: true,
        detail: "Oyster 3 tracking devices report each patient's position.",
      },
    ],
    points: [
      {
        label: "LIVE DASHBOARD",
        text: "The dashboard updates live as tracking devices move between zones.",
      },
      {
        label: "EXIT DETECTION",
        text: "Compares each device's current position against the geofenced areas to detect when a patient leaves one.",
      },
    ],
    boards: [
      {
        caption: "ZENDUIT",
        kind: "photo",
        src: "/villages/zendu/logo.webp",
        flatSrc: "/villages/zendu/logo-flat.webp",
        aspect: 946 / 652,
        color: true,
        alt: "The ZenduIT wordmark in blue",
        detail: "ZenduIT.",
      },
    ],
  },
  {
    id: "bankview",
    name: "BankView",
    short: "BANKVIEW",
    role: "Multi-bank finance app",
    dates: "Sep 2026",
    place: "Project",
    kind: "Project",
    col: -9,
    row: 21,
    color: "#5b5fc7",
    summary: "A banking app for managing accounts across banks and sending money.",
    tagline: "Every account on one screen.",
    facts: ["Multi-bank finance app", "Accounts + transfers", "Next.js · Appwrite · Dwolla"],
    metrics: [],
    tools: [
      { name: "Next.js", core: true },
      { name: "Appwrite", core: true },
      { name: "Dwolla", core: true },
      { name: "shadcn" },
      { name: "TypeScript" },
      { name: "React" },
    ],
    points: [
      {
        label: "MULTI-BANK ACCOUNTS",
        text: "Manage accounts from several banks in one place.",
      },
      {
        label: "USER-TO-USER",
        text: "Secure workflows for account setup, account linking and user-to-user transfers.",
      },
      {
        label: "APPWRITE AUTH",
        text: "Sign-up and sessions built on Appwrite's account and session functions.",
      },
    ],
    boards: [
      {
        caption: "SIGN IN",
        kind: "dash",
        src: "/villages/bankview/signin.webp",
        aspect: 1174 / 610,
        color: true,
        demo: "signin",
        alt: "The BankView sign-in screen beside a preview of the dashboard",
        detail: "Signing in to the dashboard, with sandbox accounts only.",
      },
    ],
  },
  {
    id: "engine",
    name: "V8 Engine Block",
    short: "V8 ENGINE",
    role: "CAD model",
    dates: "Dates TBD",
    place: "Project",
    kind: "Project",
    col: 10,
    row: -20,
    color: "#b4545e",
    summary: "A V8 engine block, crankshaft and pistons, modelled in CAD.",
    tagline: "Eight cylinders, one crank.",
    facts: ["CAD model", "Block, crank, pistons"],
    metrics: [],
    tools: [],
    points: [],
    boards: [
      {
        // Straightened so the CAD grid runs with the world's floor grid:
        // lying on the floor, it reads as the engine seen from above.
        caption: "TOP VIEW",
        kind: "portrait",
        src: "/villages/engine/top.webp",
        aspect: 340 / 522,
        color: true,
        alt: "Top view of the V8 engine model: two banks of four cylinders either side of the crankshaft",
        detail: "From above: two banks of four cylinders round the crankshaft.",
      },
      {
        caption: "ISOMETRIC VIEW",
        kind: "photo",
        src: "/villages/engine/iso.webp",
        flatSrc: "/villages/engine/iso-flat.webp",
        // Pre-slanted, so laid on the floor it stands square to the screen.
        // Its background grid is redrawn to match the top view's: the same
        // spacing in tiles, colour and line positions, edge to edge.
        aspect: 1,
        color: true,
        alt: "Isometric view of the V8 engine model, its translucent block showing the pistons and crankshaft inside",
        detail: "The block made see-through, showing the pistons and crankshaft.",
      },
    ],
  },
];

export function villageById(id: string) {
  return VILLAGES.find((village) => village.id === id) ?? null;
}

/** Grid position of a village's top-left corner. */
export function lotOrigin(village: Village) {
  return { col: village.col - LOT / 2, row: village.row - LOT / 2 };
}
