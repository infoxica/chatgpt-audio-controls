import { TranslationSchema } from '../types';
export const it: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "Controlli e lettura ad alta voce",
    "version": "v",
    "openChatGPT": "Apri ChatGPT",
    "dashboard": "Pannello",
    "seconds": "secondi",
    "star": "★ Stella",
    "docs": "Documentazione",
    "issues": "Problemi"
  },
  "popup": {
    "header": {
      "switchTheme": "Cambia tema",
      "openOptions": "Apri pannello e impostazioni"
    },
    "tabs": {
      "controls": "Controlli",
      "shortcuts": "Tasti",
      "about": "Informazioni"
    },
    "quickControls": {
      "playbackSpeed": "Velocità di riproduzione predefinita",
      "defaultVolume": "Volume predefinito",
      "mute": "Disattiva audio",
      "unmute": "Attiva audio",
      "smartIntegrations": "Funzioni utili",
      "inlineSpeech": "Pulsanti di lettura delle risposte",
      "inlineSpeechDesc": "Aggiunge la lettura accanto al pulsante Copia",
      "globalShortcuts": "Scorciatoie da tastiera",
      "globalShortcutsDesc": "Attiva Spazio/K, Alt+P, Alt+frecce e i tasti della velocità",
      "smoothScrubbing": "Scorrimento fluido",
      "smoothScrubbingDesc": "Tieni premuto ◀10 o 10▶ per spostarti più velocemente"
    },
    "shortcuts": {
      "title": "Scorciatoie da tastiera",
      "gesturesTitle": "Gesti del mouse e touch",
      "smoothAudioScrub": "Scorrimento audio fluido",
      "instantResponseRead": "Leggi subito la risposta",
      "directDownload": "Download diretto",
      "holdScrubKey": "Tieni premuto ◀10 / 10▶",
      "clickSpeechKey": "Fai clic su 🔈",
      "clickDownloadKey": "Fai clic su 📥"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Open source di Infoxica",
      "description": "Metti in pausa, scorri, regola la velocità e scarica l’audio letto da ChatGPT.",
      "privacyTitle": "Rispetto della privacy",
      "privacyDesc": "Nessun tracciamento o telemetria. L’elaborazione avviene nel browser.",
      "githubRepo": "Repository GitHub",
      "documentation": "Documentazione",
      "reportIssue": "Segnala un problema"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "Pannello e configurazione",
      "preferences": "Preferenze",
      "shortcuts": "Scorciatoie e gesti",
      "faq": "Domande e risoluzione dei problemi",
      "darkMode": "Modalità scura",
      "lightMode": "Modalità chiara",
      "githubRepo": "Repository GitHub"
    },
    "headers": {
      "preferencesTitle": "Preferenze audio e riproduzione",
      "preferencesDesc": "Configura lingua, velocità, volume e funzioni.",
      "shortcutsTitle": "Scorciatoie da tastiera e gesti",
      "shortcutsDesc": "Controlla rapidamente la riproduzione con la tastiera.",
      "faqTitle": "Domande e risoluzione dei problemi",
      "faqDesc": "Indicazioni su utilizzo, privacy e assistenza."
    },
    "general": {
      "languageTitle": "Lingua",
      "languageDesc": "Scegli la lingua dell’interfaccia o rileva automaticamente quella del browser.",
      "languageAuto": "Rilevamento automatico (lingua del browser)",
      "languageDetected": "Lingua rilevata",
      "speedTitle": "Preferenze della velocità",
      "speedDesc": "Scegli la velocità iniziale per ChatGPT o la lettura ad alta voce.",
      "volumeTitle": "Volume predefinito",
      "volumeDesc": "Volume iniziale della lettura ad alta voce.",
      "seekTitle": "Intervallo di salto",
      "seekDesc": "Secondi da saltare con i pulsanti o Alt+freccia sinistra/destra.",
      "secondsUnit": "secondi"
    },
    "shortcutsGuide": {
      "title": "Guida alle scorciatoie",
      "desc": "I tasti di riproduzione funzionano fuori dai campi di testo.",
      "gesturesTitle": "Mouse e pressione prolungata",
      "gesturesDesc": "Tieni premuto ◀10s o 10s▶ per scorrere l’audio a velocità crescente.",
      "gestureHold03": "Avvia lo scorrimento fluido a 4×.",
      "gestureHold15": "Accelera lo scorrimento a 10×.",
      "gestureHold30": "Accelera lo scorrimento a 25×.",
      "gestureRelease": "Rilascia per fermarti nella posizione scelta."
    },
    "faq": {
      "title": "Domande frequenti e guida",
      "subtitle": "Risposte rapide per usare ChatGPT Audio Controls.",
      "q1": "Come regolo il volume con la rotellina?",
      "a1": "Posiziona il puntatore sull’icona del volume e scorri per modificarlo a intervalli del 5%.",
      "q2": "Dove appare il lettore?",
      "a2": "Accanto al campo del messaggio oppure, sugli schermi stretti, in un pannello compatto sopra di esso.",
      "q3": "Come salvo l’audio della lettura?",
      "a3": "Dopo il caricamento dell’audio, premi Download. Il file mantiene il formato fornito da ChatGPT, senza conversioni.",
      "q4": "Funziona sui portatili piccoli?",
      "a4": "Sì. Se manca spazio laterale, i controlli appaiono in un pannello compatto sopra il campo del messaggio.",
      "q5": "Come lo installo con Tampermonkey?",
      "a5": "Installa lo userscript separato dal repository. Il gestore degli script controllerà gli aggiornamenti.",
      "q6": "Le mie conversazioni restano private?",
      "a6": "L’estensione funziona nel browser e non invia conversazioni o audio ai server dello sviluppatore."
    }
  },
  "content": {
    "tooltips": {
      "back": "Indietro di {s} secondi — tieni premuto per scorrere",
      "playPause": "Riproduci / Pausa (Spazio o K; anche Alt+P)",
      "forward": "Avanti di {s} secondi — tieni premuto per scorrere",
      "speed": "Velocità di riproduzione",
      "volume": "Volume (scorri per regolare)",
      "volumeSlider": "Cursore del volume",
      "download": "Scarica audio",
      "shortcuts": "Scorciatoie e gesti",
      "collapse": "Riduci lettore",
      "expand": "Espandi ChatGPT Audio Controls",
      "readAloud": "Leggi ad alta voce",
      "stopReadAloud": "Interrompi lettura"
    },
    "shortcutsPopover": {
      "title": "Scorciatoie della lettura",
      "playPause": "Riproduci / Pausa",
      "back": "Indietro di {s} s",
      "forward": "Avanti di {s} s",
      "slower": "Più lento",
      "faster": "Più veloce",
      "volumeScroll": "Volume con scorrimento",
      "smoothScrub": "Scorrimento fluido",
      "volumeScrollKey": "Scorri su 🔈",
      "smoothScrubKey": "Tieni premuto ◀{s} / {s}▶"
    },
    "alerts": {
      "downloadError": "Impossibile scaricare l’audio. Avvia la lettura, attendi il caricamento e riprova."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "Riproduci / Pausa",
      "description": "Alterna la riproduzione (anche Alt+P)."
    },
    "seekBack": {
      "action": "Indietro di 10 secondi",
      "description": "Torna indietro di 10 secondi nell’audio."
    },
    "seekForward": {
      "action": "Avanti di 10 secondi",
      "description": "Avanza di 10 secondi nell’audio."
    },
    "speedDecrease": {
      "action": "Riduci velocità",
      "description": "Passa alla velocità preimpostata precedente."
    },
    "speedIncrease": {
      "action": "Aumenta velocità",
      "description": "Passa alla velocità preimpostata successiva."
    }
  }
};
