import { TranslationSchema } from '../types';
export const de: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "Steuerung und Vorlesen",
    "version": "v",
    "openChatGPT": "ChatGPT öffnen",
    "dashboard": "Übersicht",
    "seconds": "Sekunden",
    "star": "★ Stern",
    "docs": "Dokumentation",
    "issues": "Probleme"
  },
  "popup": {
    "header": {
      "switchTheme": "Design wechseln",
      "openOptions": "Übersicht und Einstellungen öffnen"
    },
    "tabs": {
      "controls": "Steuerung",
      "shortcuts": "Tasten",
      "about": "Über"
    },
    "quickControls": {
      "playbackSpeed": "Standard-Wiedergabegeschwindigkeit",
      "defaultVolume": "Standardlautstärke",
      "mute": "Stummschalten",
      "unmute": "Ton einschalten",
      "smartIntegrations": "Praktische Funktionen",
      "inlineSpeech": "Vorlesetasten an Antworten",
      "inlineSpeechDesc": "Fügt Vorlesen neben der Kopiertaste hinzu",
      "globalShortcuts": "Tastenkürzel",
      "globalShortcutsDesc": "Leertaste/K, Alt+P, Alt+Pfeile und Geschwindigkeitstasten aktivieren",
      "smoothScrubbing": "Flüssiges Spulen",
      "smoothScrubbingDesc": "◀10 oder 10▶ gedrückt halten, um schneller zu spulen"
    },
    "shortcuts": {
      "title": "Tastenkürzel",
      "gesturesTitle": "Maus- und Touchgesten",
      "smoothAudioScrub": "Flüssiges Audiospulen",
      "instantResponseRead": "Antwort sofort vorlesen",
      "directDownload": "Direkter Download",
      "holdScrubKey": "◀10 / 10▶ gedrückt halten",
      "clickSpeechKey": "🔈 anklicken",
      "clickDownloadKey": "📥 anklicken"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Open Source von Infoxica",
      "description": "ChatGPT-Vorlesen pausieren, spulen, beschleunigen und als Audiodatei herunterladen.",
      "privacyTitle": "Datenschutz im Mittelpunkt",
      "privacyDesc": "Keine Tracker oder Telemetrie. Die Verarbeitung bleibt im Browser.",
      "githubRepo": "GitHub-Repository",
      "documentation": "Dokumentation",
      "reportIssue": "Problem melden"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "Übersicht und Einrichtung",
      "preferences": "Einstellungen",
      "shortcuts": "Tastenkürzel und Gesten",
      "faq": "Fragen und Fehlerbehebung",
      "darkMode": "Dunkler Modus",
      "lightMode": "Heller Modus",
      "githubRepo": "GitHub-Repository"
    },
    "headers": {
      "preferencesTitle": "Audio- und Wiedergabeeinstellungen",
      "preferencesDesc": "Sprache, Geschwindigkeit, Lautstärke und Funktionen einstellen.",
      "shortcutsTitle": "Tastenkürzel und Gesten",
      "shortcutsDesc": "Wiedergabe schnell per Tastatur steuern.",
      "faqTitle": "Fragen und Fehlerbehebung",
      "faqDesc": "Hinweise zu Bedienung, Datenschutz und Hilfe."
    },
    "general": {
      "languageTitle": "Sprache",
      "languageDesc": "Oberflächensprache wählen oder automatisch die Browsersprache verwenden.",
      "languageAuto": "Automatisch erkennen (Browsersprache)",
      "languageDetected": "Erkannte Sprache",
      "speedTitle": "Geschwindigkeitseinstellungen",
      "speedDesc": "Geschwindigkeit beim Start von ChatGPT oder Vorlesen auswählen.",
      "volumeTitle": "Standardlautstärke",
      "volumeDesc": "Anfangslautstärke beim Vorlesen.",
      "seekTitle": "Sprungweite",
      "seekDesc": "Anzahl der Sekunden pro Sprungtaste oder Alt+Pfeil links/rechts.",
      "secondsUnit": "Sekunden"
    },
    "shortcutsGuide": {
      "title": "Übersicht der Tastenkürzel",
      "desc": "Wiedergabetasten funktionieren außerhalb von Textfeldern.",
      "gesturesTitle": "Maus und langes Drücken",
      "gesturesDesc": "◀10s oder 10s▶ gedrückt halten, um zunehmend schneller zu spulen.",
      "gestureHold03": "Startet flüssiges Spulen mit 4×.",
      "gestureHold15": "Beschleunigt das Spulen auf 10×.",
      "gestureHold30": "Beschleunigt das Spulen auf 25×.",
      "gestureRelease": "Loslassen, um an der gewählten Stelle anzuhalten."
    },
    "faq": {
      "title": "Häufige Fragen und Anleitung",
      "subtitle": "Kurze Antworten zur Nutzung von ChatGPT Audio Controls.",
      "q1": "Wie ändere ich die Lautstärke mit dem Mausrad?",
      "a1": "Den Mauszeiger über das Lautstärkesymbol bewegen und scrollen. Die Lautstärke ändert sich in Schritten von 5 %.",
      "q2": "Wo erscheint der Player?",
      "a2": "Neben dem Nachrichtenfeld oder bei schmalen Fenstern als kompaktes Bedienfeld darüber.",
      "q3": "Wie speichere ich vorgelesenes Audio?",
      "a3": "Nach dem Laden auf Download klicken. Das Audio wird im von ChatGPT bereitgestellten Format gespeichert, ohne Umwandlung.",
      "q4": "Funktioniert das auf kleinen Laptops?",
      "a4": "Ja. Wenn seitlich Platz fehlt, erscheint ein kompaktes Bedienfeld über dem Nachrichtenfeld.",
      "q5": "Wie installiere ich es mit Tampermonkey?",
      "a5": "Das eigenständige Userscript aus dem Repository installieren. Der Script-Manager prüft auf Updates.",
      "q6": "Bleiben meine Gespräche privat?",
      "a6": "Die Erweiterung läuft im Browser und sendet keine Gespräche oder Audiodaten an Entwickler-Server."
    }
  },
  "content": {
    "tooltips": {
      "back": "{s} Sekunden zurück — zum Spulen halten",
      "playPause": "Wiedergabe / Pause (Leertaste oder K; auch Alt+P)",
      "forward": "{s} Sekunden vor — zum Spulen halten",
      "speed": "Wiedergabegeschwindigkeit",
      "volume": "Lautstärke (zum Ändern scrollen)",
      "volumeSlider": "Lautstärkeregler",
      "download": "Audio herunterladen",
      "shortcuts": "Tastenkürzel und Gesten",
      "collapse": "Player einklappen",
      "expand": "ChatGPT Audio Controls ausklappen",
      "readAloud": "Vorlesen",
      "stopReadAloud": "Vorlesen stoppen"
    },
    "shortcutsPopover": {
      "title": "Vorlese-Tastenkürzel",
      "playPause": "Wiedergabe / Pause",
      "back": "{s} Sek. zurück",
      "forward": "{s} Sek. vor",
      "slower": "Langsamer",
      "faster": "Schneller",
      "volumeScroll": "Lautstärke durch Scrollen",
      "smoothScrub": "Flüssiges Spulen",
      "volumeScrollKey": "Über 🔈 scrollen",
      "smoothScrubKey": "◀{s} / {s}▶ halten"
    },
    "alerts": {
      "downloadError": "Audio konnte nicht heruntergeladen werden. Vorlesen starten, das Laden abwarten und erneut versuchen."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "Wiedergabe / Pause",
      "description": "Wiedergabe umschalten (auch mit Alt+P)."
    },
    "seekBack": {
      "action": "10 Sekunden zurück",
      "description": "Im Audio 10 Sekunden zurückspringen."
    },
    "seekForward": {
      "action": "10 Sekunden vor",
      "description": "Im Audio 10 Sekunden vorspringen."
    },
    "speedDecrease": {
      "action": "Geschwindigkeit senken",
      "description": "Zur vorherigen Geschwindigkeitsstufe wechseln."
    },
    "speedIncrease": {
      "action": "Geschwindigkeit erhöhen",
      "description": "Zur nächsten Geschwindigkeitsstufe wechseln."
    }
  }
};
