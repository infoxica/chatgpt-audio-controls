import { TranslationSchema } from '../types';
export const fr: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "Commandes et lecture à voix haute",
    "version": "v",
    "openChatGPT": "Ouvrir ChatGPT",
    "dashboard": "Tableau de bord",
    "seconds": "secondes",
    "star": "★ Favori",
    "docs": "Documentation",
    "issues": "Problèmes"
  },
  "popup": {
    "header": {
      "switchTheme": "Changer de thème",
      "openOptions": "Ouvrir le tableau de bord et les réglages"
    },
    "tabs": {
      "controls": "Commandes",
      "shortcuts": "Touches",
      "about": "À propos"
    },
    "quickControls": {
      "playbackSpeed": "Vitesse de lecture par défaut",
      "defaultVolume": "Volume par défaut",
      "mute": "Couper le son",
      "unmute": "Rétablir le son",
      "smartIntegrations": "Fonctions pratiques",
      "inlineSpeech": "Boutons de lecture des réponses",
      "inlineSpeechDesc": "Ajoute la lecture à côté du bouton Copier",
      "globalShortcuts": "Raccourcis clavier",
      "globalShortcutsDesc": "Activer Espace/K, Alt+P, Alt+flèches et les touches de vitesse",
      "smoothScrubbing": "Navigation fluide",
      "smoothScrubbingDesc": "Maintenir ◀10 ou 10▶ pour accélérer la navigation"
    },
    "shortcuts": {
      "title": "Raccourcis clavier",
      "gesturesTitle": "Gestes souris et tactiles",
      "smoothAudioScrub": "Navigation audio fluide",
      "instantResponseRead": "Lire une réponse immédiatement",
      "directDownload": "Téléchargement direct",
      "holdScrubKey": "Maintenir ◀10 / 10▶",
      "clickSpeechKey": "Cliquer sur 🔈",
      "clickDownloadKey": "Cliquer sur 📥"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Projet open source d’Infoxica",
      "description": "Mettez en pause, naviguez, réglez la vitesse et téléchargez la lecture audio de ChatGPT.",
      "privacyTitle": "Respect de la vie privée",
      "privacyDesc": "Aucun traceur ni télémétrie. Le traitement reste dans votre navigateur.",
      "githubRepo": "Dépôt GitHub",
      "documentation": "Documentation",
      "reportIssue": "Signaler un problème"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "Tableau de bord et configuration",
      "preferences": "Préférences",
      "shortcuts": "Raccourcis et gestes",
      "faq": "Questions et dépannage",
      "darkMode": "Mode sombre",
      "lightMode": "Mode clair",
      "githubRepo": "Dépôt GitHub"
    },
    "headers": {
      "preferencesTitle": "Préférences audio et lecture",
      "preferencesDesc": "Réglez la langue, la vitesse, le volume et les fonctions.",
      "shortcutsTitle": "Raccourcis clavier et gestes",
      "shortcutsDesc": "Contrôlez rapidement la lecture au clavier.",
      "faqTitle": "Questions et dépannage",
      "faqDesc": "Aide à l’utilisation, confidentialité et assistance."
    },
    "general": {
      "languageTitle": "Langue",
      "languageDesc": "Choisissez la langue de l’interface ou utilisez celle du navigateur.",
      "languageAuto": "Détection automatique (langue du navigateur)",
      "languageDetected": "Langue détectée",
      "speedTitle": "Préférences de vitesse",
      "speedDesc": "Choisissez la vitesse appliquée au démarrage de ChatGPT ou de la lecture.",
      "volumeTitle": "Volume par défaut",
      "volumeDesc": "Volume initial de la lecture à voix haute.",
      "seekTitle": "Intervalle de saut",
      "seekDesc": "Nombre de secondes parcourues avec les boutons de saut ou Alt+flèches.",
      "secondsUnit": "secondes"
    },
    "shortcutsGuide": {
      "title": "Guide des raccourcis",
      "desc": "Les raccourcis de lecture fonctionnent hors des champs de texte.",
      "gesturesTitle": "Souris et appui prolongé",
      "gesturesDesc": "Maintenez ◀10s ou 10s▶ pour parcourir l’audio de plus en plus vite.",
      "gestureHold03": "Démarre la navigation fluide à 4×.",
      "gestureHold15": "Accélère la navigation à 10×.",
      "gestureHold30": "Accélère la navigation à 25×.",
      "gestureRelease": "Relâchez pour vous arrêter à la position choisie."
    },
    "faq": {
      "title": "Questions fréquentes et guide",
      "subtitle": "Des réponses simples pour utiliser ChatGPT Audio Controls.",
      "q1": "Comment régler le volume avec la molette ?",
      "a1": "Placez le pointeur sur l’icône de volume et faites défiler pour modifier le volume par pas de 5 %.",
      "q2": "Où apparaît le lecteur ?",
      "a2": "À côté du champ de message, ou dans un panneau compact au-dessus lorsque l’écran est étroit.",
      "q3": "Comment enregistrer l’audio ?",
      "a3": "Une fois l’audio chargé, cliquez sur Télécharger. Le fichier conserve le format fourni par ChatGPT, sans conversion.",
      "q4": "Cela fonctionne-t-il sur un petit ordinateur portable ?",
      "a4": "Oui. Si l’espace latéral manque, les commandes apparaissent dans un panneau compact au-dessus du champ de message.",
      "q5": "Comment installer avec Tampermonkey ?",
      "a5": "Installez le script utilisateur distinct depuis le dépôt. Votre gestionnaire de scripts recherche les mises à jour.",
      "q6": "Mes conversations restent-elles privées ?",
      "a6": "L’extension fonctionne dans votre navigateur et n’envoie ni conversations ni audio aux serveurs du développeur."
    }
  },
  "content": {
    "tooltips": {
      "back": "Reculer de {s} secondes — maintenir pour parcourir",
      "playPause": "Lecture / Pause (Espace ou K ; Alt+P également)",
      "forward": "Avancer de {s} secondes — maintenir pour parcourir",
      "speed": "Vitesse de lecture",
      "volume": "Volume (faire défiler pour régler)",
      "volumeSlider": "Curseur de volume",
      "download": "Télécharger l’audio",
      "shortcuts": "Raccourcis et gestes",
      "collapse": "Réduire le lecteur",
      "expand": "Déployer ChatGPT Audio Controls",
      "readAloud": "Lire à voix haute",
      "stopReadAloud": "Arrêter la lecture"
    },
    "shortcutsPopover": {
      "title": "Raccourcis de lecture",
      "playPause": "Lecture / Pause",
      "back": "Reculer de {s} s",
      "forward": "Avancer de {s} s",
      "slower": "Vitesse inférieure",
      "faster": "Vitesse supérieure",
      "volumeScroll": "Volume par défilement",
      "smoothScrub": "Navigation fluide",
      "volumeScrollKey": "Faire défiler sur 🔈",
      "smoothScrubKey": "Maintenir ◀{s} / {s}▶"
    },
    "alerts": {
      "downloadError": "Téléchargement impossible. Lancez la lecture, attendez le chargement de l’audio puis réessayez."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "Lecture / Pause",
      "description": "Basculer la lecture (Alt+P fonctionne aussi)."
    },
    "seekBack": {
      "action": "Reculer de 10 secondes",
      "description": "Reculer de 10 secondes dans l’audio."
    },
    "seekForward": {
      "action": "Avancer de 10 secondes",
      "description": "Avancer de 10 secondes dans l’audio."
    },
    "speedDecrease": {
      "action": "Réduire la vitesse",
      "description": "Passer à la vitesse prédéfinie précédente."
    },
    "speedIncrease": {
      "action": "Augmenter la vitesse",
      "description": "Passer à la vitesse prédéfinie suivante."
    }
  }
};
