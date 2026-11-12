import Loader from "./components/Loader";
import NavBar from "./components/NavBar";
import ThemeToggle from "./components/ThemeToggle";
import World from "./components/World";

export default function Home() {
  return (
    <main className="flex-1">
      {/* The name is painted on the canvas; this is its text equivalent. */}
      <h1 className="sr-only">Jason Ye</h1>
      <World />
      <NavBar />
      <ThemeToggle />
      <Loader />
    </main>
  );
}
