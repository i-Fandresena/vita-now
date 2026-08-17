import UseAnimationsImport from "react-useanimations";
import activityImport from "react-useanimations/lib/activity";
import alertTriangleImport from "react-useanimations/lib/alertTriangle";
import arrowLeftCircleImport from "react-useanimations/lib/arrowLeftCircle";
import arrowRightCircleImport from "react-useanimations/lib/arrowRightCircle";
import bookmarkImport from "react-useanimations/lib/bookmark";
import calendarImport from "react-useanimations/lib/calendar";
import checkmarkImport from "react-useanimations/lib/checkmark";
import folderImport from "react-useanimations/lib/folder";
import homeImport from "react-useanimations/lib/home";
import lockImport from "react-useanimations/lib/lock";
import menu2Import from "react-useanimations/lib/menu2";
import notificationImport from "react-useanimations/lib/notification";
import plusToXImport from "react-useanimations/lib/plusToX";
import searchToXImport from "react-useanimations/lib/searchToX";
import settingsImport from "react-useanimations/lib/settings";
import shareImport from "react-useanimations/lib/share";
import starImport from "react-useanimations/lib/star";
import thumbUpImport from "react-useanimations/lib/thumbUp";
import userPlusImport from "react-useanimations/lib/userPlus";
import visibilityImport from "react-useanimations/lib/visibility";
import visibility2Import from "react-useanimations/lib/visibility2";
import type { HTMLAttributes } from "react";

// `react-useanimations` mélange un bundle UMD (lottie-web) avec des modules
// CJS/Babel : selon l'outil de bundling, un import par défaut renvoie soit la
// valeur attendue directement, soit l'objet d'exports CJS entier (`{ default
// }`) faute d'interop appliquée — ça vaut pour le composant ET pour chaque
// animation importée séparément (`lib/star`, `lib/bell`...). On déballe donc
// systématiquement plutôt que de dépendre du comportement du bundler.
function unwrap<T>(mod: T): T {
  return (mod as unknown as { default?: T })?.default ?? mod;
}

const UseAnimations = unwrap(UseAnimationsImport);
const activity = unwrap(activityImport);
const alertTriangle = unwrap(alertTriangleImport);
const arrowLeftCircle = unwrap(arrowLeftCircleImport);
const arrowRightCircle = unwrap(arrowRightCircleImport);
const bookmark = unwrap(bookmarkImport);
const calendar = unwrap(calendarImport);
const checkmark = unwrap(checkmarkImport);
const folder = unwrap(folderImport);
const home2 = unwrap(homeImport);
const lock = unwrap(lockImport);
const menu2 = unwrap(menu2Import);
const notification = unwrap(notificationImport);
const plusToX = unwrap(plusToXImport);
const searchToX = unwrap(searchToXImport);
const settings = unwrap(settingsImport);
const share = unwrap(shareImport);
const star = unwrap(starImport);
const thumbUp = unwrap(thumbUpImport);
const userPlus = unwrap(userPlusImport);
const visibility = unwrap(visibilityImport);
const visibility2 = unwrap(visibility2Import);

/**
 * Icônes animées (Lottie, via react-useanimations — JSON embarqué, aucun
 * appel réseau). Remplace les pictogrammes statiques lucide-react : chaque
 * icône se joue au survol/clic plutôt qu'en boucle, pour rester lisible
 * quand plusieurs apparaissent sur un même écran.
 */
const ANIMATIONS = {
  sparkle: star,
  trophy: thumbUp,
  bell: notification,
  clock: activity,
  plus: plusToX,
  search: searchToX,
  arrowRight: arrowRightCircle,
  back: arrowLeftCircle,
  eye: visibility,
  eyeOff: visibility2,
  alertTriangle,
  calendar,
  menu: menu2,
  user: userPlus,
  building: home2,
  logout: arrowRightCircle,
  lock,
  check: checkmark,
  folder,
  send: share,
  settings,
  book: bookmark,
} as const;

export type IconName = keyof typeof ANIMATIONS;

interface IconProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className, style, ...rest }: IconProps) {
  return (
    <UseAnimations
      animation={ANIMATIONS[name]}
      size={size}
      strokeColor="currentColor"
      className={className}
      wrapperStyle={{ display: "inline-flex", flexShrink: 0, ...style }}
      {...rest}
    />
  );
}
