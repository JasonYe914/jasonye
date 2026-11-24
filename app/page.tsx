import type { Metadata } from "next";
import Clock from "./components/Clock";
import Loader from "./components/Loader";
import NavBar from "./components/NavBar";
import SiteFooter from "./components/SiteFooter";
import VillageCard, { VillageIndex } from "./components/VillageCard";
import World from "./components/World";
import WorldGuide from "./components/WorldGuide";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main className="flex-1">
      {/* The name is painted on the canvas; this is its text equivalent. */}
      <h1 className="sr-only">Jason Ye</h1>
      <VillageIndex />
      <World />
      <NavBar />
      <Clock />
      <VillageCard />
      <WorldGuide />
      <SiteFooter className="site-foot-world" />
      <Loader />
    </main>
  );
}
