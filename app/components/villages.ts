/*
 * The villages: one for each part of the résumé. Each one is a 16 × 16 lot
 * with the project itself on a plaza in the middle and its details standing
 * around it as buildings. Everything a village shows comes from its entry
 * here; anything left out simply isn't built.
 */

/** Which centrepiece stands on the plaza. See CENTERPIECES in villageLayout. */
export type SceneId =
  | "queens"
  | "qadt"
  | "playtoon"
  | "getinto"
  | "wayfinder"
  | "gofleet"
  | "zendu"
  | "bankview";

/** One headline number, shown as a tower. Size is chosen, not measured. */
export type Metric = {
  value: string;
  label: string;
  size: "s" | "m" | "l";
  /** The full sentence, shown when standing beside the tower. */
  detail: string;
};

/** One technology, shown as a market stall. Core tools stand taller. */
export type Tool = { name: string; core?: boolean; detail?: string };

/** A résumé point, cut to a few words and painted on a floor plaque. */
export type Point = { label: string; text: string };

/**
 * An image on an upright board. The board takes the image's shape: "dash"
 * is a wide screenshot, "portrait" a phone capture, "photo" a 4:3 picture,
 * "form" a smaller dialog. Without `src`, a placeholder is drawn.
 */
export type Board = {
  caption: string;
  kind: "dash" | "form" | "portrait" | "photo";
  src?: string;
  alt: string;
  detail: string;
};

export type Link = { label: string; href: string };

export type Village = {
  id: SceneId;
  /** Full name, and the short one used on the map and the gate. */
  name: string;
  short: string;
  role: string;
  dates: string;
  place: string;
  kind: "Education" | "Experience" | "Team" | "Project";
  /** Painted in front of the gate. Keep it under about 26 characters. */
  gate: string;
  /** The emblem colour: the name's gradient at the start date. */
  color: string;
  /** Grid position of the middle of the lot. */
  col: number;
  row: number;
  /** One line, for the card shown on arrival. */
  summary: string;
  /** Up to three become towers; any more are listed in the sheet only. */
  metrics: Metric[];
  /** The first five become stalls; the full list shows in the sheet. */
  tools: Tool[];
  /** Up to four become plaques. */
  points: Point[];
  /** Up to two become billboards. */
  boards: Board[];
  /** Adds a clock tower when known. */
  hours?: number;
  /** Adds one house per person when known; `you` marks yours. */
  team?: { size: number; you: string };
  /** Adds a signpost when there are any. */
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
    gate: "QUEEN'S · 2024 – NOW",
    color: "#0a63d8",
    col: -12,
    row: -22,
    summary: "Mechanical Engineering at Queen's, where it all started.",
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
        caption: "CAD AND BUILDS",
        kind: "photo",
        alt: "Placeholder for CAD renders and photos of Mech Eng builds",
        detail: "Space for CAD renders and photos of Mech Eng builds.",
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
    gate: "AERO TEAM · 2025 – 26",
    color: "#5f41e6",
    col: 10,
    row: -22,
    summary: "Python drone-control scripts on ROS2 and PX4.",
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
        caption: "SIMULATION",
        kind: "photo",
        alt: "Placeholder for a photo of the drone or a simulation screenshot",
        detail: "Space for a photo of the team's drone or a simulation screenshot.",
      },
    ],
  },
  {
    id: "playtoon",
    name: "Playtoon It Inc",
    short: "PLAYTOON",
    role: "Full-Stack Software Engineering Intern",
    dates: "Sep 2025 – Jan 2026",
    place: "Remote",
    kind: "Experience",
    gate: "PLAYTOON · 2025 – 26",
    color: "#3552df",
    col: 10,
    row: 19,
    summary: "Autosave and publishing APIs for a chapter editor.",
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
        caption: "CHAPTER EDITOR",
        kind: "dash",
        alt: "Placeholder for a screenshot of the chapter editor",
        detail: "Space for a screenshot of the chapter editor with its autosave indicator.",
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
    gate: "GET-INTO.TECH · JAN 2026",
    color: "#8b38ca",
    col: -34,
    row: -12,
    summary: "An AI interview coach that reads speech, eye contact and vocabulary.",
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
        caption: "FEEDBACK",
        kind: "portrait",
        alt: "Placeholder for the feedback screen",
        detail: "Space for a recording of a feedback session.",
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
    gate: "WAYFINDER · FEB 2026",
    color: "#b8339c",
    col: -34,
    row: 10,
    summary: "Turns a goal into a roadmap where each step unlocks after its prerequisites.",
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
        alt: "Placeholder for a generated roadmap",
        detail: "Space for a screenshot of a generated roadmap.",
      },
    ],
  },
  {
    id: "gofleet",
    name: "GoFleet Corporation",
    short: "GOFLEET",
    role: "Product Engineering Intern",
    dates: "Jun 2026 – Present",
    place: "Mississauga, ON",
    kind: "Experience",
    gate: "GOFLEET · JUN 2026 – NOW",
    color: "#da3970",
    col: 32,
    row: -8,
    summary: "A Driver Qualification platform that authorizes drivers by certification.",
    metrics: [
      {
        value: "10/10",
        label: "scenarios",
        size: "s",
        detail: "Passed all 10 client-provided scenario tests and got the client's approval.",
      },
      {
        value: "20",
        label: "certification types",
        size: "m",
        detail: "20 certification types decide whether a driver is authorized, based on whether each qualification is still valid.",
      },
      {
        value: "4,462+",
        label: "equipment records",
        size: "l",
        detail: "The platform supports more than 4,462 equipment records.",
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
        label: "~2 S PER RELOAD",
        text: "Caching through a single Redis instance plus CDN delivery cut about 2 seconds from every reload.",
      },
      {
        label: "SUPERVISOR OVERRIDES",
        text: "Built real-time authorization and supervisor override workflows that check certification requirements and expiry dates.",
      },
    ],
    boards: [
      {
        caption: "QUALIFICATION DASHBOARD",
        kind: "dash",
        alt: "Placeholder for the qualification dashboard",
        detail: "Space for a dashboard screenshot. Client work: use mock data, or blur it once approved.",
      },
      {
        caption: "SUPERVISOR OVERRIDE",
        kind: "form",
        alt: "Placeholder for the supervisor override dialog",
        detail: "Space for the supervisor override flow.",
      },
    ],
  },
  {
    id: "zendu",
    name: "ZenduIT",
    short: "ZENDUIT",
    role: "Software Engineering Intern",
    dates: "Jun 2026 – Present",
    place: "Mississauga, ON",
    kind: "Experience",
    gate: "ZENDUIT · JUN 2026 – NOW",
    color: "#e55546",
    col: 32,
    row: 14,
    summary: "An indoor patient-tracking proof of concept with live geofences.",
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
        caption: "FLOOR PLAN",
        kind: "dash",
        alt: "Placeholder for the floor plan dashboard",
        detail: "Space for a demo on a mock floor plan. Patient-related: never real data.",
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
    gate: "BANKVIEW · SEP 2026",
    color: "#f0701c",
    col: -12,
    row: 19,
    summary: "A banking app for managing accounts across banks and sending money.",
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
        caption: "DASHBOARD",
        kind: "dash",
        alt: "Placeholder for the BankView dashboard",
        detail: "Space for a dashboard screenshot using sandbox accounts only.",
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
