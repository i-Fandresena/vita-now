# Contexte pour NotebookLM — génération du PPTX de soutenance VITA'NOW / Aura++

> Ce document est destiné à être soumis tel quel à NotebookLM pour générer la
> présentation (PPTX) de la soutenance. Il contient : l'identité visuelle
> exacte de l'application (à reproduire dans les slides), le script complet
> de la présentatrice, un découpage slide par slide avec minutage pour tenir
> **7 minutes**, et les intentions d'animation traduites en équivalents
> réalisables en PowerPoint / Google Slides.

---

## 0. Ce qu'il faut comprendre avant de générer les slides

La présentation combine **deux registres différents**, et le PPTX ne doit
couvrir que le premier :

1. **Slides réelles** — l'ouverture cinématique (enveloppe/lettre), la slide
   d'équipe, le grand logo, des **cartons de chapitre** courts entre chaque
   fonctionnalité (un titre + une accroche, pas un pavé de texte), et la
   clôture.
2. **Démonstration en direct dans l'application** — la majorité des 7 minutes
   (Dashboard, Projets, Copilote IA, Recherche, Communauté, GitHub, Profil,
   Classement, Entreprises) se passe **à l'écran, dans le vrai produit**, pas
   sur une slide. Ne pas essayer de recréer des maquettes d'écran détaillées
   en slides : une slide de transition avec le nom de la fonctionnalité et une
   phrase d'accroche suffit, le reste est parlé par-dessus l'application
   réelle.

Donc : peu de slides, denses en intention, beaucoup d'espace blanc — pas un
deck de 20 diapositives chargées de texte.

---

## 1. Identité visuelle exacte de l'application (à reproduire)

Ces valeurs viennent directement du design system de l'application
(`theme.css`) — ce ne sont pas des suggestions, ce sont les couleurs et
polices réelles de VITA'NOW. Les utiliser telles quelles rend le PPTX
visuellement continu avec la démo live qui suit chaque carton de chapitre.

### Couleurs (converties en hexadécimal pour PowerPoint/Slides)

