/*
 * The write-up on each project's own page, keyed by project id. Drafted
 * from what each repo and résumé entry says, so read it through and
 * correct anything that isn't how it went.
 */

export type Story = {
  /** What the project is, a paragraph or two. */
  overview: string[];
  /** What it set out to do, when it had a goal. */
  goal?: string;
  /** How it works, a few steps or parts. */
  how: { title: string; text: string }[];
  /** What each tool did in it, by the tool's name. */
  stack: Record<string, string>;
  /** Where it stands now. */
  status: string;
};

export const AUTHOR = "Jason Ye";

export const STORIES: Record<string, Story> = {
  bankview: {
    overview: [
      "BankView is a personal finance app that brings accounts from several banks into one dashboard. You can see your balances and recent transactions side by side, link new accounts, and send money to other users without switching between banking apps.",
      "It runs entirely on sandbox data, so it shows how a real multi-bank app fits together without touching anyone's actual money.",
    ],
    goal: "Build a full-stack app that handles the hard parts of finance software properly: secure sign-in, linking outside bank accounts, and moving money between users.",
    how: [
      {
        title: "Sign in",
        text: "Accounts and sessions are handled by Appwrite, so each user has their own secure session and their own linked banks.",
      },
      {
        title: "Link banks",
        text: "Each bank you connect is stored against your account, and the dashboard pulls balances and transactions from all of them into one view.",
      },
      {
        title: "Send money",
        text: "Transfers between users go through Dwolla, which sets up the funding sources and moves the money between them.",
      },
    ],
    stack: {
      "Next.js": "The app itself: pages, routing and the server actions behind every form.",
      Appwrite: "Sign-up, sessions and the database of users and linked banks.",
      Dwolla: "Funding sources and user-to-user transfers.",
      shadcn: "The interface components: forms, cards and dialogs.",
      TypeScript: "Types across the app, so data from each service is checked.",
      React: "The dashboard's components.",
    },
    status: "Complete, running on sandbox accounts.",
  },

  wayfinder: {
    overview: [
      "Wayfinder turns one big goal into a roadmap you can actually follow. Type in something like \"become a software engineer\", and it lays out a map of milestones, each with its own tasks, where later steps only open up once the ones they depend on are done.",
      "Roadmaps branch, so there's more than one way to the goal, and you can pick the route that suits you.",
    ],
    goal: "Make large, vague goals feel manageable by breaking them into clear steps with an order to them.",
    how: [
      {
        title: "Generate",
        text: "Your goal goes to Gemini, which returns 6 to 12 milestones and how they depend on one another.",
      },
      {
        title: "Map",
        text: "The milestones are drawn as a branching roadmap, starting from the fundamentals and working up to the goal.",
      },
      {
        title: "Unlock",
        text: "Each milestone has tasks. Finish them and the next milestones unlock; skip ahead and they stay locked.",
      },
    ],
    stack: {
      "Gemini API": "Turns a goal into milestones, tasks and the links between them.",
      React: "The roadmap view and each milestone's panel.",
      Flask: "The backend that talks to Gemini and keeps track of progress.",
      TypeScript: "The frontend.",
      Python: "The backend.",
    },
    status: "Complete.",
  },

  getinto: {
    overview: [
      "Get-Into.Tech is an AI interview coach. You answer practice questions on camera, and it watches how you answer as well as what you say: your speech, your eye contact and the words you use.",
      "When you're done, it talks you through the feedback out loud, the way a real interviewer or coach would.",
    ],
    goal: "Give people somewhere to practise interviews and get honest feedback before the real thing.",
    how: [
      {
        title: "Record",
        text: "You answer a question on camera while OpenCV tracks your eye contact.",
      },
      {
        title: "Analyse",
        text: "The backend breaks the recording down and sends it to Gemini, and AssemblyAI transcribes what you said.",
      },
      {
        title: "Feedback",
        text: "The analysis is written up as feedback and spoken back to you with ElevenLabs.",
      },
    ],
    stack: {
      "Gemini API": "Analyses the recorded answer.",
      OpenCV: "Tracks eye contact from the camera.",
      AssemblyAI: "Transcribes speech for the vocabulary analysis.",
      ElevenLabs: "Speaks the feedback aloud.",
      Flask: "The backend that ties the services together.",
      React: "The interview screen.",
      TypeScript: "The frontend.",
      Python: "The backend and the video processing.",
    },
    status: "Complete.",
  },

  "java-neural-network": {
    overview: [
      "A neural network written from scratch in Java, with no machine learning libraries. Every part of it, from the neurons and layers to the training loop, is plain Java code.",
    ],
    goal: "Understand how a neural network learns by building one without any library doing the hard parts.",
    how: [
      {
        title: "Forward pass",
        text: "Inputs flow through layers of weighted connections, and each neuron applies an activation function to its total.",
      },
      {
        title: "Backpropagation",
        text: "The error at the output is passed back through the network to work out how much each weight contributed to it.",
      },
      {
        title: "Training",
        text: "Weights are nudged by gradient descent, over and over, until the network's predictions settle.",
      },
    ],
    stack: {
      Java: "Everything: the matrices, the layers and the training loop.",
    },
    status: "Complete.",
  },

  "digit-classifier": {
    overview: [
      "A neural network built from scratch in NumPy that looks at a handwritten digit and decides whether it's a 0 or a 1.",
    ],
    goal: "Build and train a working image classifier using only NumPy, as a first step into machine learning.",
    how: [
      {
        title: "Prepare",
        text: "Each handwritten digit is flattened into a list of pixel values the network can read.",
      },
      {
        title: "Train",
        text: "The network learns from labelled examples, with backpropagation and gradient descent written by hand in NumPy.",
      },
      {
        title: "Classify",
        text: "Given a new digit, the network's two outputs say how sure it is that the digit is a 0 or a 1.",
      },
    ],
    stack: {
      Python: "The whole project.",
      NumPy: "The matrix maths behind every layer and every training step.",
    },
    status: "Complete.",
  },

  desmos: {
    overview: [
      "A graphing calculator in the browser, modelled on Desmos. Type in an equation and it's drawn on the graph as you type.",
      "Alongside the 2D grapher, it includes a four-function calculator, a 3D grapher and a geometry tool.",
    ],
    goal: "Rebuild a tool I used all the time, to learn how it parses equations and draws them smoothly.",
    how: [
      {
        title: "Parse",
        text: "Each equation is read and turned into something the program can evaluate at any point.",
      },
      {
        title: "Plot",
        text: "The function is sampled across the visible part of the graph and drawn as a curve.",
      },
      {
        title: "Explore",
        text: "Pan and zoom, and the graph redraws for the new view.",
      },
    ],
    stack: {
      React: "The calculator interface and the equation list.",
      JavaScript: "Parsing equations and drawing the graphs.",
    },
    status: "Complete.",
  },

  "flappy-bird": {
    overview: [
      "Flappy Bird, played not by a person but by a whole population of birds that learn to fly on their own.",
      "Each bird has a small neural network for a brain. The first generation flaps at random and crashes almost at once. Each new generation is bred from the best of the last, and within a few generations the birds are threading the pipes.",
    ],
    goal: "Teach a computer to play a game without ever telling it how, using a genetic algorithm.",
    how: [
      {
        title: "Sense",
        text: "Each bird's network takes four inputs: its height, its velocity, the distance to the next pipe and the height of the gap.",
      },
      {
        title: "Decide",
        text: "From those, the network decides one thing: flap or don't.",
      },
      {
        title: "Evolve",
        text: "When every bird has crashed, the ones that went furthest are bred, with small random mutations, to make the next generation.",
      },
    ],
    stack: {
      Java: "The game, the neural networks and the genetic algorithm.",
    },
    status: "Complete.",
  },

  "valorant-team-select": {
    overview: [
      "A website that builds a \"perfect\" Valorant team from a database of professional players, inspired by team selection in FIFA.",
      "You can search players, look through their stats, and have the site pick the strongest team it can.",
    ],
    goal: "Use real player stats to answer a question fans argue about: who would make the best team?",
    how: [
      {
        title: "Data",
        text: "Player stats from VCT Champions 2025 are stored in a database.",
      },
      {
        title: "Browse",
        text: "Search for players and compare their stats on the Player Stats page.",
      },
      {
        title: "Select",
        text: "The Team Selection page picks the best combination of players for each role.",
      },
    ],
    stack: {
      React: "The website: home, search, player stats and team selection.",
      Java: "The backend that serves player data and builds the team.",
    },
    status: "Complete.",
  },

  solitaire: {
    overview: [
      "Klondike solitaire, written in Java: the stock, the waste pile, four foundations and seven tableau columns, all following the real rules.",
    ],
    goal: "Build a complete card game, with all its rules, from scratch.",
    how: [
      {
        title: "Deal",
        text: "The deck is shuffled and dealt into the seven tableau columns, with the rest left in the stock.",
      },
      {
        title: "Move",
        text: "Cards move between piles only when the rules allow it: alternating colours down the tableau, and suit by suit up the foundations.",
      },
      {
        title: "Win",
        text: "The game is won when every card has been moved to the foundations.",
      },
    ],
    stack: {
      Java: "The cards, the rules and the game window.",
    },
    status: "Complete.",
  },

  "maze-solver": {
    overview: [
      "A Java program that solves mazes: give it a maze, and it finds a path from the entrance to the exit and traces it out.",
    ],
    goal: "Put search algorithms into practice on a problem you can see being solved.",
    how: [
      {
        title: "Read",
        text: "The maze is stored as a grid of cells, each with walls on some of its sides.",
      },
      {
        title: "Search",
        text: "The solver explores from the entrance, cell by cell, keeping track of where it has already been.",
      },
      {
        title: "Trace",
        text: "Once it reaches the exit, it follows its steps back to draw the path.",
      },
    ],
    stack: {
      Java: "The maze, the solver and the drawing.",
    },
    status: "Complete.",
  },
};
