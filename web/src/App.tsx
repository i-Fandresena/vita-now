import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { RepositoryProvider } from "./app/repository";
import { routeKey, useRoute, type Route } from "./app/router";
import { SearchProvider } from "./app/search-store";
import { Shell } from "./app/Shell";
import { VitanowProvider } from "./app/vitanow-store";
import { fade, reduceVariants } from "./lib/motion";
import { CapsuleScreen } from "./screens/CapsuleScreen";
import {
  ChallengeScreen,
  ChallengesScreen,
  CommunityScreen,
  CompanionsScreen,
  IdeasScreen,
  MentorsScreen,
  ThreadScreen,
} from "./screens/CommunityScreens";
import {
  CompanyChallengesScreen,
  CompanyHomeScreen,
  CompanyOpportunitiesScreen,
  MarketplaceScreen,
  TalentScreen,
  TalentsScreen,
} from "./screens/CompanyScreens";
import { DashboardScreen } from "./screens/DashboardScreen";
import { DepositScreen } from "./screens/DepositScreen";
import { FragmentScreen } from "./screens/FragmentScreen";
import { LandingScreen } from "./screens/LandingScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { MemoryScreen, RenaissanceScreen } from "./screens/MemoryScreens";
import {
  JournalScreen,
  NewProjectScreen,
  ProjectScreen,
  ProjectsScreen,
  RepoScreen,
  ShowcaseScreen,
} from "./screens/ProjectScreens";
import {
  LeaderboardScreen,
  NotificationsScreen,
  OpportunitiesScreen,
  PortfolioScreen,
  ProfileScreen,
} from "./screens/ProfileScreens";
import { SignalScreen } from "./screens/SignalScreen";

/**
 * App.tsx — l'aiguillage.
 *
 * Un `switch` exhaustif sur `Route` : TypeScript refuse de compiler si une
 * route est ajoutée au type sans écran correspondant. C'est ce qui empêche la
 * dérive classique où une URL existe mais n'affiche rien.
 */

function CurrentScreen({
  route,
  navigate,
}: {
  route: Route;
  navigate: (to: Route) => void;
}) {
  switch (route.name) {
    /* Public */
    case "accueil":
      return <LandingScreen navigate={navigate} />;
    case "connexion":
      return <SignInScreen navigate={navigate} />;
    case "inscription":
      return <SignUpScreen navigate={navigate} />;

    /* Étudiant — onglets */
    case "tableau":
      return <DashboardScreen navigate={navigate} />;
    case "projets":
      return <ProjectsScreen navigate={navigate} />;
    case "memoire":
      return <MemoryScreen navigate={navigate} />;
    case "communaute":
      return <CommunityScreen navigate={navigate} />;
    case "profil":
      return <ProfileScreen id={route.id} navigate={navigate} />;

    /* Projets */
    case "projet":
      return <ProjectScreen id={route.id} navigate={navigate} />;
    case "projet-nouveau":
      return <NewProjectScreen navigate={navigate} />;
    case "projet-journal":
      return <JournalScreen id={route.id} navigate={navigate} />;
    case "projet-presentation":
      return <ShowcaseScreen id={route.id} navigate={navigate} />;
    case "projet-depot":
      return <RepoScreen id={route.id} navigate={navigate} />;

    /* Mémoire */
    case "reprise":
      return <CapsuleScreen navigate={navigate} />;
    case "renaissance":
      return <RenaissanceScreen navigate={navigate} />;
    case "fragment":
      return <FragmentScreen id={route.id} navigate={navigate} />;
    case "depot":
      return <DepositScreen navigate={navigate} />;
    case "signal":
      return <SignalScreen id={route.id} navigate={navigate} />;

    /* Communauté */
    case "sujet":
      return <ThreadScreen id={route.id} navigate={navigate} />;
    case "compagnons":
      return <CompanionsScreen navigate={navigate} />;
    case "challenges":
      return <ChallengesScreen navigate={navigate} />;
    case "challenge":
      return <ChallengeScreen id={route.id} navigate={navigate} />;
    case "idees":
      return <IdeasScreen navigate={navigate} />;
    case "mentorat":
      return <MentorsScreen navigate={navigate} />;

    /* Profil */
    case "notifications":
      return <NotificationsScreen navigate={navigate} />;
    case "classements":
      return <LeaderboardScreen navigate={navigate} />;
    case "portfolio":
      return <PortfolioScreen id={route.id} navigate={navigate} />;
    case "opportunites":
      return <OpportunitiesScreen navigate={navigate} />;

    /* Entreprise */
    case "ent-accueil":
      return <CompanyHomeScreen navigate={navigate} />;
    case "ent-talents":
      return <TalentsScreen navigate={navigate} />;
    case "ent-talent":
      return <TalentScreen id={route.id} navigate={navigate} />;
    case "ent-opportunites":
      return <CompanyOpportunitiesScreen navigate={navigate} />;
    case "ent-challenges":
      return <CompanyChallengesScreen navigate={navigate} />;
    case "ent-marketplace":
      return <MarketplaceScreen navigate={navigate} />;
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
    <VitanowProvider>
      <RepositoryProvider>
        <SearchProvider>
          <Screens />
        </SearchProvider>
      </RepositoryProvider>
    </VitanowProvider>
  );
}
