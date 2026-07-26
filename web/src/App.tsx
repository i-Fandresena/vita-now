import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { RepositoryProvider } from "./app/repository";
import { useRoute, type Route } from "./app/router";
import { SearchProvider } from "./app/search-store";
import { Shell } from "./app/Shell";
import { fade, reduceVariants } from "./lib/motion";
import { CapsuleScreen } from "./screens/CapsuleScreen";
import { DepositScreen } from "./screens/DepositScreen";
import { FragmentScreen } from "./screens/FragmentScreen";
import { LandingScreen } from "./screens/LandingScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { SignalScreen } from "./screens/SignalScreen";

/** Clé de transition : deux routes distinctes ne partagent jamais une clé. */
function routeKey(route: Route): string {
  return route.name === "fragment" || route.name === "signal"
    ? `${route.name}:${route.id}`
    : route.name;
}

function CurrentScreen({
  route,
  navigate,
}: {
  route: Route;
  navigate: (to: Route) => void;
}) {
  switch (route.name) {
    case "accueil":
      return <LandingScreen navigate={navigate} />;
    case "recherche":
      return <SearchScreen navigate={navigate} />;
    case "fragment":
      return <FragmentScreen id={route.id} navigate={navigate} />;
    case "reprise":
      return <CapsuleScreen navigate={navigate} />;
    case "depot":
      return <DepositScreen navigate={navigate} />;
    case "signal":
      return <SignalScreen id={route.id} navigate={navigate} />;
  }
}

function Screens() {
  const { route, navigate } = useRoute();
  const reduced = useReducedMotion() ?? false;
  const variants = reduceVariants(fade, reduced);

  return (
    <Shell route={route} navigate={navigate}>
      {/* `mode="wait"` : deux écrans superposés pendant la transition
          produiraient un chevauchement de texte illisible. On attend la sortie
          avant d'entrer — 100 ms, imperceptible, et jamais de scintillement. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey(route)}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <CurrentScreen route={route} navigate={navigate} />
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

export function App() {
  return (
    <RepositoryProvider>
      <SearchProvider>
        <Screens />
      </SearchProvider>
    </RepositoryProvider>
  );
}