| Rôle | Usage | Hex |
|---|---|---|
| **Indigo — action** | Couleur de marque principale, titres, éléments actifs, liens. **Jamais** utilisée pour « la réussite » | `#1E64EF` |
| Indigo clair (fond doux) | Fonds de blocs, surlignage discret | `#EAF1FE` *(indigo à 8 % d'opacité sur blanc)* |
| **Jaune/or — la réussite** | Réussite, badge, moment clé, célébration. **Jamais** un bouton | `#F7D22A` |
| Jaune doux (fond) | Fond de bloc « moment fort » | `#FDECA6` |
| Fond principal | Fond des slides de contenu | `#FFFFFF` |
| Fond « héros » (chaleureux) | Slide d'ouverture, slide de clôture — un blanc cassé chaud, pas un blanc froid | `#F1EAE1` |
| Texte principal | Corps de texte, titres | `#091426` *(navy très sombre, jamais noir pur)* |
| Texte secondaire | Sous-titres, légendes | `#657383` |
| Succès (vert) | Ponctuel, jamais dominant | `#4CC157` |
| Bordures / filets | Séparateurs discrets | `#E0E5EB` |

**Règle de la marque, à respecter absolument** : l'indigo porte l'action, le
jaune porte la réussite. Ne jamais utiliser le jaune pour un bouton ou un
élément cliquable, ne jamais utiliser l'indigo pour célébrer un succès. C'est
la règle qui structure tout le design de l'application — la garder rend le
PPTX cohérent avec ce qui a été montré à l'écran.

### Typographies (toutes disponibles nativement dans Google Slides / PowerPoint via Google Fonts — aucune substitution nécessaire)

| Rôle | Police | Usage |
|---|---|---|
| **Display (titres choc)** | **Anton** | Une seule affirmation forte par slide, tout en capitales, jamais en dessous de 24 pt. C'est la police du titre « VITA'NOW » et des grandes phrases (ex. « Tu peux le faire. Maintenant. ») |
| **Heading (titres de section)** | **Bebas Neue** | Titres de chapitre, étiquettes courtes, tout en capitales |
| **Corps de texte** | **DM Sans** | Tout le texte courant, les citations de la lettre, les légendes |
| **Accent manuscrit** | **Caveat** | Réservée à la « lettre de Soa » — pour les extraits de lettre affichés à l'écran, donne un rendu manuscrit qui renforce l'idée d'une vraie lettre reçue |
| Monospace (si besoin) | JetBrains Mono | Uniquement si un extrait de code ou d'URL est montré |

### Forme et matière

- Coins arrondis généreux (20 px) sur toute carte ou bloc — jamais des angles droits pour un contenu, c'est la signature visuelle du produit.
- Ombres portées douces et discrètes, jamais dures, sauf sur la slide de titre/clôture qui peut se permettre un style plus graphique (ombre franche, sans flou) pour le ton « lettre/papier ».
- Ton général : chaleureux, optimiste, « atelier étudiant » — pas corporate, pas froid. Le produit s'adresse à des étudiants, pas à un board d'entreprise.

---

## 2. Minutage global — tenir 7 minutes (420 secondes)

Le script fourni ci-dessous, lu à un rythme de présentation dramatique
(environ 130-140 mots/minute pour laisser la place aux respirations et aux
silences indiqués), tient déjà naturellement autour de 7 minutes tel
qu'écrit — **ne pas le raccourcir**, mais respecter ce minutage par section
pour ne pas s'attarder sur les slides de fonctionnalités au détriment de
l'ouverture et de la clôture, qui portent l'émotion du pitch.

| # | Séquence | Slide ou démo live | Durée indicative |
|---|---|---|---|
| 1 | Ouverture — enveloppe, lettre, mascotte, logo | **Slides (animation)** | 90 s |
| 2 | Présentation de l'équipe | **Slide** | 20 s |
| 3 | Landing → Connexion → Dashboard | Démo live + 1 carton de chapitre | 35 s |
| 4 | Projets | Démo live + 1 carton | 30 s |
| 5 | Copilote IA | Démo live + 1 carton | 25 s |
| 6 | Recherche / Mémoire | Démo live + 1 carton | 30 s |
| 7 | Communauté | Démo live + 1 carton | 20 s |
| 8 | Intégration GitHub | Démo live + 1 carton | 15 s |
| 9 | Profil / Portfolio | Démo live + 1 carton | 20 s |
| 10 | Classement & Points | Démo live + 1 carton | 35 s |
| 11 | Entreprises | Démo live + 1 carton | 25 s |
| 12 | Clôture — retour lettre, enveloppe qui se referme | **Slides (animation)** | 55 s |
| | **Total** | | **~420 s (7 min)** |

---

## 3. Séquence d'ouverture — script et intention visuelle (slides 1 à 4)

### Slide 1 — Écran noir

Noir complet, silence d'une seconde avant que la présentatrice ne commence à
parler. Pas de texte.

### Slide 2 — La lettre qui vole et s'ouvre

**Intention décrite** : une lettre virevolte comme une fusée en papier, puis
s'ouvre.

**Équivalent réalisable en PPTX** : une image de lettre/enveloppe pliée,
animée avec une **transition « Morph »** (PowerPoint) ou un enchaînement
zoom + rotation léger (Google Slides), qui se déplie vers une vue de la
lettre ouverte. Ne pas chercher une animation vectorielle complexe — le
morph entre deux états (fermée → ouverte) donne déjà l'effet cinématique
voulu avec des outils standards.

Une fois ouverte, afficher la lettre avec :
- **Expéditeur : Soa**
- **Destinataire : Aura++**
- Le texte en police **Caveat** (manuscrite), sur fond crème `#F1EAE1`

**Texte à afficher / dire, à l'apparition, ligne par ligne (laisser un temps de lecture court entre chaque ligne) :**
> « Hello World.
> Je m'appelle Soa.
> Je viens d'un futur qui n'a jamais connu sa fin. »

**Voix (à dire par-dessus ou juste après) :**
> C'est ainsi que commençait la lettre que nous avons reçue samedi dernier.
> Mes Dames et Messieurs les membres du jury, chers publics et les
> passionnées de la Tech, bonjour et bienvenue à cette présentation !

### Slide 3 — Suite du discours (fond neutre ou lettre en arrière-plan estompé)

**Voix :**
> Nous sommes l'équipe Aura++, composée de 5 personnes passionnées : Mirado
> chargé du développement frontend, Fandresena développeur et intégrateur,
> Mirindra notre designer, Fiderana développeuse backend et qui est aussi à
> la tête de notre équipe, et moi, développeuse backend.
>
> Nous n'avons pas reçu un sujet banal dans le cadre de cette compétition,
> mais une lettre, qui en dit beaucoup sur nous les étudiants. Elle racontait
> le témoignage de Soa, qui commence avec enthousiasme... et qui finit par
> abandonner ses projets, ses ambitions, face aux difficultés.
>
> Qui, dans cette salle, n'a jamais commencé un projet avec une idée
> brillante... avant de le laisser dans un dossier nommé « Version finale
> 2 », puis « Version finale 3 », puis « Version finale définitive » ?
>
> Nous l'avons tous fait. C'est exactement ce que raconte Soa.
> Alors nous avons décidé de lui répondre.
> Pas avec des mots...
> Mais avec une solution.

### Slide 4 — La mascotte, puis le logo en grand

**Intention décrite** : la mascotte est à son bureau, frustrée, réfléchit
(trois petits points au-dessus de la tête, blancs, qui disparaissent l'un
après l'autre au troisième temps) ; elle se lève, expression surprise et
contente, ayant aperçu une lumière — fond dégradé sombre derrière elle, la
lumière se propageant devant elle. Puis nouvelle slide : logo VITA'NOW en
grand, seul.

**Équivalent réalisable en PPTX** :
- Image de la mascotte (assis, tête basse) avec trois petites formes rondes
  blanches empilées au-dessus de sa tête, en **animation d'apparition
  séquentielle** (chaque point apparaît puis disparaît l'un après l'autre —
  animation « Apparition » puis « Disparition » standard, calées en
  cascade).
- Puis **transition Morph** vers une seconde image de la mascotte debout,
  expression surprise/joyeuse, avec un dégradé de fond sombre → lumineux
  (utilisable comme un simple dégradé de couleur animé en fond de forme,
  natif à PowerPoint).
- Puis slide suivante : **logo VITA'NOW seul, centré, grand**, fond
  `#F1EAE1` ou blanc — transition **Fondu** depuis la slide précédente.

**Voix (pendant l'apparition du logo) :**
> À chaque étudiant qui hésite à abandonner, nous voulons lui dire une seule
> chose : VITA'NOW. En malgache... « Vita izao ! » « Tu peux le faire.
> Maintenant. »
>
> Parce qu'au fond, c'est le message que nous aurions aimé envoyer à Soa
> avant qu'elle n'abandonne !

---

## 4. Cartons de chapitre — un par fonctionnalité démontrée en direct

Pour chaque fonctionnalité ci-dessous, une **slide courte** (titre en Bebas
Neue + une phrase d'accroche en DM Sans, fond blanc ou indigo clair), puis
bascule vers l'application réelle où la présentatrice parle par-dessus le
direct. Le texte donné est la voix, pas le contenu de la slide — la slide ne
porte que le titre de section + l'accroche en gras indiquée.

### Landing → Connexion → Dashboard
**Titre de slide : Dashboard**
**Accroche : « Une raison de revenir aujourd'hui. »**

> Dans sa lettre, Soa écrit : « Demain avait une étrange habitude. Il
> reculait toujours d'un pas. »
> Nous avons donc commencé par le premier écran que l'étudiant voit chaque
> matin. Parce que parfois, il ne manque pas une nouvelle idée. Il manque
> simplement une raison de revenir aujourd'hui. C'est pourquoi VITA'NOW
> affiche un rappel, une motivation différente chaque jour depuis le
> dashboard, et des résumés de sa progression.

### Projets
**Titre de slide : Projets**
**Accroche : « Interrompu ne veut jamais dire oublié. »**

> Soa ne manquait jamais de commencements. Elle manquait de continuité.
> Alors, plutôt que de simplement créer des projets... nous avons construit
> un véritable parcours. Chaque projet possède une histoire. En cours.
> Terminé. Ou interrompu. Mais ici... interrompu ne veut jamais dire oublié.

### Copilote IA
**Titre de slide : Copilote IA**
**Accroche : « Et si quelqu'un avait simplement été là ? »**

> Puis arrive ce fameux quatrième jour. Celui où un simple `if` a suffi à
> arrêter Soa. Nous nous sommes demandé : et si quelqu'un avait simplement
> été là pour lui dire quelle était la prochaine étape ? C'est exactement le
> rôle de notre Copilote IA. Il propose des solutions sur la partie où
> l'étudiant est bloqué.

### Recherche / Mémoire
**Titre de slide : Recherche**
**Accroche : « Les projets ne meurent plus avec leur auteur. »**

> Plus tard, Soa découvre qu'elle est tombée sur un problème que d'autres
> avaient déjà résolu... sans jamais le savoir. Nous avons trouvé cela
> injuste. Pourquoi recommencer lorsque quelqu'un est déjà passé par là ?
> Grâce à cette fonctionnalité, les connaissances deviennent retrouvables.
> Les projets ne meurent plus avec leur auteur — notre projet publié sur
> cette plateforme aidera les autres, ou nous ouvrira une porte vers notre
> carrière.

### Communauté
**Titre de slide : Communauté**
**Accroche : « Des étudiants qui avancent ensemble. »**

> Mais parfois... aucune intelligence artificielle ne remplacera une
> personne qui est déjà passée par les mêmes difficultés. C'est pour cela
> que nous avons imaginé une communauté. Des mentors. Des défis. Des idées.
> Des étudiants qui avancent ensemble.

### Intégration GitHub
**Titre de slide : GitHub**
**Accroche : « Les projets vivent aussi dans leur code. »**

> Les projets ne vivent pas seulement dans la plateforme. Ils vivent aussi
> dans leur code. Chaque projet peut être lié à GitHub afin que son
> évolution reste documentée et accessible.

### Profil / Portfolio
**Titre de slide : Profil**
**Accroche : « Montrez-nous ce que vous savez faire. »**

> Chaque ligne de code. Chaque projet terminé. Chaque réussite... construit
> automatiquement le portfolio de l'étudiant. Plus besoin de recommencer
> lorsqu'une entreprise demande : « Montrez-nous ce que vous savez faire. »

### Classement & Points
**Titre de slide : Classement**
**Accroche : « On récompense la reconnaissance, pas l'obligation. »**

> *(Moment fort.)* Mais il nous restait une question. Comment donner envie
> de terminer ? Pas avec une obligation. Pas avec une punition. Mais avec de
> la reconnaissance. C'est pourquoi VITA'NOW met en valeur les projets les
> plus aboutis à travers un classement annuel. Ici, on ne récompense pas
> seulement celui qui commence. On distinguera celui ou celle qui aura le
> meilleur projet de l'année, afin de motiver chacun à aller plus loin. Il
> faut gagner des points pour cela, grâce à chaque petit effort du
> quotidien : les tâches cochées, les projets déclarés comme terminés, ainsi
> de suite.

### Entreprises
**Titre de slide : Entreprises**
**Accroche : « Rapprocher deux mondes qui se rencontrent trop tard. »**

> Nous avons également voulu rapprocher deux mondes qui se rencontrent
> souvent trop tard : celui des étudiants... et celui des entreprises. Les
> entreprises peuvent publier des opportunités, découvrir les projets
> réalisés et suivre l'évolution des talents. Et pourquoi pas, les contacter
> directement ! Chacune de ces offres sera affichée et publiée du côté
> étudiant.

---

## 5. Clôture — script et intention visuelle (slides finales)

### Slide — Retour au Landing / Dashboard étudiant (capture d'écran ou fond simple)

> À la fin de sa lettre, Soa écrivait : « Et si le plus grand défi n'était ni
> de commencer, ni de finir, mais de faire en sorte qu'aucun effort ne
> s'éteigne dans le silence ? »
>
> Chez Aura++, nous n'avons pas cherché à créer un GitHub de plus. Ni un
> Notion de plus. Nous avons imaginé un compagnon de parcours. Une
> plateforme qui accompagne, qui relance, qui connecte, qui valorise, qui
> transmet. Parce qu'un projet terminé peut inspirer le suivant. Parce qu'un
> projet abandonné peut encore sauver quelqu'un. Et parce qu'un étudiant ne
> devrait jamais avoir à recommencer seul.
>
> *(Quelques secondes de silence.)*
>
> Au début de cette présentation... je vous ai dit : « Hello World. Je
> m'appelle Soa. Je viens d'un futur qui n'a jamais connu sa fin. »
> Aujourd'hui... nous espérons simplement que cette phrase n'appartienne
> plus au futur. Parce qu'à partir d'aujourd'hui... Soa n'est plus seule.
> VITA'NOW. Tu peux le faire. Maintenant.
> Merci.

### Dernière slide — L'enveloppe se referme

**Intention décrite** : la lettre se referme lentement, l'enveloppe s'en va,
une flèche courbe fine et élégante accompagne le texte final.

**Équivalent réalisable en PPTX** : **transition Morph** inverse de la
slide d'ouverture (lettre ouverte → enveloppe fermée), puis une légère
animation de **déplacement de trajectoire** (chemin de mouvement courbe,
fonctionnalité native « Trajectoires de déplacement » de PowerPoint) faisant
glisser l'enveloppe hors du cadre. Fond `#F1EAE1`, une seule ligne en Bebas
Neue apparaît en fondu après le départ de l'enveloppe :

> **Réponse envoyée.**

---

## 6. Distribution de l'équipe (slide 2, format « équipe »)

| Nom | Rôle |
|---|---|
| Mirado | Développeur Frontend |
| Fandresena | Développeur Fullstack & intégrateur |
| Mirindrampitia | Designer |
| Fiderana | Développeuse Backend — cheffe d'équipe |
| Ny Antsa | Développeuse Backend — présentatrice |

Mise en page suggérée : 5 cartes identiques (photo ou avatar générique,
prénom en Bebas Neue, rôle en DM Sans en dessous), alignées sur une grille,
coins arrondis, sur fond blanc ou indigo très clair (`#EAF1FE`).
