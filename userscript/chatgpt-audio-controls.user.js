// ==UserScript==
// @name         ChatGPT Read Aloud & Audio Controls
// @namespace    https://infoxica.com/
// @version      1.4.0
// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact seek player, speed presets, volume slider with wheel scroll, instant audio download, shortcuts.
// @author       Infoxica
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/infoxica/chatgpt-audio-controls
// @supportURL   https://github.com/infoxica/chatgpt-audio-controls/issues
// @downloadURL  https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js
// @updateURL    https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js
// @license      MIT
// ==/UserScript==

// Generated from src/content/content.ts and src/content/player.css. Do not edit.
(() => {
  // src/shared/constants.ts
  var SPEED_PRESETS = [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  var STORAGE_KEYS = {
    SPEED: "cgpt-ra-v4-speed",
    VOLUME: "cgpt-ra-v4-volume",
    SETTINGS: "cgpt-ra-settings"
  };
  var DEFAULT_SETTINGS = {
    notifyDownloadReady: true,
    floatingUiHidden: false,
    floatingUiHideMode: "idle-only",
    defaultSpeed: 1,
    defaultVolume: 1,
    tapSeekSeconds: 10,
    enableShortcuts: true,
    theme: "system",
    smoothScrubbing: true,
    autoDownloadFormat: "auto",
    language: "auto"
  };
  function orderLanguages(languages) {
    return [...languages].sort((a, b) => a.code === "auto" ? -1 : b.code === "auto" ? 1 : a.label.localeCompare(b.label, "en"));
  }
  var SUPPORTED_LANGUAGES = orderLanguages([
    { code: "auto", label: "Auto Detect", nativeName: "Auto (Browser Default)" },
    { code: "pl", label: "Polish", nativeName: "Polski" },
    { code: "hu", label: "Hungarian", nativeName: "Magyar" },
    { code: "sv", label: "Swedish", nativeName: "Svenska" },
    { code: "cs", label: "Czech", nativeName: "Čeština" },
    { code: "uk", label: "Ukrainian", nativeName: "Українська" },
    { code: "ca", label: "Catalan", nativeName: "Català" },
    { code: "el", label: "Greek", nativeName: "Ελληνικά" },
    { code: "ro", label: "Romanian", nativeName: "Română" },
    { code: "nb", label: "Norwegian Bokmål", nativeName: "Norsk bokmål" },
    { code: "bn", label: "Bengali", nativeName: "বাংলা" },
    { code: "mr", label: "Marathi", nativeName: "मराठी" },
    { code: "te", label: "Telugu", nativeName: "తెలుగు" },
    { code: "ta", label: "Tamil", nativeName: "தமிழ்" },
    { code: "ar", label: "Arabic", nativeName: "العربية" },
    { code: "fa", label: "Persian", nativeName: "فارسی" },
    { code: "he", label: "Hebrew", nativeName: "עברית" },
    { code: "en", label: "English", nativeName: "English" },
    { code: "zh-CN", label: "Chinese (Simplified)", nativeName: "简体中文" },
    { code: "zh-TW", label: "Chinese (Traditional)", nativeName: "繁體中文" },
    { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
    { code: "th", label: "Thai", nativeName: "ไทย" },
    { code: "es", label: "Spanish", nativeName: "Español" },
    { code: "pt-BR", label: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
    { code: "pt-PT", label: "Portuguese (Portugal)", nativeName: "Português (Portugal)" },
    { code: "ru", label: "Russian", nativeName: "Русский" },
    { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
    { code: "fr", label: "French", nativeName: "Français" },
    { code: "de", label: "German", nativeName: "Deutsch" },
    { code: "ja", label: "Japanese", nativeName: "日本語" },
    { code: "ko", label: "Korean", nativeName: "한국어" },
    { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
    { code: "it", label: "Italian", nativeName: "Italiano" },
    { code: "tr", label: "Turkish", nativeName: "Türkçe" }
  ]);

  // src/shared/layout.ts
  var LAYOUT_KEY = "cgpt-ra-layout-v1";
  var PRESETS = ["original", "bottom-left", "bottom-right", "top-left", "top-right", "left", "right", "composer"];
  var defaultProfile = (narrow = false) => ({ preset: narrow ? "composer" : "original", seekFirst: true });
  var defaultLayout = () => ({ version: 2, desktop: defaultProfile(), narrow: defaultProfile(true) });
  function isLayoutProfile(value) {
    if (!value || typeof value !== "object")
      return false;
    const p = value;
    return PRESETS.includes(p.preset) && typeof p.seekFirst === "boolean";
  }
  function isLayout(value) {
    const p = value;
    return p?.version === 2 && isLayoutProfile(p.desktop) && isLayoutProfile(p.narrow) && p.narrow.preset === "composer";
  }
  function migrateLayout(value) {
    if (isLayout(value))
      return value;
    const old = value;
    const next = defaultLayout();
    if (old?.version !== 1)
      return next;
    const p = old.desktop;
    if (p && typeof p.seekFirst === "boolean") {
      next.desktop.seekFirst = p.seekFirst;
      if (p.mode === "docked" && (p.arrangement === "corner" && /^(top|bottom)-(left|right)$/.test(p.anchor || "") || p.arrangement === "column" && ["left", "right"].includes(p.anchor || "")))
        next.desktop.preset = p.anchor;
    }
    if (typeof old.narrow?.seekFirst === "boolean")
      next.narrow.seekFirst = old.narrow.seekFirst;
    return next;
  }
  function layoutProfile(width) {
    return width < 768 ? "narrow" : "desktop";
  }
  async function readLayout() {
    let value;
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      value = (await chrome.storage.local.get(LAYOUT_KEY))[LAYOUT_KEY];
    else {
      try {
        value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
      } catch {
        value = null;
      }
    }
    return migrateLayout(value);
  }
  async function writeLayout(value) {
    if (!isLayout(value))
      throw new Error("Invalid layout");
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      await chrome.storage.local.set({ [LAYOUT_KEY]: value });
    else
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(value));
  }
  // src/shared/i18n/audience-features.json
  var audience_features_default = {
    pl: {
      features: [
        "Układ odtwarzacza",
        "Pulpit",
        "Wąski ekran",
        "Automatyczny",
        "Umieszczenie",
        "Układ",
        "Poziomy rząd",
        "Poziomy stos",
        "Kolumna pionowa",
        "Kształt L",
        "Najpierw pasek postępu",
        "Strona koła",
        "Lewy",
        "Prawa",
        "Zresetuj układ",
        "Przeciągnij, aby uporządkować",
        "Pełny dźwięk jest gotowy do pobrania",
        "Powiadom, gdy pełny dźwięk będzie gotowy",
        "Przypisywanie skrótów jest dostępne w przeglądarkach komputerowych.",
        "Zresetuj prędkość do 1×",
        "Zwiększ głośność",
        "Zmniejsz głośność",
        "Wycisz / wyłącz wyciszenie",
        "U góry po lewej",
        "Górny środek",
        "U góry po prawej",
        "Lewy środkowy",
        "Prawy środek",
        "Na dole po lewej",
        "Dolny środek",
        "Prawy dolny róg",
        "Zapisano na tym urządzeniu",
        "Zamień paski"
      ],
      dock: "Nad polem wiadomości",
      seekCommands: [
        "Przewiń wstecz",
        "Przewiń do przodu"
      ],
      support: [
        "Pomóż ukształtować ChatGPT Audio Controls",
        "Masz pomysł? Podziel się sugestią lub zostaw szczerą recenzję, aby wesprzeć rozszerzenie.",
        "Podziel się sugestią",
        "Napisz recenzję"
      ],
      summary: "Sterowanie dźwiękiem ChatGPT: pauza, przewijanie, prędkość, głośność, pobieranie i skróty."
    },
    hu: {
      features: [
        "Játékos elrendezés",
        "Asztali",
        "Keskeny képernyő",
        "Automatikus",
        "Elhelyezés",
        "Elrendezés",
        "Vízszintes sor",
        "Vízszintes halom",
        "Függőleges oszlop",
        "L alakú",
        "Először keress tablettát",
        "Kör oldala",
        "Balra",
        "Igaz",
        "Elrendezés visszaállítása",
        "Húzza az elrendezéshez",
        "A teljes hanganyag letöltésre kész",
        "Értesítés, ha a teljes hang készen áll",
        "A parancsikon-hozzárendelés asztali böngészőkben elérhető.",
        "Állítsa vissza a sebességet 1×-re",
        "Hangerő növelése",
        "Hangerő csökkentése",
        "Némítás / némítás feloldása",
        "Balra fent",
        "Felső középső",
        "Jobbra fent",
        "Bal középen",
        "Jobb középen",
        "Balra lent",
        "Alul középen",
        "Jobbra lent",
        "Mentve erre az eszközre",
        "Cserélje ki a tablettákat"
      ],
      dock: "Zeneszerző dokkoló",
      seekCommands: [
        "Keress visszafelé",
        "Keress előre"
      ],
      support: [
        "Segítsen a ChatGPT Audio Controls kialakításában",
        "Van valami ötleted? Ossza meg javaslatát, vagy írjon őszinte véleményt a bővítmény támogatása érdekében.",
        "Ossza meg javaslatát",
        "Írjon véleményt"
      ],
      summary: "ChatGPT hangvezérlők: szünet, keresés, sebesség, hangerő, letöltések és parancsikonok."
    },
    sv: {
      features: [
        "Spelarlayout",
        "Skrivbord",
        "Smal skärm",
        "Automatisk",
        "Placering",
        "Arrangemang",
        "Horisontell rad",
        "Horisontell stack",
        "Vertikal kolumn",
        "L-form",
        "Förloppsfältet först",
        "Cirkelns sida",
        "Vänster",
        "Höger",
        "Återställ layout",
        "Dra för att ordna",
        "Fullständigt ljud är redo att laddas ner",
        "Meddela när fullt ljud är klart",
        "Genvägstilldelning är tillgänglig i datorwebbläsare.",
        "Återställ hastigheten till 1×",
        "Öka volymen",
        "Minska volymen",
        "Stäng av / slå på ljudet",
        "Överst till vänster",
        "Översta mitten",
        "Överst till höger",
        "Vänster mitten",
        "Höger mitten",
        "Nederst till vänster",
        "Nedre mitten",
        "Nederst till höger",
        "Sparad på den här enheten",
        "Byt plats på fälten"
      ],
      dock: "Docka vid meddelandefältet",
      seekCommands: [
        "Spola bakåt",
        "Spola framåt"
      ],
      support: [
        "Hjälp till att forma ChatGPT Audio Controls",
        "Har du en idé? Dela ett förslag eller lämna en ärlig recension för att stödja tillägget.",
        "Dela ett förslag",
        "Skriv en recension"
      ],
      summary: "ChatGPT ljudkontroller: pausa, spola, ändra hastighet och volym, ladda ner ljud och använd kortkommandon."
    },
    cs: {
      features: [
        "Rozložení přehrávače",
        "Desktop",
        "Úzká obrazovka",
        "Automaticky",
        "Umístění",
        "Uspořádání",
        "Vodorovná řada",
        "Horizontální zásobník",
        "Vertikální sloupec",
        "tvar L",
        "Nejprve vyhledejte pilulku",
        "Kruhová strana",
        "Vlevo",
        "Správně",
        "Obnovit rozložení",
        "Uspořádejte přetažením",
        "Kompletní zvuk je připraven ke stažení",
        "Upozornit, až bude připraven celý zvuk",
        "Přiřazení zkratky je k dispozici v prohlížečích na počítači.",
        "Nastavte rychlost na 1×",
        "Zvyšte hlasitost",
        "Snížit hlasitost",
        "Ztlumit / ztlumit",
        "Vlevo nahoře",
        "Horní střed",
        "Vpravo nahoře",
        "Levý střed",
        "Pravý střed",
        "Vlevo dole",
        "Spodní střed",
        "Vpravo dole",
        "Uloženo v tomto zařízení",
        "Vyměňte pilulky"
      ],
      dock: "Dok pro skladatele",
      seekCommands: [
        "Hledejte zpět",
        "Hledejte dopředu"
      ],
      support: [
        "Pomozte tvarovat ChatGPT Audio Controls",
        "Máte nápad? Sdílejte návrh nebo zanechte upřímnou recenzi na podporu rozšíření.",
        "Sdílejte návrh",
        "Napište recenzi"
      ],
      summary: "Ovládání zvuku ChatGPT: pauza, hledání, rychlost, hlasitost, stahování a zkratky."
    },
    uk: {
      features: [
        "Схема програвача",
        "Робочий стіл",
        "Вузький екран",
        "Автоматичний",
        "Розміщення",
        "Аранжування",
        "Горизонтальний ряд",
        "Горизонтальний стек",
        "Вертикальний стовпець",
        "L форма",
        "Спочатку шукайте таблетку",
        "Сторона кола",
        "Ліворуч",
        "правильно",
        "Скинути макет",
        "Перетягніть, щоб упорядкувати",
        "Повний аудіофайл готовий для завантаження",
        "Повідомити, коли буде готовий повний аудіофайл",
        "Призначення ярликів доступне в настільних браузерах.",
        "Скинути швидкість до 1×",
        "Збільшити гучність",
        "Зменшити гучність",
        "Вимкнути / увімкнути звук",
        "Вгорі ліворуч",
        "Верхній центр",
        "Вгорі справа",
        "Ліворуч по центру",
        "Правий центр",
        "Внизу зліва",
        "Нижній центр",
        "Праворуч внизу",
        "Збережено на цьому пристрої",
        "Поміняти таблетки"
      ],
      dock: "Композитор док",
      seekCommands: [
        "Шукайте назад",
        "Шукати вперед"
      ],
      support: [
        "Допоможіть сформувати ChatGPT Audio Controls",
        "Є ідея? Поділіться пропозицією або залиште чесний відгук, щоб підтримати розширення.",
        "Поділіться пропозицією",
        "Написати відгук"
      ],
      summary: "ChatGPT керування звуком: пауза, пошук, швидкість, гучність, завантаження та ярлики."
    },
    ca: {
      features: [
        "Disseny del jugador",
        "Escriptori",
        "Pantalla estreta",
        "Automàtic",
        "Col·locació",
        "Arranjament",
        "Fila horitzontal",
        "Pila horitzontal",
        "Columna vertical",
        "Forma L",
        "Busqueu primer la píndola",
        "El costat del cercle",
        "Esquerra",
        "D'acord",
        "Restableix el disseny",
        "Arrossegueu per organitzar",
        "L'àudio complet està llest per descarregar",
        "Aviseu quan l'àudio complet estigui llest",
        "L'assignació de dreceres està disponible als navegadors d'escriptori.",
        "Restableix la velocitat a 1×",
        "Augmentar el volum",
        "Disminuir el volum",
        "Silenciar / activar el silenci",
        "A dalt a l'esquerra",
        "Centre superior",
        "A dalt a la dreta",
        "Centre esquerre",
        "Centre dret",
        "A baix a l'esquerra",
        "Centre inferior",
        "A baix a la dreta",
        "Desat en aquest dispositiu",
        "Canvi de pastilles"
      ],
      dock: "Moll del compositor",
      seekCommands: [
        "Busca enrere",
        "Busca endavant"
      ],
      support: [
        "Ajuda a donar forma a ChatGPT Audio Controls",
        "Tens una idea? Comparteix un suggeriment o deixa una revisió honesta per donar suport a l'extensió.",
        "Comparteix un suggeriment",
        "Escriu una ressenya"
      ],
      summary: "Controls d'àudio ChatGPT: pausa, cerca, velocitat, volum, descàrregues i dreceres."
    },
    el: {
      features: [
        "Διάταξη παίκτη",
        "Επιτραπέζιος υπολογιστής",
        "Στενή οθόνη",
        "Αυτόματο",
        "Τοποθέτηση",
        "Τακτοποίηση",
        "Οριζόντια σειρά",
        "Οριζόντια στοίβα",
        "Κάθετη στήλη",
        "σχήμα L",
        "Αναζητήστε πρώτα χάπι",
        "Κυκλική πλευρά",
        "Αριστερά",
        "Σωστά",
        "Επαναφορά διάταξης",
        "Σύρετε για να τακτοποιήσετε",
        "Ο πλήρης ήχος είναι έτοιμος για λήψη",
        "Ειδοποιήστε όταν ο πλήρης ήχος είναι έτοιμος",
        "Η εκχώρηση συντομεύσεων είναι διαθέσιμη σε προγράμματα περιήγησης επιτραπέζιου υπολογιστή.",
        "Επαναφέρετε την ταχύτητα στο 1×",
        "Αυξήστε την ένταση",
        "Μειώστε την ένταση",
        "Σίγαση / κατάργηση σίγασης",
        "Επάνω αριστερά",
        "Κορυφαίο κέντρο",
        "Πάνω δεξιά",
        "Αριστερό κέντρο",
        "Δεξί κέντρο",
        "Κάτω αριστερά",
        "Κάτω κέντρο",
        "Κάτω δεξιά",
        "Αποθηκεύτηκε σε αυτήν τη συσκευή",
        "Ανταλλάξτε χάπια"
      ],
      dock: "Αποβάθρα συνθέτη",
      seekCommands: [
        "Αναζητήστε προς τα πίσω",
        "Αναζητήστε μπροστά"
      ],
      support: [
        "Βοηθήστε το σχήμα ChatGPT Audio Controls",
        "Έχετε μια ιδέα; Μοιραστείτε μια πρόταση ή αφήστε μια ειλικρινή κριτική για να υποστηρίξετε την επέκταση.",
        "Μοιραστείτε μια πρόταση",
        "Γράψτε μια κριτική"
      ],
      summary: "ChatGPT χειριστήρια ήχου: παύση, αναζήτηση, ταχύτητα, ένταση, λήψεις και συντομεύσεις."
    },
    ro: {
      features: [
        "Aspectul playerului",
        "Desktop",
        "Ecran îngust",
        "Automat",
        "Plasarea",
        "Aranjament",
        "Rând orizontal",
        "Stivă orizontală",
        "Coloana verticală",
        "Forma L",
        "Bara de progres prima",
        "Partea cercului",
        "Stânga",
        "Dreapta",
        "Resetați aspectul",
        "Trageți pentru a aranja",
        "Audio complet este gata de descărcat",
        "Notificați când audio complet este gata",
        "Atribuirea comenzilor rapide este disponibilă pe browserele desktop.",
        "Resetați viteza la 1×",
        "Măriți volumul",
        "Scade volumul",
        "Dezactivați / activați sunetul",
        "Sus stânga",
        "Centru de sus",
        "Dreapta sus",
        "Centru stânga",
        "Centru dreapta",
        "Stânga jos",
        "Centru jos",
        "Dreapta jos",
        "Salvat pe acest dispozitiv",
        "Schimbați ordinea barelor"
      ],
      dock: "Andocat la câmpul de mesaj",
      seekCommands: [
        "Derulați înapoi",
        "Derulați înainte"
      ],
      support: [
        "Ajutați să modelați ChatGPT Audio Controls",
        "Ai o idee? Trimiteți o sugestie sau lăsați o recenzie sinceră pentru a sprijini extensia.",
        "Distribuiți o sugestie",
        "Scrie o recenzie"
      ],
      summary: "Comenzi audio ChatGPT: pauză, derulare, viteză, volum, descărcări și comenzi rapide."
    },
    nb: {
      features: [
        "Spilleroppsett",
        "Skrivebord",
        "Smal skjerm",
        "Automatisk",
        "Plassering",
        "Arrangement",
        "Horisontal rad",
        "Horisontal stabel",
        "Vertikal søyle",
        "L-form",
        "Søk pille først",
        "Sirkelsiden",
        "venstre",
        "Høyre",
        "Tilbakestill layout",
        "Dra for å arrangere",
        "Full lyd er klar til nedlasting",
        "Gi beskjed når full lyd er klar",
        "Snarveisoppgave er tilgjengelig i nettlesere på datamaskiner.",
        "Tilbakestill hastigheten til 1×",
        "Øk volumet",
        "Reduser volumet",
        "Slå av/på",
        "Øverst til venstre",
        "Øverst i midten",
        "Øverst til høyre",
        "Venstre sentrum",
        "Høyre sentrum",
        "Nederst til venstre",
        "Nederst i midten",
        "Nederst til høyre",
        "Lagret på denne enheten",
        "Bytt piller"
      ],
      dock: "Komponistdokk",
      seekCommands: [
        "Søk bakover",
        "Søk fremover"
      ],
      support: [
        "Hjelp til å forme ChatGPT Audio Controls",
        "Har du en idé? Del et forslag eller legg igjen en ærlig anmeldelse for å støtte utvidelsen.",
        "Del et forslag",
        "Skriv en anmeldelse"
      ],
      summary: "ChatGPT lydkontroller: pause, søk, hastighet, volum, nedlastinger og snarveier."
    }
  };

  // src/shared/i18n/direction.ts
  function directionForLocale(locale) {
    return ["ar", "fa", "he"].includes(locale.trim().toLowerCase().split(/[-_]/)[0]) ? "rtl" : "ltr";
  }
  // src/shared/i18n/locales/audience.json
  var audience_default = {
    pl: {
      common: {
        extensionName: "ChatGPT Audio",
        extensionSubtitle: "Sterowanie i czytanie na głos",
        version: "v",
        openChatGPT: "Otwórz ChatGPT",
        dashboard: "Pulpit nawigacyjny",
        seconds: "sekundy",
        star: "★ Gwiazda",
        docs: "Dokumentacja",
        issues: "Problemy"
      },
      popup: {
        header: {
          switchTheme: "Zmień motyw",
          openOptions: "Otwórz Panel i Ustawienia"
        },
        tabs: {
          controls: "Sterowanie",
          shortcuts: "Skróty",
          about: "Informacje"
        },
        quickControls: {
          playbackSpeed: "Domyślna prędkość odtwarzania",
          defaultVolume: "Domyślna głośność",
          mute: "Wycisz",
          unmute: "Wyłącz wyciszenie",
          smartIntegrations: "Inteligentne integracje",
          globalShortcuts: "Globalne skróty",
          globalShortcutsDesc: "Włącz Space/K, Alt+P, Alt+Arrows i klawisze prędkości",
          smoothScrubbing: "Płynne przewijanie",
          smoothScrubbingDesc: "Przytrzymaj ◀10 lub 10▶, aby przewijać coraz szybciej"
        },
        shortcuts: {
          title: "Skróty klawiaturowe",
          gesturesTitle: "Gesty myszy i dotyku",
          smoothAudioScrub: "Płynne przewijanie dźwięku",
          directDownload: "Bezpośrednie pobieranie",
          holdScrubKey: "Przytrzymaj ◀10 / 10▶",
          clickDownloadKey: "Kliknij przycisk 📥"
        },
        about: {
          title: "ChatGPT Audio Controls",
          byInfoxica: "Otwarte oprogramowanie autorstwa Infoxica",
          description: "Wstrzymuj, przewijaj do tyłu, zmieniaj prędkość odtwarzania i pobieraj dźwięk. Pozostań w rozmowie, słuchając.",
          privacyTitle: "Skoncentrowany w 100% na prywatności",
          privacyDesc: "Żadnych trackerów, żadnej telemetrii. Wszystko działa na Twojej maszynie.",
          githubRepo: "Repozytorium GitHuba",
          documentation: "Dokumentacja",
          reportIssue: "Zgłoś problem"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Audio",
          dashboardSubtitle: "Panel i konfiguracja",
          preferences: "Preferencje",
          shortcuts: "Skróty i gesty",
          faq: "Często zadawane pytania i rozwiązywanie problemów",
          darkMode: "Tryb ciemny",
          lightMode: "Tryb jasny",
          githubRepo: "Repozytorium GitHuba"
        },
        headers: {
          preferencesTitle: "Preferencje audio i odtwarzania",
          preferencesDesc: "Skonfiguruj język, ustawienia prędkości odtwarzania, domyślną głośność i funkcje.",
          shortcutsTitle: "Skróty klawiaturowe i gesty",
          shortcutsDesc: "Opanuj szybkie klawisze skrótu, aby łatwo manipulować odtwarzaniem.",
          faqTitle: "Często zadawane pytania i rozwiązywanie problemów",
          faqDesc: "Szczegółowy przewodnik techniczny, odpowiedzi na temat bezpieczeństwa i pomocy technicznej."
        },
        general: {
          languageTitle: "Język i lokalizacja",
          languageDesc: "Wybierz preferowany język interfejsu lub pozwól rozszerzeniu automatycznie wykryć język Twojej przeglądarki.",
          languageAuto: "Automatyczne wykrywanie (język przeglądarki)",
          languageDetected: "Wykryto",
          speedTitle: "Preferencje prędkości odtwarzania",
          speedDesc: "Wybierz domyślną szybkość odtwarzania podczas otwierania ChatGPT lub uruchamiania Czytaj na głos.",
          volumeTitle: "Domyślny poziom głośności",
          volumeDesc: "Zaprogramowana głośność strumieni mowy Czytaj na głos.",
          seekTitle: "Krok przewijania",
          seekDesc: "Liczba sekund do pominięcia po pojedynczym dotknięciu przycisków -10s / +10s lub Alt + Lewo / Alt + Prawo.",
          secondsUnit: "sekundy"
        },
        shortcutsGuide: {
          title: "Informacje o skrótach klawiaturowych",
          desc: "Przyspiesz swoją pracę dzięki ergonomicznym klawiszom skrótu do odtwarzania jedną ręką i standardowym klawiszom skrótu YouTube.",
          gesturesTitle: "Przewijanie przez przytrzymanie przycisku",
          gesturesDesc: "Przytrzymaj ◀10s lub 10s▶, aby płynnie przewijać długie odpowiedzi głosowe z rosnącą prędkością:",
          gestureHold03: "Rozpoczyna płynne przewijanie z prędkością 4×.",
          gestureHold15: "Zwiększa prędkość przewijania do 10×.",
          gestureHold30: "Zwiększa prędkość przewijania do 25×.",
          gestureRelease: "Zatrzymuje przewijanie w wybranym miejscu."
        },
        faq: {
          title: "Często zadawane pytania i podręcznik użytkownika",
          subtitle: "Szybkie odpowiedzi, które pomogą Ci w pełni wykorzystać sterowanie audio ChatGPT.",
          q1: "Jak dostosować głośność, przewijając myszką?",
          a1: "Po prostu umieść wskaźnik myszy nad ikoną głośnika głośności na pasku odtwarzacza i przewiń kółkiem myszy w górę lub w dół. Głośność będzie płynnie dostosowywana w krokach co 5% bez konieczności otwierania suwaka!",
          q2: "Gdzie pojawia się odtwarzacz na ChatGPT?",
          a2: "Zachowaj oryginalne położenie, wybierz róg lub bok ekranu albo umieść odtwarzacz nad polem wiadomości. Przeciągaj i zamieniaj paski — rozszerzenie zapamięta układ.",
          q3: "Jak pobrać dźwięk syntezowanej mowy?",
          a3: "Pobierane pliki korzystają z formatu audio udostępnianego przez ChatGPT. Rozszerzenie nie konwertuje dźwięku. Otwórz ChatGPT i rozpocznij czytanie na głos po ukończeniu odpowiedzi. Użyj odtwarzacza, aby wstrzymywać, szukać, zmieniać prędkość lub pobierać.",
          q4: "Czy to działa na małych ekranach laptopów?",
          a4: "Tak! Odtwarzacz automatycznie wykrywa dostępną szerokość ekranu i dynamicznie skaluje pasek wyszukiwania, aby wygodnie dopasować go do ekranu laptopa. Jeśli przestrzeń jest bardzo mała, pływający przycisk pozostaje dostępny, dzięki czemu możesz rozwijać i zwijać odtwarzacz, kiedy tylko tego potrzebujesz.",
          q5: "Jak zainstalować to poprzez Tampermonkey z automatycznymi aktualizacjami?",
          a5: "Jeśli używasz Tampermonkey, Violentmonkey lub Greasemonkey, możesz zainstalować samodzielny skrypt bezpośrednio z naszego repozytorium. Tampermonkey automatycznie sprawdzi GitHub pod kątem aktualizacji i powiadomi Cię o wydaniu nowej wersji.",
          q6: "Czy moje rozmowy lub podpowiedzi są prywatne?",
          a6: "100% prywatności. Rozszerzenie działa całkowicie na urządzeniu lokalnym. Żadne monity, odpowiedzi, strumienie audio ani osobiste dane telemetryczne nie są nigdy wysyłane do żadnego serwera zewnętrznego."
        }
      },
      content: {
        tooltips: {
          back: "Wstecz o {s} s — przytrzymaj, aby przewijać",
          playPause: "Odtwórz / Wstrzymaj (Space lub K; Alt+P nadal działa)",
          forward: "Dalej o {s} s — przytrzymaj, aby przewijać",
          speed: "Szybkość odtwarzania",
          volume: "Głośność (przewiń, aby dostosować)",
          volumeSlider: "Suwak głośności",
          download: "Pobierz dźwięk",
          shortcuts: "Skróty klawiaturowe i gesty",
          collapse: "Zwiń odtwarzacz",
          expand: "Rozwiń ChatGPT Audio Controls",
          readAloud: "Przeczytaj na głos"
        },
        shortcutsPopover: {
          title: "Skróty odczytywania na głos",
          playPause: "Odtwórz/Wstrzymaj",
          back: "Powrót {s} sek",
          forward: "Do przodu {s} sek",
          slower: "Wolniejsze ustawienie wstępne",
          faster: "Szybsze ustawienie wstępne",
          volumeScroll: "Przewijanie głośności",
          smoothScrub: "Płynne przewijanie",
          volumeScrollKey: "Przewiń 🔈",
          smoothScrubKey: "Przytrzymaj ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Nie można pobrać strumienia audio. Upewnij się, że dźwięk jest aktywnie ładowany."
        }
      },
      shortcuts: {
        playPause: {
          action: "Odtwórz/Wstrzymaj",
          description: "Przełącz odtwarzanie, dopasowując popularne odtwarzacze internetowe i stacjonarne (Alt+P pozostaje obsługiwany)"
        },
        seekBack: {
          action: "Cofnij się o 10 sekund",
          description: "Cofnij o 10 s (przytrzymaj, aby płynnie przewijać)"
        },
        seekForward: {
          action: "Do przodu o 10 sekund",
          description: "Przewiń do przodu o 10 s (przytrzymaj, aby płynnie przewijać)"
        },
        speedDecrease: {
          action: "Zmniejsz prędkość",
          description: "Zejdź do poprzedniego ustawienia prędkości"
        },
        speedIncrease: {
          action: "Zwiększ prędkość",
          description: "Przejdź do następnego ustawienia prędkości"
        }
      }
    },
    hu: {
      common: {
        extensionName: "ChatGPT Audio",
        extensionSubtitle: "Vezérlők és hangos olvasás",
        version: "v",
        openChatGPT: "Nyissa meg a ChatGPT-t",
        dashboard: "Irányítópult",
        seconds: "másodpercig",
        star: "★ Csillag",
        docs: "Dokumentumok",
        issues: "Kérdések"
      },
      popup: {
        header: {
          switchTheme: "Téma váltása",
          openOptions: "Nyissa meg az Irányítópult és a beállításokat"
        },
        tabs: {
          controls: "Vezérlők",
          shortcuts: "Kulcsok",
          about: "Körülbelül"
        },
        quickControls: {
          playbackSpeed: "Alapértelmezett lejátszási sebesség",
          defaultVolume: "Alapértelmezett hangerő",
          mute: "Némítás",
          unmute: "Némítás feloldása",
          smartIntegrations: "Intelligens integrációk",
          globalShortcuts: "Globális gyorsbillentyűk",
          globalShortcutsDesc: "Space/K, Alt+P, Alt+Arrows és gyorsbillentyűk engedélyezése",
          smoothScrubbing: "Sima súrolás",
          smoothScrubbingDesc: "Gyorsítsa fel a keresést a ◀10 vagy 10▶ gomb lenyomva tartásával"
        },
        shortcuts: {
          title: "Billentyűparancsok",
          gesturesTitle: "Egér- és érintésmozdulatok",
          smoothAudioScrub: "Smooth Audio Scrub",
          directDownload: "Közvetlen letöltés",
          holdScrubKey: "Tartsa lenyomva a ◀10 / 10▶ gombot",
          clickDownloadKey: "Kattintson a 📥 gombra"
        },
        about: {
          title: "ChatGPT hangvezérlők",
          byInfoxica: "Nyílt forráskód: Infoxica",
          description: "Szünet, visszatekerés, lejátszási sebesség módosítása és hang letöltése. Maradjon a beszélgetésben, miközben hallgat.",
          privacyTitle: "100%-ban az adatvédelemre összpontosít",
          privacyDesc: "Nincs nyomkövető, nincs telemetria. Minden fut a gépeden.",
          githubRepo: "GitHub Repository",
          documentation: "Dokumentáció",
          reportIssue: "Probléma bejelentése"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Audio",
          dashboardSubtitle: "Irányítópult és beállítás",
          preferences: "Preferences",
          shortcuts: "Parancsikonok és gesztusok",
          faq: "GYIK és hibaelhárítás",
          darkMode: "Sötét mód",
          lightMode: "Fény mód",
          githubRepo: "GitHub Repo"
        },
        headers: {
          preferencesTitle: "Hang- és lejátszási beállítások",
          preferencesDesc: "Konfigurálja a nyelvet, a lejátszási sebesség előre beállított beállításait, az alapértelmezett hangerőt és a funkciókat.",
          shortcutsTitle: "Billentyűparancsok és mozdulatok",
          shortcutsDesc: "A gyors gyorsbillentyűk elsajátítása a könnyű lejátszási manipuláció érdekében.",
          faqTitle: "GYIK és hibaelhárítás",
          faqDesc: "Részletes műszaki útmutató, biztonsági és támogatási válaszok."
        },
        general: {
          languageTitle: "Nyelv és lokalizáció",
          languageDesc: "Válassza ki a kívánt kezelőfelület nyelvét, vagy hagyja, hogy a bővítmény automatikusan felismerje böngészője nyelvét.",
          languageAuto: "Automatikus felismerés (böngésző nyelve)",
          languageDetected: "Észlelve",
          speedTitle: "Lejátszási sebesség beállításai",
          speedDesc: "Válassza ki az alapértelmezett lejátszási sebességet a ChatGPT megnyitásakor vagy a Read Aloud elindításakor.",
          volumeTitle: "Alapértelmezett hangerőszint",
          volumeDesc: "Előre beállított hangerő a Felolvasás beszédfolyamokhoz.",
          seekTitle: "Skip & Seek lépés",
          seekDesc: "Az átugráshoz szükséges másodpercek száma a -10s / +10s gombok vagy az Alt + Bal / Alt + Jobb megnyomásával.",
          secondsUnit: "másodpercig"
        },
        shortcutsGuide: {
          title: "Billentyűparancsok kézikönyve",
          desc: "Gyorsítsa fel munkafolyamatát az ergonomikus egykezes és a YouTube szabványú lejátszási gyorsbillentyűkkel.",
          gesturesTitle: "Mouse & Hold Scrub gesztusok",
          gesturesDesc: "Tartsa lenyomva a ◀10s vagy 10s▶ gombot a hosszú hangos válaszok dinamikus gyorsításával történő gördülékenységéhez:",
          gestureHold03: "Sima súrolás üzemmódba lép (4× normál sebesség).",
          gestureHold15: "10-szeres keresési sebességre gyorsul.",
          gestureHold30: "Nagy sebességű ugrási sebesség 25×-es sebességgel.",
          gestureRelease: "Zökkenőmentesen rögzül a kívánt pozícióba."
        },
        faq: {
          title: "Gyakran Ismételt Kérdések és Felhasználói útmutató",
          subtitle: "Gyors válaszok, amelyek segítségével a legtöbbet hozhatja ki a ChatGPT hangvezérlőkből.",
          q1: "Hogyan állíthatom be a hangerőt az egér görgetésével?",
          a1: "Egyszerűen vigye az egérmutatót a hangerő hangszóró ikonjára a lejátszó sínjén, és görgesse az egér görgőjét felfelé vagy lefelé. A hangerő zökkenőmentesen 5%-os lépésekben állítható anélkül, hogy meg kellene nyitnia a csúszkát!",
          q2: "Hol jelenik meg a lejátszó a ChatGPT-n?",
          a2: "Tartsa meg az eredeti elhelyezést, válasszon egy sarok vagy oldal előre beállított értéket, vagy dokkoljon a csevegés bemenete fölé. Húzza a mozgatáshoz, cserélje fel a sávokat, és emlékezzen az elrendezésre.",
          q3: "Hogyan tölthetem le a szintetizált beszédhangot?",
          a3: "A letöltések a ChatGPT által biztosított hangformátumot használják. A kiterjesztés nem konvertálja a hangot. Nyissa meg a ChatGPT-t, és indítsa el a Hangos felolvasást a kész válasz esetén. Használja a lejátszót szüneteltetésre, keresésre, sebesség módosítására vagy letöltésre.",
          q4: "Ez működik kis laptop képernyőkön?",
          a4: "Igen! A lejátszó automatikusan felismeri a rendelkezésre álló képernyőszélességet, és dinamikusan skálázza a keresősávot, hogy kényelmesen illeszkedjen a laptop képernyőjéhez. Ha nagyon szűk a hely, a lebegő gomb elérhető marad, így bármikor kibonthatja és összecsukhatja a lejátszót, amikor csak szüksége van rá.",
          q5: "Hogyan telepíthetem ezt a Tampermonkey-n keresztül automatikus frissítéssel?",
          a5: "Ha Tampermonkey-t, Violentmonkey-t vagy Greasemonkey-t használ, az önálló szkriptet közvetlenül a tárhelyünkből telepítheti. A Tampermonkey automatikusan ellenőrzi a GitHub frissítéseit, és értesíti Önt, ha új verzió jelenik meg.",
          q6: "Privát jellegűek a beszélgetéseim vagy az üzeneteim?",
          a6: "100% privát. A bővítmény teljes egészében a helyi eszközön fut. Soha semmilyen külső szerverre nem küldenek felszólításokat, válaszokat, hangfolyamokat vagy személyes telemetriát."
        }
      },
      content: {
        tooltips: {
          back: "Vissza {s} másodperc – tartsa lenyomva a súroláshoz",
          playPause: "Lejátszás / Szünet (szóköz vagy K; Alt+P örökölt)",
          forward: "Előre {s} másodperc – tartsa lenyomva a súroláshoz",
          speed: "Lejátszási sebesség",
          volume: "Hangerő (görgessen a beállításhoz)",
          volumeSlider: "Hangerő csúszka",
          download: "Hang letöltése",
          shortcuts: "Billentyűparancsok és kézmozdulatok",
          collapse: "A lejátszó összecsukása",
          expand: "Bontsa ki a ChatGPT audiovezérlőket",
          readAloud: "Olvass fel hangosan"
        },
        shortcutsPopover: {
          title: "Olvassa el a Hangosan parancsikonokat",
          playPause: "Lejátszás / Szünet",
          back: "Vissza {s} mp",
          forward: "Előre {s} mp",
          slower: "Lassabb előbeállítás",
          faster: "Gyorsabb előbeállítás",
          volumeScroll: "Kötetgörgetés",
          smoothScrub: "Sima bőrradír",
          volumeScrollKey: "Lapozz tovább 🔈",
          smoothScrubKey: "Tartsa lenyomva a ◀{s} / {s}▶ gombot"
        },
        alerts: {
          downloadError: "Nem sikerült letölteni az audio adatfolyamot. Győződjön meg arról, hogy a hang aktívan betöltődik."
        }
      },
      shortcuts: {
        playPause: {
          action: "Lejátszás / Szünet",
          description: "Lejátszás váltása, az elterjedt webes és asztali lejátszók összeegyeztetése (a Alt+P továbbra is támogatott)"
        },
        seekBack: {
          action: "10 másodperc vissza",
          description: "Ugrás hátra 10 mp-et (tartsa lenyomva a sima dörzsöléshez)"
        },
        seekForward: {
          action: "Előre 10 másodperccel",
          description: "Ugrás előre 10 mp-et (tartsa a sima dörzsöléshez)"
        },
        speedDecrease: {
          action: "Sebesség csökkentése",
          description: "Lépjen le az előző előre beállított sebességre"
        },
        speedIncrease: {
          action: "Sebesség növelése",
          description: "Lépjen a következő előre beállított sebességre"
        }
      }
    },
    sv: {
      common: {
        extensionName: "ChatGPT Audio",
        extensionSubtitle: "Kontroller och högläsning",
        version: "v",
        openChatGPT: "Öppna ChatGPT",
        dashboard: "Kontrollpanel",
        seconds: "sekunder",
        star: "★ Stjärna",
        docs: "Dokumentation",
        issues: "Problem"
      },
      popup: {
        header: {
          switchTheme: "Byt tema",
          openOptions: "Öppna kontrollpanelen och inställningarna"
        },
        tabs: {
          controls: "Kontroller",
          shortcuts: "Kortkommandon",
          about: "Om"
        },
        quickControls: {
          playbackSpeed: "Standard uppspelningshastighet",
          defaultVolume: "Standardvolym",
          mute: "Ljud av",
          unmute: "Slå på ljudet",
          smartIntegrations: "Smarta integrationer",
          globalShortcuts: "Globala genvägar",
          globalShortcutsDesc: "Aktivera Space/K, Alt+P, Alt+Arrows och hastighetsknappar",
          smoothScrubbing: "Steglös spolning",
          smoothScrubbingDesc: "Håll ned ◀10 eller 10▶ för att spola allt snabbare"
        },
        shortcuts: {
          title: "Kortkommandon",
          gesturesTitle: "Mus- och pekgester",
          smoothAudioScrub: "Steglös ljudspolning",
          directDownload: "Direkt nedladdning",
          holdScrubKey: "Håll ned ◀10 / 10▶",
          clickDownloadKey: "Klicka på knappen 📥"
        },
        about: {
          title: "ChatGPT Audio Controls",
          byInfoxica: "Öppen källkod från Infoxica",
          description: "Pausa, spola tillbaka, ändra uppspelningshastighet och ladda ner ljud. Håll dig i konversationen medan du lyssnar.",
          privacyTitle: "100 % integritetsfokuserad",
          privacyDesc: "Inga spårare, ingen telemetri. Allt körs på din maskin.",
          githubRepo: "Källkod på GitHub",
          documentation: "Dokumentation",
          reportIssue: "Rapportera ett problem"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Audio",
          dashboardSubtitle: "Kontrollpanel och inställningar",
          preferences: "Inställningar",
          shortcuts: "Genvägar och gester",
          faq: "FAQ & felsökning",
          darkMode: "Mörkt läge",
          lightMode: "Ljusläge",
          githubRepo: "Källkod på GitHub"
        },
        headers: {
          preferencesTitle: "Ljud- och uppspelningsinställningar",
          preferencesDesc: "Konfigurera språk, förinställningar för uppspelningshastighet, standardvolym och funktioner.",
          shortcutsTitle: "Kortkommandon och gester",
          shortcutsDesc: "Styr uppspelningen enkelt med kortkommandon.",
          faqTitle: "FAQ & felsökning",
          faqDesc: "Detaljerad teknisk guide, säkerhet och supportsvar."
        },
        general: {
          languageTitle: "Språk & lokalisering",
          languageDesc: "Välj ditt föredragna gränssnittsspråk eller låt tillägget automatiskt upptäcka din webbläsares språk.",
          languageAuto: "Automatisk identifiering (webbläsarspråk)",
          languageDetected: "Upptäckt",
          speedTitle: "Inställningar för uppspelningshastighet",
          speedDesc: "Välj din standarduppspelningshastighet när du öppnar ChatGPT eller startar Läs högt.",
          volumeTitle: "Standardvolymnivå",
          volumeDesc: "Förinställd volym för uppläsning av talströmmar.",
          seekTitle: "Spolningssteg",
          seekDesc: "Antal sekunder att hoppa över vid ett enkelt tryck på knapparna -10s / +10s eller Alt + Vänster / Alt + Höger.",
          secondsUnit: "sekunder"
        },
        shortcutsGuide: {
          title: "Referens för kortkommandon",
          desc: "Accelerera ditt arbetsflöde med ergonomiska enhands- och YouTube-standarduppspelningskommandon.",
          gesturesTitle: "Spola genom att hålla ned knappen",
          gesturesDesc: "Håll ned ◀10s eller 10s▶ för att spola genom långa upplästa svar med ökande hastighet:",
          gestureHold03: "Startar steglös spolning med 4× hastighet.",
          gestureHold15: "Ökar spolningshastigheten till 10×.",
          gestureHold30: "Ökar spolningshastigheten till 25×.",
          gestureRelease: "Stannar vid den valda positionen."
        },
        faq: {
          title: "Vanliga frågor och användarguide",
          subtitle: "Snabba svar som hjälper dig att få ut det mesta av ChatGPT ljudkontroller.",
          q1: "Hur justerar jag volymen genom att rulla med musen?",
          a1: "Håll helt enkelt muspekaren över volymhögtalarikonen på spelarskenan och rulla mushjulet uppåt eller nedåt. Volymen justeras smidigt i steg om 5 % utan att behöva öppna skjutreglagets popover!",
          q2: "Var visas spelaren på ChatGPT?",
          a2: "Behåll den ursprungliga placeringen, välj ett hörn eller en sida, eller docka ovanför meddelandefältet. Dra för att flytta och byta plats på fälten. Tillägget sparar din layout.",
          q3: "Hur laddar jag ner det syntetiserade talljudet?",
          a3: "Nedladdningar använder ljudformatet som tillhandahålls av ChatGPT. Tillägget konverterar inte ljud. Öppna ChatGPT och börja läsa högt på ett färdigt svar. Använd spelaren för att pausa, söka, ändra hastighet eller ladda ner.",
          q4: "Fungerar detta på små bärbara skärmar?",
          a4: "Ja! Spelaren känner automatiskt av din tillgängliga skärmbredd och skalar dynamiskt sökfältet så att det passar din bärbara dators skärm bekvämt. Om utrymmet är extremt trångt förblir den flytande knappen tillgänglig så att du kan expandera och fälla ihop spelaren när du behöver den.",
          q5: "Hur installerar jag detta via Tampermonkey med automatiska uppdateringar?",
          a5: "Om du använder Tampermonkey, Violentmonkey eller Greasemonkey kan du installera det fristående skriptet direkt från vårt arkiv. Tampermonkey kommer automatiskt att kontrollera GitHub för uppdateringar och meddela dig när en ny version släpps.",
          q6: "Är mina konversationer eller uppmaningar privata?",
          a6: "100% privat. Tillägget körs helt på din lokala enhet. Inga uppmaningar, svar, ljudströmmar eller personlig telemetri skickas någonsin till någon extern server."
        }
      },
      content: {
        tooltips: {
          back: "Bakåt {s} sekunder — håll ned för att spola",
          playPause: "Spela / Pausa (Space eller K; Alt+P fungerar fortfarande)",
          forward: "Framåt {s} sekunder — håll ned för att spola",
          speed: "Uppspelningshastighet",
          volume: "Volym (Bläddra för att justera)",
          volumeSlider: "Volymreglage",
          download: "Ladda ner ljud",
          shortcuts: "Kortkommandon och gester",
          collapse: "Fäll ihop spelaren",
          expand: "Visa ChatGPT Audio Controls",
          readAloud: "Läs högt"
        },
        shortcutsPopover: {
          title: "Kortkommandon för högläsning",
          playPause: "Spela / Pausa",
          back: "Tillbaka {s} sek",
          forward: "Framåt {s} sek",
          slower: "Långsammare förinställning",
          faster: "Snabbare förinställning",
          volumeScroll: "Justera volymen med mushjulet",
          smoothScrub: "Steglös spolning",
          volumeScrollKey: "Rulla över 🔈",
          smoothScrubKey: "Håll ned ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Det gick inte att ladda ner ljudström. Se till att ljudet är aktivt laddat."
        }
      },
      shortcuts: {
        playPause: {
          action: "Spela / Pausa",
          description: "Växla uppspelning, matcha vanliga webb- och stationära spelare (Alt+P stöds fortfarande)"
        },
        seekBack: {
          action: "Tillbaka 10 sekunder",
          description: "Hoppa bakåt 10 s (håll ned för att spola)"
        },
        seekForward: {
          action: "Framåt 10 sekunder",
          description: "Hoppa framåt 10 s (håll ned för att spola)"
        },
        speedDecrease: {
          action: "Minska hastigheten",
          description: "Gå ner till föregående förinställd hastighet"
        },
        speedIncrease: {
          action: "Öka hastigheten",
          description: "Stega upp till nästa förinställda hastighet"
        }
      }
    },
    cs: {
      common: {
        extensionName: "Zvuk ChatGPT",
        extensionSubtitle: "Ovládání a čtení nahlas",
        version: "v",
        openChatGPT: "Otevřete ChatGPT",
        dashboard: "Dashboard",
        seconds: "sekund",
        star: "★ Hvězda",
        docs: "Docs",
        issues: "Problémy"
      },
      popup: {
        header: {
          switchTheme: "Přepnout téma",
          openOptions: "Otevřete Dashboard & Settings"
        },
        tabs: {
          controls: "Ovládací prvky",
          shortcuts: "Klíče",
          about: "O"
        },
        quickControls: {
          playbackSpeed: "Výchozí rychlost přehrávání",
          defaultVolume: "Výchozí hlasitost",
          mute: "Ztlumit",
          unmute: "Zapnout zvuk",
          smartIntegrations: "Inteligentní integrace",
          globalShortcuts: "Globální zkratky",
          globalShortcutsDesc: "Povolit Space/K, Alt+P, Alt+Arrows a tlačítka rychlosti",
          smoothScrubbing: "Hladké drhnutí",
          smoothScrubbingDesc: "Vyhledávání zrychlíte podržením ◀10 nebo 10▶"
        },
        shortcuts: {
          title: "Klávesové zkratky",
          gesturesTitle: "Gesta myši a dotyku",
          smoothAudioScrub: "Hladký zvukový peeling",
          directDownload: "Přímé stahování",
          holdScrubKey: "Podržte ◀10 / 10▶",
          clickDownloadKey: "Klikněte na tlačítko 📥"
        },
        about: {
          title: "Ovládání zvuku ChatGPT",
          byInfoxica: "Open Source od Infoxica",
          description: "Pozastavit, přetočit zpět, změnit rychlost přehrávání a stáhnout zvuk. Zůstaňte v konverzaci, zatímco posloucháte.",
          privacyTitle: "100% zaměření na soukromí",
          privacyDesc: "Žádné sledovače, žádná telemetrie. Vše běží na vašem stroji.",
          githubRepo: "Úložiště GitHub",
          documentation: "Dokumentace",
          reportIssue: "Nahlásit problém"
        }
      },
      options: {
        nav: {
          dashboardTitle: "Zvuk ChatGPT",
          dashboardSubtitle: "Dashboard & Setup",
          preferences: "Předvolby",
          shortcuts: "Zkratky a gesta",
          faq: "Nejčastější dotazy a odstraňování problémů",
          darkMode: "Tmavý režim",
          lightMode: "Světelný režim",
          githubRepo: "GitHub Repo"
        },
        headers: {
          preferencesTitle: "Předvolby zvuku a přehrávání",
          preferencesDesc: "Nakonfigurujte jazyk, předvolby rychlosti přehrávání, výchozí hlasitost a funkce.",
          shortcutsTitle: "Klávesové zkratky a gesta",
          shortcutsDesc: "Ovládněte rychlé klávesové zkratky pro snadnou manipulaci s přehráváním.",
          faqTitle: "Nejčastější dotazy a odstraňování problémů",
          faqDesc: "Podrobný technický průvodce, zabezpečení a odpovědi na podporu."
        },
        general: {
          languageTitle: "Jazyk a lokalizace",
          languageDesc: "Vyberte preferovaný jazyk rozhraní nebo nechte rozšíření automaticky detekovat jazyk vašeho prohlížeče.",
          languageAuto: "Automatická detekce (jazyk prohlížeče)",
          languageDetected: "Zjištěno",
          speedTitle: "Předvolby rychlosti přehrávání",
          speedDesc: "Zvolte výchozí rychlost přehrávání při otevírání ChatGPT nebo spouštění čtení nahlas.",
          volumeTitle: "Výchozí úroveň hlasitosti",
          volumeDesc: "Přednastavená hlasitost pro hlasové proudy řeči.",
          seekTitle: "Krok přeskočení a hledání",
          seekDesc: "Počet sekund, které mají být přeskočeny jedním klepnutím na tlačítka -10s / +10s nebo Alt + Left / Alt + Right.",
          secondsUnit: "sekund"
        },
        shortcutsGuide: {
          title: "Reference klávesových zkratek",
          desc: "Zrychlete svůj pracovní postup pomocí ergonomických klávesových zkratek pro přehrávání jednou rukou a standardních YouTube.",
          gesturesTitle: "Gesta mytí a držení",
          gesturesDesc: "Podržením tlačítek ◀10s nebo 10s▶ plynule procházejte dlouhé hlasové odpovědi s dynamickým zrychlením:",
          gestureHold03: "Vstoupí do režimu hladkého čištění (4× normální rychlost).",
          gestureHold15: "Zrychluje na 10× rychlost vyhledávání.",
          gestureHold30: "Rychlost skoku při vysoké rychlosti 25×.",
          gestureRelease: "Bezproblémově se uzamkne v požadované poloze."
        },
        faq: {
          title: "Často kladené otázky a uživatelská příručka",
          subtitle: "Rychlé odpovědi, které vám pomohou co nejlépe využít ovládání zvuku ChatGPT.",
          q1: "Jak upravím hlasitost rolováním myší?",
          a1: "Jednoduše umístěte ukazatel myši na ikonu reproduktoru hlasitosti na liště přehrávače a posuňte kolečko myši nahoru nebo dolů. Hlasitost se plynule upraví v krocích po 5 %, aniž byste museli otevírat posuvný kryt!",
          q2: "Kde se přehrávač objeví na ChatGPT?",
          a2: "Ponechte původní umístění, vyberte přednastavení rohu nebo strany nebo ukotvete nad vstupem chatu. Přetažením se můžete pohybovat, vyměňovat pruhy a pamatovat si rozvržení.",
          q3: "Jak si stáhnu zvuk syntetizované řeči?",
          a3: "Stahování používá zvukový formát poskytovaný ChatGPT. Rozšíření nepřevádí zvuk. Otevřete ChatGPT a po dokončení odpovědi spusťte čtení nahlas. Použijte přehrávač k pozastavení, vyhledávání, změně rychlosti nebo stahování.",
          q4: "Funguje to na malých obrazovkách notebooků?",
          a4: "Ano! Přehrávač automaticky detekuje dostupnou šířku obrazovky a dynamicky přizpůsobuje svůj vyhledávací panel tak, aby se pohodlně vešel na obrazovku vašeho notebooku. Pokud je místo extrémně málo, plovoucí tlačítko zůstane přístupné, takže přehrávač můžete rozbalit a sbalit, kdykoli to budete potřebovat.",
          q5: "Jak to nainstaluji přes Tampermonkey s automatickými aktualizacemi?",
          a5: "Pokud používáte Tampermonkey, Violentmonkey nebo Greasemonkey, můžete si nainstalovat samostatný skript přímo z našeho úložiště. Tampermonkey automaticky zkontroluje aktualizace GitHubu a upozorní vás na vydání nové verze.",
          q6: "Jsou moje konverzace nebo výzvy soukromé?",
          a6: "100% soukromé. Rozšíření běží výhradně na vašem místním zařízení. Žádné výzvy, odpovědi, audio streamy nebo osobní telemetrie nejsou nikdy odesílány na žádný externí server."
        }
      },
      content: {
        tooltips: {
          back: "Zpět {s} sekund – podržením vyčistíte",
          playPause: "Přehrát / Pozastavit (mezera nebo K; starší verze Alt+P)",
          forward: "Vpřed {s} sekund – podržením vyčistíte",
          speed: "Rychlost přehrávání",
          volume: "Hlasitost (upravte posunutím)",
          volumeSlider: "Posuvník hlasitosti",
          download: "Stáhnout zvuk",
          shortcuts: "Klávesové zkratky a gesta",
          collapse: "Sbalit přehrávač",
          expand: "Rozbalte ovládací prvky zvuku ChatGPT",
          readAloud: "Čtěte nahlas"
        },
        shortcutsPopover: {
          title: "Zkratky čtení nahlas",
          playPause: "Přehrát / Pozastavit",
          back: "Zpět {s} sec",
          forward: "Vpřed {s} sec",
          slower: "Pomalejší předvolba",
          faster: "Rychlejší předvolba",
          volumeScroll: "Rolování hlasitosti",
          smoothScrub: "Hladký peeling",
          volumeScrollKey: "Přejděte na 🔈",
          smoothScrubKey: "Podržte ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Zvukový stream nelze stáhnout. Ujistěte se, že je zvuk aktivně načten."
        }
      },
      shortcuts: {
        playPause: {
          action: "Přehrát / Pozastavit",
          description: "Přepnout přehrávání, sladit běžné webové a stolní přehrávače (Alt+P zůstává podporováno)"
        },
        seekBack: {
          action: "Zpět 10 sekund",
          description: "Skok zpět o 10 s (podržením pro hladké drhnutí)"
        },
        seekForward: {
          action: "Vpřed o 10 sekund",
          description: "Skok dopředu o 10 s (podržením pro hladké drhnutí)"
        },
        speedDecrease: {
          action: "Snížit rychlost",
          description: "Přejděte dolů na předchozí předvolbu rychlosti"
        },
        speedIncrease: {
          action: "Zvyšte rychlost",
          description: "Přejděte na další předvolbu rychlosti"
        }
      }
    },
    uk: {
      common: {
        extensionName: "ChatGPT Аудіо",
        extensionSubtitle: "Елементи керування та читання вголос",
        version: "v",
        openChatGPT: "Відкрийте ChatGPT",
        dashboard: "Приладова панель",
        seconds: "секунд",
        star: "★ Зірка",
        docs: "документи",
        issues: "Питання"
      },
      popup: {
        header: {
          switchTheme: "Змінити тему",
          openOptions: "Відкрийте інформаційну панель і налаштування"
        },
        tabs: {
          controls: "Елементи керування",
          shortcuts: "Ключі",
          about: "про"
        },
        quickControls: {
          playbackSpeed: "Швидкість відтворення за замовчуванням",
          defaultVolume: "Гучність за замовчуванням",
          mute: "Вимкнути звук",
          unmute: "Увімкнути звук",
          smartIntegrations: "Розумні інтеграції",
          globalShortcuts: "Глобальні ярлики",
          globalShortcutsDesc: "Увімкнути Space/K, Alt+P, Alt+Arrows і швидкісні клавіші",
          smoothScrubbing: "Гладке чищення",
          smoothScrubbingDesc: "Щоб прискорити пошук, утримуйте ◀10 або 10▶"
        },
        shortcuts: {
          title: "Комбінації клавіш",
          gesturesTitle: "Жести миші та дотику",
          smoothAudioScrub: "Smooth Audio Scrub",
          directDownload: "Пряме завантаження",
          holdScrubKey: "Утримуйте ◀10 / 10▶",
          clickDownloadKey: "Натисніть кнопку 📥"
        },
        about: {
          title: "ChatGPT Елементи керування звуком",
          byInfoxica: "Відкритий код від Infoxica",
          description: "Пауза, перемотування назад, зміна швидкості відтворення та завантаження аудіо. Залишайтеся в розмові, слухаючи.",
          privacyTitle: "На 100% зосереджено на конфіденційності",
          privacyDesc: "Ні трекерів, ні телеметрії. Усе працює на вашій машині.",
          githubRepo: "Репозиторій GitHub",
          documentation: "Документація",
          reportIssue: "Повідомити про проблему"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Аудіо",
          dashboardSubtitle: "Інформаційна панель і налаштування",
          preferences: "Уподобання",
          shortcuts: "Комбінації клавіш і жести",
          faq: "Поширені запитання та усунення несправностей",
          darkMode: "Темний режим",
          lightMode: "Світловий режим",
          githubRepo: "GitHub Repo"
        },
        headers: {
          preferencesTitle: "Параметри аудіо та відтворення",
          preferencesDesc: "Налаштуйте мову, попередні налаштування швидкості відтворення, гучність за замовчуванням і функції.",
          shortcutsTitle: "Комбінації клавіш і жести",
          shortcutsDesc: "Опануйте швидкі гарячі клавіші для легкого керування відтворенням.",
          faqTitle: "Поширені запитання та усунення несправностей",
          faqDesc: "Детальний технічний посібник, відповіді щодо безпеки та підтримки."
        },
        general: {
          languageTitle: "Мова та локалізація",
          languageDesc: "Виберіть потрібну мову інтерфейсу або дозвольте розширенню автоматично визначити мову вашого браузера.",
          languageAuto: "Автоматичне визначення (мова браузера)",
          languageDetected: "Виявлено",
          speedTitle: "Параметри швидкості відтворення",
          speedDesc: "Виберіть швидкість відтворення за умовчанням, відкриваючи ChatGPT або запускаючи Read Aloud.",
          volumeTitle: "Рівень гучності за замовчуванням",
          volumeDesc: "Попередньо встановлена гучність для читання вголос мовних потоків.",
          seekTitle: "Крок пропуску та пошуку",
          seekDesc: "Кількість секунд, які потрібно пропустити при одноразовому натисканні кнопок -10s / +10s або Alt + Left / Alt + Right.",
          secondsUnit: "секунд"
        },
        shortcutsGuide: {
          title: "Довідник з комбінацій клавіш",
          desc: "Прискоріть свій робочий процес за допомогою ергономічних клавіш для відтворення однією рукою та стандартних YouTube.",
          gesturesTitle: "Жести миші й утримання",
          gesturesDesc: "Утримуйте кнопки ◀10s або 10s▶, щоб плавно прокручувати довгі голосові відповіді з динамічним прискоренням:",
          gestureHold03: "Перехід у режим плавного чищення (4× нормальна швидкість).",
          gestureHold15: "Швидкість пошуку прискорюється до 10 разів.",
          gestureHold30: "Висока швидкість стрибка зі швидкістю 25×.",
          gestureRelease: "Плавно фіксується в потрібному положенні."
        },
        faq: {
          title: "Часті запитання та посібник користувача",
          subtitle: "Швидкі відповіді, які допоможуть отримати максимальну віддачу від засобів керування звуком ChatGPT.",
          q1: "Як регулювати гучність, прокручуючи мишею?",
          a1: "Просто наведіть вказівник миші на піктограму гучномовця на рейці плеєра та прокрутіть колесо миші вгору або вниз. Гучність буде плавно регулюватися з кроком 5% без необхідності відкривати повзунок!",
          q2: "Де з'являється гравець на ChatGPT?",
          a2: "Збережіть вихідне розташування, виберіть кут або бічні налаштування або закріпіть над введенням чату. Перетягуйте, щоб рухатися, міняйте смужки місцями та запам’ятовуйте свій макет.",
          q3: "Як завантажити аудіо синтезованого мовлення?",
          a3: "Для завантажень використовується аудіоформат, наданий ChatGPT. Розширення не конвертує звук. Відкрийте ChatGPT і почніть читати вголос після завершеної відповіді. Використовуйте плеєр для паузи, пошуку, зміни швидкості або завантаження.",
          q4: "Чи працює це на маленьких екранах ноутбуків?",
          a4: "так! Програвач автоматично визначає доступну ширину екрана та динамічно масштабує свою панель пошуку, щоб зручно підходити до екрана вашого ноутбука. Якщо місця дуже мало, плаваюча кнопка залишається доступною, тож ви можете розгортати та згортати програвач, коли вам це потрібно.",
          q5: "Як мені встановити це через Tampermonkey з автоматичними оновленнями?",
          a5: "Якщо ви використовуєте Tampermonkey, Violentmonkey або Greasemonkey, ви можете встановити окремий сценарій безпосередньо з нашого репозиторію. Tampermonkey автоматично перевірятиме GitHub на наявність оновлень і сповіщатиме вас щоразу, коли буде випущена нова версія.",
          q6: "Чи мої розмови чи підказки приватні?",
          a6: "100% приватний. Розширення повністю працює на вашому локальному пристрої. Жодні підказки, відповіді, аудіопотоки чи особиста телеметрія ніколи не надсилаються на будь-який зовнішній сервер."
        }
      },
      content: {
        tooltips: {
          back: "Назад {s} секунд — утримуйте, щоб почистити",
          playPause: "Відтворення/пауза (Пробіл або K; спадщина Alt+P)",
          forward: "Уперед {s} секунд — утримуйте, щоб почистити",
          speed: "Швидкість відтворення",
          volume: "Гучність (прокрутіть, щоб відрегулювати)",
          volumeSlider: "Повзунок гучності",
          download: "Завантажити аудіо",
          shortcuts: "Комбінації клавіш і жести",
          collapse: "Згорнути плеєр",
          expand: "Розгорніть елементи керування звуком ChatGPT",
          readAloud: "Прочитайте вголос"
        },
        shortcutsPopover: {
          title: "Комбінації клавіш для читання вголос",
          playPause: "Відтворення / Пауза",
          back: "Назад {s} сек",
          forward: "Вперед {s} сек",
          slower: "Повільніше налаштування",
          faster: "Швидший пресет",
          volumeScroll: "Прокручування гучності",
          smoothScrub: "Гладкий скраб",
          volumeScrollKey: "Прокрутіть далі 🔈",
          smoothScrubKey: "Утримуйте ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Не вдалося завантажити аудіопотік. Переконайтеся, що аудіо завантажується активно."
        }
      },
      shortcuts: {
        playPause: {
          action: "Відтворення / Пауза",
          description: "Перемкнути відтворення, зіставляючи звичайні веб-програвачі та програвачі на комп’ютері (Alt+P продовжує підтримуватися)"
        },
        seekBack: {
          action: "Назад 10 секунд",
          description: "Перейти назад на 10 секунд (утримуйте для гладкого чищення)"
        },
        seekForward: {
          action: "Уперед на 10 секунд",
          description: "Перейти вперед на 10 с (утримуйте для гладкого чищення)"
        },
        speedDecrease: {
          action: "Зменшити швидкість",
          description: "Перейти до попереднього налаштування швидкості"
        },
        speedIncrease: {
          action: "Збільшити швидкість",
          description: "Перейдіть до наступного попереднього налаштування швидкості"
        }
      }
    },
    ca: {
      common: {
        extensionName: "ChatGPT Àudio",
        extensionSubtitle: "Controls i lectura en veu alta",
        version: "v",
        openChatGPT: "Obre ChatGPT",
        dashboard: "Tauler de control",
        seconds: "segons",
        star: "★ Estrella",
        docs: "Docs",
        issues: "Problemes"
      },
      popup: {
        header: {
          switchTheme: "Canvia el tema",
          openOptions: "Obriu Tauler i configuració"
        },
        tabs: {
          controls: "Controls",
          shortcuts: "Les claus",
          about: "Sobre"
        },
        quickControls: {
          playbackSpeed: "Velocitat de reproducció per defecte",
          defaultVolume: "Volum per defecte",
          mute: "Silenciar",
          unmute: "Activa el so",
          smartIntegrations: "Integracions intel·ligents",
          globalShortcuts: "Dreceres globals",
          globalShortcutsDesc: "Activa les tecles de velocitat Space/K, Alt+P, Alt+Arrows i de velocitat",
          smoothScrubbing: "Fregat suau",
          smoothScrubbingDesc: "Accelereu la cerca mantenint premut ◀10 o 10▶"
        },
        shortcuts: {
          title: "Dreceres de teclat",
          gesturesTitle: "Gestos del ratolí i el tacte",
          smoothAudioScrub: "Smooth Audio Scrub",
          directDownload: "Descàrrega directa",
          holdScrubKey: "Manteniu premut ◀10/10▶",
          clickDownloadKey: "Feu clic al botó 📥"
        },
        about: {
          title: "Controls d'àudio ChatGPT",
          byInfoxica: "Codi obert per Infoxica",
          description: "Posa en pausa, rebobina, canvia la velocitat de reproducció i baixa l'àudio. Mantingueu-vos en la conversa mentre escolteu.",
          privacyTitle: "100% centrat en la privadesa",
          privacyDesc: "Sense rastrejadors, sense telemetria. Tot funciona a la teva màquina.",
          githubRepo: "Repositori GitHub",
          documentation: "Documentació",
          reportIssue: "Informar d'un problema"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Àudio",
          dashboardSubtitle: "Tauler i configuració",
          preferences: "Preferències",
          shortcuts: "Dreceres i gestos",
          faq: "Preguntes freqüents i resolució de problemes",
          darkMode: "Mode fosc",
          lightMode: "Mode de llum",
          githubRepo: "Repositori GitHub"
        },
        headers: {
          preferencesTitle: "Preferències d'àudio i reproducció",
          preferencesDesc: "Configura l'idioma, la velocitat de reproducció predeterminada, el volum predeterminat i les funcions.",
          shortcutsTitle: "Dreceres i gestos del teclat",
          shortcutsDesc: "Domineu les tecles d'accés ràpid ràpid per a una manipulació de reproducció sense esforç.",
          faqTitle: "Preguntes freqüents i resolució de problemes",
          faqDesc: "Guia tècnica detallada, seguretat i respostes de suport."
        },
        general: {
          languageTitle: "Idioma i localització",
          languageDesc: "Trieu l'idioma de la vostra interfície preferit o deixeu que l'extensió detecti automàticament l'idioma del vostre navegador.",
          languageAuto: "Detecció automàtica (idioma del navegador)",
          languageDetected: "Detectat",
          speedTitle: "Preferències de velocitat de reproducció",
          speedDesc: "Trieu la vostra velocitat de reproducció predeterminada quan obriu ChatGPT o inicieu la lectura en veu alta.",
          volumeTitle: "Nivell de volum per defecte",
          volumeDesc: "Volum preestablert per a fluxos de veu de lectura en veu alta.",
          seekTitle: "Pas de salt i cerca",
          seekDesc: "Nombre de segons per saltar amb un sol toc dels botons -10s / +10s o Alt + Esquerra / Alt + Dreta.",
          secondsUnit: "segons"
        },
        shortcutsGuide: {
          title: "Referència de dreceres de teclat",
          desc: "Accelereu el vostre flux de treball amb tecles d'accés directe ergonòmics d'una sola mà i estàndard de YouTube.",
          gesturesTitle: "Gestos de fregar amb el ratolí i mantenir premut",
          gesturesDesc: "Mantingueu premuts els botons ◀10s o 10s▶ per fregar sense problemes les respostes de veu llargues amb acceleració dinàmica:",
          gestureHold03: "Entra en mode de neteja suau (velocitat normal 4x).",
          gestureHold15: "S'accelera fins a 10 vegades la taxa de recerca.",
          gestureHold30: "Velocitat de salt d'alta velocitat amb una velocitat de 25 ×.",
          gestureRelease: "Es bloqueja perfectament a la posició desitjada."
        },
        faq: {
          title: "Preguntes freqüents i Guia de l'usuari",
          subtitle: "Respostes ràpides per ajudar-vos a treure el màxim profit dels controls d'àudio ChatGPT.",
          q1: "Com puc ajustar el volum desplaçant-me amb el ratolí?",
          a1: "Simplement passeu el punter del ratolí per sobre de la icona de l'altaveu de volum del rail del reproductor i desplaceu la roda del ratolí cap amunt o cap avall. El volum s'ajustarà sense problemes en increments del 5% sense haver d'obrir el botó lliscant!",
          q2: "On apareix el reproductor a ChatGPT?",
          a2: "Manteniu la ubicació original, trieu una cantonada o un lateral preestablert, o acopleu-lo a sobre de l'entrada del xat. Arrossegueu per moure's, intercanvieu les barres i recordeu la vostra disposició.",
          q3: "Com puc descarregar l'àudio de veu sintetitzat?",
          a3: "Les baixades utilitzen el format d'àudio proporcionat per ChatGPT. L'extensió no converteix l'àudio. Obriu ChatGPT i comenceu a llegir en veu alta amb una resposta completa. Utilitzeu el reproductor per fer una pausa, cercar, canviar la velocitat o descarregar.",
          q4: "Funciona això en pantalles de portàtils petites?",
          a4: "Sí! El reproductor detecta automàticament l'amplada de pantalla disponible i escala dinàmicament la seva barra de cerca per adaptar-se còmodament a la pantalla del portàtil. Si l'espai és extremadament reduït, el botó flotant es manté accessible perquè pugueu ampliar i col·lapsar el reproductor sempre que ho necessiteu.",
          q5: "Com ho instal·lo mitjançant Tampermonkey amb actualitzacions automàtiques?",
          a5: "Si utilitzeu Tampermonkey, Violentmonkey o Greasemonkey, podeu instal·lar l'script autònom directament des del nostre dipòsit. Tampermonkey comprovarà automàticament a GitHub si hi ha actualitzacions i us notificarà cada vegada que es publiqui una versió nova.",
          q6: "Les meves converses o sol·licituds són privades?",
          a6: "100% Privat. L'extensió s'executa completament al vostre dispositiu local. No s'envia cap sol·licitud, respostes, fluxos d'àudio o telemetria personal a cap servidor extern."
        }
      },
      content: {
        tooltips: {
          back: "Enrere {s} segons: manteniu premut per fregar",
          playPause: "Reproduir/Pausa (espai o K; llegat Alt+P)",
          forward: "Endavant {s} segons: manteniu premut per fregar",
          speed: "Velocitat de reproducció",
          volume: "Volum (desplaça't per ajustar)",
          volumeSlider: "Control lliscant de volum",
          download: "Descarregar àudio",
          shortcuts: "Dreceres i gestos del teclat",
          collapse: "Redueix el jugador",
          expand: "Amplieu els controls d'àudio ChatGPT",
          readAloud: "Llegeix en veu alta"
        },
        shortcutsPopover: {
          title: "Llegir en veu alta Dreceres",
          playPause: "Reproduir / Pausa",
          back: "Tornar {s} sec",
          forward: "Endavant {s} sec",
          slower: "Preestablert més lent",
          faster: "Preajust més ràpid",
          volumeScroll: "Volum de desplaçament",
          smoothScrub: "Exfoliació llisa",
          volumeScrollKey: "Desplaceu-vos-hi 🔈",
          smoothScrubKey: "Manteniu premut ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "No s'ha pogut baixar el flux d'àudio. Assegureu-vos que l'àudio estigui carregat activament."
        }
      },
      shortcuts: {
        playPause: {
          action: "Reproduir / Pausa",
          description: "Commuta la reproducció, fent coincidir els reproductors web i d'escriptori habituals (Alt+P continua sent compatible)"
        },
        seekBack: {
          action: "Enrere 10 segons",
          description: "Salta cap enrere 10 segons (manteniu premut per fregar suaument)"
        },
        seekForward: {
          action: "Endavant 10 segons",
          description: "Salta cap endavant 10 segons (manteniu premut per fregar suaument)"
        },
        speedDecrease: {
          action: "Disminuir la velocitat",
          description: "Baixeu a la velocitat predeterminada anterior"
        },
        speedIncrease: {
          action: "Augmenta la velocitat",
          description: "Passeu a la següent velocitat predeterminada"
        }
      }
    },
    el: {
      common: {
        extensionName: "ChatGPT Ήχος",
        extensionSubtitle: "Έλεγχοι & ανάγνωση δυνατά",
        version: "v",
        openChatGPT: "Ανοίξτε το ChatGPT",
        dashboard: "Ταμπλό",
        seconds: "δευτερόλεπτα",
        star: "★ Αστέρι",
        docs: "Έγγραφα",
        issues: "Θέματα"
      },
      popup: {
        header: {
          switchTheme: "Εναλλαγή θέματος",
          openOptions: "Ανοίξτε το Dashboard & Settings"
        },
        tabs: {
          controls: "Έλεγχοι",
          shortcuts: "Κλειδιά",
          about: "Περίπου"
        },
        quickControls: {
          playbackSpeed: "Προεπιλεγμένη ταχύτητα αναπαραγωγής",
          defaultVolume: "Προεπιλεγμένη ένταση ήχου",
          mute: "Σίγαση",
          unmute: "Κατάργηση σίγασης",
          smartIntegrations: "Έξυπνες ενσωματώσεις",
          globalShortcuts: "Καθολικές συντομεύσεις",
          globalShortcutsDesc: "Ενεργοποίηση Space/K, Alt+P, Alt+Arrows & πλήκτρα ταχύτητας",
          smoothScrubbing: "Ομαλό τρίψιμο",
          smoothScrubbingDesc: "Επιταχύνετε την αναζήτηση κρατώντας ◀10 ή 10▶"
        },
        shortcuts: {
          title: "Συντομεύσεις πληκτρολογίου",
          gesturesTitle: "Χειρονομίες ποντικιού και αφής",
          smoothAudioScrub: "Smooth Audio Scrub",
          directDownload: "Άμεση λήψη",
          holdScrubKey: "Κρατήστε ◀10 / 10▶",
          clickDownloadKey: "Κάντε κλικ στο κουμπί 📥"
        },
        about: {
          title: "ChatGPT Χειριστήρια ήχου",
          byInfoxica: "Ανοιχτός κώδικας από Infoxica",
          description: "Παύση, επαναφορά, αλλαγή ταχύτητας αναπαραγωγής και λήψη ήχου. Μείνετε στη συζήτηση ενώ ακούτε.",
          privacyTitle: "100% με επίκεντρο το απόρρητο",
          privacyDesc: "Χωρίς ιχνηλάτες, χωρίς τηλεμετρία. Όλα τρέχουν στο μηχάνημά σας.",
          githubRepo: "Αποθετήριο GitHub",
          documentation: "Τεκμηρίωση",
          reportIssue: "Αναφορά προβλήματος"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Ήχος",
          dashboardSubtitle: "Ταμπλό & Ρύθμιση",
          preferences: "Προτιμήσεις",
          shortcuts: "Συντομεύσεις & χειρονομίες",
          faq: "Συχνές ερωτήσεις και αντιμετώπιση προβλημάτων",
          darkMode: "Σκοτεινή λειτουργία",
          lightMode: "Λειτουργία φωτός",
          githubRepo: "GitHub Repo"
        },
        headers: {
          preferencesTitle: "Προτιμήσεις ήχου και αναπαραγωγής",
          preferencesDesc: "Διαμορφώστε τη γλώσσα, τις προεπιλογές ταχύτητας αναπαραγωγής, την προεπιλεγμένη ένταση και τις δυνατότητες.",
          shortcutsTitle: "Συντομεύσεις και χειρονομίες πληκτρολογίου",
          shortcutsDesc: "Κατακτήστε τα γρήγορα πλήκτρα πρόσβασης για αβίαστο χειρισμό αναπαραγωγής.",
          faqTitle: "Συχνές ερωτήσεις και αντιμετώπιση προβλημάτων",
          faqDesc: "Λεπτομερής τεχνικός οδηγός, απαντήσεις ασφάλειας και υποστήριξης."
        },
        general: {
          languageTitle: "Γλώσσα & Εντοπισμός",
          languageDesc: "Επιλέξτε τη γλώσσα διεπαφής που προτιμάτε ή αφήστε την επέκταση να εντοπίσει αυτόματα τη γλώσσα του προγράμματος περιήγησής σας.",
          languageAuto: "Αυτόματος εντοπισμός (Γλώσσα προγράμματος περιήγησης)",
          languageDetected: "Εντοπίστηκε",
          speedTitle: "Προτιμήσεις ταχύτητας αναπαραγωγής",
          speedDesc: "Επιλέξτε τον προεπιλεγμένο ρυθμό αναπαραγωγής κατά το άνοιγμα του ChatGPT ή την εκκίνηση του Read Aloud.",
          volumeTitle: "Προεπιλεγμένο επίπεδο έντασης ήχου",
          volumeDesc: "Προκαθορισμένη ένταση ήχου για ροές ομιλίας Read Aloud.",
          seekTitle: "Παράλειψη και αναζήτηση βήμα",
          seekDesc: "Αριθμός δευτερολέπτων προς παράλειψη με ένα μόνο πάτημα των κουμπιών -10s / +10s ή Alt + Left / Alt + Right.",
          secondsUnit: "δευτερόλεπτα"
        },
        shortcutsGuide: {
          title: "Αναφορά συντομεύσεων πληκτρολογίου",
          desc: "Επιταχύνετε τη ροή εργασίας σας με τα εργονομικά πλήκτρα πρόσβασης με ένα χέρι και τα τυπικά πλήκτρα αναπαραγωγής YouTube.",
          gesturesTitle: "Χειρονομίες Scrub με ποντίκι και κράτημα",
          gesturesDesc: "Κρατήστε πατημένο είτε τα κουμπιά ◀10s είτε 10s▶ για να καθαρίσετε ομαλά τις μακροσκελείς φωνητικές απαντήσεις με δυναμική επιτάχυνση:",
          gestureHold03: "Εισέρχεται σε λειτουργία ομαλού καθαρισμού (4× κανονική ταχύτητα).",
          gestureHold15: "Επιταχύνει σε ποσοστό αναζήτησης 10×.",
          gestureHold30: "Ρυθμός άλματος υψηλής ταχύτητας με ρυθμό 25×.",
          gestureRelease: "Κλειδώνει άψογα στην επιθυμητή θέση."
        },
        faq: {
          title: "Συχνές ερωτήσεις και οδηγός χρήσης",
          subtitle: "Γρήγορες απαντήσεις που θα σας βοηθήσουν να αξιοποιήσετε στο έπακρο τα χειριστήρια ήχου ChatGPT.",
          q1: "Πώς μπορώ να ρυθμίσω την ένταση κάνοντας κύλιση με το ποντίκι μου;",
          a1: "Απλώς τοποθετήστε το δείκτη του ποντικιού σας πάνω από το εικονίδιο του ηχείου έντασης ήχου στη ράγα της συσκευής αναπαραγωγής και μετακινήστε τον τροχό του ποντικιού πάνω ή κάτω. Η ένταση θα προσαρμόζεται ομαλά σε βήματα 5% χωρίς να χρειάζεται να ανοίξετε το ρυθμιστικό popover!",
          q2: "Πού εμφανίζεται η συσκευή αναπαραγωγής στο ChatGPT;",
          a2: "Διατηρήστε την αρχική τοποθέτηση, επιλέξτε μια γωνιακή ή πλευρική προεπιλογή ή συνδέστε πάνω από την είσοδο συνομιλίας. Σύρετε για να μετακινηθείτε, αλλάξτε τις γραμμές και θυμηθείτε τη διάταξή σας.",
          q3: "Πώς μπορώ να κατεβάσω τον συνθετικό ήχο ομιλίας;",
          a3: "Οι λήψεις χρησιμοποιούν τη μορφή ήχου που παρέχεται από το ChatGPT. Η επέκταση δεν μετατρέπει ήχο. Ανοίξτε το ChatGPT και ξεκινήστε το Read Aloud σε μια ολοκληρωμένη απάντηση. Χρησιμοποιήστε τη συσκευή αναπαραγωγής για παύση, αναζήτηση, αλλαγή ταχύτητας ή λήψη.",
          q4: "Λειτουργεί σε μικρές οθόνες φορητών υπολογιστών;",
          a4: "Ναί! Η συσκευή αναπαραγωγής εντοπίζει αυτόματα το διαθέσιμο πλάτος της οθόνης σας και κλιμακώνει δυναμικά τη γραμμή αναζήτησης για να ταιριάζει άνετα στην οθόνη του φορητού υπολογιστή σας. Εάν ο χώρος είναι εξαιρετικά περιορισμένος, το αιωρούμενο κουμπί παραμένει προσβάσιμο, ώστε να μπορείτε να επεκτείνετε και να συμπτύξετε τη συσκευή αναπαραγωγής όποτε τη χρειάζεστε.",
          q5: "Πώς μπορώ να το εγκαταστήσω μέσω του Tampermonkey με αυτόματες ενημερώσεις;",
          a5: "Εάν χρησιμοποιείτε Tampermonkey, Violentmonkey ή Greasemonkey, μπορείτε να εγκαταστήσετε το αυτόνομο σενάριο απευθείας από το αποθετήριο μας. Το Tampermonkey θα ελέγχει αυτόματα το GitHub για ενημερώσεις και θα σας ειδοποιεί κάθε φορά που κυκλοφορεί μια νέα έκδοση.",
          q6: "Είναι ιδιωτικές οι συνομιλίες ή τα μηνύματά μου;",
          a6: "100% Ιδιωτικό. Η επέκταση εκτελείται εξ ολοκλήρου στην τοπική συσκευή σας. Δεν αποστέλλονται ποτέ μηνύματα προτροπής, απαντήσεις, ροές ήχου ή προσωπική τηλεμετρία σε κανέναν εξωτερικό διακομιστή."
        }
      },
      content: {
        tooltips: {
          back: "Πίσω {s} δευτερόλεπτα — κρατήστε πατημένο για τρίψιμο",
          playPause: "Αναπαραγωγή / Παύση (Διάστημα ή K, Alt+P παλαιού τύπου)",
          forward: "Προώθηση {s} δευτερόλεπτα — κρατήστε πατημένο για τρίψιμο",
          speed: "Ταχύτητα αναπαραγωγής",
          volume: "Ένταση (Κύλιση για προσαρμογή)",
          volumeSlider: "Ρυθμιστικό έντασης",
          download: "Λήψη ήχου",
          shortcuts: "Συντομεύσεις και χειρονομίες πληκτρολογίου",
          collapse: "Σύμπτυξη προγράμματος αναπαραγωγής",
          expand: "Αναπτύξτε τα στοιχεία ελέγχου ήχου ChatGPT",
          readAloud: "Διαβάστε δυνατά"
        },
        shortcutsPopover: {
          title: "Διαβάστε δυνατά τις συντομεύσεις",
          playPause: "Αναπαραγωγή / Παύση",
          back: "Πίσω {s} δευτ",
          forward: "Εμπρός {s} δευτ",
          slower: "Πιο αργή προεπιλογή",
          faster: "Ταχύτερη προεπιλογή",
          volumeScroll: "Κύλιση τόμου",
          smoothScrub: "Smooth Scrub",
          volumeScrollKey: "Κάντε κύλιση 🔈",
          smoothScrubKey: "Κρατήστε πατημένο το ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Δεν ήταν δυνατή η λήψη της ροής ήχου. Βεβαιωθείτε ότι ο ήχος έχει φορτωθεί ενεργά."
        }
      },
      shortcuts: {
        playPause: {
          action: "Αναπαραγωγή / Παύση",
          description: "Εναλλαγή αναπαραγωγής, αντιστοίχιση κοινών προγραμμάτων αναπαραγωγής ιστού και επιτραπέζιων υπολογιστών (το Alt+P εξακολουθεί να υποστηρίζεται)"
        },
        seekBack: {
          action: "Πίσω 10 δευτερόλεπτα",
          description: "Πήδα προς τα πίσω 10 δευτερόλεπτα (Κρατήστε το για ομαλό τρίψιμο)"
        },
        seekForward: {
          action: "Εμπρός 10 δευτερόλεπτα",
          description: "Άλμα προς τα εμπρός 10 δευτερόλεπτα (κρατήστε το για ομαλό τρίψιμο)"
        },
        speedDecrease: {
          action: "Μειώστε την ταχύτητα",
          description: "Κατεβείτε στην προηγούμενη προκαθορισμένη ταχύτητα"
        },
        speedIncrease: {
          action: "Αύξηση Ταχύτητας",
          description: "Ανεβάστε την επόμενη προκαθορισμένη ταχύτητα"
        }
      }
    },
    ro: {
      common: {
        extensionName: "ChatGPT Audio",
        extensionSubtitle: "Comenzi și citire cu voce tare",
        version: "v",
        openChatGPT: "Deschideți ChatGPT",
        dashboard: "Tabloul de bord",
        seconds: "secunde",
        star: "★ Steaua",
        docs: "Documentație",
        issues: "Probleme"
      },
      popup: {
        header: {
          switchTheme: "Comutați tema",
          openOptions: "Deschideți Tabloul de bord și setări"
        },
        tabs: {
          controls: "Controale",
          shortcuts: "Scurtături",
          about: "Despre"
        },
        quickControls: {
          playbackSpeed: "Viteza de redare implicită",
          defaultVolume: "Volum implicit",
          mute: "Dezactivați sunetul",
          unmute: "Activați sunetul",
          smartIntegrations: "Integrări inteligente",
          globalShortcuts: "Comenzi rapide globale",
          globalShortcutsDesc: "Activați Space/K, Alt+P, Alt+Arrows și tastele de viteză",
          smoothScrubbing: "Derulare lină",
          smoothScrubbingDesc: "Țineți apăsat ◀10 sau 10▶ pentru a derula tot mai rapid"
        },
        shortcuts: {
          title: "Comenzi rapide de la tastatură",
          gesturesTitle: "Gesturi mouse și atingere",
          smoothAudioScrub: "Derulare audio lină",
          directDownload: "Descărcare directă",
          holdScrubKey: "Țineți apăsat ◀10 / 10▶",
          clickDownloadKey: "Faceți clic pe butonul 📥"
        },
        about: {
          title: "ChatGPT Audio Controls",
          byInfoxica: "Cod sursă deschis, de Infoxica",
          description: "Întrerupeți, derulați înapoi, modificați viteza de redare și descărcați audio. Rămâneți în conversație în timp ce ascultați.",
          privacyTitle: "Concentrat 100% asupra confidențialității",
          privacyDesc: "Fără trackere, fără telemetrie. Totul rulează pe mașina dvs.",
          githubRepo: "Depozitul GitHub",
          documentation: "Documentație",
          reportIssue: "Raportați o problemă"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT Audio",
          dashboardSubtitle: "Tabloul de bord și configurare",
          preferences: "Preferințe",
          shortcuts: "Comenzi rapide și gesturi",
          faq: "Întrebări frecvente și depanare",
          darkMode: "Modul întunecat",
          lightMode: "Mod luminos",
          githubRepo: "Cod sursă pe GitHub"
        },
        headers: {
          preferencesTitle: "Preferințe audio și redare",
          preferencesDesc: "Configurați limba, presetările vitezei de redare, volumul implicit și funcțiile.",
          shortcutsTitle: "Comenzi rapide de la tastatură și gesturi",
          shortcutsDesc: "Controlați ușor redarea folosind comenzile rapide de la tastatură.",
          faqTitle: "Întrebări frecvente și depanare",
          faqDesc: "Ghid tehnic detaliat, securitate și răspunsuri de asistență."
        },
        general: {
          languageTitle: "Limbă și localizare",
          languageDesc: "Alegeți limba de interfață preferată sau lăsați extensia să detecteze automat limba browserului dvs.",
          languageAuto: "Detectare automată (limba browserului)",
          languageDetected: "Detectat",
          speedTitle: "Preferințe pentru viteza de redare",
          speedDesc: "Alegeți rata de redare implicită când deschideți ChatGPT sau lansați Citiți cu voce tare.",
          volumeTitle: "Nivelul implicit al volumului",
          volumeDesc: "Volum prestabilit pentru fluxurile de vorbire Citiți cu voce tare.",
          seekTitle: "Pasul de derulare",
          seekDesc: "Numărul de secunde derulate la apăsarea butoanelor -10s / +10s sau a tastelor Alt + Stânga / Alt + Dreapta.",
          secondsUnit: "secunde"
        },
        shortcutsGuide: {
          title: "Referință pentru comenzile rapide de la tastatură",
          desc: "Accelerează-ți fluxul de lucru cu taste rapide de redare ergonomice cu o singură mână și standard YouTube.",
          gesturesTitle: "Derulare prin apăsare lungă",
          gesturesDesc: "Țineți apăsat ◀10s sau 10s▶ pentru a derula răspunsurile audio lungi cu viteză crescătoare:",
          gestureHold03: "Începe derularea lină cu viteza de 4×.",
          gestureHold15: "Mărește viteza de derulare la 10×.",
          gestureHold30: "Mărește viteza de derulare la 25×.",
          gestureRelease: "Oprește derularea la poziția aleasă."
        },
        faq: {
          title: "Întrebări frecvente și ghid de utilizare",
          subtitle: "Răspunsuri rapide pentru a vă ajuta să profitați la maximum de controalele audio ChatGPT.",
          q1: "Cum reglez volumul derulând cu mouse-ul?",
          a1: "Pur și simplu plasați cursorul mouse-ului peste pictograma difuzorului de volum de pe șina playerului și derulați rotița mouse-ului în sus sau în jos. Volumul se va regla ușor, în trepte de 5%, fără a fi nevoie să deschideți popover-ul glisor!",
          q2: "Unde apare playerul în ChatGPT?",
          a2: "Păstrați poziția inițială, alegeți un colț sau o latură a ecranului ori andocați playerul deasupra câmpului de mesaj. Trageți pentru a muta barele sau a le schimba ordinea. Extensia reține aranjamentul.",
          q3: "Cum descarc sunetul vocal sintetizat?",
          a3: "Descărcările folosesc formatul audio oferit de ChatGPT. Extensia nu convertește audio. Deschideți ChatGPT și începeți Citiți cu voce tare la un răspuns finalizat. Utilizați playerul pentru a întrerupe, căuta, schimba viteza sau descărca.",
          q4: "Funcționează acest lucru pe ecrane mici de laptop?",
          a4: "Da! Playerul detectează automat lățimea disponibilă a ecranului și își scalează dinamic bara de căutare pentru a se potrivi confortabil cu ecranul laptopului. Dacă spațiul este extrem de îngust, butonul plutitor rămâne accesibil, astfel încât să puteți extinde și restrânge playerul oricând aveți nevoie de el.",
          q5: "Cum instalez acest lucru prin Tampermonkey cu actualizări automate?",
          a5: "Dacă utilizați Tampermonkey, Violentmonkey sau Greasemonkey, puteți instala scriptul autonom direct din depozitul nostru. Tampermonkey va verifica automat GitHub pentru actualizări și vă va anunța ori de câte ori este lansată o nouă versiune.",
          q6: "Conversațiile sau solicitările mele sunt private?",
          a6: "100% Privat. Extensia rulează în întregime pe dispozitivul dvs. local. Nicio solicitare, răspunsuri, fluxuri audio sau telemetrie personală nu sunt trimise vreodată la niciun server extern."
        }
      },
      content: {
        tooltips: {
          back: "Înapoi cu {s} secunde — țineți apăsat pentru a derula",
          playPause: "Redare / Pauză (Space sau K; Alt+P funcționează în continuare)",
          forward: "Înainte cu {s} secunde — țineți apăsat pentru a derula",
          speed: "Viteza de redare",
          volume: "Volum (Derulați pentru a regla)",
          volumeSlider: "Glisor de volum",
          download: "Descărcați audio",
          shortcuts: "Comenzi rapide și gesturi de la tastatură",
          collapse: "Restrânge playerul",
          expand: "Extindeți ChatGPT Audio Controls",
          readAloud: "Citiți cu voce tare"
        },
        shortcutsPopover: {
          title: "Comenzi rapide pentru citirea cu voce tare",
          playPause: "Redare/Pauză",
          back: "Înapoi {s} sec",
          forward: "Înainte {s} sec",
          slower: "Presetare mai lentă",
          faster: "Presetare mai rapidă",
          volumeScroll: "Derulare volum",
          smoothScrub: "Derulare lină",
          volumeScrollKey: "Derulează pe 🔈",
          smoothScrubKey: "Țineți apăsat ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Nu s-a putut descărca fluxul audio. Asigurați-vă că sunetul este încărcat activ."
        }
      },
      shortcuts: {
        playPause: {
          action: "Redare/Pauză",
          description: "Comutați redarea, potrivirea playerelor web și desktop obișnuite (Alt+P rămâne acceptat)"
        },
        seekBack: {
          action: "Înapoi 10 secunde",
          description: "Înapoi cu 10 s (țineți apăsat pentru a derula lin)"
        },
        seekForward: {
          action: "Înainte 10 secunde",
          description: "Înainte cu 10 s (țineți apăsat pentru a derula lin)"
        },
        speedDecrease: {
          action: "Scade viteza",
          description: "Coborâți la presetarea anterioară a vitezei"
        },
        speedIncrease: {
          action: "Măriți viteza",
          description: "Treceți la următoarea presetare a vitezei"
        }
      }
    },
    nb: {
      common: {
        extensionName: "ChatGPT lyd",
        extensionSubtitle: "Kontroller og høytlesning",
        version: "v",
        openChatGPT: "Åpne ChatGPT",
        dashboard: "Dashbord",
        seconds: "sekunder",
        star: "★ Stjerne",
        docs: "Dokumenter",
        issues: "Problemer"
      },
      popup: {
        header: {
          switchTheme: "Bytt tema",
          openOptions: "Åpne Dashboard og innstillinger"
        },
        tabs: {
          controls: "Kontroller",
          shortcuts: "Nøkler",
          about: "Om"
        },
        quickControls: {
          playbackSpeed: "Standard avspillingshastighet",
          defaultVolume: "Standardvolum",
          mute: "Demp",
          unmute: "Slå på lyden",
          smartIntegrations: "Smarte integrasjoner",
          globalShortcuts: "Globale snarveier",
          globalShortcutsDesc: "Aktiver Space/K, Alt+P, Alt+Arrows og hastighetstaster",
          smoothScrubbing: "Glatt skrubbing",
          smoothScrubbingDesc: "Akselerer søkingen ved å holde ◀10 eller 10▶"
        },
        shortcuts: {
          title: "Tastatursnarveier",
          gesturesTitle: "Mus- og berøringsbevegelser",
          smoothAudioScrub: "Glatt lydskrubb",
          directDownload: "Direkte nedlasting",
          holdScrubKey: "Hold inne ◀10 / 10▶",
          clickDownloadKey: "Klikk på 📥-knappen"
        },
        about: {
          title: "ChatGPT lydkontroller",
          byInfoxica: "Åpen kildekode av Infoxica",
          description: "Pause, spole tilbake, endre avspillingshastighet og last ned lyd. Hold deg i samtalen mens du lytter.",
          privacyTitle: "100 % personvernfokusert",
          privacyDesc: "Ingen sporere, ingen telemetri. Alt kjører på maskinen din.",
          githubRepo: "GitHub Repository",
          documentation: "Dokumentasjon",
          reportIssue: "Rapporter et problem"
        }
      },
      options: {
        nav: {
          dashboardTitle: "ChatGPT lyd",
          dashboardSubtitle: "Dashboard og oppsett",
          preferences: "Preferanser",
          shortcuts: "Snarveier og bevegelser",
          faq: "FAQ og feilsøking",
          darkMode: "Mørk modus",
          lightMode: "Lysmodus",
          githubRepo: "GitHub Repo"
        },
        headers: {
          preferencesTitle: "Lyd- og avspillingsinnstillinger",
          preferencesDesc: "Konfigurer språk, forhåndsinnstillinger for avspillingshastighet, standardvolum og funksjoner.",
          shortcutsTitle: "Tastatursnarveier og bevegelser",
          shortcutsDesc: "Mestre raske hurtigtaster for uanstrengt avspillingsmanipulering.",
          faqTitle: "FAQ og feilsøking",
          faqDesc: "Detaljert teknisk veiledning, sikkerhet og støttesvar."
        },
        general: {
          languageTitle: "Språk og lokalisering",
          languageDesc: "Velg ditt foretrukne grensesnittspråk eller la utvidelsen automatisk oppdage nettleserens språk.",
          languageAuto: "Automatisk gjenkjenning (nettleserspråk)",
          languageDetected: "Oppdaget",
          speedTitle: "Innstillinger for avspillingshastighet",
          speedDesc: "Velg standard avspillingshastighet når du åpner ChatGPT eller starter Les høyt.",
          volumeTitle: "Standard volumnivå",
          volumeDesc: "Forhåndsinnstilt volum for høytlesning av talestrømmer.",
          seekTitle: "Hopp over og søk trinn",
          seekDesc: "Antall sekunder å hoppe over ved ett enkelt trykk på -10s / +10s-knappene eller Alt + Venstre / Alt + Høyre.",
          secondsUnit: "sekunder"
        },
        shortcutsGuide: {
          title: "Referanse til tastatursnarveier",
          desc: "Akselerer arbeidsflyten din med ergonomiske enkelthånds- og YouTube-standard avspillingstaster.",
          gesturesTitle: "Mus og hold skrubbebevegelser",
          gesturesDesc: "Hold nede enten ◀10s eller 10s▶-knappene for jevnt å skrubbe gjennom lange stemmesvar med dynamisk akselerasjon:",
          gestureHold03: "Går inn i jevn skrubbemodus (4× normal hastighet).",
          gestureHold15: "Akselererer til 10× søkehastighet.",
          gestureHold30: "Høyhastighets hopphastighet på 25× hastighet.",
          gestureRelease: "Låser sømløst til ønsket posisjon."
        },
        faq: {
          title: "Ofte stilte spørsmål og brukerveiledning",
          subtitle: "Raske svar for å hjelpe deg å få mest mulig ut av ChatGPT lydkontroller.",
          q1: "Hvordan justerer jeg volumet ved å rulle med musen?",
          a1: "Bare hold musepekeren over volumhøyttalerikonet på spillerskinnen og rull musehjulet opp eller ned. Volumet justeres jevnt i trinn på 5 % uten å måtte åpne skyveknappen!",
          q2: "Hvor vises spilleren på ChatGPT?",
          a2: "Behold den opprinnelige plasseringen, velg en forhåndsinnstilling på hjørnet eller siden, eller forankre over chat-inngangen. Dra for å flytte, bytt stolpene og husk oppsettet ditt.",
          q3: "Hvordan laster jeg ned den syntetiserte talelyden?",
          a3: "Nedlastinger bruker lydformatet levert av ChatGPT. Utvidelsen konverterer ikke lyd. Åpne ChatGPT og start høytlesing på et fullført svar. Bruk spilleren til å sette på pause, søke, endre hastighet eller laste ned.",
          q4: "Fungerer dette på små bærbare skjermer?",
          a4: "Ja! Spilleren oppdager automatisk den tilgjengelige skjermbredden din og skalerer søkelinjen dynamisk for å passe komfortabelt med skjermen på den bærbare datamaskinen. Hvis plassen er ekstremt trang, forblir den flytende knappen tilgjengelig slik at du kan utvide og kollapse spilleren når du trenger det.",
          q5: "Hvordan installerer jeg dette via Tampermonkey med automatiske oppdateringer?",
          a5: "Hvis du bruker Tampermonkey, Violentmonkey eller Greasemonkey, kan du installere det frittstående skriptet direkte fra vårt depot. Tampermonkey vil automatisk sjekke GitHub for oppdateringer og varsle deg hver gang en ny versjon utgis.",
          q6: "Er samtalene eller forespørslene mine private?",
          a6: "100 % privat. Utvidelsen kjører utelukkende på din lokale enhet. Ingen meldinger, svar, lydstrømmer eller personlig telemetri sendes noen gang til noen ekstern server."
        }
      },
      content: {
        tooltips: {
          back: "Tilbake {s} sekunder — hold inne for å skrubbe",
          playPause: "Spill / Pause (mellomrom eller K; Alt+P eldre)",
          forward: "Fremover {s} sekunder — hold inne for å skrubbe",
          speed: "Avspillingshastighet",
          volume: "Volum (Rull for å justere)",
          volumeSlider: "Volumglidebryter",
          download: "Last ned lyd",
          shortcuts: "Tastatursnarveier og bevegelser",
          collapse: "Skjul spiller",
          expand: "Utvid ChatGPT lydkontroller",
          readAloud: "Les høyt"
        },
        shortcutsPopover: {
          title: "Les høyt Snarveier",
          playPause: "Spill / Pause",
          back: "Tilbake {s} sek",
          forward: "Frem {s} sek",
          slower: "Langsommere forhåndsinnstilling",
          faster: "Raskere forhåndsinnstilling",
          volumeScroll: "Volumrulling",
          smoothScrub: "Glatt skrubb",
          volumeScrollKey: "Scroll videre 🔈",
          smoothScrubKey: "Hold inne ◀{s} / {s}▶"
        },
        alerts: {
          downloadError: "Kunne ikke laste ned lydstrøm. Sørg for at lyden er aktivt lastet."
        }
      },
      shortcuts: {
        playPause: {
          action: "Spill / Pause",
          description: "Veksle avspilling, matching av vanlige nett- og skrivebordsspillere (Alt+P fortsatt støttes)"
        },
        seekBack: {
          action: "Tilbake 10 sekunder",
          description: "Hopp 10 sekunder bakover (Hold for jevn skrubb)"
        },
        seekForward: {
          action: "Fremover 10 sekunder",
          description: "Hopp 10 sekunder fremover (Hold for jevn skrubb)"
        },
        speedDecrease: {
          action: "Reduser hastigheten",
          description: "Gå ned til forrige forhåndsinnstilte hastighet"
        },
        speedIncrease: {
          action: "Øk hastigheten",
          description: "Gå opp til neste forhåndsinnstilte hastighet"
        }
      }
    }
  };

  // src/shared/i18n/locales/en.ts
  var en = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Controls & Read Aloud",
      version: "v",
      openChatGPT: "Open ChatGPT",
      dashboard: "Dashboard",
      seconds: "seconds",
      star: "★ Star",
      docs: "Docs",
      issues: "Issues"
    },
    popup: {
      header: {
        switchTheme: "Switch Theme",
        openOptions: "Open Dashboard & Settings"
      },
      tabs: {
        controls: "Controls",
        shortcuts: "Keys",
        about: "About"
      },
      quickControls: {
        playbackSpeed: "Default Playback Speed",
        defaultVolume: "Default Volume",
        mute: "Mute",
        unmute: "Unmute",
        smartIntegrations: "Smart Integrations",
        globalShortcuts: "Global Shortcuts",
        globalShortcutsDesc: "Enable Space/K, Alt+P, Alt+Arrows & speed keys",
        smoothScrubbing: "Smooth Scrubbing",
        smoothScrubbingDesc: "Accelerate seeking by holding ◀10 or 10▶"
      },
      shortcuts: {
        title: "Keyboard Shortcuts",
        gesturesTitle: "Mouse & Touch Gestures",
        smoothAudioScrub: "Smooth Audio Scrub",
        directDownload: "Direct Download",
        holdScrubKey: "Hold ◀10 / 10▶",
        clickDownloadKey: "Click \uD83D\uDCE5 button"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Open Source by Infoxica",
        description: "Elevating ChatGPT's voice experience with seamless audio scrubbing, dynamic speed presets, direct audio downloads, and one-click speech triggers.",
        privacyTitle: "100% Privacy Focused",
        privacyDesc: "No trackers, no telemetry. Everything runs on your machine.",
        githubRepo: "GitHub Repository",
        documentation: "Documentation",
        reportIssue: "Report an Issue"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Dashboard & Setup",
        preferences: "Preferences",
        shortcuts: "Shortcuts & Gestures",
        faq: "FAQ & Troubleshooting",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        githubRepo: "GitHub Repo"
      },
      headers: {
        preferencesTitle: "Audio & Playback Preferences",
        preferencesDesc: "Configure language, playback speed presets, default volume, and features.",
        shortcutsTitle: "Keyboard Shortcuts & Gestures",
        shortcutsDesc: "Master quick hotkeys for effortless playback manipulation.",
        faqTitle: "FAQ & Troubleshooting",
        faqDesc: "Detailed technical guide, security, and support answers."
      },
      general: {
        languageTitle: "Language & Localization",
        languageDesc: "Choose your preferred interface language or let the extension automatically detect your browser's language.",
        languageAuto: "Auto Detect (Browser Language)",
        languageDetected: "Detected",
        speedTitle: "Playback Speed Preferences",
        speedDesc: "Choose your default playback rate when opening ChatGPT or launching Read Aloud.",
        volumeTitle: "Default Volume Level",
        volumeDesc: "Preset volume for Read Aloud speech streams.",
        seekTitle: "Skip & Seek Step",
        seekDesc: "Number of seconds to skip on single tap of the -10s / +10s buttons or Alt + Left / Alt + Right.",
        secondsUnit: "seconds"
      },
      shortcutsGuide: {
        title: "Keyboard Shortcuts Reference",
        desc: "Accelerate your workflow with ergonomic single-hand and YouTube-standard playback hotkeys.",
        gesturesTitle: "Mouse & Hold Scrub Gestures",
        gesturesDesc: "Hold down either the ◀10s or 10s▶ buttons to smoothly scrub through long voice answers with dynamic acceleration:",
        gestureHold03: "Enters smooth scrubbing mode (4× normal speed).",
        gestureHold15: "Accelerates to 10× seeking rate.",
        gestureHold30: "High-speed jump rate at 25× rate.",
        gestureRelease: "Seamlessly locks to the desired position."
      },
      faq: {
        title: "Frequently Asked Questions & User Guide",
        subtitle: "Quick answers to help you get the most out of ChatGPT Audio Controls.",
        q1: "How do I adjust the volume by scrolling with my mouse?",
        a1: "Simply hover your mouse pointer over the volume speaker icon on the player rail and scroll your mouse wheel up or down. The volume will smoothly adjust in 5% increments without having to open the slider popover!",
        q2: "Where does the player appear on ChatGPT?",
        a2: "The player is anchored conveniently directly beside your message composer prompt. When no audio is playing, a small floating logo button stays neatly docked on the right side. Clicking this button or starting Read Aloud expands the full player capsules.",
        q3: "How do I download the synthesized speech audio?",
        a3: "Whenever ChatGPT reads aloud a response, click the download button (\uD83D\uDCE5) on the right rail. The audio stream is instantly saved as a high-quality audio file (.mp3, .m4a, or .wav) onto your computer.",
        q4: "Does this work on small laptop screens?",
        a4: "Yes! The player automatically detects your available screen width and dynamically scales its seekbar to fit your laptop screen comfortably. If space is extremely tight, the floating button stays accessible so you can expand and collapse the player whenever you need it.",
        q5: "How do I install this via Tampermonkey with auto-updates?",
        a5: "If you use Tampermonkey, Violentmonkey, or Greasemonkey, you can install the standalone script directly from our repository. Tampermonkey will automatically check GitHub for updates and notify you whenever a new version is released.",
        q6: "Are my conversations or prompts private?",
        a6: "100% Private. The extension runs entirely on your local device. No prompts, answers, audio streams, or personal telemetry are ever sent to any external server."
      }
    },
    content: {
      tooltips: {
        back: "Back {s} seconds — hold to scrub",
        playPause: "Play / Pause (Space or K; Alt+P legacy)",
        forward: "Forward {s} seconds — hold to scrub",
        speed: "Playback speed",
        volume: "Volume (Scroll to adjust)",
        volumeSlider: "Volume Slider",
        download: "Download audio",
        shortcuts: "Keyboard shortcuts & gestures",
        collapse: "Collapse Player",
        expand: "Expand ChatGPT Audio Controls",
        readAloud: "Read aloud"
      },
      shortcutsPopover: {
        title: "Read Aloud Shortcuts",
        playPause: "Play / Pause",
        back: "Back {s} sec",
        forward: "Forward {s} sec",
        slower: "Slower Preset",
        faster: "Faster Preset",
        volumeScroll: "Volume Scroll",
        smoothScrub: "Smooth Scrub",
        volumeScrollKey: "Scroll on \uD83D\uDD08",
        smoothScrubKey: "Hold ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Could not download audio stream. Ensure audio is actively loaded."
      }
    },
    shortcuts: {
      playPause: {
        action: "Play / Pause",
        description: "Toggle playback, matching common web and desktop players (Alt+P remains supported)"
      },
      seekBack: {
        action: "Back 10 seconds",
        description: "Jump backward 10s (Hold for smooth scrub)"
      },
      seekForward: {
        action: "Forward 10 seconds",
        description: "Jump forward 10s (Hold for smooth scrub)"
      },
      speedDecrease: {
        action: "Decrease Speed",
        description: "Step down to previous speed preset"
      },
      speedIncrease: {
        action: "Increase Speed",
        description: "Step up to next speed preset"
      }
    }
  };

  // src/shared/i18n/locales/expanded.ts
  var text = {
    bn: [
      "ChatGPT অডিও|নিয়ন্ত্রণ ও পড়ে শোনানো|v|ChatGPT খুলুন|ড্যাশবোর্ড|সেকেন্ড|★ স্টার দিন|নথি|সমস্যা",
      "থিম বদলান|ড্যাশবোর্ড ও সেটিংস খুলুন|নিয়ন্ত্রণ|কী|সম্পর্কে",
      "ডিফল্ট প্লেব্যাক গতি|ডিফল্ট শব্দমাত্রা|নিঃশব্দ|শব্দ চালু|স্মার্ট সমন্বয়|কীবোর্ড শর্টকাট|Space/K, Alt+P, Alt+তীর ও গতির কী চালু করুন|মসৃণ সিকিং|◀10 বা 10▶ ধরে রেখে দ্রুত এগোন",
      "কীবোর্ড শর্টকাট|মাউস ও স্পর্শের অঙ্গভঙ্গি|মসৃণ অডিও সিকিং|সরাসরি ডাউনলোড|◀10 / 10▶ ধরে রাখুন|\uD83D\uDCE5 বোতামে ক্লিক করুন",
      "ChatGPT অডিও নিয়ন্ত্রণ|Infoxica-র মুক্ত সোর্স|ChatGPT-এর অডিও থামান, এগিয়ে-পিছিয়ে নিন, গতি বদলান ও ডাউনলোড করুন।|গোপনীয়তাকে অগ্রাধিকার|কোনো ট্র্যাকার বা টেলিমেট্রি নেই। সবকিছু আপনার ডিভাইসে চলে।|GitHub সংগ্রহশালা|ব্যবহারের নথি|সমস্যা জানান",
      "ChatGPT অডিও|ড্যাশবোর্ড ও সেটআপ|পছন্দসমূহ|শর্টকাট ও অঙ্গভঙ্গি|প্রশ্ন ও সমস্যা সমাধান|গাঢ় মোড|হালকা মোড|GitHub সংগ্রহশালা",
      "অডিও ও প্লেব্যাক পছন্দ|ভাষা, গতি, শব্দমাত্রা ও বৈশিষ্ট্য নির্ধারণ করুন।|কীবোর্ড শর্টকাট ও অঙ্গভঙ্গি|দ্রুত কী দিয়ে সহজে প্লেব্যাক নিয়ন্ত্রণ করুন।|প্রশ্ন ও সমস্যা সমাধান|প্রযুক্তি, নিরাপত্তা ও সহায়তার উত্তর।",
      "ভাষা ও স্থানীয়করণ|ইন্টারফেসের ভাষা বেছে নিন অথবা ব্রাউজারের ভাষা স্বয়ংক্রিয়ভাবে ব্যবহার করুন।|স্বয়ংক্রিয় শনাক্তকরণ (ব্রাউজারের ভাষা)|শনাক্ত হয়েছে|প্লেব্যাক গতির পছন্দ|ChatGPT বা পড়ে শোনানো চালুর সময় ডিফল্ট গতি বেছে নিন।|ডিফল্ট শব্দমাত্রা|পড়ে শোনানোর শব্দমাত্রা নির্ধারণ করুন।|এগোনো ও পেছানোর ধাপ|বোতাম বা Alt+বাম / Alt+ডান একবার চাপলে কত সেকেন্ড সরবে।|সেকেন্ড",
      "কীবোর্ড শর্টকাট নির্দেশিকা|পরিচিত প্লেব্যাক কী দিয়ে দ্রুত নিয়ন্ত্রণ করুন।|মাউস ও ধরে রেখে সিকিং|◀10s বা 10s▶ ধরে রাখলে দীর্ঘ অডিওতে ক্রমশ দ্রুত সরতে পারবেন।|মসৃণ সিকিং শুরু হয় (4× গতি)।|সিকিং গতি 10× হয়।|সিকিং গতি 25× হয়।|ছেড়ে দিলে নির্বাচিত অবস্থানে থামে।",
      "সাধারণ প্রশ্ন ও ব্যবহার নির্দেশিকা|ChatGPT অডিও নিয়ন্ত্রণ ব্যবহারে সহায়ক উত্তর।|মাউস স্ক্রল করে শব্দমাত্রা কীভাবে বদলাব?|স্পিকার আইকনের ওপর মাউস রেখে স্ক্রল করুন। প্রতি ধাপে শব্দমাত্রা 5% বদলাবে।|ChatGPT-তে প্লেয়ার কোথায় থাকে?|প্রথমে লেখার বাক্সের কাছে থাকে। বৃত্তটি টেনে স্থান বদলান, ক্লিক করে সংকুচিত বা প্রসারিত করুন।|কথার অডিও কীভাবে ডাউনলোড করব?|পড়ে শোনানো শুরু করে ডাউনলোড বোতাম চাপুন। সম্পূর্ণ অডিও প্রস্তুত হলে মূল ফরম্যাটেই সংরক্ষণ হবে।|ছোট পর্দায় ব্যবহার করা যায়?|হ্যাঁ। ছোট পর্দায় দুটি অনুভূমিক পিল থাকে। জায়গা কমলে অবস্থান সাময়িকভাবে মানিয়ে নেয়।|Tampermonkey দিয়ে কীভাবে ইনস্টল করব?|সংগ্রহশালা থেকে স্বতন্ত্র স্ক্রিপ্ট ইনস্টল করুন। Tampermonkey GitHub-এ আপডেট খুঁজে জানাবে।|আমার কথোপকথন কি ব্যক্তিগত থাকে?|অডিও ও কথোপকথন ব্রাউজারেই থাকে। এক্সটেনশন এগুলি বাইরে পাঠায় না।",
      "{s} সেকেন্ড পেছান — ধরে রাখলে সিকিং|চালান / বিরতি (Space বা K; Alt+P)|{s} সেকেন্ড এগোন — ধরে রাখলে সিকিং|প্লেব্যাক গতি|শব্দমাত্রা (স্ক্রল করুন)|শব্দমাত্রার স্লাইডার|অডিও ডাউনলোড|কীবোর্ড শর্টকাট ও অঙ্গভঙ্গি|প্লেয়ার সংকুচিত করুন|ChatGPT অডিও নিয়ন্ত্রণ প্রসারিত করুন|পড়ে শোনান",
      "পড়ে শোনানোর শর্টকাট|চালান / বিরতি|{s} সেকেন্ড পেছান|{s} সেকেন্ড এগোন|ধীর গতি|দ্রুত গতি|শব্দমাত্রা স্ক্রল|মসৃণ সিকিং|\uD83D\uDD08-এ স্ক্রল করুন|◀{s} / {s}▶ ধরে রাখুন|অডিও ডাউনলোড করা যায়নি। অডিও লোড হয়েছে কি না দেখুন।",
      "চালান / বিরতি|প্লেব্যাক চালু বা বন্ধ করুন (Alt+P-ও চলে)।|10 সেকেন্ড পেছান|10 সেকেন্ড পেছান; ধরে রাখলে মসৃণ সিকিং।|10 সেকেন্ড এগোন|10 সেকেন্ড এগোন; ধরে রাখলে মসৃণ সিকিং।|গতি কমান|আগের ধীর গতিতে যান।|গতি বাড়ান|পরের দ্রুত গতিতে যান."
    ].join("|").split("|"),
    mr: [
      "ChatGPT ऑडिओ|नियंत्रणे व वाचून दाखवणे|v|ChatGPT उघडा|डॅशबोर्ड|सेकंद|★ स्टार द्या|दस्तऐवज|समस्या",
      "थीम बदला|डॅशबोर्ड व सेटिंग्ज उघडा|नियंत्रणे|कळा|माहिती",
      "मूलभूत प्लेबॅक वेग|मूलभूत आवाज|आवाज बंद|आवाज सुरू|स्मार्ट एकत्रीकरण|कीबोर्ड शॉर्टकट|Space/K, Alt+P, Alt+बाण व वेगाच्या कळा सुरू करा|सुलभ सीकिंग|◀10 किंवा 10▶ धरून ठेवल्यावर वेगाने सरका",
      "कीबोर्ड शॉर्टकट|माऊस व स्पर्श हावभाव|सुलभ ऑडिओ सीकिंग|थेट डाउनलोड|◀10 / 10▶ धरून ठेवा|\uD83D\uDCE5 बटण दाबा",
      "ChatGPT ऑडिओ नियंत्रणे|Infoxica कडून मुक्त स्रोत|ChatGPT ऑडिओ थांबवा, पुढे-मागे करा, वेग बदला आणि डाउनलोड करा.|गोपनीयतेला प्राधान्य|ट्रॅकर किंवा टेलिमेट्री नाही. सर्व काही तुमच्या डिव्हाइसवर चालते.|GitHub संग्रह|दस्तऐवज|समस्या कळवा",
      "ChatGPT ऑडिओ|डॅशबोर्ड व मांडणी|प्राधान्ये|शॉर्टकट व हावभाव|प्रश्न व समस्या निवारण|गडद मोड|फिकट मोड|GitHub संग्रह",
      "ऑडिओ व प्लेबॅक प्राधान्ये|भाषा, वेग, आवाज आणि वैशिष्ट्ये ठरवा.|कीबोर्ड शॉर्टकट व हावभाव|कळांनी सहज प्लेबॅक नियंत्रित करा.|प्रश्न व समस्या निवारण|तांत्रिक मार्गदर्शन, सुरक्षा व मदतीची उत्तरे.",
      "भाषा व स्थानिकीकरण|इंटरफेसची भाषा निवडा किंवा ब्राउझरची भाषा आपोआप वापरा.|स्वयंचलित शोध (ब्राउझरची भाषा)|आढळलेली भाषा|प्लेबॅक वेगाची प्राधान्ये|ChatGPT किंवा वाचून दाखवणे सुरू करताना वापरायचा वेग निवडा.|मूलभूत आवाज पातळी|वाचून दाखवण्यासाठी आवाज ठरवा.|पुढे-मागे जाण्याचे अंतर|बटण किंवा Alt+डावा / Alt+उजवा एकदा दाबल्यावर किती सेकंद सरकायचे.|सेकंद",
      "कीबोर्ड शॉर्टकट संदर्भ|परिचित कळांनी जलद नियंत्रण करा.|माऊस व धरून सीकिंग|◀10s किंवा 10s▶ धरून ठेवा; लांब ऑडिओत सरकण्याचा वेग वाढतो.|सुलभ सीकिंग सुरू होते (4× वेग).|सीकिंगचा वेग 10× होतो.|सीकिंगचा वेग 25× होतो.|सोडल्यावर निवडलेल्या जागी थांबते.",
      "नेहमीचे प्रश्न व वापर मार्गदर्शक|ChatGPT ऑडिओ नियंत्रणासाठी उपयुक्त उत्तरे.|माऊस स्क्रोलने आवाज कसा बदलायचा?|स्पीकर चिन्हावर माऊस ठेवून स्क्रोल करा. प्रत्येक टप्प्यावर आवाज 5% बदलतो.|ChatGPT मध्ये प्लेयर कुठे दिसतो?|सुरुवातीला मजकूर चौकटीजवळ दिसतो. वर्तुळ ओढून स्थान बदला; क्लिक करून लहान किंवा मोठा करा.|बोलण्याचा ऑडिओ कसा डाउनलोड करायचा?|वाचून दाखवणे सुरू करून डाउनलोड दाबा. पूर्ण ऑडिओ तयार झाल्यावर मूळ स्वरूपात जतन होतो.|लहान स्क्रीनवर चालते का?|होय. लहान स्क्रीनवर दोन आडवे पिल दिसतात. जागा कमी झाल्यावर तात्पुरती मांडणी बदलते.|Tampermonkey मधून कसे स्थापित करायचे?|संग्रहातील स्वतंत्र स्क्रिप्ट स्थापित करा. Tampermonkey GitHub वर अद्यतने तपासून कळवते.|माझी संभाषणे खाजगी राहतात का?|ऑडिओ व संभाषणे ब्राउझरमध्येच राहतात. विस्तार ती बाहेर पाठवत नाही.",
      "{s} सेकंद मागे — सीकिंगसाठी धरून ठेवा|चालवा / विराम (Space किंवा K; Alt+P)|{s} सेकंद पुढे — सीकिंगसाठी धरून ठेवा|प्लेबॅक वेग|आवाज (स्क्रोल करा)|आवाज स्लायडर|ऑडिओ डाउनलोड|कीबोर्ड शॉर्टकट व हावभाव|प्लेयर लहान करा|ChatGPT ऑडिओ नियंत्रणे मोठी करा|वाचून दाखवा",
      "वाचून दाखवण्याचे शॉर्टकट|चालवा / विराम|{s} सेकंद मागे|{s} सेकंद पुढे|कमी वेग|जास्त वेग|आवाज स्क्रोल|सुलभ सीकिंग|\uD83D\uDD08 वर स्क्रोल करा|◀{s} / {s}▶ धरून ठेवा|ऑडिओ डाउनलोड झाला नाही. ऑडिओ लोड झाला आहे का ते तपासा.",
      "चालवा / विराम|प्लेबॅक सुरू किंवा बंद करा (Alt+P देखील चालते).|10 सेकंद मागे|10 सेकंद मागे जा; सीकिंगसाठी धरून ठेवा.|10 सेकंद पुढे|10 सेकंद पुढे जा; सीकिंगसाठी धरून ठेवा.|वेग कमी करा|आधीचा कमी वेग निवडा.|वेग वाढवा|पुढचा जास्त वेग निवडा."
    ].join("|").split("|"),
    te: [
      "ChatGPT ఆడియో|నియంత్రణలు మరియు చదివి వినిపించడం|v|ChatGPT తెరవండి|డ్యాష్‌బోర్డ్|సెకన్లు|★ స్టార్ ఇవ్వండి|పత్రాలు|సమస్యలు",
      "థీమ్ మార్చండి|డ్యాష్‌బోర్డ్ మరియు సెట్టింగ్‌లు తెరవండి|నియంత్రణలు|కీలు|గురించి",
      "డిఫాల్ట్ ప్లేబ్యాక్ వేగం|డిఫాల్ట్ శబ్దస్థాయి|మ్యూట్|అన్‌మ్యూట్|స్మార్ట్ అనుసంధానాలు|కీబోర్డ్ షార్ట్‌కట్‌లు|Space/K, Alt+P, Alt+బాణాలు మరియు వేగం కీలను ప్రారంభించండి|సులభంగా సీక్ చేయడం|◀10 లేదా 10▶ పట్టుకొని వేగంగా జరపండి",
      "కీబోర్డ్ షార్ట్‌కట్‌లు|మౌస్ మరియు స్పర్శ సంజ్ఞలు|సులభ ఆడియో సీకింగ్|నేరుగా డౌన్‌లోడ్|◀10 / 10▶ పట్టుకోండి|\uD83D\uDCE5 బటన్ నొక్కండి",
      "ChatGPT ఆడియో నియంత్రణలు|Infoxica ఓపెన్ సోర్స్|ChatGPT ఆడియోను ఆపండి, ముందుకు వెనక్కు జరపండి, వేగం మార్చండి, డౌన్‌లోడ్ చేయండి.|గోప్యతకు ప్రాధాన్యం|ట్రాకర్లు లేదా టెలిమెట్రీ లేవు. అన్నీ మీ పరికరంలోనే నడుస్తాయి.|GitHub రిపోజిటరీ|డాక్యుమెంటేషన్|సమస్యను నివేదించండి",
      "ChatGPT ఆడియో|డ్యాష్‌బోర్డ్ మరియు సెటప్|ప్రాధాన్యతలు|షార్ట్‌కట్‌లు మరియు సంజ్ఞలు|ప్రశ్నలు మరియు పరిష్కారాలు|డార్క్ మోడ్|లైట్ మోడ్|GitHub రిపోజిటరీ",
      "ఆడియో మరియు ప్లేబ్యాక్ ప్రాధాన్యతలు|భాష, వేగం, శబ్దం మరియు ఫీచర్‌లను సెట్ చేయండి.|కీబోర్డ్ షార్ట్‌కట్‌లు మరియు సంజ్ఞలు|కీలతో సులభంగా ప్లేబ్యాక్ నియంత్రించండి.|ప్రశ్నలు మరియు పరిష్కారాలు|సాంకేతిక మార్గదర్శకాలు, భద్రత మరియు సహాయం.",
      "భాష మరియు స్థానికీకరణ|ఇంటర్‌ఫేస్ భాషను ఎంచుకోండి లేదా బ్రౌజర్ భాషను స్వయంచాలకంగా వాడండి.|స్వయంచాలక గుర్తింపు (బ్రౌజర్ భాష)|గుర్తించినది|ప్లేబ్యాక్ వేగ ప్రాధాన్యతలు|ChatGPT లేదా చదివి వినిపించడం ప్రారంభించినప్పుడు డిఫాల్ట్ వేగం ఎంచుకోండి.|డిఫాల్ట్ శబ్దస్థాయి|చదివి వినిపించే ఆడియో శబ్దాన్ని సెట్ చేయండి.|ముందుకు వెనక్కు జరిపే వ్యవధి|బటన్ లేదా Alt+ఎడమ / Alt+కుడి ఒకసారి నొక్కినప్పుడు జరపాల్సిన సెకన్లు.|సెకన్లు",
      "కీబోర్డ్ షార్ట్‌కట్‌ల సూచిక|పరిచయమైన కీలతో వేగంగా నియంత్రించండి.|మౌస్ మరియు పట్టుకొని సీకింగ్|◀10s లేదా 10s▶ పట్టుకోండి; పొడవైన ఆడియోలో జరిపే వేగం పెరుగుతుంది.|సులభ సీకింగ్ మొదలవుతుంది (4× వేగం).|సీకింగ్ వేగం 10× అవుతుంది.|సీకింగ్ వేగం 25× అవుతుంది.|వదిలినప్పుడు ఎంచుకున్న చోట ఆగుతుంది.",
      "సాధారణ ప్రశ్నలు మరియు వినియోగ మార్గదర్శి|ChatGPT ఆడియో నియంత్రణలకు ఉపయోగకరమైన సమాధానాలు.|మౌస్ స్క్రోల్‌తో శబ్దం ఎలా మార్చాలి?|స్పీకర్ చిహ్నంపై మౌస్ ఉంచి స్క్రోల్ చేయండి. ప్రతి దశలో శబ్దం 5% మారుతుంది.|ChatGPTలో ప్లేయర్ ఎక్కడ కనిపిస్తుంది?|మొదట సందేశ పెట్టె దగ్గర కనిపిస్తుంది. వృత్తాన్ని లాగి స్థానం మార్చండి; క్లిక్ చేసి ముడుచండి లేదా విస్తరించండి.|మాటల ఆడియోను ఎలా డౌన్‌లోడ్ చేయాలి?|చదివి వినిపించడం ప్రారంభించి డౌన్‌లోడ్ నొక్కండి. పూర్తి ఆడియో సిద్ధమైనప్పుడు అసలు ఫార్మాట్‌లో సేవ్ అవుతుంది.|చిన్న తెరల్లో పని చేస్తుందా?|అవును. చిన్న తెరల్లో రెండు అడ్డ పిల్‌లు కనిపిస్తాయి. స్థలం తగ్గినప్పుడు అమరిక తాత్కాలికంగా మారుతుంది.|Tampermonkey ద్వారా ఎలా ఇన్‌స్టాల్ చేయాలి?|రిపోజిటరీ నుంచి స్వతంత్ర స్క్రిప్ట్ ఇన్‌స్టాల్ చేయండి. Tampermonkey GitHubలో నవీకరణలు చూసి తెలియజేస్తుంది.|నా సంభాషణలు గోప్యంగా ఉంటాయా?|ఆడియో మరియు సంభాషణలు బ్రౌజర్‌లోనే ఉంటాయి. పొడిగింపు వాటిని బయటకు పంపదు.",
      "{s} సెకన్లు వెనక్కు — సీకింగ్ కోసం పట్టుకోండి|ప్లే / విరామం (Space లేదా K; Alt+P)|{s} సెకన్లు ముందుకు — సీకింగ్ కోసం పట్టుకోండి|ప్లేబ్యాక్ వేగం|శబ్దస్థాయి (స్క్రోల్ చేయండి)|శబ్దస్థాయి స్లైడర్|ఆడియో డౌన్‌లోడ్|కీబోర్డ్ షార్ట్‌కట్‌లు మరియు సంజ్ఞలు|ప్లేయర్‌ను ముడుచండి|ChatGPT ఆడియో నియంత్రణలను విస్తరించండి|చదివి వినిపించు",
      "చదివి వినిపించే షార్ట్‌కట్‌లు|ప్లే / విరామం|{s} సెకన్లు వెనక్కు|{s} సెకన్లు ముందుకు|తక్కువ వేగం|ఎక్కువ వేగం|శబ్దస్థాయి స్క్రోల్|సులభ సీకింగ్|\uD83D\uDD08పై స్క్రోల్ చేయండి|◀{s} / {s}▶ పట్టుకోండి|ఆడియో డౌన్‌లోడ్ కాలేదు. ఆడియో లోడ్ అయిందో చూడండి.",
      "ప్లే / విరామం|ప్లేబ్యాక్ ఆన్ లేదా ఆఫ్ చేయండి (Alt+P కూడా పనిచేస్తుంది).|10 సెకన్లు వెనక్కు|10 సెకన్లు వెనక్కు జరపండి; సీకింగ్ కోసం పట్టుకోండి.|10 సెకన్లు ముందుకు|10 సెకన్లు ముందుకు జరపండి; సీకింగ్ కోసం పట్టుకోండి.|వేగం తగ్గించండి|మునుపటి తక్కువ వేగం ఎంచుకోండి.|వేగం పెంచండి|తరువాతి ఎక్కువ వేగం ఎంచుకోండి."
    ].join("|").split("|"),
    ta: [
      "ChatGPT ஒலி|கட்டுப்பாடுகள் மற்றும் உரக்க வாசித்தல்|v|ChatGPT திறக்கவும்|முகப்பு|வினாடிகள்|★ நட்சத்திரமிடு|ஆவணங்கள்|சிக்கல்கள்",
      "தோற்றத்தை மாற்று|முகப்பையும் அமைப்புகளையும் திற|கட்டுப்பாடுகள்|விசைகள்|பற்றி",
      "இயல்புநிலை பின்னணி வேகம்|இயல்புநிலை ஒலியளவு|ஒலியை முடக்கு|ஒலியை இயக்கு|ஸ்மார்ட் இணைப்புகள்|விசைப்பலகைக் குறுக்குவழிகள்|Space/K, Alt+P, Alt+அம்புகள் மற்றும் வேக விசைகளை இயக்கு|சீரான நகர்த்தல்|◀10 அல்லது 10▶ அழுத்திப் பிடித்து வேகமாக நகர்த்து",
      "விசைப்பலகைக் குறுக்குவழிகள்|சுட்டி மற்றும் தொடு சைகைகள்|சீரான ஒலி நகர்த்தல்|நேரடிப் பதிவிறக்கம்|◀10 / 10▶ அழுத்திப் பிடிக்கவும்|\uD83D\uDCE5 பொத்தானை அழுத்தவும்",
      "ChatGPT ஒலிக் கட்டுப்பாடுகள்|Infoxica வழங்கும் திறந்த மூலம்|ChatGPT ஒலியை நிறுத்தவும், முன்னும் பின்னும் நகர்த்தவும், வேகத்தை மாற்றவும், பதிவிறக்கவும்.|தனியுரிமைக்கு முன்னுரிமை|கண்காணிப்பும் தொலைதரவுச் சேகரிப்பும் இல்லை. அனைத்தும் உங்கள் சாதனத்தில் இயங்கும்.|GitHub களஞ்சியம்|ஆவணங்கள்|சிக்கலைப் புகாரளி",
      "ChatGPT ஒலி|முகப்பு மற்றும் அமைவு|விருப்பங்கள்|குறுக்குவழிகள் மற்றும் சைகைகள்|கேள்விகள் மற்றும் தீர்வுகள்|இருண்ட தோற்றம்|வெளிர் தோற்றம்|GitHub களஞ்சியம்",
      "ஒலி மற்றும் பின்னணி விருப்பங்கள்|மொழி, வேகம், ஒலியளவு மற்றும் அம்சங்களை அமைக்கவும்.|விசைப்பலகைக் குறுக்குவழிகள் மற்றும் சைகைகள்|விசைகளால் எளிதாக இயக்கத்தைக் கட்டுப்படுத்தவும்.|கேள்விகள் மற்றும் தீர்வுகள்|தொழில்நுட்ப வழிகாட்டல், பாதுகாப்பு மற்றும் உதவி.",
      "மொழி மற்றும் உள்ளூர்மயமாக்கல்|இடைமுக மொழியைத் தேர்ந்தெடுக்கவும் அல்லது உலாவியின் மொழியைத் தானாகப் பயன்படுத்தவும்.|தானாகக் கண்டறி (உலாவி மொழி)|கண்டறியப்பட்டது|பின்னணி வேக விருப்பங்கள்|ChatGPT அல்லது உரக்க வாசித்தலைத் தொடங்கும்போது இயல்புநிலை வேகத்தைத் தேர்ந்தெடுக்கவும்.|இயல்புநிலை ஒலியளவு|உரக்க வாசித்தலுக்கான ஒலியளவை அமைக்கவும்.|முன்னும் பின்னும் நகரும் அளவு|பொத்தான் அல்லது Alt+இடது / Alt+வலது ஒருமுறை அழுத்தும்போது நகர வேண்டிய வினாடிகள்.|வினாடிகள்",
      "விசைப்பலகைக் குறுக்குவழி வழிகாட்டி|பழக்கமான விசைகளால் விரைவாகக் கட்டுப்படுத்தவும்.|சுட்டி மற்றும் அழுத்திப் பிடித்து நகர்த்தல்|◀10s அல்லது 10s▶ அழுத்திப் பிடித்தால் நீண்ட ஒலியில் நகரும் வேகம் அதிகரிக்கும்.|சீரான நகர்த்தல் தொடங்கும் (4× வேகம்).|நகரும் வேகம் 10× ஆகும்.|நகரும் வேகம் 25× ஆகும்.|விட்டதும் தேர்ந்தெடுத்த இடத்தில் நிற்கும்.",
      "அடிக்கடி கேட்கப்படும் கேள்விகள் மற்றும் வழிகாட்டி|ChatGPT ஒலிக் கட்டுப்பாடுகளுக்கான உதவிக் குறிப்புகள்.|சுட்டியால் உருட்டி ஒலியளவை எப்படி மாற்றுவது?|ஒலிபெருக்கி சின்னத்தின் மீது சுட்டியை வைத்து உருட்டவும். ஒவ்வொரு படியிலும் ஒலியளவு 5% மாறும்.|ChatGPTயில் பிளேயர் எங்கே தோன்றும்?|முதலில் செய்திப் பெட்டியின் அருகில் தோன்றும். வட்டத்தை இழுத்து இடம் மாற்றவும்; கிளிக் செய்து சுருக்கவும் அல்லது விரிக்கவும்.|பேச்சு ஒலியை எப்படிப் பதிவிறக்குவது?|உரக்க வாசித்தலைத் தொடங்கி பதிவிறக்கத்தை அழுத்தவும். முழு ஒலி தயாரானதும் அசல் வடிவத்தில் சேமிக்கப்படும்.|சிறிய திரைகளில் இயங்குமா?|ஆம். சிறிய திரைகளில் இரண்டு கிடைமட்டப் பட்டைகள் இருக்கும். இடம் குறைந்தால் அமைப்பு தற்காலிகமாக மாறும்.|Tampermonkey மூலம் எப்படி நிறுவுவது?|களஞ்சியத்திலிருந்து தனி ஸ்கிரிப்டை நிறுவவும். Tampermonkey GitHub புதுப்பிப்புகளைச் சரிபார்த்து அறிவிக்கும்.|எனது உரையாடல்கள் தனிப்பட்டவையா?|ஒலியும் உரையாடல்களும் உலாவியிலேயே இருக்கும். நீட்டிப்பு அவற்றை வெளியே அனுப்பாது.",
      "{s} வினாடிகள் பின்னே — நகர்த்த அழுத்திப் பிடிக்கவும்|இயக்கு / இடைநிறுத்து (Space அல்லது K; Alt+P)|{s} வினாடிகள் முன்னே — நகர்த்த அழுத்திப் பிடிக்கவும்|பின்னணி வேகம்|ஒலியளவு (உருட்டவும்)|ஒலியளவுச் சறுக்கி|ஒலியைப் பதிவிறக்கு|விசைப்பலகைக் குறுக்குவழிகள் மற்றும் சைகைகள்|பிளேயரைச் சுருக்கு|ChatGPT ஒலிக் கட்டுப்பாடுகளை விரி|உரக்க வாசி",
      "உரக்க வாசித்தல் குறுக்குவழிகள்|இயக்கு / இடைநிறுத்து|{s} வினாடிகள் பின்னே|{s} வினாடிகள் முன்னே|குறைந்த வேகம்|அதிக வேகம்|ஒலியளவு உருட்டல்|சீரான நகர்த்தல்|\uD83D\uDD08 மீது உருட்டவும்|◀{s} / {s}▶ அழுத்திப் பிடிக்கவும்|ஒலியைப் பதிவிறக்க முடியவில்லை. ஒலி ஏற்றப்பட்டுள்ளதா எனப் பார்க்கவும்.",
      "இயக்கு / இடைநிறுத்து|பின்னணியை இயக்கு அல்லது நிறுத்து (Alt+Pயும் இயங்கும்).|10 வினாடிகள் பின்னே|10 வினாடிகள் பின்னே நகர்த்து; தொடர அழுத்திப் பிடிக்கவும்.|10 வினாடிகள் முன்னே|10 வினாடிகள் முன்னே நகர்த்து; தொடர அழுத்திப் பிடிக்கவும்.|வேகத்தைக் குறை|முந்தைய குறைந்த வேகத்தைத் தேர்வு செய்.|வேகத்தை அதிகரி|அடுத்த அதிக வேகத்தைத் தேர்வு செய்."
    ].join("|").split("|"),
    ar: [
      "صوت ChatGPT|التحكم والقراءة بصوت عالٍ|v|فتح ChatGPT|لوحة التحكم|ثوانٍ|★ نجمة|الوثائق|المشكلات",
      "تغيير المظهر|فتح لوحة التحكم والإعدادات|التحكم|المفاتيح|حول",
      "سرعة التشغيل الافتراضية|مستوى الصوت الافتراضي|كتم الصوت|إلغاء الكتم|تكاملات ذكية|اختصارات لوحة المفاتيح|تفعيل Space/K وAlt+P وAlt+الأسهم ومفاتيح السرعة|تنقل سلس|اضغط مطولاً على ◀10 أو 10▶ لتسريع التنقل",
      "اختصارات لوحة المفاتيح|إيماءات الفأرة واللمس|تنقل صوتي سلس|تنزيل مباشر|اضغط مطولاً على ◀10 / 10▶|انقر زر \uD83D\uDCE5",
      "التحكم بصوت ChatGPT|مشروع مفتوح المصدر من Infoxica|أوقف صوت ChatGPT مؤقتاً وتنقل فيه وغيّر سرعته ونزّله.|الخصوصية أولاً|لا تتبع ولا قياس عن بُعد. يعمل كل شيء على جهازك.|مستودع GitHub|الوثائق|الإبلاغ عن مشكلة",
      "صوت ChatGPT|لوحة التحكم والإعداد|التفضيلات|الاختصارات والإيماءات|الأسئلة وحل المشكلات|الوضع الداكن|الوضع الفاتح|مستودع GitHub",
      "تفضيلات الصوت والتشغيل|اضبط اللغة والسرعة ومستوى الصوت والميزات.|اختصارات لوحة المفاتيح والإيماءات|تحكم بالتشغيل بسهولة باستخدام المفاتيح.|الأسئلة وحل المشكلات|إرشادات تقنية وإجابات حول الأمان والدعم.",
      "اللغة والتوطين|اختر لغة الواجهة أو استخدم لغة المتصفح تلقائياً.|اكتشاف تلقائي (لغة المتصفح)|اللغة المكتشفة|تفضيلات سرعة التشغيل|اختر السرعة الافتراضية عند فتح ChatGPT أو بدء القراءة بصوت عالٍ.|مستوى الصوت الافتراضي|اضبط مستوى صوت القراءة بصوت عالٍ.|خطوة التقديم والإرجاع|عدد الثواني عند الضغط مرة على الأزرار أو Alt+يسار / Alt+يمين.|ثوانٍ",
      "مرجع اختصارات لوحة المفاتيح|تحكم بسرعة باستخدام مفاتيح التشغيل المألوفة.|إيماءات الفأرة والضغط المطول|اضغط مطولاً على ◀10s أو 10s▶ للتنقل بسرعة متزايدة في الصوت الطويل.|يبدأ التنقل السلس بسرعة 4×.|تزداد سرعة التنقل إلى 10×.|تزداد سرعة التنقل إلى 25×.|يتوقف عند الموضع المحدد عند الإفلات.",
      "الأسئلة الشائعة ودليل المستخدم|إجابات تساعدك على استخدام أدوات صوت ChatGPT.|كيف أغيّر مستوى الصوت بعجلة الفأرة؟|ضع المؤشر فوق رمز مكبر الصوت ومرّر العجلة. يتغير الصوت بنسبة 5% في كل خطوة.|أين يظهر المشغّل في ChatGPT؟|يظهر أولاً قرب مربع الرسالة. اسحب الدائرة لتغيير موضعه، وانقر لطيّه أو توسيعه.|كيف أنزّل الصوت المقروء؟|ابدأ القراءة بصوت عالٍ ثم اضغط التنزيل. يُحفظ الصوت الكامل بصيغته الأصلية عند جاهزيته.|هل يعمل على الشاشات الصغيرة؟|نعم. يظهر شريطان أفقيان على الشاشات الصغيرة، ويتكيف الموضع مؤقتاً عند ضيق المساحة.|كيف أثبّته باستخدام Tampermonkey؟|ثبّت السكربت المستقل من المستودع. يتحقق Tampermonkey من تحديثات GitHub ويبلغك بها.|هل تبقى محادثاتي خاصة؟|يبقى الصوت والمحادثات داخل المتصفح. لا ترسلها الإضافة إلى الخارج.",
      "إرجاع {s} ثوانٍ — اضغط مطولاً للتنقل|تشغيل / إيقاف مؤقت (Space أو K؛ Alt+P)|تقديم {s} ثوانٍ — اضغط مطولاً للتنقل|سرعة التشغيل|مستوى الصوت (مرّر للتعديل)|شريط مستوى الصوت|تنزيل الصوت|اختصارات لوحة المفاتيح والإيماءات|طيّ المشغّل|توسيع أدوات صوت ChatGPT|قراءة بصوت عالٍ",
      "اختصارات القراءة بصوت عالٍ|تشغيل / إيقاف مؤقت|إرجاع {s} ثوانٍ|تقديم {s} ثوانٍ|سرعة أقل|سرعة أعلى|تمرير مستوى الصوت|تنقل سلس|مرّر فوق \uD83D\uDD08|اضغط مطولاً على ◀{s} / {s}▶|تعذر تنزيل الصوت. تأكد من تحميله.",
      "تشغيل / إيقاف مؤقت|بدّل حالة التشغيل؛ يعمل Alt+P أيضاً.|إرجاع 10 ثوانٍ|ارجع 10 ثوانٍ؛ اضغط مطولاً للتنقل السلس.|تقديم 10 ثوانٍ|تقدم 10 ثوانٍ؛ اضغط مطولاً للتنقل السلس.|خفض السرعة|انتقل إلى السرعة المحددة السابقة.|رفع السرعة|انتقل إلى السرعة المحددة التالية."
    ].join("|").split("|"),
    fa: [
      "صدای ChatGPT|کنترل‌ها و بلندخوانی|v|باز کردن ChatGPT|داشبورد|ثانیه|★ ستاره|راهنما|مشکلات",
      "تغییر پوسته|باز کردن داشبورد و تنظیمات|کنترل‌ها|کلیدها|درباره",
      "سرعت پیش‌فرض پخش|بلندی پیش‌فرض صدا|بی‌صدا|باصدا|یکپارچه‌سازی هوشمند|میان‌برهای صفحه‌کلید|فعال‌سازی Space/K، Alt+P، Alt+جهت‌ها و کلیدهای سرعت|جابه‌جایی روان|با نگه داشتن ◀10 یا 10▶ سریع‌تر جابه‌جا شوید",
      "میان‌برهای صفحه‌کلید|حرکات ماوس و لمس|جابه‌جایی روان در صدا|دانلود مستقیم|◀10 / 10▶ را نگه دارید|دکمه \uD83D\uDCE5 را بزنید",
      "کنترل‌های صدای ChatGPT|متن‌باز از Infoxica|صدای ChatGPT را مکث کنید، جابه‌جا شوید، سرعت را تغییر دهید و دانلود کنید.|حریم خصوصی در اولویت|بدون ردیابی یا تله‌متری. همه‌چیز در دستگاه شما اجرا می‌شود.|مخزن GitHub|مستندات|گزارش مشکل",
      "صدای ChatGPT|داشبورد و راه‌اندازی|ترجیحات|میان‌برها و حرکات|پرسش‌ها و رفع اشکال|حالت تیره|حالت روشن|مخزن GitHub",
      "ترجیحات صدا و پخش|زبان، سرعت، بلندی صدا و قابلیت‌ها را تنظیم کنید.|میان‌برهای صفحه‌کلید و حرکات|با کلیدها پخش را به‌آسانی کنترل کنید.|پرسش‌ها و رفع اشکال|راهنمای فنی، امنیت و پاسخ‌های پشتیبانی.",
      "زبان و بومی‌سازی|زبان رابط را انتخاب کنید یا زبان مرورگر را خودکار به کار ببرید.|تشخیص خودکار (زبان مرورگر)|شناسایی‌شده|ترجیحات سرعت پخش|سرعت پیش‌فرض هنگام باز کردن ChatGPT یا شروع بلندخوانی را انتخاب کنید.|بلندی پیش‌فرض صدا|بلندی صدای بلندخوانی را تنظیم کنید.|گام جابه‌جایی|تعداد ثانیه‌های جابه‌جایی با یک فشار دکمه یا Alt+چپ / Alt+راست.|ثانیه",
      "راهنمای میان‌برهای صفحه‌کلید|با کلیدهای آشنای پخش سریع‌تر کنترل کنید.|ماوس و نگه داشتن برای جابه‌جایی|◀10s یا 10s▶ را نگه دارید تا در صدای طولانی با شتاب جابه‌جا شوید.|جابه‌جایی روان با سرعت 4× آغاز می‌شود.|سرعت جابه‌جایی به 10× می‌رسد.|سرعت جابه‌جایی به 25× می‌رسد.|با رها کردن در جای انتخاب‌شده می‌ماند.",
      "پرسش‌های رایج و راهنمای کاربر|پاسخ‌هایی برای استفاده از کنترل‌های صدای ChatGPT.|چگونه با چرخ ماوس بلندی صدا را تغییر دهم؟|نشانگر را روی نماد بلندگو بگذارید و چرخ ماوس را بچرخانید. صدا در هر گام 5% تغییر می‌کند.|پخش‌کننده در ChatGPT کجا دیده می‌شود؟|ابتدا نزدیک کادر پیام است. دایره را برای جابه‌جایی بکشید و برای جمع یا باز کردن کلیک کنید.|چگونه صدای خوانده‌شده را دانلود کنم؟|بلندخوانی را شروع کنید و دانلود را بزنید. صدای کامل پس از آماده شدن با قالب اصلی ذخیره می‌شود.|در صفحه کوچک کار می‌کند؟|بله. دو نوار افقی در صفحه کوچک دیده می‌شود و با کم شدن فضا چیدمان موقتاً تغییر می‌کند.|چگونه با Tampermonkey نصب کنم؟|اسکریپت مستقل را از مخزن نصب کنید. Tampermonkey به‌روزرسانی‌های GitHub را بررسی و اعلام می‌کند.|آیا گفتگوهای من خصوصی می‌مانند؟|صدا و گفتگوها در مرورگر می‌مانند. افزونه آن‌ها را به بیرون نمی‌فرستد.",
      "{s} ثانیه عقب — برای جابه‌جایی نگه دارید|پخش / مکث (Space یا K؛ Alt+P)|{s} ثانیه جلو — برای جابه‌جایی نگه دارید|سرعت پخش|بلندی صدا (با چرخ ماوس)|لغزنده صدا|دانلود صدا|میان‌برهای صفحه‌کلید و حرکات|جمع کردن پخش‌کننده|باز کردن کنترل‌های صدای ChatGPT|بلندخوانی",
      "میان‌برهای بلندخوانی|پخش / مکث|{s} ثانیه عقب|{s} ثانیه جلو|سرعت کمتر|سرعت بیشتر|چرخاندن برای صدا|جابه‌جایی روان|روی \uD83D\uDD08 چرخ ماوس را بچرخانید|◀{s} / {s}▶ را نگه دارید|دانلود صدا ممکن نشد. مطمئن شوید صدا بارگیری شده است.",
      "پخش / مکث|پخش را روشن یا متوقف کنید؛ Alt+P هم کار می‌کند.|10 ثانیه عقب|10 ثانیه عقب بروید؛ برای جابه‌جایی روان نگه دارید.|10 ثانیه جلو|10 ثانیه جلو بروید؛ برای جابه‌جایی روان نگه دارید.|کاهش سرعت|به سرعت قبلی بروید.|افزایش سرعت|به سرعت بعدی بروید."
    ].join("|").split("|"),
    he: [
      "שמע ChatGPT|בקרה והקראה|v|פתיחת ChatGPT|לוח בקרה|שניות|★ כוכב|תיעוד|בעיות",
      "החלפת ערכת נושא|פתיחת לוח הבקרה וההגדרות|בקרה|מקשים|אודות",
      "מהירות נגינה כברירת מחדל|עוצמת קול כברירת מחדל|השתקה|ביטול השתקה|שילובים חכמים|קיצורי מקשים|הפעלת Space/K, Alt+P, Alt+חצים ומקשי מהירות|דילוג רציף|החזיקו ◀10 או 10▶ כדי להאיץ את הדילוג",
      "קיצורי מקשים|מחוות עכבר ומגע|דילוג רציף בשמע|הורדה ישירה|החזיקו ◀10 / 10▶|לחצו על \uD83D\uDCE5",
      "בקרת שמע ChatGPT|קוד פתוח מאת Infoxica|עצרו את שמע ChatGPT, דלגו בו, שנו מהירות והורידו אותו.|הפרטיות קודמת|ללא מעקב או טלמטריה. הכול פועל במכשיר שלכם.|מאגר GitHub|תיעוד|דיווח על בעיה",
      "שמע ChatGPT|לוח בקרה והתקנה|העדפות|קיצורים ומחוות|שאלות ופתרון בעיות|מצב כהה|מצב בהיר|מאגר GitHub",
      "העדפות שמע ונגינה|הגדירו שפה, מהירות, עוצמת קול ותכונות.|קיצורי מקשים ומחוות|שליטה קלה בנגינה באמצעות מקשים.|שאלות ופתרון בעיות|מדריך טכני, אבטחה ותשובות תמיכה.",
      "שפה והתאמה מקומית|בחרו שפת ממשק או השתמשו אוטומטית בשפת הדפדפן.|זיהוי אוטומטי (שפת הדפדפן)|זוהתה|העדפות מהירות נגינה|בחרו מהירות ברירת מחדל בפתיחת ChatGPT או בתחילת הקראה.|עוצמת קול כברירת מחדל|הגדירו את עוצמת הקול להקראה.|מרווח דילוג|מספר השניות לדילוג בלחיצה אחת על הכפתור או Alt+שמאל / Alt+ימין.|שניות",
      "מדריך קיצורי מקשים|שליטה מהירה באמצעות מקשי נגינה מוכרים.|עכבר והחזקה לדילוג|החזיקו ◀10s או 10s▶ כדי לדלג בשמע ארוך במהירות גוברת.|דילוג רציף מתחיל במהירות 4×.|מהירות הדילוג עולה ל־10×.|מהירות הדילוג עולה ל־25×.|השחרור משאיר את הנגן במיקום שנבחר.",
      "שאלות נפוצות ומדריך משתמש|תשובות שיעזרו להשתמש בבקרת שמע ChatGPT.|איך משנים עוצמה בגלילת העכבר?|הניחו את הסמן על סמל הרמקול וגללו. העוצמה משתנה ב־5% בכל צעד.|היכן הנגן מופיע ב־ChatGPT?|בהתחלה ליד תיבת ההודעה. גררו את העיגול להזזה ולחצו עליו לצמצום או להרחבה.|איך מורידים את ההקראה?|התחילו הקראה ולחצו על הורדה. השמע המלא נשמר בפורמט המקורי כשהוא מוכן.|האם זה עובד במסכים קטנים?|כן. שני סרגלים אופקיים מופיעים במסך צר, והפריסה מותאמת זמנית כשאין מקום.|איך מתקינים דרך Tampermonkey?|התקינו את הסקריפט העצמאי מהמאגר. Tampermonkey בודק עדכונים ב־GitHub ומודיע עליהם.|האם השיחות שלי נשארות פרטיות?|השמע והשיחות נשארים בדפדפן. התוסף אינו שולח אותם החוצה.",
      "אחורה {s} שניות — החזיקו לדילוג|נגינה / השהיה (Space או K; Alt+P)|קדימה {s} שניות — החזיקו לדילוג|מהירות נגינה|עוצמת קול (גללו לשינוי)|מחוון עוצמת קול|הורדת שמע|קיצורי מקשים ומחוות|צמצום הנגן|הרחבת בקרת שמע ChatGPT|הקראה",
      "קיצורי הקראה|נגינה / השהיה|אחורה {s} שניות|קדימה {s} שניות|מהירות נמוכה יותר|מהירות גבוהה יותר|גלילה לעוצמה|דילוג רציף|גללו מעל \uD83D\uDD08|החזיקו ◀{s} / {s}▶|לא ניתן להוריד שמע. ודאו שהשמע נטען.",
      "נגינה / השהיה|החלפת מצב הנגינה; גם Alt+P נתמך.|אחורה 10 שניות|דילוג של 10 שניות אחורה; החזיקו לדילוג רציף.|קדימה 10 שניות|דילוג של 10 שניות קדימה; החזיקו לדילוג רציף.|האטת מהירות|מעבר למהירות הקודמת.|הגברת מהירות|מעבר למהירות הבאה."
    ].join("|").split("|")
  };
  function translate(values) {
    let index = 0;
    function walk(object) {
      return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, typeof value === "string" ? values[index++] : walk(value)]));
    }
    const result = walk(en);
    if (index !== values.length || values.some((v) => !v.trim()))
      throw new Error(`Incomplete locale: ${values.length}/${index}`);
    return result;
  }
  var expandedLocales = Object.fromEntries(Object.entries(text).map(([code, values]) => [code, translate(values)]));

  // src/shared/i18n/locales/hi.ts
  var hi = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "नियंत्रण और पढ़कर सुनाना",
      version: "v",
      openChatGPT: "ChatGPT खोलें",
      dashboard: "डैशबोर्ड",
      seconds: "सेकंड",
      star: "★ स्टार",
      docs: "दस्तावेज़",
      issues: "समस्याएँ"
    },
    popup: {
      header: {
        switchTheme: "थीम बदलें",
        openOptions: "डैशबोर्ड और सेटिंग खोलें"
      },
      tabs: {
        controls: "नियंत्रण",
        shortcuts: "कुंजियाँ",
        about: "परिचय"
      },
      quickControls: {
        playbackSpeed: "डिफ़ॉल्ट प्लेबैक गति",
        defaultVolume: "डिफ़ॉल्ट आवाज़",
        mute: "म्यूट करें",
        unmute: "म्यूट हटाएँ",
        smartIntegrations: "उपयोगी सुविधाएँ",
        globalShortcuts: "कीबोर्ड शॉर्टकट",
        globalShortcutsDesc: "Space/K, Alt+P, Alt+तीर और गति कुंजियाँ चालू करें",
        smoothScrubbing: "आसानी से आगे-पीछे जाएँ",
        smoothScrubbingDesc: "◀10 या 10▶ दबाकर रखने पर तेज़ी से आगे-पीछे जाएँ"
      },
      shortcuts: {
        title: "कीबोर्ड शॉर्टकट",
        gesturesTitle: "माउस और टच जेस्चर",
        smoothAudioScrub: "ऑडियो में आसानी से आगे-पीछे जाएँ",
        directDownload: "सीधा डाउनलोड",
        holdScrubKey: "◀10 / 10▶ दबाकर रखें",
        clickDownloadKey: "\uD83D\uDCE5 बटन क्लिक करें"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Infoxica का ओपन-सोर्स प्रोजेक्ट",
        description: "ChatGPT के पढ़कर सुनाने में रोकें, आगे-पीछे जाएँ, गति बदलें और ऑडियो डाउनलोड करें।",
        privacyTitle: "गोपनीयता को प्राथमिकता",
        privacyDesc: "कोई ट्रैकर या टेलीमेट्री नहीं। प्रोसेसिंग आपके ब्राउज़र में होती है।",
        githubRepo: "GitHub रिपॉज़िटरी",
        documentation: "दस्तावेज़",
        reportIssue: "समस्या बताएँ"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "डैशबोर्ड और सेटअप",
        preferences: "प्राथमिकताएँ",
        shortcuts: "शॉर्टकट और जेस्चर",
        faq: "सवाल और समस्या समाधान",
        darkMode: "डार्क मोड",
        lightMode: "लाइट मोड",
        githubRepo: "GitHub रिपॉज़िटरी"
      },
      headers: {
        preferencesTitle: "ऑडियो और प्लेबैक सेटिंग",
        preferencesDesc: "भाषा, गति, आवाज़ और सुविधाएँ चुनें।",
        shortcutsTitle: "कीबोर्ड शॉर्टकट और जेस्चर",
        shortcutsDesc: "कुंजियों से प्लेबैक तुरंत नियंत्रित करें।",
        faqTitle: "सवाल और समस्या समाधान",
        faqDesc: "इस्तेमाल, गोपनीयता और सहायता की जानकारी।"
      },
      general: {
        languageTitle: "भाषा",
        languageDesc: "अपनी भाषा चुनें या ब्राउज़र की भाषा अपने आप पहचानने दें।",
        languageAuto: "अपने आप पहचानें (ब्राउज़र की भाषा)",
        languageDetected: "पहचानी गई भाषा",
        speedTitle: "प्लेबैक गति की सेटिंग",
        speedDesc: "ChatGPT या पढ़कर सुनाना शुरू करते समय की गति चुनें।",
        volumeTitle: "डिफ़ॉल्ट आवाज़ का स्तर",
        volumeDesc: "पढ़कर सुनाना शुरू होने पर लागू आवाज़।",
        seekTitle: "आगे-पीछे जाने का अंतराल",
        seekDesc: "स्किप बटन या Alt+बाएँ/दाएँ तीर से कितने सेकंड आगे-पीछे जाना है।",
        secondsUnit: "सेकंड"
      },
      shortcutsGuide: {
        title: "शॉर्टकट की सूची",
        desc: "प्लेबैक कुंजियाँ टेक्स्ट फ़ील्ड के बाहर काम करती हैं।",
        gesturesTitle: "माउस और दबाकर रखने के जेस्चर",
        gesturesDesc: "◀10s या 10s▶ दबाकर रखें। आगे-पीछे जाने की गति धीरे-धीरे बढ़ेगी।",
        gestureHold03: "4 गुना गति से आगे-पीछे जाना शुरू होता है।",
        gestureHold15: "गति 10 गुना हो जाती है।",
        gestureHold30: "गति 25 गुना हो जाती है।",
        gestureRelease: "छोड़ने पर चुनी हुई जगह पर रुकता है।"
      },
      faq: {
        title: "अक्सर पूछे जाने वाले सवाल और गाइड",
        subtitle: "ChatGPT Audio Controls इस्तेमाल करने के आसान जवाब।",
        q1: "माउस स्क्रॉल से आवाज़ कैसे बदलें?",
        a1: "आवाज़ के आइकन पर माउस रखकर स्क्रॉल करें। आवाज़ 5% के अंतर से बदलेगी।",
        q2: "ChatGPT में प्लेयर कहाँ दिखता है?",
        a2: "संदेश लिखने की जगह के पास। छोटी स्क्रीन पर नियंत्रण उसके ऊपर एक छोटे पैनल में दिखते हैं।",
        q3: "पढ़कर सुनाया गया ऑडियो कैसे सेव करें?",
        a3: "ऑडियो लोड होने पर डाउनलोड दबाएँ। ऑडियो ChatGPT के दिए फ़ॉर्मैट में सेव होता है; एक्सटेंशन फ़ॉर्मैट नहीं बदलता।",
        q4: "क्या यह छोटे लैपटॉप पर काम करता है?",
        a4: "हाँ। बगल में जगह कम होने पर नियंत्रण संदेश बॉक्स के ऊपर छोटे पैनल में दिखते हैं।",
        q5: "Tampermonkey से कैसे इंस्टॉल करें?",
        a5: "रिपॉज़िटरी से अलग यूज़रस्क्रिप्ट इंस्टॉल करें। स्क्रिप्ट मैनेजर अपडेट जाँचता है।",
        q6: "क्या मेरी बातचीत और प्रॉम्प्ट निजी रहते हैं?",
        a6: "एक्सटेंशन ब्राउज़र में चलता है। बातचीत या ऑडियो डेवलपर के सर्वर पर नहीं भेजा जाता।"
      }
    },
    content: {
      tooltips: {
        back: "{s} सेकंड पीछे — दबाकर रखें",
        playPause: "चलाएँ / रोकें (Space या K; Alt+P भी)",
        forward: "{s} सेकंड आगे — दबाकर रखें",
        speed: "प्लेबैक गति",
        volume: "आवाज़ (स्क्रॉल से बदलें)",
        volumeSlider: "आवाज़ का स्लाइडर",
        download: "ऑडियो डाउनलोड करें",
        shortcuts: "शॉर्टकट और जेस्चर",
        collapse: "प्लेयर समेटें",
        expand: "ChatGPT Audio Controls खोलें",
        readAloud: "पढ़कर सुनाएँ"
      },
      shortcutsPopover: {
        title: "पढ़कर सुनाने के शॉर्टकट",
        playPause: "चलाएँ / रोकें",
        back: "{s} सेकंड पीछे",
        forward: "{s} सेकंड आगे",
        slower: "गति घटाएँ",
        faster: "गति बढ़ाएँ",
        volumeScroll: "स्क्रॉल से आवाज़",
        smoothScrub: "आसानी से आगे-पीछे जाएँ",
        volumeScrollKey: "\uD83D\uDD08 पर स्क्रॉल करें",
        smoothScrubKey: "◀{s} / {s}▶ दबाकर रखें"
      },
      alerts: {
        downloadError: "ऑडियो डाउनलोड नहीं हुआ। पढ़कर सुनाना शुरू करें, ऑडियो लोड होने दें और फिर कोशिश करें।"
      }
    },
    shortcuts: {
      playPause: {
        action: "चलाएँ / रोकें",
        description: "प्लेबैक बदलें (Alt+P भी काम करता है)।"
      },
      seekBack: {
        action: "10 सेकंड पीछे",
        description: "10 सेकंड पीछे जाएँ।"
      },
      seekForward: {
        action: "10 सेकंड आगे",
        description: "10 सेकंड आगे जाएँ।"
      },
      speedDecrease: {
        action: "गति घटाएँ",
        description: "पिछली निर्धारित गति चुनें।"
      },
      speedIncrease: {
        action: "गति बढ़ाएँ",
        description: "अगली निर्धारित गति चुनें।"
      }
    }
  };

  // src/shared/i18n/locales/fr.ts
  var fr = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Commandes et lecture à voix haute",
      version: "v",
      openChatGPT: "Ouvrir ChatGPT",
      dashboard: "Tableau de bord",
      seconds: "secondes",
      star: "★ Favori",
      docs: "Documentation",
      issues: "Problèmes"
    },
    popup: {
      header: {
        switchTheme: "Changer de thème",
        openOptions: "Ouvrir le tableau de bord et les réglages"
      },
      tabs: {
        controls: "Commandes",
        shortcuts: "Touches",
        about: "À propos"
      },
      quickControls: {
        playbackSpeed: "Vitesse de lecture par défaut",
        defaultVolume: "Volume par défaut",
        mute: "Couper le son",
        unmute: "Rétablir le son",
        smartIntegrations: "Fonctions pratiques",
        globalShortcuts: "Raccourcis clavier",
        globalShortcutsDesc: "Activer Espace/K, Alt+P, Alt+flèches et les touches de vitesse",
        smoothScrubbing: "Navigation fluide",
        smoothScrubbingDesc: "Maintenir ◀10 ou 10▶ pour accélérer la navigation"
      },
      shortcuts: {
        title: "Raccourcis clavier",
        gesturesTitle: "Gestes souris et tactiles",
        smoothAudioScrub: "Navigation audio fluide",
        directDownload: "Téléchargement direct",
        holdScrubKey: "Maintenir ◀10 / 10▶",
        clickDownloadKey: "Cliquer sur \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Projet open source d’Infoxica",
        description: "Mettez en pause, naviguez, réglez la vitesse et téléchargez la lecture audio de ChatGPT.",
        privacyTitle: "Respect de la vie privée",
        privacyDesc: "Aucun traceur ni télémétrie. Le traitement reste dans votre navigateur.",
        githubRepo: "Dépôt GitHub",
        documentation: "Documentation",
        reportIssue: "Signaler un problème"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Tableau de bord et configuration",
        preferences: "Préférences",
        shortcuts: "Raccourcis et gestes",
        faq: "Questions et dépannage",
        darkMode: "Mode sombre",
        lightMode: "Mode clair",
        githubRepo: "Dépôt GitHub"
      },
      headers: {
        preferencesTitle: "Préférences audio et lecture",
        preferencesDesc: "Réglez la langue, la vitesse, le volume et les fonctions.",
        shortcutsTitle: "Raccourcis clavier et gestes",
        shortcutsDesc: "Contrôlez rapidement la lecture au clavier.",
        faqTitle: "Questions et dépannage",
        faqDesc: "Aide à l’utilisation, confidentialité et assistance."
      },
      general: {
        languageTitle: "Langue",
        languageDesc: "Choisissez la langue de l’interface ou utilisez celle du navigateur.",
        languageAuto: "Détection automatique (langue du navigateur)",
        languageDetected: "Langue détectée",
        speedTitle: "Préférences de vitesse",
        speedDesc: "Choisissez la vitesse appliquée au démarrage de ChatGPT ou de la lecture.",
        volumeTitle: "Volume par défaut",
        volumeDesc: "Volume initial de la lecture à voix haute.",
        seekTitle: "Intervalle de saut",
        seekDesc: "Nombre de secondes parcourues avec les boutons de saut ou Alt+flèches.",
        secondsUnit: "secondes"
      },
      shortcutsGuide: {
        title: "Guide des raccourcis",
        desc: "Les raccourcis de lecture fonctionnent hors des champs de texte.",
        gesturesTitle: "Souris et appui prolongé",
        gesturesDesc: "Maintenez ◀10s ou 10s▶ pour parcourir l’audio de plus en plus vite.",
        gestureHold03: "Démarre la navigation fluide à 4×.",
        gestureHold15: "Accélère la navigation à 10×.",
        gestureHold30: "Accélère la navigation à 25×.",
        gestureRelease: "Relâchez pour vous arrêter à la position choisie."
      },
      faq: {
        title: "Questions fréquentes et guide",
        subtitle: "Des réponses simples pour utiliser ChatGPT Audio Controls.",
        q1: "Comment régler le volume avec la molette ?",
        a1: "Placez le pointeur sur l’icône de volume et faites défiler pour modifier le volume par pas de 5 %.",
        q2: "Où apparaît le lecteur ?",
        a2: "À côté du champ de message, ou dans un panneau compact au-dessus lorsque l’écran est étroit.",
        q3: "Comment enregistrer l’audio ?",
        a3: "Une fois l’audio chargé, cliquez sur Télécharger. Le fichier conserve le format fourni par ChatGPT, sans conversion.",
        q4: "Cela fonctionne-t-il sur un petit ordinateur portable ?",
        a4: "Oui. Si l’espace latéral manque, les commandes apparaissent dans un panneau compact au-dessus du champ de message.",
        q5: "Comment installer avec Tampermonkey ?",
        a5: "Installez le script utilisateur distinct depuis le dépôt. Votre gestionnaire de scripts recherche les mises à jour.",
        q6: "Mes conversations restent-elles privées ?",
        a6: "L’extension fonctionne dans votre navigateur et n’envoie ni conversations ni audio aux serveurs du développeur."
      }
    },
    content: {
      tooltips: {
        back: "Reculer de {s} secondes — maintenir pour parcourir",
        playPause: "Lecture / Pause (Espace ou K ; Alt+P également)",
        forward: "Avancer de {s} secondes — maintenir pour parcourir",
        speed: "Vitesse de lecture",
        volume: "Volume (faire défiler pour régler)",
        volumeSlider: "Curseur de volume",
        download: "Télécharger l’audio",
        shortcuts: "Raccourcis et gestes",
        collapse: "Réduire le lecteur",
        expand: "Déployer ChatGPT Audio Controls",
        readAloud: "Lire à voix haute"
      },
      shortcutsPopover: {
        title: "Raccourcis de lecture",
        playPause: "Lecture / Pause",
        back: "Reculer de {s} s",
        forward: "Avancer de {s} s",
        slower: "Vitesse inférieure",
        faster: "Vitesse supérieure",
        volumeScroll: "Volume par défilement",
        smoothScrub: "Navigation fluide",
        volumeScrollKey: "Faire défiler sur \uD83D\uDD08",
        smoothScrubKey: "Maintenir ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Téléchargement impossible. Lancez la lecture, attendez le chargement de l’audio puis réessayez."
      }
    },
    shortcuts: {
      playPause: {
        action: "Lecture / Pause",
        description: "Basculer la lecture (Alt+P fonctionne aussi)."
      },
      seekBack: {
        action: "Reculer de 10 secondes",
        description: "Reculer de 10 secondes dans l’audio."
      },
      seekForward: {
        action: "Avancer de 10 secondes",
        description: "Avancer de 10 secondes dans l’audio."
      },
      speedDecrease: {
        action: "Réduire la vitesse",
        description: "Passer à la vitesse prédéfinie précédente."
      },
      speedIncrease: {
        action: "Augmenter la vitesse",
        description: "Passer à la vitesse prédéfinie suivante."
      }
    }
  };

  // src/shared/i18n/locales/de.ts
  var de = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Steuerung und Vorlesen",
      version: "v",
      openChatGPT: "ChatGPT öffnen",
      dashboard: "Übersicht",
      seconds: "Sekunden",
      star: "★ Stern",
      docs: "Dokumentation",
      issues: "Probleme"
    },
    popup: {
      header: {
        switchTheme: "Design wechseln",
        openOptions: "Übersicht und Einstellungen öffnen"
      },
      tabs: {
        controls: "Steuerung",
        shortcuts: "Tasten",
        about: "Über"
      },
      quickControls: {
        playbackSpeed: "Standard-Wiedergabegeschwindigkeit",
        defaultVolume: "Standardlautstärke",
        mute: "Stummschalten",
        unmute: "Ton einschalten",
        smartIntegrations: "Praktische Funktionen",
        globalShortcuts: "Tastenkürzel",
        globalShortcutsDesc: "Leertaste/K, Alt+P, Alt+Pfeile und Geschwindigkeitstasten aktivieren",
        smoothScrubbing: "Flüssiges Spulen",
        smoothScrubbingDesc: "◀10 oder 10▶ gedrückt halten, um schneller zu spulen"
      },
      shortcuts: {
        title: "Tastenkürzel",
        gesturesTitle: "Maus- und Touchgesten",
        smoothAudioScrub: "Flüssiges Audiospulen",
        directDownload: "Direkter Download",
        holdScrubKey: "◀10 / 10▶ gedrückt halten",
        clickDownloadKey: "\uD83D\uDCE5 anklicken"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Open Source von Infoxica",
        description: "ChatGPT-Vorlesen pausieren, spulen, beschleunigen und als Audiodatei herunterladen.",
        privacyTitle: "Datenschutz im Mittelpunkt",
        privacyDesc: "Keine Tracker oder Telemetrie. Die Verarbeitung bleibt im Browser.",
        githubRepo: "GitHub-Repository",
        documentation: "Dokumentation",
        reportIssue: "Problem melden"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Übersicht und Einrichtung",
        preferences: "Einstellungen",
        shortcuts: "Tastenkürzel und Gesten",
        faq: "Fragen und Fehlerbehebung",
        darkMode: "Dunkler Modus",
        lightMode: "Heller Modus",
        githubRepo: "GitHub-Repository"
      },
      headers: {
        preferencesTitle: "Audio- und Wiedergabeeinstellungen",
        preferencesDesc: "Sprache, Geschwindigkeit, Lautstärke und Funktionen einstellen.",
        shortcutsTitle: "Tastenkürzel und Gesten",
        shortcutsDesc: "Wiedergabe schnell per Tastatur steuern.",
        faqTitle: "Fragen und Fehlerbehebung",
        faqDesc: "Hinweise zu Bedienung, Datenschutz und Hilfe."
      },
      general: {
        languageTitle: "Sprache",
        languageDesc: "Oberflächensprache wählen oder automatisch die Browsersprache verwenden.",
        languageAuto: "Automatisch erkennen (Browsersprache)",
        languageDetected: "Erkannte Sprache",
        speedTitle: "Geschwindigkeitseinstellungen",
        speedDesc: "Geschwindigkeit beim Start von ChatGPT oder Vorlesen auswählen.",
        volumeTitle: "Standardlautstärke",
        volumeDesc: "Anfangslautstärke beim Vorlesen.",
        seekTitle: "Sprungweite",
        seekDesc: "Anzahl der Sekunden pro Sprungtaste oder Alt+Pfeil links/rechts.",
        secondsUnit: "Sekunden"
      },
      shortcutsGuide: {
        title: "Übersicht der Tastenkürzel",
        desc: "Wiedergabetasten funktionieren außerhalb von Textfeldern.",
        gesturesTitle: "Maus und langes Drücken",
        gesturesDesc: "◀10s oder 10s▶ gedrückt halten, um zunehmend schneller zu spulen.",
        gestureHold03: "Startet flüssiges Spulen mit 4×.",
        gestureHold15: "Beschleunigt das Spulen auf 10×.",
        gestureHold30: "Beschleunigt das Spulen auf 25×.",
        gestureRelease: "Loslassen, um an der gewählten Stelle anzuhalten."
      },
      faq: {
        title: "Häufige Fragen und Anleitung",
        subtitle: "Kurze Antworten zur Nutzung von ChatGPT Audio Controls.",
        q1: "Wie ändere ich die Lautstärke mit dem Mausrad?",
        a1: "Den Mauszeiger über das Lautstärkesymbol bewegen und scrollen. Die Lautstärke ändert sich in Schritten von 5 %.",
        q2: "Wo erscheint der Player?",
        a2: "Neben dem Nachrichtenfeld oder bei schmalen Fenstern als kompaktes Bedienfeld darüber.",
        q3: "Wie speichere ich vorgelesenes Audio?",
        a3: "Nach dem Laden auf Download klicken. Das Audio wird im von ChatGPT bereitgestellten Format gespeichert, ohne Umwandlung.",
        q4: "Funktioniert das auf kleinen Laptops?",
        a4: "Ja. Wenn seitlich Platz fehlt, erscheint ein kompaktes Bedienfeld über dem Nachrichtenfeld.",
        q5: "Wie installiere ich es mit Tampermonkey?",
        a5: "Das eigenständige Userscript aus dem Repository installieren. Der Script-Manager prüft auf Updates.",
        q6: "Bleiben meine Gespräche privat?",
        a6: "Die Erweiterung läuft im Browser und sendet keine Gespräche oder Audiodaten an Entwickler-Server."
      }
    },
    content: {
      tooltips: {
        back: "{s} Sekunden zurück — zum Spulen halten",
        playPause: "Wiedergabe / Pause (Leertaste oder K; auch Alt+P)",
        forward: "{s} Sekunden vor — zum Spulen halten",
        speed: "Wiedergabegeschwindigkeit",
        volume: "Lautstärke (zum Ändern scrollen)",
        volumeSlider: "Lautstärkeregler",
        download: "Audio herunterladen",
        shortcuts: "Tastenkürzel und Gesten",
        collapse: "Player einklappen",
        expand: "ChatGPT Audio Controls ausklappen",
        readAloud: "Vorlesen"
      },
      shortcutsPopover: {
        title: "Vorlese-Tastenkürzel",
        playPause: "Wiedergabe / Pause",
        back: "{s} Sek. zurück",
        forward: "{s} Sek. vor",
        slower: "Langsamer",
        faster: "Schneller",
        volumeScroll: "Lautstärke durch Scrollen",
        smoothScrub: "Flüssiges Spulen",
        volumeScrollKey: "Über \uD83D\uDD08 scrollen",
        smoothScrubKey: "◀{s} / {s}▶ halten"
      },
      alerts: {
        downloadError: "Audio konnte nicht heruntergeladen werden. Vorlesen starten, das Laden abwarten und erneut versuchen."
      }
    },
    shortcuts: {
      playPause: {
        action: "Wiedergabe / Pause",
        description: "Wiedergabe umschalten (auch mit Alt+P)."
      },
      seekBack: {
        action: "10 Sekunden zurück",
        description: "Im Audio 10 Sekunden zurückspringen."
      },
      seekForward: {
        action: "10 Sekunden vor",
        description: "Im Audio 10 Sekunden vorspringen."
      },
      speedDecrease: {
        action: "Geschwindigkeit senken",
        description: "Zur vorherigen Geschwindigkeitsstufe wechseln."
      },
      speedIncrease: {
        action: "Geschwindigkeit erhöhen",
        description: "Zur nächsten Geschwindigkeitsstufe wechseln."
      }
    }
  };

  // src/shared/i18n/locales/ja.ts
  var ja = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "操作と読み上げ",
      version: "v",
      openChatGPT: "ChatGPTを開く",
      dashboard: "ダッシュボード",
      seconds: "秒",
      star: "★ スター",
      docs: "ドキュメント",
      issues: "問題"
    },
    popup: {
      header: {
        switchTheme: "テーマを切り替え",
        openOptions: "ダッシュボードと設定を開く"
      },
      tabs: {
        controls: "操作",
        shortcuts: "キー",
        about: "概要"
      },
      quickControls: {
        playbackSpeed: "既定の再生速度",
        defaultVolume: "既定の音量",
        mute: "ミュート",
        unmute: "ミュート解除",
        smartIntegrations: "便利な機能",
        globalShortcuts: "キーボードショートカット",
        globalShortcutsDesc: "Space/K、Alt+P、Alt+矢印、速度キーを有効にする",
        smoothScrubbing: "スムーズなシーク",
        smoothScrubbingDesc: "◀10 または 10▶を長押しすると移動速度が上がります"
      },
      shortcuts: {
        title: "キーボードショートカット",
        gesturesTitle: "マウスとタッチ操作",
        smoothAudioScrub: "スムーズな音声シーク",
        directDownload: "直接ダウンロード",
        holdScrubKey: "◀10 / 10▶を長押し",
        clickDownloadKey: "\uD83D\uDCE5ボタンをクリック"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Infoxicaのオープンソース",
        description: "ChatGPTの読み上げを一時停止、シーク、速度調整、ダウンロードで快適に操作できます。",
        privacyTitle: "プライバシーを重視",
        privacyDesc: "追跡やテレメトリーなし。処理はブラウザー内で行われます。",
        githubRepo: "GitHubリポジトリ",
        documentation: "ドキュメント",
        reportIssue: "問題を報告"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "ダッシュボードと設定",
        preferences: "設定",
        shortcuts: "ショートカットと操作",
        faq: "よくある質問と対処法",
        darkMode: "ダークモード",
        lightMode: "ライトモード",
        githubRepo: "GitHubリポジトリ"
      },
      headers: {
        preferencesTitle: "音声と再生の設定",
        preferencesDesc: "言語、再生速度、音量、機能を設定します。",
        shortcutsTitle: "キーボードショートカットと操作",
        shortcutsDesc: "キーで再生をすばやく操作します。",
        faqTitle: "よくある質問と対処法",
        faqDesc: "使い方、プライバシー、サポートの案内です。"
      },
      general: {
        languageTitle: "言語",
        languageDesc: "表示言語を選ぶか、ブラウザーの言語を自動検出します。",
        languageAuto: "自動検出（ブラウザーの言語）",
        languageDetected: "検出された言語",
        speedTitle: "再生速度の設定",
        speedDesc: "ChatGPTや読み上げを開始するときの再生速度を選びます。",
        volumeTitle: "既定の音量",
        volumeDesc: "読み上げの開始時の音量です。",
        seekTitle: "スキップ間隔",
        seekDesc: "スキップボタンまたはAlt+左右矢印で移動する秒数です。",
        secondsUnit: "秒"
      },
      shortcutsGuide: {
        title: "ショートカット一覧",
        desc: "再生キーは入力欄の外で使えます。",
        gesturesTitle: "マウスと長押し操作",
        gesturesDesc: "◀10s または 10s▶を長押しすると、シークが段階的に加速します。",
        gestureHold03: "スムーズなシークを開始（4倍）。",
        gestureHold15: "シーク速度が10倍になります。",
        gestureHold30: "シーク速度が25倍になります。",
        gestureRelease: "離すと選んだ位置で止まります。"
      },
      faq: {
        title: "よくある質問と使い方",
        subtitle: "ChatGPT Audio Controlsの使い方を確認できます。",
        q1: "マウスホイールで音量を変えるには？",
        a1: "音量アイコンにマウスを合わせてスクロールすると、音量を5%ずつ変更できます。",
        q2: "プレーヤーはどこに表示されますか？",
        a2: "メッセージ入力欄の横に表示されます。狭い画面では入力欄の上にコンパクト表示されます。",
        q3: "読み上げ音声を保存するには？",
        a3: "音声の読み込み後にダウンロードボタンを押します。ChatGPTが提供する形式で保存され、形式変換は行いません。",
        q4: "小さいノートパソコンでも使えますか？",
        a4: "はい。横に十分な空間がないときは、入力欄の上にコンパクトな操作パネルを表示します。",
        q5: "Tampermonkeyで導入するには？",
        a5: "リポジトリから独立したユーザースクリプトを導入できます。更新はスクリプト管理ツールが確認します。",
        q6: "会話やプロンプトは非公開ですか？",
        a6: "拡張機能はブラウザー内で動作し、会話や音声を開発者のサーバーに送信しません。"
      }
    },
    content: {
      tooltips: {
        back: "{s}秒戻る — 長押しでシーク",
        playPause: "再生 / 一時停止（SpaceまたはK、Alt+Pも対応）",
        forward: "{s}秒進む — 長押しでシーク",
        speed: "再生速度",
        volume: "音量（スクロールで調整）",
        volumeSlider: "音量スライダー",
        download: "音声をダウンロード",
        shortcuts: "ショートカットと操作",
        collapse: "プレーヤーを折りたたむ",
        expand: "ChatGPT Audio Controlsを展開",
        readAloud: "読み上げ"
      },
      shortcutsPopover: {
        title: "読み上げのショートカット",
        playPause: "再生 / 一時停止",
        back: "{s}秒戻る",
        forward: "{s}秒進む",
        slower: "速度を下げる",
        faster: "速度を上げる",
        volumeScroll: "スクロールで音量調整",
        smoothScrub: "スムーズなシーク",
        volumeScrollKey: "\uD83D\uDD08の上でスクロール",
        smoothScrubKey: "◀{s} / {s}▶を長押し"
      },
      alerts: {
        downloadError: "音声をダウンロードできませんでした。読み上げを開始し、音声の読み込み後に再試行してください。"
      }
    },
    shortcuts: {
      playPause: {
        action: "再生 / 一時停止",
        description: "再生を切り替えます（Alt+Pも対応）。"
      },
      seekBack: {
        action: "10秒戻る",
        description: "10秒前へ移動します。"
      },
      seekForward: {
        action: "10秒進む",
        description: "10秒先へ移動します。"
      },
      speedDecrease: {
        action: "速度を下げる",
        description: "前の速度プリセットに切り替えます。"
      },
      speedIncrease: {
        action: "速度を上げる",
        description: "次の速度プリセットに切り替えます。"
      }
    }
  };

  // src/shared/i18n/locales/ko.ts
  var ko = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "오디오 제어 및 읽어주기",
      version: "v",
      openChatGPT: "ChatGPT 열기",
      dashboard: "대시보드",
      seconds: "초",
      star: "★ 별표",
      docs: "문서",
      issues: "문제"
    },
    popup: {
      header: {
        switchTheme: "테마 전환",
        openOptions: "대시보드 및 설정 열기"
      },
      tabs: {
        controls: "제어",
        shortcuts: "키",
        about: "정보"
      },
      quickControls: {
        playbackSpeed: "기본 재생 속도",
        defaultVolume: "기본 음량",
        mute: "음소거",
        unmute: "음소거 해제",
        smartIntegrations: "편리한 기능",
        globalShortcuts: "키보드 단축키",
        globalShortcutsDesc: "Space/K, Alt+P, Alt+화살표 및 속도 키 사용",
        smoothScrubbing: "부드러운 탐색",
        smoothScrubbingDesc: "◀10 또는 10▶를 길게 누르면 탐색 속도가 빨라집니다"
      },
      shortcuts: {
        title: "키보드 단축키",
        gesturesTitle: "마우스 및 터치 동작",
        smoothAudioScrub: "부드러운 오디오 탐색",
        directDownload: "바로 다운로드",
        holdScrubKey: "◀10 / 10▶ 길게 누르기",
        clickDownloadKey: "\uD83D\uDCE5 버튼 클릭"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Infoxica의 오픈 소스",
        description: "ChatGPT 읽어주기를 일시 정지하고, 탐색하고, 속도를 조절하고, 다운로드하세요.",
        privacyTitle: "개인정보 보호 중심",
        privacyDesc: "추적 및 원격 측정 없이 브라우저에서 처리합니다.",
        githubRepo: "GitHub 저장소",
        documentation: "문서",
        reportIssue: "문제 신고"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "대시보드 및 설정",
        preferences: "환경설정",
        shortcuts: "단축키 및 동작",
        faq: "자주 묻는 질문 및 문제 해결",
        darkMode: "어두운 모드",
        lightMode: "밝은 모드",
        githubRepo: "GitHub 저장소"
      },
      headers: {
        preferencesTitle: "오디오 및 재생 설정",
        preferencesDesc: "언어, 재생 속도, 음량과 기능을 설정합니다.",
        shortcutsTitle: "키보드 단축키 및 동작",
        shortcutsDesc: "단축키로 재생을 빠르게 제어하세요.",
        faqTitle: "자주 묻는 질문 및 문제 해결",
        faqDesc: "사용법, 개인정보 보호 및 지원 안내입니다."
      },
      general: {
        languageTitle: "언어",
        languageDesc: "표시 언어를 선택하거나 브라우저 언어를 자동으로 감지합니다.",
        languageAuto: "자동 감지 (브라우저 언어)",
        languageDetected: "감지된 언어",
        speedTitle: "재생 속도 설정",
        speedDesc: "ChatGPT 또는 읽어주기를 시작할 때 사용할 속도를 선택합니다.",
        volumeTitle: "기본 음량",
        volumeDesc: "읽어주기 시작 시 적용할 음량입니다.",
        seekTitle: "건너뛰기 간격",
        seekDesc: "건너뛰기 버튼 또는 Alt+좌우 화살표로 이동할 초 단위 간격입니다.",
        secondsUnit: "초"
      },
      shortcutsGuide: {
        title: "단축키 안내",
        desc: "재생 단축키는 입력란 밖에서 작동합니다.",
        gesturesTitle: "마우스 및 길게 누르기",
        gesturesDesc: "◀10s 또는 10s▶를 길게 누르면 탐색 속도가 점차 빨라집니다.",
        gestureHold03: "부드러운 탐색 시작 (4배).",
        gestureHold15: "탐색 속도가 10배가 됩니다.",
        gestureHold30: "탐색 속도가 25배가 됩니다.",
        gestureRelease: "놓으면 선택한 위치에서 멈춥니다."
      },
      faq: {
        title: "자주 묻는 질문 및 사용 안내",
        subtitle: "ChatGPT Audio Controls를 사용하는 방법입니다.",
        q1: "마우스 휠로 음량을 조절하려면?",
        a1: "음량 아이콘 위에서 스크롤하면 음량이 5%씩 바뀝니다.",
        q2: "플레이어는 어디에 표시되나요?",
        a2: "메시지 입력란 옆에 표시됩니다. 화면이 좁으면 입력란 위에 작은 패널로 표시됩니다.",
        q3: "읽어주기 오디오를 저장하려면?",
        a3: "오디오가 로드된 뒤 다운로드를 누르세요. ChatGPT가 제공하는 형식으로 저장하며 형식을 변환하지 않습니다.",
        q4: "작은 노트북에서도 사용할 수 있나요?",
        a4: "네. 옆 공간이 부족하면 입력란 위에 작은 제어 패널이 표시됩니다.",
        q5: "Tampermonkey로 설치하려면?",
        a5: "저장소에서 독립형 사용자 스크립트를 설치하세요. 스크립트 관리자가 업데이트를 확인합니다.",
        q6: "대화와 프롬프트는 비공개인가요?",
        a6: "확장 프로그램은 브라우저에서 실행되며 대화나 오디오를 개발자 서버에 보내지 않습니다."
      }
    },
    content: {
      tooltips: {
        back: "{s}초 뒤로 — 길게 눌러 탐색",
        playPause: "재생 / 일시 정지 (Space 또는 K, Alt+P도 지원)",
        forward: "{s}초 앞으로 — 길게 눌러 탐색",
        speed: "재생 속도",
        volume: "음량 (스크롤로 조절)",
        volumeSlider: "음량 슬라이더",
        download: "오디오 다운로드",
        shortcuts: "단축키 및 동작",
        collapse: "플레이어 접기",
        expand: "ChatGPT Audio Controls 펼치기",
        readAloud: "읽어주기"
      },
      shortcutsPopover: {
        title: "읽어주기 단축키",
        playPause: "재생 / 일시 정지",
        back: "{s}초 뒤로",
        forward: "{s}초 앞으로",
        slower: "속도 줄이기",
        faster: "속도 높이기",
        volumeScroll: "스크롤로 음량 조절",
        smoothScrub: "부드러운 탐색",
        volumeScrollKey: "\uD83D\uDD08 위에서 스크롤",
        smoothScrubKey: "◀{s} / {s}▶ 길게 누르기"
      },
      alerts: {
        downloadError: "오디오를 다운로드하지 못했습니다. 읽어주기를 시작하고 오디오가 로드된 후 다시 시도하세요."
      }
    },
    shortcuts: {
      playPause: {
        action: "재생 / 일시 정지",
        description: "재생 상태를 전환합니다 (Alt+P도 지원)."
      },
      seekBack: {
        action: "10초 뒤로",
        description: "10초 뒤로 이동합니다."
      },
      seekForward: {
        action: "10초 앞으로",
        description: "10초 앞으로 이동합니다."
      },
      speedDecrease: {
        action: "속도 줄이기",
        description: "이전 속도 설정으로 바꿉니다."
      },
      speedIncrease: {
        action: "속도 높이기",
        description: "다음 속도 설정으로 바꿉니다."
      }
    }
  };

  // src/shared/i18n/locales/id.ts
  var id = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Kontrol dan baca nyaring",
      version: "v",
      openChatGPT: "Buka ChatGPT",
      dashboard: "Dasbor",
      seconds: "detik",
      star: "★ Bintang",
      docs: "Dokumentasi",
      issues: "Masalah"
    },
    popup: {
      header: {
        switchTheme: "Ganti tema",
        openOptions: "Buka dasbor dan pengaturan"
      },
      tabs: {
        controls: "Kontrol",
        shortcuts: "Tombol",
        about: "Tentang"
      },
      quickControls: {
        playbackSpeed: "Kecepatan pemutaran bawaan",
        defaultVolume: "Volume bawaan",
        mute: "Bisukan",
        unmute: "Aktifkan suara",
        smartIntegrations: "Fitur praktis",
        globalShortcuts: "Pintasan keyboard",
        globalShortcutsDesc: "Aktifkan Spasi/K, Alt+P, Alt+panah, dan tombol kecepatan",
        smoothScrubbing: "Pencarian posisi mulus",
        smoothScrubbingDesc: "Tahan ◀10 atau 10▶ untuk mempercepat perpindahan"
      },
      shortcuts: {
        title: "Pintasan keyboard",
        gesturesTitle: "Gestur mouse dan sentuh",
        smoothAudioScrub: "Pencarian posisi audio mulus",
        directDownload: "Unduh langsung",
        holdScrubKey: "Tahan ◀10 / 10▶",
        clickDownloadKey: "Klik tombol \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Sumber terbuka oleh Infoxica",
        description: "Jeda, cari posisi, atur kecepatan, dan unduh audio baca nyaring ChatGPT.",
        privacyTitle: "Mengutamakan privasi",
        privacyDesc: "Tanpa pelacak atau telemetri. Pemrosesan dilakukan di browser.",
        githubRepo: "Repositori GitHub",
        documentation: "Dokumentasi",
        reportIssue: "Laporkan masalah"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Dasbor dan penyiapan",
        preferences: "Preferensi",
        shortcuts: "Pintasan dan gestur",
        faq: "Pertanyaan dan pemecahan masalah",
        darkMode: "Mode gelap",
        lightMode: "Mode terang",
        githubRepo: "Repositori GitHub"
      },
      headers: {
        preferencesTitle: "Preferensi audio dan pemutaran",
        preferencesDesc: "Atur bahasa, kecepatan, volume, dan fitur.",
        shortcutsTitle: "Pintasan keyboard dan gestur",
        shortcutsDesc: "Kendalikan pemutaran dengan cepat menggunakan keyboard.",
        faqTitle: "Pertanyaan dan pemecahan masalah",
        faqDesc: "Panduan penggunaan, privasi, dan bantuan."
      },
      general: {
        languageTitle: "Bahasa",
        languageDesc: "Pilih bahasa antarmuka atau deteksi bahasa browser secara otomatis.",
        languageAuto: "Deteksi otomatis (bahasa browser)",
        languageDetected: "Bahasa terdeteksi",
        speedTitle: "Preferensi kecepatan",
        speedDesc: "Pilih kecepatan awal saat membuka ChatGPT atau memulai baca nyaring.",
        volumeTitle: "Volume bawaan",
        volumeDesc: "Volume awal baca nyaring.",
        seekTitle: "Interval lompatan",
        seekDesc: "Jumlah detik untuk tombol lompat atau Alt+panah kiri/kanan.",
        secondsUnit: "detik"
      },
      shortcutsGuide: {
        title: "Panduan pintasan",
        desc: "Tombol pemutaran berfungsi di luar kolom teks.",
        gesturesTitle: "Mouse dan tekan lama",
        gesturesDesc: "Tahan ◀10s atau 10s▶ untuk menelusuri audio dengan semakin cepat.",
        gestureHold03: "Mulai pencarian posisi mulus pada 4×.",
        gestureHold15: "Percepat pencarian posisi ke 10×.",
        gestureHold30: "Percepat pencarian posisi ke 25×.",
        gestureRelease: "Lepaskan untuk berhenti di posisi pilihan."
      },
      faq: {
        title: "Pertanyaan umum dan panduan",
        subtitle: "Jawaban singkat untuk menggunakan ChatGPT Audio Controls.",
        q1: "Bagaimana mengatur volume dengan roda mouse?",
        a1: "Arahkan penunjuk ke ikon volume dan gulir untuk mengubah volume sebesar 5% setiap langkah.",
        q2: "Di mana pemutar muncul?",
        a2: "Di samping kotak pesan, atau dalam panel ringkas di atasnya jika layar sempit.",
        q3: "Bagaimana menyimpan audio baca nyaring?",
        a3: "Setelah audio dimuat, klik Unduh. Audio disimpan dalam format dari ChatGPT tanpa konversi.",
        q4: "Apakah bisa dipakai di laptop kecil?",
        a4: "Ya. Saat ruang samping tidak cukup, kontrol tampil dalam panel ringkas di atas kotak pesan.",
        q5: "Bagaimana memasang lewat Tampermonkey?",
        a5: "Pasang userscript terpisah dari repositori. Pengelola skrip akan memeriksa pembaruan.",
        q6: "Apakah percakapan saya tetap pribadi?",
        a6: "Ekstensi berjalan di browser dan tidak mengirim percakapan atau audio ke server pengembang."
      }
    },
    content: {
      tooltips: {
        back: "Mundur {s} detik — tahan untuk mencari posisi",
        playPause: "Putar / Jeda (Spasi atau K; Alt+P juga didukung)",
        forward: "Maju {s} detik — tahan untuk mencari posisi",
        speed: "Kecepatan pemutaran",
        volume: "Volume (gulir untuk mengatur)",
        volumeSlider: "Penggeser volume",
        download: "Unduh audio",
        shortcuts: "Pintasan dan gestur",
        collapse: "Ciutkan pemutar",
        expand: "Perluas ChatGPT Audio Controls",
        readAloud: "Baca nyaring"
      },
      shortcutsPopover: {
        title: "Pintasan baca nyaring",
        playPause: "Putar / Jeda",
        back: "Mundur {s} dtk",
        forward: "Maju {s} dtk",
        slower: "Lebih lambat",
        faster: "Lebih cepat",
        volumeScroll: "Volume dengan guliran",
        smoothScrub: "Pencarian posisi mulus",
        volumeScrollKey: "Gulir pada \uD83D\uDD08",
        smoothScrubKey: "Tahan ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Audio tidak dapat diunduh. Mulai baca nyaring, tunggu audio dimuat, lalu coba lagi."
      }
    },
    shortcuts: {
      playPause: {
        action: "Putar / Jeda",
        description: "Alihkan pemutaran (Alt+P juga didukung)."
      },
      seekBack: {
        action: "Mundur 10 detik",
        description: "Mundur 10 detik dalam audio."
      },
      seekForward: {
        action: "Maju 10 detik",
        description: "Maju 10 detik dalam audio."
      },
      speedDecrease: {
        action: "Kurangi kecepatan",
        description: "Beralih ke prasetel kecepatan sebelumnya."
      },
      speedIncrease: {
        action: "Tambah kecepatan",
        description: "Beralih ke prasetel kecepatan berikutnya."
      }
    }
  };

  // src/shared/i18n/locales/it.ts
  var it = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Controlli e lettura ad alta voce",
      version: "v",
      openChatGPT: "Apri ChatGPT",
      dashboard: "Pannello",
      seconds: "secondi",
      star: "★ Stella",
      docs: "Documentazione",
      issues: "Problemi"
    },
    popup: {
      header: {
        switchTheme: "Cambia tema",
        openOptions: "Apri pannello e impostazioni"
      },
      tabs: {
        controls: "Controlli",
        shortcuts: "Tasti",
        about: "Informazioni"
      },
      quickControls: {
        playbackSpeed: "Velocità di riproduzione predefinita",
        defaultVolume: "Volume predefinito",
        mute: "Disattiva audio",
        unmute: "Attiva audio",
        smartIntegrations: "Funzioni utili",
        globalShortcuts: "Scorciatoie da tastiera",
        globalShortcutsDesc: "Attiva Spazio/K, Alt+P, Alt+frecce e i tasti della velocità",
        smoothScrubbing: "Scorrimento fluido",
        smoothScrubbingDesc: "Tieni premuto ◀10 o 10▶ per spostarti più velocemente"
      },
      shortcuts: {
        title: "Scorciatoie da tastiera",
        gesturesTitle: "Gesti del mouse e touch",
        smoothAudioScrub: "Scorrimento audio fluido",
        directDownload: "Download diretto",
        holdScrubKey: "Tieni premuto ◀10 / 10▶",
        clickDownloadKey: "Fai clic su \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Open source di Infoxica",
        description: "Metti in pausa, scorri, regola la velocità e scarica l’audio letto da ChatGPT.",
        privacyTitle: "Rispetto della privacy",
        privacyDesc: "Nessun tracciamento o telemetria. L’elaborazione avviene nel browser.",
        githubRepo: "Repository GitHub",
        documentation: "Documentazione",
        reportIssue: "Segnala un problema"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Pannello e configurazione",
        preferences: "Preferenze",
        shortcuts: "Scorciatoie e gesti",
        faq: "Domande e risoluzione dei problemi",
        darkMode: "Modalità scura",
        lightMode: "Modalità chiara",
        githubRepo: "Repository GitHub"
      },
      headers: {
        preferencesTitle: "Preferenze audio e riproduzione",
        preferencesDesc: "Configura lingua, velocità, volume e funzioni.",
        shortcutsTitle: "Scorciatoie da tastiera e gesti",
        shortcutsDesc: "Controlla rapidamente la riproduzione con la tastiera.",
        faqTitle: "Domande e risoluzione dei problemi",
        faqDesc: "Indicazioni su utilizzo, privacy e assistenza."
      },
      general: {
        languageTitle: "Lingua",
        languageDesc: "Scegli la lingua dell’interfaccia o rileva automaticamente quella del browser.",
        languageAuto: "Rilevamento automatico (lingua del browser)",
        languageDetected: "Lingua rilevata",
        speedTitle: "Preferenze della velocità",
        speedDesc: "Scegli la velocità iniziale per ChatGPT o la lettura ad alta voce.",
        volumeTitle: "Volume predefinito",
        volumeDesc: "Volume iniziale della lettura ad alta voce.",
        seekTitle: "Intervallo di salto",
        seekDesc: "Secondi da saltare con i pulsanti o Alt+freccia sinistra/destra.",
        secondsUnit: "secondi"
      },
      shortcutsGuide: {
        title: "Guida alle scorciatoie",
        desc: "I tasti di riproduzione funzionano fuori dai campi di testo.",
        gesturesTitle: "Mouse e pressione prolungata",
        gesturesDesc: "Tieni premuto ◀10s o 10s▶ per scorrere l’audio a velocità crescente.",
        gestureHold03: "Avvia lo scorrimento fluido a 4×.",
        gestureHold15: "Accelera lo scorrimento a 10×.",
        gestureHold30: "Accelera lo scorrimento a 25×.",
        gestureRelease: "Rilascia per fermarti nella posizione scelta."
      },
      faq: {
        title: "Domande frequenti e guida",
        subtitle: "Risposte rapide per usare ChatGPT Audio Controls.",
        q1: "Come regolo il volume con la rotellina?",
        a1: "Posiziona il puntatore sull’icona del volume e scorri per modificarlo a intervalli del 5%.",
        q2: "Dove appare il lettore?",
        a2: "Accanto al campo del messaggio oppure, sugli schermi stretti, in un pannello compatto sopra di esso.",
        q3: "Come salvo l’audio della lettura?",
        a3: "Dopo il caricamento dell’audio, premi Download. Il file mantiene il formato fornito da ChatGPT, senza conversioni.",
        q4: "Funziona sui portatili piccoli?",
        a4: "Sì. Se manca spazio laterale, i controlli appaiono in un pannello compatto sopra il campo del messaggio.",
        q5: "Come lo installo con Tampermonkey?",
        a5: "Installa lo userscript separato dal repository. Il gestore degli script controllerà gli aggiornamenti.",
        q6: "Le mie conversazioni restano private?",
        a6: "L’estensione funziona nel browser e non invia conversazioni o audio ai server dello sviluppatore."
      }
    },
    content: {
      tooltips: {
        back: "Indietro di {s} secondi — tieni premuto per scorrere",
        playPause: "Riproduci / Pausa (Spazio o K; anche Alt+P)",
        forward: "Avanti di {s} secondi — tieni premuto per scorrere",
        speed: "Velocità di riproduzione",
        volume: "Volume (scorri per regolare)",
        volumeSlider: "Cursore del volume",
        download: "Scarica audio",
        shortcuts: "Scorciatoie e gesti",
        collapse: "Riduci lettore",
        expand: "Espandi ChatGPT Audio Controls",
        readAloud: "Leggi ad alta voce"
      },
      shortcutsPopover: {
        title: "Scorciatoie della lettura",
        playPause: "Riproduci / Pausa",
        back: "Indietro di {s} s",
        forward: "Avanti di {s} s",
        slower: "Più lento",
        faster: "Più veloce",
        volumeScroll: "Volume con scorrimento",
        smoothScrub: "Scorrimento fluido",
        volumeScrollKey: "Scorri su \uD83D\uDD08",
        smoothScrubKey: "Tieni premuto ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Impossibile scaricare l’audio. Avvia la lettura, attendi il caricamento e riprova."
      }
    },
    shortcuts: {
      playPause: {
        action: "Riproduci / Pausa",
        description: "Alterna la riproduzione (anche Alt+P)."
      },
      seekBack: {
        action: "Indietro di 10 secondi",
        description: "Torna indietro di 10 secondi nell’audio."
      },
      seekForward: {
        action: "Avanti di 10 secondi",
        description: "Avanza di 10 secondi nell’audio."
      },
      speedDecrease: {
        action: "Riduci velocità",
        description: "Passa alla velocità preimpostata precedente."
      },
      speedIncrease: {
        action: "Aumenta velocità",
        description: "Passa alla velocità preimpostata successiva."
      }
    }
  };

  // src/shared/i18n/locales/tr.ts
  var tr = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Denetimler ve sesli okuma",
      version: "v",
      openChatGPT: "ChatGPT’yi aç",
      dashboard: "Panel",
      seconds: "saniye",
      star: "★ Yıldız",
      docs: "Belgeler",
      issues: "Sorunlar"
    },
    popup: {
      header: {
        switchTheme: "Temayı değiştir",
        openOptions: "Paneli ve ayarları aç"
      },
      tabs: {
        controls: "Denetimler",
        shortcuts: "Tuşlar",
        about: "Hakkında"
      },
      quickControls: {
        playbackSpeed: "Varsayılan oynatma hızı",
        defaultVolume: "Varsayılan ses düzeyi",
        mute: "Sesi kapat",
        unmute: "Sesi aç",
        smartIntegrations: "Pratik özellikler",
        globalShortcuts: "Klavye kısayolları",
        globalShortcutsDesc: "Boşluk/K, Alt+P, Alt+oklar ve hız tuşlarını etkinleştir",
        smoothScrubbing: "Akıcı ileri geri sarma",
        smoothScrubbingDesc: "Daha hızlı sarmak için ◀10 veya 10▶ düğmesini basılı tutun"
      },
      shortcuts: {
        title: "Klavye kısayolları",
        gesturesTitle: "Fare ve dokunma hareketleri",
        smoothAudioScrub: "Akıcı ses sarma",
        directDownload: "Doğrudan indir",
        holdScrubKey: "◀10 / 10▶ düğmesini basılı tutun",
        clickDownloadKey: "\uD83D\uDCE5 düğmesine tıklayın"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Infoxica’nın açık kaynak projesi",
        description: "ChatGPT’nin sesli okumasını duraklatın, sarın, hızını değiştirin ve indirin.",
        privacyTitle: "Gizlilik odaklı",
        privacyDesc: "İzleyici veya telemetri yok. İşlemler tarayıcınızda gerçekleşir.",
        githubRepo: "GitHub deposu",
        documentation: "Belgeler",
        reportIssue: "Sorun bildir"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Panel ve kurulum",
        preferences: "Tercihler",
        shortcuts: "Kısayollar ve hareketler",
        faq: "Sorular ve sorun giderme",
        darkMode: "Koyu mod",
        lightMode: "Açık mod",
        githubRepo: "GitHub deposu"
      },
      headers: {
        preferencesTitle: "Ses ve oynatma tercihleri",
        preferencesDesc: "Dil, hız, ses düzeyi ve özellikleri ayarlayın.",
        shortcutsTitle: "Klavye kısayolları ve hareketler",
        shortcutsDesc: "Oynatmayı klavyeyle hızlıca denetleyin.",
        faqTitle: "Sorular ve sorun giderme",
        faqDesc: "Kullanım, gizlilik ve destek bilgileri."
      },
      general: {
        languageTitle: "Dil",
        languageDesc: "Arayüz dilini seçin veya tarayıcı dilini otomatik algılayın.",
        languageAuto: "Otomatik algıla (tarayıcı dili)",
        languageDetected: "Algılanan dil",
        speedTitle: "Hız tercihleri",
        speedDesc: "ChatGPT veya sesli okuma başlatıldığında kullanılacak hızı seçin.",
        volumeTitle: "Varsayılan ses düzeyi",
        volumeDesc: "Sesli okumanın başlangıç ses düzeyi.",
        seekTitle: "Atlama aralığı",
        seekDesc: "Atlama düğmeleri veya Alt+sol/sağ ok ile kaç saniye atlanacağını belirler.",
        secondsUnit: "saniye"
      },
      shortcutsGuide: {
        title: "Kısayol rehberi",
        desc: "Oynatma tuşları metin alanlarının dışında çalışır.",
        gesturesTitle: "Fare ve basılı tutma",
        gesturesDesc: "Sesi giderek daha hızlı sarmak için ◀10s veya 10s▶ düğmesini basılı tutun.",
        gestureHold03: "4× hızında akıcı sarma başlar.",
        gestureHold15: "Sarma hızı 10× olur.",
        gestureHold30: "Sarma hızı 25× olur.",
        gestureRelease: "Seçtiğiniz konumda durmak için bırakın."
      },
      faq: {
        title: "Sık sorulan sorular ve rehber",
        subtitle: "ChatGPT Audio Controls kullanımı için kısa yanıtlar.",
        q1: "Fare tekerleğiyle sesi nasıl ayarlarım?",
        a1: "İşaretçiyi ses simgesinin üzerine getirin ve kaydırın. Ses düzeyi %5’lik adımlarla değişir.",
        q2: "Oynatıcı nerede görünür?",
        a2: "Mesaj kutusunun yanında, dar ekranlarda ise kutunun üstündeki küçük bir panelde görünür.",
        q3: "Sesli okuma dosyasını nasıl kaydederim?",
        a3: "Ses yüklendikten sonra İndir’e tıklayın. Dosya ChatGPT’nin sağladığı biçimde kaydedilir; biçim dönüştürülmez.",
        q4: "Küçük dizüstü bilgisayarlarda çalışır mı?",
        a4: "Evet. Yanlarda yer yoksa denetimler mesaj kutusunun üstündeki küçük bir panelde görünür.",
        q5: "Tampermonkey ile nasıl kurarım?",
        a5: "Depodan ayrı kullanıcı betiğini yükleyin. Betik yöneticisi güncellemeleri denetler.",
        q6: "Konuşmalarım gizli kalır mı?",
        a6: "Uzantı tarayıcıda çalışır; konuşmaları veya sesi geliştiricinin sunucularına göndermez."
      }
    },
    content: {
      tooltips: {
        back: "{s} saniye geri — sarmak için basılı tutun",
        playPause: "Oynat / Duraklat (Boşluk veya K; Alt+P de desteklenir)",
        forward: "{s} saniye ileri — sarmak için basılı tutun",
        speed: "Oynatma hızı",
        volume: "Ses düzeyi (ayarlamak için kaydırın)",
        volumeSlider: "Ses düzeyi kaydırıcısı",
        download: "Sesi indir",
        shortcuts: "Kısayollar ve hareketler",
        collapse: "Oynatıcıyı daralt",
        expand: "ChatGPT Audio Controls’ü genişlet",
        readAloud: "Sesli oku"
      },
      shortcutsPopover: {
        title: "Sesli okuma kısayolları",
        playPause: "Oynat / Duraklat",
        back: "{s} sn geri",
        forward: "{s} sn ileri",
        slower: "Daha yavaş",
        faster: "Daha hızlı",
        volumeScroll: "Kaydırarak ses ayarı",
        smoothScrub: "Akıcı sarma",
        volumeScrollKey: "\uD83D\uDD08 üzerinde kaydırın",
        smoothScrubKey: "◀{s} / {s}▶ düğmesini basılı tutun"
      },
      alerts: {
        downloadError: "Ses indirilemedi. Sesli okumayı başlatın, sesin yüklenmesini bekleyin ve tekrar deneyin."
      }
    },
    shortcuts: {
      playPause: {
        action: "Oynat / Duraklat",
        description: "Oynatmayı değiştirir (Alt+P de desteklenir)."
      },
      seekBack: {
        action: "10 saniye geri",
        description: "Seste 10 saniye geri gider."
      },
      seekForward: {
        action: "10 saniye ileri",
        description: "Seste 10 saniye ileri gider."
      },
      speedDecrease: {
        action: "Hızı azalt",
        description: "Önceki hız ayarına geçer."
      },
      speedIncrease: {
        action: "Hızı artır",
        description: "Sonraki hız ayarına geçer."
      }
    }
  };

  // src/shared/i18n/locales/zh-CN.ts
  var zhCN = {
    common: {
      extensionName: "ChatGPT 音频控制",
      extensionSubtitle: "播放控制与朗读增强",
      version: "v",
      openChatGPT: "打开 ChatGPT",
      dashboard: "控制面板",
      seconds: "秒",
      star: "★ 点赞 Star",
      docs: "文档",
      issues: "反馈问题"
    },
    popup: {
      header: {
        switchTheme: "切换主题",
        openOptions: "打开设置与面板"
      },
      tabs: {
        controls: "控制",
        shortcuts: "快捷键",
        about: "关于"
      },
      quickControls: {
        playbackSpeed: "默认播放速度",
        defaultVolume: "默认音量",
        mute: "静音",
        unmute: "取消静音",
        smartIntegrations: "智能集成",
        globalShortcuts: "全局快捷键",
        globalShortcutsDesc: "启用 Space/K、Alt+P、Alt+方向键及调速快捷键",
        smoothScrubbing: "平滑长按快进/快退",
        smoothScrubbingDesc: "长按 ◀10 或 10▶ 按钮可实现加速平滑快进/快退"
      },
      shortcuts: {
        title: "键盘快捷键",
        gesturesTitle: "鼠标与手势操作",
        smoothAudioScrub: "平滑快进/快退",
        directDownload: "直接下载音频",
        holdScrubKey: "长按 ◀10 / 10▶",
        clickDownloadKey: "点击 \uD83D\uDCE5 按钮"
      },
      about: {
        title: "ChatGPT 音频控制扩展",
        byInfoxica: "由 Infoxica 开源提供",
        description: "为 ChatGPT 语音朗读提供卓越体验：无缝进度跳转、动态倍速调节、音频一键下载及便捷朗读按钮。",
        privacyTitle: "100% 隐私安全保护",
        privacyDesc: "无追踪器、无数据收集，所有操作均在本地浏览器中运行。",
        githubRepo: "GitHub 开源仓库",
        documentation: "使用文档",
        reportIssue: "反馈问题与建议"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT 音频",
        dashboardSubtitle: "控制面板与设置",
        preferences: "偏好设置",
        shortcuts: "快捷键与手势",
        faq: "常见问题解答",
        darkMode: "深色模式",
        lightMode: "浅色模式",
        githubRepo: "GitHub 仓库"
      },
      headers: {
        preferencesTitle: "音频与播放偏好设置",
        preferencesDesc: "配置界面语言、默认播放速度、默认音量以及各项智能功能。",
        shortcutsTitle: "键盘快捷键与手势指南",
        shortcutsDesc: "掌握高效快捷键，轻松掌控音频播放与进度。",
        faqTitle: "常见问题与疑难解答",
        faqDesc: "详细的技术指南、隐私安全说明与支持解答。"
      },
      general: {
        languageTitle: "语言与本地化",
        languageDesc: "选择您偏好的界面显示语言，或设置为自动跟随浏览器语言。",
        languageAuto: "自动检测 (浏览器默认语言)",
        languageDetected: "已检测到",
        speedTitle: "默认播放倍速",
        speedDesc: "设置打开 ChatGPT 或启动朗读时的默认播放速度。",
        volumeTitle: "默认音量大小",
        volumeDesc: "设置朗读音频流启动时的默认音量百分比。",
        seekTitle: "快进/快退步长",
        seekDesc: "单次点击 -10s / +10s 按钮或按下 Alt + 左/右箭头时跳转的秒数。",
        secondsUnit: "秒"
      },
      shortcutsGuide: {
        title: "键盘快捷键速查表",
        desc: "支持符合 YouTube 标准及单手操作的常用播放热键，显著提升使用效率。",
        gesturesTitle: "鼠标长按快进/快退手势",
        gesturesDesc: "按住 ◀10s 或 10s▶ 按钮可实现动态加速平滑拖动与跳转：",
        gestureHold03: "进入平滑快进模式 (4× 正常播放速度)。",
        gestureHold15: "加速至 10× 快速跳转。",
        gestureHold30: "超高速极速跳进 25× 速率。",
        gestureRelease: "松开即可锁定至目标播放位置。"
      },
      faq: {
        title: "常见问题解答与使用指南",
        subtitle: "快速解答帮助您充分利用 ChatGPT 音频控制扩展的所有功能。",
        q1: "如何通过鼠标滚轮调节音量？",
        a1: "只需将鼠标悬停在播放器栏的音量扬声器图标上，向上或向下滚动鼠标滚轮即可。音量将以 5% 的步长平滑调节，无需展开滑块面板！",
        q2: "播放器会显示在 ChatGPT 的什么位置？",
        a2: "播放器紧邻消息输入框停靠。未播放音频时，右侧会常驻一个精致的悬浮图标；点击悬浮图标或启动朗读时，将自动展开完整的播放控制胶囊栏。",
        q3: "如何下载合成的语音朗读音频？",
        a3: "当 ChatGPT 朗读回答时，点击右侧栏的下载按钮 (\uD83D\uDCE5)，音频流将立即以高保真格式 (.mp3, .m4a, 或 .wav) 保存到您的电脑上。",
        q4: "在小屏幕笔记本电脑上能够正常使用吗？",
        a4: "完全支持！播放器会自动检测可用屏幕宽度，并动态缩放进度条以完美适配笔记本屏幕。如果空间非常紧凑，悬浮按钮可随时展开或收起播放器。",
        q5: "如何通过 Tampermonkey 油猴脚本安装并自动更新？",
        a5: "如果您使用 Tampermonkey、Violentmonkey 或 Greasemonkey，可直接从我们的仓库安装独立脚本。油猴会自动检测 GitHub 并在有新版本发布时提醒更新。",
        q6: "我的对话内容或提示词具有隐私保护吗？",
        a6: "100% 隐私安全。扩展完全在您的本地设备上运行，绝不会向任何外部服务器发送任何提示词、回复文本、音频流或遥测数据。"
      }
    },
    content: {
      tooltips: {
        back: "后退 {s} 秒 — 长按可加速快退",
        playPause: "播放 / 暂停 (Space 或 K；支持 Alt+P)",
        forward: "前进 {s} 秒 — 长按可加速快进",
        speed: "播放倍速",
        volume: "音量 (滚轮可直接调节)",
        volumeSlider: "音量滑块",
        download: "下载音频文件",
        shortcuts: "快捷键与手势指南",
        collapse: "收起播放器",
        expand: "展开 ChatGPT 音频控制",
        readAloud: "朗读回答"
      },
      shortcutsPopover: {
        title: "朗读快捷键",
        playPause: "播放 / 暂停",
        back: "后退 {s} 秒",
        forward: "前进 {s} 秒",
        slower: "减慢倍速",
        faster: "加快倍速",
        volumeScroll: "滚轮调音量",
        smoothScrub: "平滑快进快退",
        volumeScrollKey: "在 \uD83D\uDD08 上滚动",
        smoothScrubKey: "长按 ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "未能下载音频流，请确保音频正在正常加载与播放。"
      }
    },
    shortcuts: {
      playPause: {
        action: "播放 / 暂停",
        description: "切换播放状态，兼容主流网页与桌面播放器快捷键 (支持 Alt+P)"
      },
      seekBack: {
        action: "后退 10 秒",
        description: "后退 10 秒 (长按可进行平滑快退)"
      },
      seekForward: {
        action: "前进 10 秒",
        description: "前进 10 秒 (长按可进行平滑快进)"
      },
      speedDecrease: {
        action: "降低倍速",
        description: "切换至上一级播放倍速预设"
      },
      speedIncrease: {
        action: "提高倍速",
        description: "切换至下一级播放倍速预设"
      }
    }
  };

  // src/shared/i18n/locales/zh-TW.ts
  var zhTW = {
    common: {
      extensionName: "ChatGPT 音訊控制",
      extensionSubtitle: "播放控制與朗讀增強",
      version: "v",
      openChatGPT: "開啟 ChatGPT",
      dashboard: "控制面板",
      seconds: "秒",
      star: "★ 給星 Star",
      docs: "說明文件",
      issues: "回報問題"
    },
    popup: {
      header: {
        switchTheme: "切換主題",
        openOptions: "開啟設定與面板"
      },
      tabs: {
        controls: "控制",
        shortcuts: "快捷鍵",
        about: "關於"
      },
      quickControls: {
        playbackSpeed: "預設播放速度",
        defaultVolume: "預設音量",
        mute: "靜音",
        unmute: "取消靜音",
        smartIntegrations: "智慧整合",
        globalShortcuts: "全域快捷鍵",
        globalShortcutsDesc: "啟用 Space/K、Alt+P、Alt+方向鍵及調速快捷鍵",
        smoothScrubbing: "平滑長按快進/快退",
        smoothScrubbingDesc: "長按 ◀10 或 10▶ 按鈕可實現加速平滑快進/快退"
      },
      shortcuts: {
        title: "鍵盤快捷鍵",
        gesturesTitle: "滑鼠與手勢操作",
        smoothAudioScrub: "平滑快進/快退",
        directDownload: "直接下載音訊",
        holdScrubKey: "長按 ◀10 / 10▶",
        clickDownloadKey: "點擊 \uD83D\uDCE5 按鈕"
      },
      about: {
        title: "ChatGPT 音訊控制擴充功能",
        byInfoxica: "由 Infoxica 開源提供",
        description: "為 ChatGPT 語音朗讀提供卓越體驗：無縫進度跳轉、動態倍速調節、音訊一鍵下載及便捷朗讀按鈕。",
        privacyTitle: "100% 隱私安全保護",
        privacyDesc: "無追蹤器、無遙測資料收集，所有操作均在本地瀏覽器中執行。",
        githubRepo: "GitHub 開源儲存庫",
        documentation: "使用說明文件",
        reportIssue: "回報問題與建議"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT 音訊",
        dashboardSubtitle: "控制面板與設定",
        preferences: "偏好設定",
        shortcuts: "快捷鍵與手勢",
        faq: "常見問題解答",
        darkMode: "深色模式",
        lightMode: "淺色模式",
        githubRepo: "GitHub 儲存庫"
      },
      headers: {
        preferencesTitle: "音訊與播放偏好設定",
        preferencesDesc: "配置介面語言、預設播放速度、預設音量以及各項智慧功能。",
        shortcutsTitle: "鍵盤快捷鍵與手勢指南",
        shortcutsDesc: "掌握高效快捷鍵，輕鬆掌控音訊播放與進度。",
        faqTitle: "常見問題與疑難排解",
        faqDesc: "詳細的技術指南、隱私安全說明與支援解答。"
      },
      general: {
        languageTitle: "語言與在地化",
        languageDesc: "選擇您偏好的介面顯示語言，或設定為自動跟隨瀏覽器語言。",
        languageAuto: "自動偵測 (瀏覽器預設語言)",
        languageDetected: "已偵測到",
        speedTitle: "預設播放倍速",
        speedDesc: "設定開啟 ChatGPT 或啟動朗讀時的預設播放速度。",
        volumeTitle: "預設音量大小",
        volumeDesc: "設定朗讀音訊串流啟動時的預設音量百分比。",
        seekTitle: "快進/快退步長",
        seekDesc: "單次點擊 -10s / +10s 按鈕或按下 Alt + 左/右箭頭時跳轉的秒數。",
        secondsUnit: "秒"
      },
      shortcutsGuide: {
        title: "鍵盤快捷鍵速查表",
        desc: "支援符合 YouTube 標準及單手操作的常用播放熱鍵，顯著提升使用效率。",
        gesturesTitle: "滑鼠長按快進/快退手勢",
        gesturesDesc: "按住 ◀10s 或 10s▶ 按鈕可實現動態加速平滑拖曳與跳轉：",
        gestureHold03: "進入平滑快進模式 (4× 正常播放速度)。",
        gestureHold15: "加速至 10× 快速跳轉。",
        gestureHold30: "超高速極速跳進 25× 速率。",
        gestureRelease: "放開即可鎖定至目標播放位置。"
      },
      faq: {
        title: "常見問題解答與使用指南",
        subtitle: "快速解答協助您充分利用 ChatGPT 音訊控制擴充功能的所有功能。",
        q1: "如何透過滑鼠滾輪調節音量？",
        a1: "只需將滑鼠游標懸停在播放器欄的音量喇叭圖示上，向上或向下滾動滑鼠滾輪即可。音量將以 5% 的步長平滑調節，無需展開滑桿面板！",
        q2: "播放器會顯示在 ChatGPT 的什麼位置？",
        a2: "播放器緊鄰訊息輸入框停靠。未播放音訊時，右側會常駐一個精緻的懸浮圖示；點擊懸浮圖示或啟動朗讀時，將自動展開完整的播放控制膠囊欄。",
        q3: "如何下載合成的語音朗讀音訊？",
        a3: "當 ChatGPT 朗讀回答時，點擊右側欄的下載按鈕 (\uD83D\uDCE5)，音訊串流將立即以高保真格式 (.mp3, .m4a, 或 .wav) 儲存到您的電腦上。",
        q4: "在小螢幕筆記型電腦上能夠正常使用嗎？",
        a4: "完全支援！播放器會自動偵測可用螢幕寬度，並動態縮放進度條以完美適配筆電螢幕。如果空間非常緊湊，懸浮按鈕可隨時展開或收起播放器。",
        q5: "如何透過 Tampermonkey 油猴腳本安裝並自動更新？",
        a5: "如果您使用 Tampermonkey、Violentmonkey 或 Greasemonkey，可直接從我們的儲存庫安裝獨立腳本。油猴會自動偵測 GitHub 並在有新版本釋出時提醒更新。",
        q6: "我的對話內容或提示詞具有隱私保護嗎？",
        a6: "100% 隱私安全。擴充功能完全在您的本機裝置上執行，絕不會向任何外部伺服器傳送任何提示詞、回覆文字、音訊串流或遙測資料。"
      }
    },
    content: {
      tooltips: {
        back: "後退 {s} 秒 — 長按可加速快退",
        playPause: "播放 / 暫停 (Space 或 K；支援 Alt+P)",
        forward: "前進 {s} 秒 — 長按可加速快進",
        speed: "播放倍速",
        volume: "音量 (滾輪可直接調節)",
        volumeSlider: "音量滑桿",
        download: "下載音訊檔案",
        shortcuts: "快捷鍵與手勢指南",
        collapse: "收起播放器",
        expand: "展開 ChatGPT 音訊控制",
        readAloud: "朗讀回答"
      },
      shortcutsPopover: {
        title: "朗讀快捷鍵",
        playPause: "播放 / 暫停",
        back: "後退 {s} 秒",
        forward: "前進 {s} 秒",
        slower: "減慢倍速",
        faster: "加快倍速",
        volumeScroll: "滾輪調音量",
        smoothScrub: "平滑快進快退",
        volumeScrollKey: "在 \uD83D\uDD08 上滾動",
        smoothScrubKey: "長按 ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "未能下載音訊串流，請確保音訊正在正常載入與播放。"
      }
    },
    shortcuts: {
      playPause: {
        action: "播放 / 暫停",
        description: "切換播放狀態，相容主流網頁與桌面播放器快捷鍵 (支援 Alt+P)"
      },
      seekBack: {
        action: "後退 10 秒",
        description: "後退 10 秒 (長按可進行平滑快退)"
      },
      seekForward: {
        action: "前進 10 秒",
        description: "前進 10 秒 (長按可進行平滑快進)"
      },
      speedDecrease: {
        action: "降低倍速",
        description: "切換至上一級播放倍速預設"
      },
      speedIncrease: {
        action: "提高倍速",
        description: "切換至下一級播放倍速預設"
      }
    }
  };

  // src/shared/i18n/locales/vi.ts
  var vi = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Điều khiển & Đọc to văn bản",
      version: "v",
      openChatGPT: "Mở ChatGPT",
      dashboard: "Bảng điều khiển",
      seconds: "giây",
      star: "★ Tặng Star",
      docs: "Tài liệu",
      issues: "Báo lỗi & Góp ý"
    },
    popup: {
      header: {
        switchTheme: "Chuyển giao diện",
        openOptions: "Mở Cài đặt & Bảng điều khiển"
      },
      tabs: {
        controls: "Điều khiển",
        shortcuts: "Phím tắt",
        about: "Giới thiệu"
      },
      quickControls: {
        playbackSpeed: "Tốc độ phát mặc định",
        defaultVolume: "Âm lượng mặc định",
        mute: "Tắt tiếng",
        unmute: "Bật tiếng",
        smartIntegrations: "Tính năng thông minh",
        globalShortcuts: "Phím tắt toàn cầu",
        globalShortcutsDesc: "Bật Space/K, Alt+P, Alt+Mũi tên & phím điều chỉnh tốc độ",
        smoothScrubbing: "Tua nhanh mượt mà khi giữ",
        smoothScrubbingDesc: "Tăng tốc tua audio khi nhấn giữ ◀10 hoặc 10▶"
      },
      shortcuts: {
        title: "Phím tắt bàn phím",
        gesturesTitle: "Thao tác chuột & Cử chỉ",
        smoothAudioScrub: "Tua âm thanh mượt mà",
        directDownload: "Tải xuống âm thanh trực tiếp",
        holdScrubKey: "Nhấn giữ ◀10 / 10▶",
        clickDownloadKey: "Nhấn nút \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Mã nguồn mở bởi Infoxica",
        description: "Nâng tầm trải nghiệm giọng nói trên ChatGPT với tính năng tua mượt mà, tốc độ phát linh hoạt, tải xuống âm thanh tức thì và nút đọc to tiện lợi.",
        privacyTitle: "Bảo mật 100%",
        privacyDesc: "Không theo dõi, không thu thập dữ liệu từ xa. Mọi thứ xử lý trực tiếp trên trình duyệt của bạn.",
        githubRepo: "Kho lưu trữ GitHub",
        documentation: "Tài liệu hướng dẫn",
        reportIssue: "Báo cáo sự cố"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Bảng điều khiển & Cài đặt",
        preferences: "Tùy chọn",
        shortcuts: "Phím tắt & Cử chỉ",
        faq: "Hỏi đáp & Khắc phục lỗi",
        darkMode: "Giao diện tối",
        lightMode: "Giao diện sáng",
        githubRepo: "Kho GitHub"
      },
      headers: {
        preferencesTitle: "Tùy chọn Âm thanh & Phát lại",
        preferencesDesc: "Cấu hình ngôn ngữ giao diện, tốc độ phát, âm lượng mặc định và các tính năng thông minh.",
        shortcutsTitle: "Phím tắt bàn phím & Cử chỉ",
        shortcutsDesc: "Làm chủ các phím tắt nhanh để điều khiển phát âm thanh dễ dàng.",
        faqTitle: "Câu hỏi thường gặp & Khắc phục sự cố",
        faqDesc: "Hướng dẫn kỹ thuật chi tiết, bảo mật và thông tin hỗ trợ."
      },
      general: {
        languageTitle: "Ngôn ngữ & Bản địa hóa",
        languageDesc: "Chọn ngôn ngữ hiển thị bạn muốn hoặc để tiện ích tự động phát hiện ngôn ngữ của trình duyệt.",
        languageAuto: "Tự động phát hiện (Ngôn ngữ trình duyệt)",
        languageDetected: "Đã phát hiện",
        speedTitle: "Tốc độ phát mặc định",
        speedDesc: "Chọn tốc độ phát mặc định khi mở ChatGPT hoặc bắt đầu Đọc to.",
        volumeTitle: "Mức âm lượng mặc định",
        volumeDesc: "Âm lượng đặt trước cho luồng giọng nói Đọc to.",
        seekTitle: "Bước tua & Nhảy thời gian",
        seekDesc: "Số giây tua khi nhấn 1 lần vào nút -10s / +10s hoặc phím Alt + Mũi tên Trái / Phải.",
        secondsUnit: "giây"
      },
      shortcutsGuide: {
        title: "Bảng tra cứu phím tắt",
        desc: "Tăng tốc trải nghiệm với các phím tắt tiêu chuẩn YouTube và thao tác một tay thuận tiện.",
        gesturesTitle: "Cử chỉ giữ chuột để tua mượt mà",
        gesturesDesc: "Nhấn giữ nút ◀10s hoặc 10s▶ để tua mượt mà qua các câu trả lời dài với khả năng tăng tốc linh hoạt:",
        gestureHold03: "Vào chế độ tua mượt mà (tốc độ 4× bình thường).",
        gestureHold15: "Tăng tốc tua lên mức 10×.",
        gestureHold30: "Tua tốc độ siêu nhanh ở mức 25×.",
        gestureRelease: "Thả ra để khóa vị trí phát mong muốn ngay lập tức."
      },
      faq: {
        title: "Câu hỏi thường gặp & Hướng dẫn sử dụng",
        subtitle: "Giải đáp nhanh giúp bạn tận dụng tối đa tiện ích ChatGPT Audio Controls.",
        q1: "Làm cách nào để chỉnh âm lượng bằng con lăn chuột?",
        a1: "Chỉ cần rê chuột lên biểu tượng loa âm lượng trên thanh trình phát và cuộn con lăn lên hoặc xuống. Âm lượng sẽ tăng giảm mượt mà mỗi nấc 5% mà không cần mở thanh trượt!",
        q2: "Trình phát xuất hiện ở vị trí nào trên ChatGPT?",
        a2: "Trình phát được gắn gọn gàng ngay cạnh ô nhập tin nhắn của bạn. Khi không có âm thanh phát, một nút nổi logo nhỏ sẽ nằm bên phải; bấm vào nút này hoặc bật Đọc to sẽ mở rộng toàn bộ thanh điều khiển.",
        q3: "Làm cách nào để tải xuống file âm thanh giọng đọc?",
        a3: "Bất cứ khi nào ChatGPT đọc to câu trả lời, hãy nhấn nút tải xuống (\uD83D\uDCE5) ở thanh bên phải. File âm thanh chất lượng cao (.mp3, .m4a hoặc .wav) sẽ được lưu ngay vào máy tính của bạn.",
        q4: "Tiện ích có hoạt động tốt trên màn hình laptop nhỏ không?",
        a4: "Hoàn toàn có! Trình phát tự động nhận diện chiều rộng màn hình và co giãn thanh tua để vừa vặn hoàn hảo. Nếu không gian hẹp, nút nổi luôn sẵn sàng để bạn mở ra hoặc thu gọn linh hoạt.",
        q5: "Làm sao để cài đặt qua Tampermonkey với tính năng tự động cập nhật?",
        a5: "Nếu sử dụng Tampermonkey, Violentmonkey hoặc Greasemonkey, bạn có thể cài đặt script trực tiếp từ GitHub của chúng tôi. Tampermonkey sẽ tự động kiểm tra và thông báo khi có bản cập nhật mới.",
        q6: "Cuộc trò chuyện và câu lệnh của tôi có được bảo mật không?",
        a6: "Bảo mật 100%. Tiện ích chạy hoàn toàn trên thiết bị của bạn. Không có bất kỳ câu lệnh, phản hồi, âm thanh hay dữ liệu nào bị gửi về máy chủ bên ngoài."
      }
    },
    content: {
      tooltips: {
        back: "Lùi {s} giây — giữ để tua",
        playPause: "Phát / Tạm dừng (Phím Space hoặc K; Alt+P)",
        forward: "Tiến {s} giây — giữ để tua",
        speed: "Tốc độ phát",
        volume: "Âm lượng (Cuộn chuột để chỉnh)",
        volumeSlider: "Thanh trượt âm lượng",
        download: "Tải xuống âm thanh",
        shortcuts: "Phím tắt & Cử chỉ",
        collapse: "Thu gọn trình phát",
        expand: "Mở rộng ChatGPT Audio Controls",
        readAloud: "Đọc to câu trả lời"
      },
      shortcutsPopover: {
        title: "Phím tắt Đọc to",
        playPause: "Phát / Tạm dừng",
        back: "Lùi {s} giây",
        forward: "Tiến {s} giây",
        slower: "Giảm tốc độ",
        faster: "Tăng tốc độ",
        volumeScroll: "Cuộn chỉnh âm lượng",
        smoothScrub: "Tua mượt khi giữ",
        volumeScrollKey: "Cuộn trên nút \uD83D\uDD08",
        smoothScrubKey: "Giữ ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Không thể tải xuống luồng âm thanh. Vui lòng đảm bảo âm thanh đang được phát."
      }
    },
    shortcuts: {
      playPause: {
        action: "Phát / Tạm dừng",
        description: "Chuyển đổi trạng thái phát, tương thích với các trình phát video/audio phổ biến (Hỗ trợ Alt+P)"
      },
      seekBack: {
        action: "Lùi 10 giây",
        description: "Lùi lại 10 giây (Nhấn giữ để tua mượt)"
      },
      seekForward: {
        action: "Tiến 10 giây",
        description: "Tiến lên 10 giây (Nhấn giữ để tua mượt)"
      },
      speedDecrease: {
        action: "Giảm tốc độ",
        description: "Chuyển về mốc tốc độ phát chậm hơn"
      },
      speedIncrease: {
        action: "Tăng tốc độ",
        description: "Chuyển lên mốc tốc độ phát nhanh hơn"
      }
    }
  };

  // src/shared/i18n/locales/th.ts
  var th = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "ตัวควบคุมเสียง & อ่านออกเสียง",
      version: "v",
      openChatGPT: "เปิด ChatGPT",
      dashboard: "แดชบอร์ด",
      seconds: "วินาที",
      star: "★ ให้ดาว Star",
      docs: "เอกสารคู่มือ",
      issues: "แจ้งปัญหา"
    },
    popup: {
      header: {
        switchTheme: "เปลี่ยนธีม",
        openOptions: "เปิดแดชบอร์ดและการตั้งค่า"
      },
      tabs: {
        controls: "ควบคุม",
        shortcuts: "ปุ่มลัด",
        about: "เกี่ยวกับ"
      },
      quickControls: {
        playbackSpeed: "ความเร็วเล่นเริ่มต้น",
        defaultVolume: "ระดับเสียงเริ่มต้น",
        mute: "ปิดเสียง",
        unmute: "เปิดเสียง",
        smartIntegrations: "การเชื่อมต่ออัจฉริยะ",
        globalShortcuts: "ปุ่มลัดทั่วทั้งหน้า",
        globalShortcutsDesc: "เปิดใช้ Space/K, Alt+P, Alt+ลูกศร และปุ่มปรับความเร็ว",
        smoothScrubbing: "กรอเสียงนุ่มนวลเมื่อกดค้าง",
        smoothScrubbingDesc: "เร่งความเร็วการกรอเสียงเมื่อกดค้าง ◀10 หรือ 10▶"
      },
      shortcuts: {
        title: "ปุ่มลัดแป้นพิมพ์",
        gesturesTitle: "การควบคุมด้วยเมาส์และท่าทาง",
        smoothAudioScrub: "กรอเสียงอย่างราบรื่น",
        directDownload: "ดาวน์โหลดเสียงโดยตรง",
        holdScrubKey: "กดค้าง ◀10 / 10▶",
        clickDownloadKey: "คลิกปุ่ม \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "โอเพนซอร์สโดย Infoxica",
        description: "ยกระดับประสบการณ์เสียงบน ChatGPT ด้วยการกรอเสียงที่นุ่มนวล การปรับระดับความเร็วที่ยืดหยุ่น การดาวน์โหลดเสียงทันที และปุ่มอ่านออกเสียงที่สะดวกสบาย",
        privacyTitle: "เน้นความเป็นส่วนตัว 100%",
        privacyDesc: "ไม่มีระบบติดตาม ไม่มีการเก็บข้อมูล ทุกอย่างทำงานบนเบราว์เซอร์ของคุณโดยตรง",
        githubRepo: "คลังโค้ด GitHub",
        documentation: "เอกสารการใช้งาน",
        reportIssue: "รายงานปัญหาหรือข้อเสนอแนะ"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "แดชบอร์ดและการตั้งค่า",
        preferences: "การตั้งค่า",
        shortcuts: "ปุ่มลัดและท่าทาง",
        faq: "คำถามที่พบบ่อย",
        darkMode: "โหมดมืด",
        lightMode: "โหมดสว่าง",
        githubRepo: "คลัง GitHub"
      },
      headers: {
        preferencesTitle: "การตั้งค่าเสียงและการเล่น",
        preferencesDesc: "ตั้งค่าภาษาอินเทอร์เฟซ ความเร็วการเล่นเริ่มต้น ระดับเสียง และฟังก์ชันอัจฉริยะ",
        shortcutsTitle: "ปุ่มลัดแป้นพิมพ์และท่าทาง",
        shortcutsDesc: "เรียนรู้ปุ่มลัดด่วนเพื่อควบคุมการเล่นเสียงได้อย่างง่ายดาย",
        faqTitle: "คำถามที่พบบ่อยและวิธีแก้ปัญหา",
        faqDesc: "คู่มือทางเทคนิค ความปลอดภัยของข้อมูล และคำแนะนำช่วยเหลือ"
      },
      general: {
        languageTitle: "ภาษาและการแปลภาษา",
        languageDesc: "เลือกภาษาที่ต้องการให้แสดงผล หรือตั้งค่าให้ตรวจจับภาษาของเบราว์เซอร์โดยอัตโนมัติ",
        languageAuto: "ตรวจจับอัตโนมัติ (ภาษาของเบราว์เซอร์)",
        languageDetected: "ตรวจพบ",
        speedTitle: "ความเร็วการเล่นเริ่มต้น",
        speedDesc: "เลือกความเร็วเริ่มต้นเมื่อเปิด ChatGPT หรือเริ่มใช้งานการอ่านออกเสียง",
        volumeTitle: "ระดับเสียงเริ่มต้น",
        volumeDesc: "ตั้งค่าระดับเสียงเริ่มต้นสำหรับสตรีมเสียงอ่านออกเสียง",
        seekTitle: "ระยะเวลาในการข้าม/กรอ",
        seekDesc: "จำนวนวินาทีที่จะข้ามเมื่อกดปุ่ม -10s / +10s หนึ่งครั้ง หรือกดปุ่ม Alt + ซ้าย / ขวา",
        secondsUnit: "วินาที"
      },
      shortcutsGuide: {
        title: "ตารางอ้างอิงปุ่มลัดแป้นพิมพ์",
        desc: "เพิ่มความสะดวกรวดเร็วด้วยปุ่มลัดมาตรฐาน YouTube และการใช้งานมือเดียวที่ลงตัว",
        gesturesTitle: "การกดค้างเมาส์เพื่อกรอเสียงอย่างราบรื่น",
        gesturesDesc: "กดค้างที่ปุ่ม ◀10s หรือ 10s▶ เพื่อกรอผ่านคำตอบขนาดยาวพร้อมอัตราเร่งความเร็วอัตโนมัติ:",
        gestureHold03: "เข้าสู่โหมดกรอนุ่มนวล (ความเร็ว 4× ปกติ)",
        gestureHold15: "เร่งความเร็วการกรอเป็น 10×",
        gestureHold30: "ความเร็วสูงพิเศษระดับ 25×",
        gestureRelease: "ปล่อยมือเพื่อล็อกตำแหน่งที่ต้องการทันที"
      },
      faq: {
        title: "คำถามที่พบบ่อยและคู่มือการใช้งาน",
        subtitle: "คำตอบด่วนเพื่อช่วยให้คุณใช้งาน ChatGPT Audio Controls ได้อย่างเต็มประสิทธิภาพ",
        q1: "วิธีปรับระดับเสียงด้วยลูกกลิ้งเมาส์ทำอย่างไร?",
        a1: "เพียงวางเคอร์เซอร์เมาส์ไว้เหนือไอคอนลำโพงบนแถบควบคุม แล้วเลื่อนลูกกลิ้งเมาส์ขึ้นหรือลง ระดับเสียงจะปรับเปลี่ยนทีละ 5% อย่างนุ่มนวลโดยไม่ต้องเปิดแถบเลื่อน!",
        q2: "แถบเครื่องเล่นเสียงจะแสดงที่ตำแหน่งใดบน ChatGPT?",
        a2: "เครื่องเล่นจะอยู่ติดกับช่องพิมพ์ข้อความของคุณอย่างเป็นระเบียบ เมื่อไม่มีเสียงเล่น ปุ่มไอคอนลอยขนาดกะทัดรัดจะแสดงอยู่ทางขวา การคลิกปุ่มนี้หรือเริ่มอ่านออกเสียงจะขยายแถบควบคุมเต็มรูปแบบ",
        q3: "ดาวน์โหลดไฟล์เสียงสังเคราะห์ที่อ่านออกเสียงได้อย่างไร?",
        a3: "เมื่อใดก็ตามที่ ChatGPT อ่านคำตอบ ให้คลิกปุ่มดาวน์โหลด (\uD83D\uDCE5) บนแถบด้านขวา สตรีมเสียงจะถูกบันทึกลงในคอมพิวเตอร์ของคุณเป็นไฟล์คุณภาพสูง (.mp3, .m4a หรือ .wav) ทันที",
        q4: "สามารถใช้งานบนหน้าจอแล็ปท็อปขนาดเล็กได้หรือไม่?",
        a4: "ใช้งานได้สมบูรณ์แบบ! ตัวเล่นจะตรวจจับความกว้างหน้าจอและปรับขนาดแถบเลื่อนเวลาให้พอดีโดยอัตโนมัติ หากหน้าจอแคบมาก ปุ่มลอยจะช่วยให้คุณเปิด-ปิดแถบควบคุมได้ตลอดเวลา",
        q5: "ติดตั้งผ่าน Tampermonkey พร้อมอัปเดตอัตโนมัติได้อย่างไร?",
        a5: "หากคุณใช้ Tampermonkey, Violentmonkey หรือ Greasemonkey คุณสามารถติดตั้งสคริปต์ได้โดยตรงจากคลัง GitHub ของเรา Tampermonkey จะตรวจสอบและแจ้งเตือนเมื่อมีเวอร์ชันใหม่ออกมา",
        q6: "บทสนทนาและข้อความแจ้งของฉันมีความเป็นส่วนตัวหรือไม่?",
        a6: "เป็นส่วนตัว 100% ส่วนขยายทำงานบนอุปกรณ์ของคุณทั้งหมด ไม่มีการส่งข้อความ คำตอบ เสียง หรือข้อมูลการใช้งานไปยังเซิร์ฟเวอร์ภายนอกใดๆ ทั้งสิ้น"
      }
    },
    content: {
      tooltips: {
        back: "ย้อนกลับ {s} วินาที — กดค้างเพื่อกรอ",
        playPause: "เล่น / พัก (Space หรือ K; รองรับ Alt+P)",
        forward: "ไปข้างหน้า {s} วินาที — กดค้างเพื่อกรอ",
        speed: "ความเร็วการเล่น",
        volume: "ระดับเสียง (เลื่อนลูกกลิ้งเพื่อปรับ)",
        volumeSlider: "แถบปรับระดับเสียง",
        download: "ดาวน์โหลดเสียง",
        shortcuts: "ปุ่มลัดและท่าทาง",
        collapse: "ย่อแถบควบคุม",
        expand: "ขยายแถบควบคุมเสียง ChatGPT",
        readAloud: "อ่านออกเสียงคำตอบ"
      },
      shortcutsPopover: {
        title: "ปุ่มลัดการอ่านออกเสียง",
        playPause: "เล่น / พัก",
        back: "ย้อน {s} วินาที",
        forward: "ข้าม {s} วินาที",
        slower: "ลดความเร็ว",
        faster: "เพิ่มความเร็ว",
        volumeScroll: "เลื่อนปรับเสียง",
        smoothScrub: "กรอนุ่มนวล",
        volumeScrollKey: "เลื่อนบน \uD83D\uDD08",
        smoothScrubKey: "กดค้าง ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "ไม่สามารถดาวน์โหลดไฟล์เสียงได้ กรุณาตรวจสอบว่ามีเสียงกำลังเล่นอยู่"
      }
    },
    shortcuts: {
      playPause: {
        action: "เล่น / พัก",
        description: "สลับสถานะการเล่น รองรับปุ่มลัดมาตรฐานบนเว็บและโปรแกรมเล่นทั่วไป (รองรับ Alt+P)"
      },
      seekBack: {
        action: "ย้อนหลัง 10 วินาที",
        description: "ย้อนกลับไป 10 วินาที (กดค้างเพื่อกรอนุ่มนวล)"
      },
      seekForward: {
        action: "ไปข้างหน้า 10 วินาที",
        description: "ข้ามไปข้างหน้า 10 วินาที (กดค้างเพื่อกรอนุ่มนวล)"
      },
      speedDecrease: {
        action: "ลดความเร็ว",
        description: "ปรับลดระดับความเร็วการเล่นทีละขั้น"
      },
      speedIncrease: {
        action: "เพิ่มความเร็ว",
        description: "ปรับเพิ่มระดับความเร็วการเล่นทีละขั้น"
      }
    }
  };

  // src/shared/i18n/locales/es.ts
  var es = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Controles y Lectura en Voz Alta",
      version: "v",
      openChatGPT: "Abrir ChatGPT",
      dashboard: "Panel de Control",
      seconds: "segundos",
      star: "★ Dar Estrella",
      docs: "Documentación",
      issues: "Reportar Problema"
    },
    popup: {
      header: {
        switchTheme: "Cambiar Tema",
        openOptions: "Abrir Panel y Ajustes"
      },
      tabs: {
        controls: "Controles",
        shortcuts: "Atajos",
        about: "Acerca de"
      },
      quickControls: {
        playbackSpeed: "Velocidad de Reproducción",
        defaultVolume: "Volumen Predeterminado",
        mute: "Silenciar",
        unmute: "Activar Sonido",
        smartIntegrations: "Integraciones Inteligentes",
        globalShortcuts: "Atajos Globales de Teclado",
        globalShortcutsDesc: "Activar Espacio/K, Alt+P, Alt+Flechas y teclas de velocidad",
        smoothScrubbing: "Avance rápido fluido al mantener presionado",
        smoothScrubbingDesc: "Acelera el desplazamiento de audio manteniendo ◀10 o 10▶"
      },
      shortcuts: {
        title: "Atajos de Teclado",
        gesturesTitle: "Gestos de Ratón y Toque",
        smoothAudioScrub: "Desplazamiento Fluido",
        directDownload: "Descarga Directa de Audio",
        holdScrubKey: "Mantener ◀10 / 10▶",
        clickDownloadKey: "Clic en botón \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Código abierto por Infoxica",
        description: "Mejora la experiencia de voz en ChatGPT con avance fluido, velocidades dinámicas, descargas directas de audio y botones de lectura rápida.",
        privacyTitle: "100% Enfocado en la Privacidad",
        privacyDesc: "Sin rastreadores ni telemetría. Todo se procesa localmente en tu navegador.",
        githubRepo: "Repositorio de GitHub",
        documentation: "Documentación",
        reportIssue: "Reportar un Problema"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Panel y Configuración",
        preferences: "Preferencias",
        shortcuts: "Atajos y Gestos",
        faq: "Preguntas Frecuentes",
        darkMode: "Modo Oscuro",
        lightMode: "Modo Claro",
        githubRepo: "Repositorio GitHub"
      },
      headers: {
        preferencesTitle: "Preferencias de Audio y Reproducción",
        preferencesDesc: "Configura el idioma de la interfaz, velocidad predeterminada, volumen e integraciones.",
        shortcutsTitle: "Atajos de Teclado y Gestos",
        shortcutsDesc: "Domina los atajos rápidos para controlar la reproducción sin esfuerzo.",
        faqTitle: "Preguntas Frecuentes y Solución de Problemas",
        faqDesc: "Guía técnica detallada, privacidad y respuestas de soporte."
      },
      general: {
        languageTitle: "Idioma y Localización",
        languageDesc: "Selecciona el idioma de la interfaz o detecta automáticamente el idioma de tu navegador.",
        languageAuto: "Detección Automática (Idioma del Navegador)",
        languageDetected: "Detectado",
        speedTitle: "Velocidad de Reproducción Predeterminada",
        speedDesc: "Elige la velocidad al abrir ChatGPT o iniciar la lectura en voz alta.",
        volumeTitle: "Nivel de Volumen Predeterminado",
        volumeDesc: "Volumen predefinido para la voz de lectura en voz alta.",
        seekTitle: "Paso de Avance y Retroceso",
        seekDesc: "Número de segundos a saltar con un toque en los botones -10s / +10s o Alt + Izquierda / Derecha.",
        secondsUnit: "segundos"
      },
      shortcutsGuide: {
        title: "Referencia de Atajos de Teclado",
        desc: "Optimiza tu flujo de trabajo con atajos estándar de YouTube y diseño ergonómico para una sola mano.",
        gesturesTitle: "Gestos de Ratón y Avance Fluido",
        gesturesDesc: "Mantén presionado ◀10s o 10s▶ para desplazarte por respuestas largas con aceleración dinámica:",
        gestureHold03: "Entra en modo de avance fluido (velocidad 4×).",
        gestureHold15: "Acelera a velocidad de búsqueda 10×.",
        gestureHold30: "Salto de ultra alta velocidad a 25×.",
        gestureRelease: "Suelta para fijar inmediatamente la posición deseada."
      },
      faq: {
        title: "Preguntas Frecuentes y Guía de Usuario",
        subtitle: "Respuestas rápidas para aprovechar al máximo ChatGPT Audio Controls.",
        q1: "¿Cómo ajusto el volumen con la rueda del ratón?",
        a1: "Simplemente pasa el cursor sobre el icono del altavoz en la barra del reproductor y gira la rueda del ratón. El volumen se ajustará suavemente en pasos del 5% sin necesidad de abrir el control deslizante.",
        q2: "¿Dónde aparece el reproductor en ChatGPT?",
        a2: "El reproductor se ancla directamente junto al cuadro de entrada de mensajes. Cuando no hay audio, un botón flotante permanece en el lateral derecho; al pulsarlo o iniciar la lectura, se expande la barra completa.",
        q3: "¿Cómo descargo el archivo de audio de la lectura?",
        a3: "Cuando ChatGPT lea una respuesta, pulsa el botón de descarga (\uD83D\uDCE5) en la barra derecha. El audio se guardará al instante en tu equipo con calidad máxima (.mp3, .m4a o .wav).",
        q4: "¿Funciona en pantallas pequeñas de portátiles?",
        a4: "¡Sí! El reproductor detecta automáticamente el ancho de la pantalla y ajusta la barra de progreso proporcionalmente. Si el espacio es muy reducido, el botón flotante permite expandirlo o replegarlo fácilmente.",
        q5: "¿Cómo lo instalo con Tampermonkey con actualizaciones automáticas?",
        a5: "Si utilizas Tampermonkey, Violentmonkey o Greasemonkey, puedes instalar el script directamente desde nuestro repositorio. Tampermonkey comprobará GitHub y te notificará cuando haya una nueva versión.",
        q6: "¿Son privadas mis conversaciones y solicitudes?",
        a6: "100% Privadas. La extensión se ejecuta íntegramente en tu dispositivo local. Nunca se envía texto, audio ni datos a servidores externos."
      }
    },
    content: {
      tooltips: {
        back: "Retroceder {s} segundos — mantén pulsado para seguir retrocediendo",
        playPause: "Reproducir / Pausar (Espacio o K; Alt+P)",
        forward: "Avanzar {s} segundos — mantener para avanzar rápido",
        speed: "Velocidad de reproducción",
        volume: "Volumen (Rueda del ratón para ajustar)",
        volumeSlider: "Control de volumen",
        download: "Descargar audio",
        shortcuts: "Atajos de teclado y gestos",
        collapse: "Ocultar reproductor",
        expand: "Expandir controles de audio de ChatGPT",
        readAloud: "Leer respuesta"
      },
      shortcutsPopover: {
        title: "Atajos de Lectura",
        playPause: "Reproducir / Pausar",
        back: "Retroceder {s} s",
        forward: "Avanzar {s} s",
        slower: "Más lento",
        faster: "Más rápido",
        volumeScroll: "Rueda para volumen",
        smoothScrub: "Avance fluido",
        volumeScrollKey: "Girar sobre \uD83D\uDD08",
        smoothScrubKey: "Mantener ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "No se pudo descargar el flujo de audio. Asegúrate de que el audio esté cargado."
      }
    },
    shortcuts: {
      playPause: {
        action: "Reproducir / Pausar",
        description: "Alterna la reproducción, compatible con reproductores web habituales (compatible con Alt+P)"
      },
      seekBack: {
        action: "Retroceder 10 segundos",
        description: "Salta 10s hacia atrás (mantener para desplazamiento fluido)"
      },
      seekForward: {
        action: "Avanzar 10 segundos",
        description: "Salta 10s hacia adelante (mantener para desplazamiento fluido)"
      },
      speedDecrease: {
        action: "Disminuir Velocidad",
        description: "Baja al nivel de velocidad anterior"
      },
      speedIncrease: {
        action: "Aumentar Velocidad",
        description: "Sube al siguiente nivel de velocidad"
      }
    }
  };

  // src/shared/i18n/locales/pt-BR.ts
  var ptBR = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Controles e Leitura em Voz Alta",
      version: "v",
      openChatGPT: "Abrir ChatGPT",
      dashboard: "Painel de Controle",
      seconds: "segundos",
      star: "★ Dar Estrela",
      docs: "Documentação",
      issues: "Relatar Problema"
    },
    popup: {
      header: {
        switchTheme: "Alternar Tema",
        openOptions: "Abrir Painel e Configurações"
      },
      tabs: {
        controls: "Controles",
        shortcuts: "Atalhos",
        about: "Sobre"
      },
      quickControls: {
        playbackSpeed: "Velocidade de Reprodução",
        defaultVolume: "Volume Padrão",
        mute: "Silenciar",
        unmute: "Ativar Som",
        smartIntegrations: "Integrações Inteligentes",
        globalShortcuts: "Atalhos Globais de Teclado",
        globalShortcutsDesc: "Ativar Espaço/K, Alt+P, Alt+Setas e teclas de velocidade",
        smoothScrubbing: "Avanço contínuo ao segurar",
        smoothScrubbingDesc: "Acelera o deslocamento segurando ◀10 ou 10▶"
      },
      shortcuts: {
        title: "Atalhos de Teclado",
        gesturesTitle: "Gestos de Mouse e Toque",
        smoothAudioScrub: "Avanço Contínuo de Áudio",
        directDownload: "Download Direto de Áudio",
        holdScrubKey: "Segurar ◀10 / 10▶",
        clickDownloadKey: "Clicar no botão \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Código aberto por Infoxica",
        description: "Aprimora a experiência de voz no ChatGPT com avanço contínuo, velocidades dinâmicas, downloads diretos de áudio e botões de leitura rápida.",
        privacyTitle: "100% Focado em Privacidade",
        privacyDesc: "Sem rastreadores nem telemetria. Tudo roda localmente no seu navegador.",
        githubRepo: "Repositório no GitHub",
        documentation: "Documentação",
        reportIssue: "Relatar um Problema"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Painel e Configuração",
        preferences: "Preferências",
        shortcuts: "Atalhos e Gestos",
        faq: "Perguntas Frequentes",
        darkMode: "Modo Escuro",
        lightMode: "Modo Claro",
        githubRepo: "Repositório GitHub"
      },
      headers: {
        preferencesTitle: "Preferências de Áudio e Reprodução",
        preferencesDesc: "Configure o idioma da interface, velocidade padrão, volume e recursos inteligentes.",
        shortcutsTitle: "Atalhos de Teclado e Gestos",
        shortcutsDesc: "Domine os atalhos rápidos para controlar a reprodução com facilidade.",
        faqTitle: "Perguntas Frequentes e Solução de Problemas",
        faqDesc: "Guia técnico detalhado, privacidade e suporte."
      },
      general: {
        languageTitle: "Idioma e Localização",
        languageDesc: "Escolha o idioma de exibição ou deixe a extensão detectar automaticamente o idioma do seu navegador.",
        languageAuto: "Detectar Automaticamente (Idioma do Navegador)",
        languageDetected: "Detectado",
        speedTitle: "Velocidade Padrão de Reprodução",
        speedDesc: "Escolha a velocidade padrão ao abrir o ChatGPT ou iniciar a Leitura em Voz Alta.",
        volumeTitle: "Nível de Volume Padrão",
        volumeDesc: "Volume pré-definido para transmissões de voz.",
        seekTitle: "Passo de Avanço e Retrocesso",
        seekDesc: "Número de segundos a pular com um toque nos botões -10s / +10s ou Alt + Esquerda / Direita.",
        secondsUnit: "segundos"
      },
      shortcutsGuide: {
        title: "Guia de Atalhos de Teclado",
        desc: "Acelere seu fluxo de trabalho com atalhos padrão do YouTube e controles ergonômicos de uma mão.",
        gesturesTitle: "Gestos de Mouse e Avanço Contínuo",
        gesturesDesc: "Segure os botões ◀10s ou 10s▶ para navegar por respostas longas com aceleração dinâmica:",
        gestureHold03: "Entra no modo de avanço contínuo (velocidade 4×).",
        gestureHold15: "Acelera para taxa de busca de 10×.",
        gestureHold30: "Salto de velocidade ultra rápida a 25×.",
        gestureRelease: "Solte para travar imediatamente na posição desejada."
      },
      faq: {
        title: "Perguntas Frequentes e Guia do Usuário",
        subtitle: "Respostas rápidas para aproveitar ao máximo o ChatGPT Audio Controls.",
        q1: "Como ajustar o volume usando a roda do mouse?",
        a1: "Basta passar o cursor sobre o ícone do alto-falante na barra do player e rolar a roda do mouse para cima ou para baixo. O volume ajusta suavemente em incrementos de 5% sem abrir o controle deslizante!",
        q2: "Onde o player aparece no ChatGPT?",
        a2: "O player fica posicionado convenientemente ao lado do campo de mensagem. Quando nenhum áudio está tocando, um botão flutuante discreto permanece no lado direito; ao clicar nele ou iniciar a leitura, a barra se expande.",
        q3: "Como faço para baixar o áudio sintetizado?",
        a3: "Sempre que o ChatGPT ler uma resposta, clique no botão de download (\uD83D\uDCE5) na barra direita. O áudio é salvo instantaneamente em alta qualidade (.mp3, .m4a ou .wav) no seu computador.",
        q4: "Funciona em telas pequenas de notebooks?",
        a4: "Sim! O player detecta automaticamente a largura da tela e dimensiona a barra de busca de forma responsiva. Se o espaço for reduzido, o botão flutuante permite abrir e recolher o player a qualquer momento.",
        q5: "Como instalar via Tampermonkey com atualizações automáticas?",
        a5: "Se você usa Tampermonkey, Violentmonkey ou Greasemonkey, pode instalar o script diretamente do nosso repositório. O Tampermonkey checa o GitHub e notifica quando uma nova versão for lançada.",
        q6: "Minhas conversas e mensagens são privadas?",
        a6: "100% Privadas. A extensão roda inteiramente no seu dispositivo local. Nenhuma mensagem, resposta, áudio ou telemetria é enviada para servidores externos."
      }
    },
    content: {
      tooltips: {
        back: "Voltar {s} segundos — segure para continuar voltando",
        playPause: "Reproduzir / Pausar (Espaço ou K; Alt+P)",
        forward: "Avançar {s} segundos — segure para avançar rápido",
        speed: "Velocidade de reprodução",
        volume: "Volume (Role o mouse para ajustar)",
        volumeSlider: "Controle de volume",
        download: "Baixar áudio",
        shortcuts: "Atalhos de teclado e gestos",
        collapse: "Recolher Player",
        expand: "Expandir controles de áudio do ChatGPT",
        readAloud: "Ler resposta"
      },
      shortcutsPopover: {
        title: "Atalhos de Leitura",
        playPause: "Reproduzir / Pausar",
        back: "Voltar {s} s",
        forward: "Avançar {s} s",
        slower: "Mais lento",
        faster: "Mais rápido",
        volumeScroll: "Rolar para volume",
        smoothScrub: "Avanço contínuo",
        volumeScrollKey: "Rolar no \uD83D\uDD08",
        smoothScrubKey: "Segurar ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Não foi possível baixar o áudio. Certifique-se de que o áudio esteja carregado."
      }
    },
    shortcuts: {
      playPause: {
        action: "Reproduzir / Pausar",
        description: "Alterna a reprodução, compatível com players comuns de vídeo/áudio (suporta Alt+P)"
      },
      seekBack: {
        action: "Voltar 10 segundos",
        description: "Pula 10s para trás (segure para avanço contínuo)"
      },
      seekForward: {
        action: "Avançar 10 segundos",
        description: "Pula 10s para frente (segure para avanço contínuo)"
      },
      speedDecrease: {
        action: "Diminuir Velocidade",
        description: "Reduz para o nível de velocidade anterior"
      },
      speedIncrease: {
        action: "Aumentar Velocidade",
        description: "Avança para o próximo nível de velocidade"
      }
    }
  };

  // src/shared/i18n/locales/pt-PT.ts
  var ptPT = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Controlos e Leitura em Voz Alta",
      version: "v",
      openChatGPT: "Abrir ChatGPT",
      dashboard: "Painel de Controlo",
      seconds: "segundos",
      star: "★ Dar Estrela",
      docs: "Documentação",
      issues: "Reportar Problema"
    },
    popup: {
      header: {
        switchTheme: "Alternar Tema",
        openOptions: "Abrir Painel e Definições"
      },
      tabs: {
        controls: "Controlos",
        shortcuts: "Atalhos",
        about: "Sobre"
      },
      quickControls: {
        playbackSpeed: "Velocidade de Reprodução",
        defaultVolume: "Volume Predefinido",
        mute: "Sem Som",
        unmute: "Ativar Som",
        smartIntegrations: "Integrações Inteligentes",
        globalShortcuts: "Atalhos Globais de Teclado",
        globalShortcutsDesc: "Ativar Espaço/K, Alt+P, Alt+Setas e teclas de velocidade",
        smoothScrubbing: "Avanço contínuo ao premir",
        smoothScrubbingDesc: "Acelera o deslocamento mantendo premido ◀10 ou 10▶"
      },
      shortcuts: {
        title: "Atalhos de Teclado",
        gesturesTitle: "Gestos de Rato e Toque",
        smoothAudioScrub: "Avanço Contínuo de Áudio",
        directDownload: "Transferência Direta de Áudio",
        holdScrubKey: "Premir ◀10 / 10▶",
        clickDownloadKey: "Clicar no botão \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Código aberto por Infoxica",
        description: "Melhora a experiência de voz no ChatGPT com avanço contínuo, velocidades dinâmicas, transferências diretas de áudio e botões de leitura rápida.",
        privacyTitle: "100% Focado na Privacidade",
        privacyDesc: "Sem rastreadores nem telemetria. Tudo é executado localmente no seu navegador.",
        githubRepo: "Repositório no GitHub",
        documentation: "Documentação",
        reportIssue: "Reportar um Problema"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Painel e Configuração",
        preferences: "Preferências",
        shortcuts: "Atalhos e Gestos",
        faq: "Perguntas Frequentes",
        darkMode: "Modo Escuro",
        lightMode: "Modo Claro",
        githubRepo: "Repositório GitHub"
      },
      headers: {
        preferencesTitle: "Preferências de Áudio e Reprodução",
        preferencesDesc: "Configure o idioma da interface, velocidade predefinida, volume e funcionalidades inteligentes.",
        shortcutsTitle: "Atalhos de Teclado e Gestos",
        shortcutsDesc: "Domine os atalhos rápidos para controlar a reprodução com facilidade.",
        faqTitle: "Perguntas Frequentes e Resolução de Problemas",
        faqDesc: "Guia técnico detalhado, privacidade e suporte."
      },
      general: {
        languageTitle: "Idioma e Localização",
        languageDesc: "Escolha o idioma de apresentação ou permita que a extensão detete automaticamente o idioma do navegador.",
        languageAuto: "Detetar Automaticamente (Idioma do Navegador)",
        languageDetected: "Detetado",
        speedTitle: "Velocidade Predefinida de Reprodução",
        speedDesc: "Escolha a velocidade predefinida ao abrir o ChatGPT ou iniciar a Leitura em Voz Alta.",
        volumeTitle: "Nível de Volume Predefinido",
        volumeDesc: "Volume predefinido para transmissões de voz.",
        seekTitle: "Passo de Avanço e Recuo",
        seekDesc: "Número de segundos a saltar com um toque nos botões -10s / +10s ou Alt + Esquerda / Direita.",
        secondsUnit: "segundos"
      },
      shortcutsGuide: {
        title: "Guia de Atalhos de Teclado",
        desc: "Acelere o seu fluxo de trabalho com atalhos padrão do YouTube e controlos ergonómicos com uma mão.",
        gesturesTitle: "Gestos de Rato e Avanço Contínuo",
        gesturesDesc: "Prima os botões ◀10s ou 10s▶ para navegar por respostas longas com aceleração dinâmica:",
        gestureHold03: "Entra no modo de avanço contínuo (velocidade 4×).",
        gestureHold15: "Acelera para taxa de procura de 10×.",
        gestureHold30: "Salto de velocidade ultra rápida a 25×.",
        gestureRelease: "Solte para fixar imediatamente a posição pretendida."
      },
      faq: {
        title: "Perguntas Frequentes e Guia do Utilizador",
        subtitle: "Respostas rápidas para tirar o máximo partido do ChatGPT Audio Controls.",
        q1: "Como ajustar o volume utilizando a roda do rato?",
        a1: "Basta passar o cursor sobre o ícone do altifalante na barra do leitor e rodar a roda do rato para cima ou para baixo. O volume ajusta-se suavemente em incrementos de 5% sem abrir o controlo deslizante!",
        q2: "Onde aparece o leitor no ChatGPT?",
        a2: "O leitor fica posicionado convenientemente ao lado do campo de mensagem. Quando nenhum áudio está a reproduzir, um botão flutuante discreto permanece no lado direito; ao clicar nele ou iniciar a leitura, a barra expande-se.",
        q3: "Como posso transferir o áudio sintetizado?",
        a3: "Sempre que o ChatGPT ler uma resposta, clique no botão de transferência (\uD83D\uDCE5) na barra direita. O áudio é guardado instantaneamente em alta qualidade (.mp3, .m4a ou .wav) no seu computador.",
        q4: "Funciona em ecrãs pequenos de computadores portáteis?",
        a4: "Sim! O leitor deteta automaticamente a largura do ecrã e redimensiona a barra de procura de forma responsiva. Se o espaço for reduzido, o botão flutuante permite abrir e recolher o leitor a qualquer momento.",
        q5: "Como instalar via Tampermonkey com atualizações automáticas?",
        a5: "Se utiliza Tampermonkey, Violentmonkey ou Greasemonkey, pode instalar o script diretamente a partir do nosso repositório. O Tampermonkey verifica o GitHub e notifica quando for lançada uma nova versão.",
        q6: "As minhas conversas e mensagens são privadas?",
        a6: "100% Privadas. A extensão é executada inteiramente no seu dispositivo local. Nenhuma mensagem, resposta, áudio ou telemetria é enviada para servidores externos."
      }
    },
    content: {
      tooltips: {
        back: "Recuar {s} segundos — prima para avançar rápido",
        playPause: "Reproduzir / Pausar (Espaço ou K; Alt+P)",
        forward: "Avançar {s} segundos — prima para avançar rápido",
        speed: "Velocidade de reprodução",
        volume: "Volume (Rode o rato para ajustar)",
        volumeSlider: "Controlo de volume",
        download: "Transferir áudio",
        shortcuts: "Atalhos de teclado e gestos",
        collapse: "Recolher Leitor",
        expand: "Expandir controlos de áudio do ChatGPT",
        readAloud: "Ler resposta"
      },
      shortcutsPopover: {
        title: "Atalhos de Leitura",
        playPause: "Reproduzir / Pausar",
        back: "Recuar {s} s",
        forward: "Avançar {s} s",
        slower: "Mais lento",
        faster: "Mais rápido",
        volumeScroll: "Rolar para volume",
        smoothScrub: "Avanço contínuo",
        volumeScrollKey: "Rolar no \uD83D\uDD08",
        smoothScrubKey: "Premir ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Não foi possível transferir o áudio. Certifique-se de que o áudio está carregado."
      }
    },
    shortcuts: {
      playPause: {
        action: "Reproduzir / Pausar",
        description: "Alterna a reprodução, compatível com leitores comuns de vídeo/áudio (suporta Alt+P)"
      },
      seekBack: {
        action: "Recuar 10 segundos",
        description: "Salta 10s para trás (prima para avanço contínuo)"
      },
      seekForward: {
        action: "Avançar 10 segundos",
        description: "Salta 10s para a frente (prima para avanço contínuo)"
      },
      speedDecrease: {
        action: "Diminuir Velocidade",
        description: "Reduz para o nível de velocidade anterior"
      },
      speedIncrease: {
        action: "Aumentar Velocidade",
        description: "Avança para o próximo nível de velocidade"
      }
    }
  };

  // src/shared/i18n/locales/ru.ts
  var ru = {
    common: {
      extensionName: "ChatGPT Audio",
      extensionSubtitle: "Управление и Озвучивание",
      version: "v",
      openChatGPT: "Открыть ChatGPT",
      dashboard: "Панель управления",
      seconds: "секунд",
      star: "★ Оценить Star",
      docs: "Документация",
      issues: "Сообщить об ошибке"
    },
    popup: {
      header: {
        switchTheme: "Сменить тему",
        openOptions: "Открыть настройки и панель"
      },
      tabs: {
        controls: "Управление",
        shortcuts: "Клавиши",
        about: "О расширении"
      },
      quickControls: {
        playbackSpeed: "Скорость по умолчанию",
        defaultVolume: "Громкость по умолчанию",
        mute: "Выключить звук",
        unmute: "Включить звук",
        smartIntegrations: "Умные интеграции",
        globalShortcuts: "Глобальные горячие клавиши",
        globalShortcutsDesc: "Включить Пробел/K, Alt+P, Alt+Стрелки и клавиши скорости",
        smoothScrubbing: "Плавная перемотка при удержании",
        smoothScrubbingDesc: "Ускоренная перемотка аудио при удержании ◀10 или 10▶"
      },
      shortcuts: {
        title: "Горячие клавиши",
        gesturesTitle: "Мышь и жесты",
        smoothAudioScrub: "Плавная перемотка аудио",
        directDownload: "Прямое скачивание аудио",
        holdScrubKey: "Удерживать ◀10 / 10▶",
        clickDownloadKey: "Нажать кнопку \uD83D\uDCE5"
      },
      about: {
        title: "ChatGPT Audio Controls",
        byInfoxica: "Open Source проект от Infoxica",
        description: "Улучшает голосовое взаимодействие в ChatGPT: плавная перемотка, гибкая настройка скорости, прямое скачивание аудио и озвучивание в один клик.",
        privacyTitle: "100% Конфиденциальность",
        privacyDesc: "Без трекеров и телеметрии. Всё работает локально на вашем компьютере.",
        githubRepo: "Репозиторий на GitHub",
        documentation: "Документация",
        reportIssue: "Сообщить о проблеме"
      }
    },
    options: {
      nav: {
        dashboardTitle: "ChatGPT Audio",
        dashboardSubtitle: "Панель и Настройки",
        preferences: "Настройки",
        shortcuts: "Клавиши и Жесты",
        faq: "Частые вопросы (FAQ)",
        darkMode: "Темная тема",
        lightMode: "Светлая тема",
        githubRepo: "Репозиторий GitHub"
      },
      headers: {
        preferencesTitle: "Настройки звука и воспроизведения",
        preferencesDesc: "Настройте язык интерфейса, скорость воспроизведения по умолчанию, громкость и функции.",
        shortcutsTitle: "Горячие клавиши и жесты",
        shortcutsDesc: "Используйте быстрые клавиши для легкого управления воспроизведением аудио.",
        faqTitle: "Частые вопросы и решение проблем",
        faqDesc: "Подробное техническое руководство, безопасность и ответы службы поддержки."
      },
      general: {
        languageTitle: "Язык и локализация",
        languageDesc: "Выберите желаемый язык интерфейса или включите автоматическое определение языка браузера.",
        languageAuto: "Автоопределение (Язык браузера)",
        languageDetected: "Определено",
        speedTitle: "Скорость воспроизведения по умолчанию",
        speedDesc: "Выберите скорость при открытии ChatGPT или запуске озвучивания.",
        volumeTitle: "Уровень громкости по умолчанию",
        volumeDesc: "Предустановленная громкость для потоков синтеза речи.",
        seekTitle: "Шаг перемотки",
        seekDesc: "Количество секунд для пропуска при одном нажатии на кнопки -10s / +10s или Alt + Стрелка влево / вправо.",
        secondsUnit: "секунд"
      },
      shortcutsGuide: {
        title: "Справочник горячих клавиш",
        desc: "Ускорьте работу благодаря стандартным горячим клавишам YouTube и эргономичному управлению одной рукой.",
        gesturesTitle: "Жесты мыши и плавная перемотка",
        gesturesDesc: "Удерживайте кнопки ◀10s или 10s▶ для плавной перемотки длинных ответов с динамическим ускорением:",
        gestureHold03: "Вход в режим плавной перемотки (скорость 4×).",
        gestureHold15: "Ускорение перемотки до 10×.",
        gestureHold30: "Сверхбыстрый скачок со скоростью 25×.",
        gestureRelease: "Отпустите, чтобы зафиксировать нужную позицию."
      },
      faq: {
        title: "Часто задаваемые вопросы и руководство",
        subtitle: "Быстрые ответы для максимально эффективного использования ChatGPT Audio Controls.",
        q1: "Как регулировать громкость колесиком мыши?",
        a1: "Просто наведите курсор на значок динамика на панели плеера и прокрутите колесико мыши вверх или вниз. Громкость будет плавно меняться с шагом 5% без открытия слайдера!",
        q2: "Где отображается плеер в ChatGPT?",
        a2: "Плеер удобно расположен прямо рядом с полем ввода сообщений. Когда звук не воспроизводится, справа закреплена аккуратная плавающая кнопка; нажатие на нее или запуск озвучки раскрывает полную панель.",
        q3: "Как скачать синтезированный аудиофайл?",
        a3: "Когда ChatGPT читает ответ, нажмите кнопку скачивания (\uD83D\uDCE5) на панели справа. Аудиопоток сразу сохранится на ваш компьютер в высоком качестве (.mp3, .m4a или .wav).",
        q4: "Работает ли плеер на небольших экранах ноутбуков?",
        a4: "Да! Плеер автоматически определяет ширину экрана и масштабирует ползунок прогресса. Если места мало, плавающая кнопка позволяет легко скрывать и открывать плеер.",
        q5: "Как установить через Tampermonkey с автообновлением?",
        a5: "Если вы используете Tampermonkey, Violentmonkey или Greasemonkey, вы можете установить скрипт прямо из нашего репозитория. Tampermonkey будет проверять GitHub и уведомлять о выходе обновлений.",
        q6: "Конфиденциальны ли мои диалоги и запросы?",
        a6: "100% Конфиденциально. Расширение работает исключительно на вашем локальном устройстве. Никакие запросы, ответы, аудиопотоки или телеметрия не передаются на внешние серверы."
      }
    },
    content: {
      tooltips: {
        back: "Назад на {s} секунд — удерживайте для перемотки",
        playPause: "Воспроизведение / Пауза (Пробел или K; Alt+P)",
        forward: "Вперед на {s} секунд — удерживайте для перемотки",
        speed: "Скорость воспроизведения",
        volume: "Громкость (Прокрутка колесиком)",
        volumeSlider: "Регулятор громкости",
        download: "Скачать аудио",
        shortcuts: "Горячие клавиши и жесты",
        collapse: "Свернуть плеер",
        expand: "Развернуть ChatGPT Audio Controls",
        readAloud: "Озвучить ответ"
      },
      shortcutsPopover: {
        title: "Горячие клавиши озвучки",
        playPause: "Воспроизведение / Пауза",
        back: "Назад на {s} сек",
        forward: "Вперед на {s} сек",
        slower: "Замедлить",
        faster: "Ускорить",
        volumeScroll: "Прокрутка громкости",
        smoothScrub: "Плавная перемотка",
        volumeScrollKey: "Крутить над \uD83D\uDD08",
        smoothScrubKey: "Удерживать ◀{s} / {s}▶"
      },
      alerts: {
        downloadError: "Не удалось скачать аудио. Убедитесь, что воспроизведение загружено."
      }
    },
    shortcuts: {
      playPause: {
        action: "Воспроизведение / Пауза",
        description: "Переключение воспроизведения, совместимо со стандартными видеоплеерами (поддерживается Alt+P)"
      },
      seekBack: {
        action: "Назад на 10 секунд",
        description: "Перемотка на 10с назад (удерживайте для плавного перехода)"
      },
      seekForward: {
        action: "Вперед на 10 секунд",
        description: "Перемотка на 10с вперед (удерживайте для плавного перехода)"
      },
      speedDecrease: {
        action: "Уменьшить скорость",
        description: "Переход на предыдущий уровень скорости"
      },
      speedIncrease: {
        action: "Увеличить скорость",
        description: "Переход на следующий уровень скорости"
      }
    }
  };
  // src/shared/i18n/core.ts
  var LOCALES = {
    ...audience_default,
    ...expandedLocales,
    en,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    vi,
    th,
    es,
    "pt-BR": ptBR,
    "pt-PT": ptPT,
    ru,
    hi,
    fr,
    de,
    ja,
    ko,
    id,
    it,
    tr
  };
  function matchLocale(raw) {
    if (typeof raw !== "string")
      return;
    const [base, ...subtags] = raw.trim().replaceAll("_", "-").toLowerCase().split("-");
    if (base === "zh") {
      if (subtags.includes("hant"))
        return "zh-TW";
      if (subtags.includes("hans"))
        return "zh-CN";
      return subtags.some((tag) => ["tw", "hk", "mo"].includes(tag)) ? "zh-TW" : "zh-CN";
    }
    if (base === "pt")
      return subtags.includes("pt") ? "pt-PT" : "pt-BR";
    if (base === "no")
      return "nb";
    return Object.hasOwn(LOCALES, base) ? base : undefined;
  }
  function detectBrowserLanguage() {
    const candidates = [];
    if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
      try {
        const chromeLang = chrome.i18n.getUILanguage();
        if (chromeLang)
          candidates.push(chromeLang);
      } catch (_) {}
    }
    if (typeof navigator !== "undefined") {
      if (Array.isArray(navigator.languages)) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
    }
    for (const raw of candidates) {
      const matched = matchLocale(raw);
      if (matched)
        return matched;
    }
    return "en";
  }
  function resolveLanguage(lang) {
    return matchLocale(lang) || detectBrowserLanguage();
  }
  function getTranslations(lang) {
    const resolved = resolveLanguage(lang);
    return LOCALES[resolved] || en;
  }
  function languageDirection(language) {
    return directionForLocale(resolveLanguage(language));
  }

  // src/shared/i18n/expanded-release.ts
  var expandedRelease = {
    bn: [
      "ভাসমান নিয়ন্ত্রণ লুকান|লুকানো থাকলে|শুধু নিষ্ক্রিয় বুদবুদ লুকান|বুদবুদ ও প্লেয়ার লুকান|অডিও চলতে থাকবে। এখান থেকে বা শর্টকাট দিয়ে নিয়ন্ত্রণ ফিরিয়ে আনুন।|ভাসমান নিয়ন্ত্রণ দেখান / লুকান|নির্ধারিত নয়|শর্টকাট বদলান|প্লেব্যাক কী ChatGPT-এর লেখার ঘরের বাইরে কাজ করে। দেখানো/লুকানোর শর্টকাট লেখার সময়ও চলে।|শোনা শুরু করুন|ChatGPT খুলে সম্পূর্ণ উত্তরে পড়ে শোনানো চালু করুন। প্লেয়ার দিয়ে বিরতি, সিকিং, গতি বদল বা ডাউনলোড করুন।|বুঝেছি|সহায়তা ও সমস্যা সমাধান|পড়ে শোনানো শুরু হচ্ছে…|উত্তরের পাশে ChatGPT-এর পড়ে শোনানোর বোতাম চাপুন।|আবার চালানো যায়নি। উত্তরের পড়ে শোনানোর বোতাম দিয়ে শুরু করুন।|অডিও ডাউনলোড হয়নি। পড়ে শোনানো চালিয়ে অডিও লোড হওয়ার পরে আবার চেষ্টা করুন।|ডাউনলোড প্রস্তুত হচ্ছে…|সেটিং সংরক্ষণ হয়নি। আবার চেষ্টা করুন।|ডাউনলোডে ChatGPT-এর দেওয়া অডিও ফরম্যাট ব্যবহৃত হয়। এক্সটেনশন ফরম্যাট বদলায় না।|জায়গা কম হলে লেখার বাক্সের ওপরে দুটি পিল দেখায়।",
      "আপনার চলে যাওয়ায় দুঃখিত \uD83D\uDC9B|ChatGPT অডিও নিয়ন্ত্রণ ব্যবহার করার জন্য ধন্যবাদ। কী উন্নত করতে পারি?|একটি কারণ বেছে পাঠান। লেখার দরকার নেই।|ঠিকমতো কাজ করেনি।|বুদবুদ বা প্লেয়ার বাধা দিয়েছে।|ChatGPT বা ব্রাউজার ধীর হয়েছে।|ব্যবহার কঠিন ছিল।|প্রয়োজনীয় বৈশিষ্ট্য ছিল না।|আমার ভাষা ভালোভাবে সমর্থিত ছিল না।|আর দরকার নেই।|অন্য কারণ।|মন্তব্য যোগ করুন — ঐচ্ছিক|কথোপকথন বা ব্যক্তিগত তথ্য দেবেন না। সর্বোচ্চ 1,000 অক্ষর।|মতামত পাঠান|কী উন্নত করা যায় জানান। বিভাগ বেছে চাইলে মন্তব্য যোগ করুন।|ত্রুটি জানান|উন্নতির প্রস্তাব দিন|ধন্যবাদ। আপনার মতামত সংরক্ষিত হয়েছে।|পাঠানো হচ্ছে…|মতামত এড়িয়ে যান|উন্নতিতে সাহায্য করার জন্য ধন্যবাদ। আবার স্বাগতম।|ব্যবহার করার জন্য ধন্যবাদ। ভালো থাকুন!|মতামত নিশ্চিত হয়নি। আবার চেষ্টা করুন; আপনার উত্তর এখানেই আছে।|মতামত পাঠাতে একটি কারণ বাছুন।|মতামত ঐচ্ছিক ও ব্যক্তিগত; নাম বা ইমেল লাগে না। অ্যাপ ও ডিভাইসের সাধারণ তথ্য সমস্যা বুঝতে সাহায্য করে। ব্যক্তিগত তথ্য বা কথোপকথন দেবেন না।",
      "চেহারা|সিস্টেম|হালকা|গাঢ়|ভাষা|ChatGPT পড়ে শোনানো, সুবিধাজনক নিয়ন্ত্রণসহ।|বিরতি দিন, পেছান, গতি বদলান ও অডিও ডাউনলোড করুন। শুনতে শুনতে কথোপকথনে থাকুন।|Chrome-এর জন্য নিন|Edge-এর জন্য নিন|ডেস্কটপ Chrome, Edge ও সামঞ্জস্যপূর্ণ ব্রাউজারের জন্য। ইনস্টল করতে কম্পিউটারে খুলুন।|নিজের মতো শুনুন|ভালোভাবে শোনার তিন ধাপ|ব্রাউজারের স্টোর থেকে এক্সটেনশন ইনস্টল করুন।|ChatGPT খুলে সম্পূর্ণ উত্তরে পড়ে শোনানো চালু করুন।|প্লেয়ারে বিরতি, সিকিং, গতি বদল বা অডিও সংরক্ষণ করুন।|গোপনীয়তা|এক্সটেনশনে অ্যানালিটিক্স বা টেলিমেট্রি নেই। অডিও ও কথোপকথন ব্রাউজারেই থাকে। ব্রাউজার সিঙ্ক পছন্দসমূহ সিঙ্ক করতে পারে।|Infoxica-র স্বাধীন মুক্ত সোর্স প্রকল্প। OpenAI-এর সঙ্গে যুক্ত বা অনুমোদিত নয়।|ওয়েবসাইট আরও উপযোগী করতে সাহায্য করুন|কোন পৃষ্ঠা কাজে লাগে ও মানুষ কীভাবে এক্সটেনশন খুঁজে পান তা জানতে চাই। ওয়েবসাইট ভিজিট ও স্টোর লিঙ্কের ক্লিক মাপতে Google Analytics অনুমতি দেবেন? এক্সটেনশন ও আনইনস্টল সমীক্ষায় অ্যানালিটিক্স নেই। যেকোনো সময় সিদ্ধান্ত বদলাতে পারেন।|অ্যানালিটিক্স অনুমোদন|না, ধন্যবাদ|অ্যানালিটিক্স পছন্দ|অনুমতি দিলেই ওয়েবসাইট Google Analytics ব্যবহার করে। এটি ভিজিট ও স্টোর লিঙ্কের ক্লিক মাপে; ইনস্টল বা এক্সটেনশন ব্যবহার নয়। অ্যানালিটিক্স পছন্দ থেকে অনুমতি তুলে নিতে পারেন।|আনইনস্টলের পরেও মতামত ঐচ্ছিক ও ব্যক্তিগত। নাম বা ইমেল লাগে না। ব্যক্তিগত তথ্য বা কথোপকথন দেবেন না।|ChatGPT পড়ে শোনানোর প্লেব্যাক নিয়ন্ত্রণ|বর্তমান সংস্করণের জন্য স্টোর দেখুন।|অফিসিয়াল ওয়েবসাইট"
    ].join("|").split("|"),
    mr: [
      "तरंगती नियंत्रणे लपवा|लपवताना|फक्त निष्क्रिय बबल लपवा|बबल व प्लेयर लपवा|ऑडिओ सुरू राहतो. येथून किंवा शॉर्टकटने नियंत्रणे परत आणा.|तरंगती नियंत्रणे दाखवा / लपवा|नेमलेले नाही|शॉर्टकट बदला|प्लेबॅक कळा ChatGPT मधील मजकूर क्षेत्राबाहेर काम करतात. दाखवणे/लपवणे शॉर्टकट टाइप करतानाही चालतो.|ऐकणे सुरू करा|ChatGPT उघडून पूर्ण उत्तरावर वाचून दाखवणे सुरू करा. प्लेयरने विराम, सीकिंग, वेग बदल किंवा डाउनलोड करा.|समजले|मदत व समस्या निवारण|वाचून दाखवणे सुरू होत आहे…|उत्तराशेजारचे ChatGPT चे वाचून दाखवा बटण वापरा.|पुन्हा सुरू करता आले नाही. उत्तराचे वाचून दाखवा बटण वापरा.|ऑडिओ डाउनलोड झाला नाही. वाचून दाखवणे सुरू करून ऑडिओ लोड झाल्यावर पुन्हा प्रयत्न करा.|डाउनलोड तयार होत आहे…|सेटिंग जतन झाले नाही. पुन्हा प्रयत्न करा.|डाउनलोडसाठी ChatGPT ने दिलेले ऑडिओ स्वरूप वापरले जाते. विस्तार स्वरूप बदलत नाही.|जागा कमी असल्यास संदेश चौकटीवर दोन पिल दिसतात.",
      "तुम्ही जात आहात याचे वाईट वाटते \uD83D\uDC9B|ChatGPT ऑडिओ नियंत्रणे वापरल्याबद्दल धन्यवाद. आम्ही काय सुधारू शकतो?|एक कारण निवडून पाठवा. टाइप करणे आवश्यक नाही.|योग्य काम केले नाही.|बबल किंवा प्लेयर अडथळा ठरला.|ChatGPT किंवा ब्राउझर मंद झाला.|वापरणे कठीण होते.|हवे असलेले वैशिष्ट्य नव्हते.|माझ्या भाषेला पुरेसे समर्थन नव्हते.|आता गरज नाही.|दुसरे कारण.|नोंद जोडा — ऐच्छिक|संभाषण किंवा वैयक्तिक तपशील देऊ नका. जास्तीत जास्त 1,000 अक्षरे.|अभिप्राय पाठवा|काय सुधारता येईल ते सांगा. प्रकार निवडा व हवे असल्यास नोंद जोडा.|दोष कळवा|सुधारणा सुचवा|धन्यवाद. तुमचा अभिप्राय जतन झाला.|पाठवत आहे…|अभिप्राय वगळा|सुधारणेस मदत केल्याबद्दल धन्यवाद. पुन्हा आपले स्वागत आहे.|वापरून पाहिल्याबद्दल धन्यवाद. काळजी घ्या!|अभिप्रायाची पुष्टी झाली नाही. पुन्हा प्रयत्न करा; तुमचे उत्तर येथेच आहे.|अभिप्रायासाठी एक कारण निवडा.|अभिप्राय ऐच्छिक व खाजगी आहे; नाव किंवा ईमेल लागत नाही. अॅप व डिव्हाइसची साधी माहिती समस्या समजण्यास मदत करते. वैयक्तिक माहिती किंवा संभाषणे देऊ नका.",
      "दिसणे|सिस्टम|फिकट|गडद|भाषा|ChatGPT वाचून दाखवणे, सोयीच्या नियंत्रणांसह.|विराम द्या, मागे जा, वेग बदला व ऑडिओ डाउनलोड करा. ऐकत असताना संभाषणात रहा.|Chrome साठी मिळवा|Edge साठी मिळवा|डेस्कटॉप Chrome, Edge व सुसंगत ब्राउझरसाठी. स्थापित करण्यासाठी संगणकावर उघडा.|तुमच्या पद्धतीने ऐका|चांगल्या ऐकण्याच्या तीन पायऱ्या|ब्राउझरच्या स्टोअरमधून विस्तार स्थापित करा.|ChatGPT उघडून पूर्ण उत्तरावर वाचून दाखवणे सुरू करा.|प्लेयरने विराम, सीकिंग, वेग बदल किंवा ऑडिओ जतन करा.|गोपनीयता|विस्तारात विश्लेषण किंवा टेलिमेट्री नाही. ऑडिओ व संभाषणे ब्राउझरमध्येच राहतात. ब्राउझर सिंक प्राधान्ये समक्रमित करू शकते.|Infoxica चा स्वतंत्र मुक्त-स्रोत प्रकल्प. OpenAI शी संलग्न किंवा त्यांच्याकडून मान्यताप्राप्त नाही.|वेबसाइट अधिक उपयुक्त करण्यास मदत करा|उपयुक्त पाने व विस्तार कसा सापडतो हे समजण्यासाठी वेबसाइट भेटी व स्टोअर दुव्यांवरील क्लिक मोजण्याची Google Analytics ला परवानगी द्याल का? विस्तार व विस्थापन सर्वेक्षणात विश्लेषण नाही. निर्णय कधीही बदलू शकता.|विश्लेषणाला परवानगी|नको, धन्यवाद|विश्लेषण प्राधान्ये|परवानगी दिल्यावरच वेबसाइट Google Analytics वापरते. भेटी व स्टोअर क्लिक मोजले जातात; स्थापना किंवा विस्ताराचा वापर नाही. विश्लेषण प्राधान्यांतून परवानगी मागे घेता येते.|विस्थापनेनंतरही अभिप्राय ऐच्छिक व खाजगी असतो. नाव किंवा ईमेल लागत नाही. वैयक्तिक तपशील किंवा संभाषणे देऊ नका.|ChatGPT वाचून दाखवण्याची प्लेबॅक नियंत्रणे|सध्या उपलब्ध आवृत्तीसाठी स्टोअर तपासा.|अधिकृत वेबसाइट"
    ].join("|").split("|"),
    te: [
      "తేలియాడే నియంత్రణలను దాచు|దాచినప్పుడు|నిష్క్రియ బుడగను మాత్రమే దాచు|బుడగను మరియు ప్లేయర్‌ను దాచు|ఆడియో కొనసాగుతుంది. ఇక్కడ లేదా షార్ట్‌కట్‌తో నియంత్రణలను తిరిగి చూపండి.|తేలియాడే నియంత్రణలను చూపు / దాచు|కేటాయించలేదు|షార్ట్‌కట్ మార్చు|ప్లేబ్యాక్ కీలు ChatGPTలో టెక్స్ట్ ఫీల్డ్‌ల బయట పనిచేస్తాయి. చూపు/దాచు షార్ట్‌కట్ టైప్ చేసేటప్పుడు కూడా పనిచేస్తుంది.|వినడం ప్రారంభించండి|ChatGPT తెరిచి పూర్తయిన సమాధానంపై చదివి వినిపించడం ప్రారంభించండి. ప్లేయర్‌తో విరామం, సీకింగ్, వేగం లేదా డౌన్‌లోడ్ నియంత్రించండి.|అర్థమైంది|సహాయం మరియు పరిష్కారాలు|చదివి వినిపించడం ప్రారంభమవుతోంది…|సమాధానం పక్కన ఉన్న ChatGPT చదివి వినిపించే బటన్ వాడండి.|మళ్లీ ప్లే కాలేదు. సమాధానంలోని చదివి వినిపించే బటన్‌తో ప్రారంభించండి.|ఆడియో డౌన్‌లోడ్ కాలేదు. చదివి వినిపించడం ప్రారంభించి ఆడియో లోడ్ అయిన తర్వాత ప్రయత్నించండి.|డౌన్‌లోడ్ సిద్ధమవుతోంది…|సెట్టింగ్ సేవ్ కాలేదు. మళ్లీ ప్రయత్నించండి.|డౌన్‌లోడ్‌లు ChatGPT ఇచ్చిన ఆడియో ఫార్మాట్‌నే వాడతాయి. పొడిగింపు ఫార్మాట్ మార్చదు.|స్థలం తక్కువగా ఉంటే సందేశ పెట్టె పైన రెండు పిల్‌లు కనిపిస్తాయి.",
      "మీరు వెళ్లిపోతున్నందుకు విచారం \uD83D\uDC9B|ChatGPT ఆడియో నియంత్రణలు ప్రయత్నించినందుకు ధన్యవాదాలు. ఏమి మెరుగుపరచవచ్చు?|ఒక కారణం ఎంచుకుని పంపండి. టైప్ చేయాల్సిన అవసరం లేదు.|సరిగ్గా పని చేయలేదు.|బుడగ లేదా ప్లేయర్ అడ్డుగా ఉంది.|ChatGPT లేదా బ్రౌజర్ నెమ్మదించింది.|వాడటం కష్టంగా ఉంది.|అవసరమైన ఫీచర్ లేదు.|నా భాషకు తగిన మద్దతు లేదు.|ఇక అవసరం లేదు.|వేరే కారణం.|గమనిక జోడించండి — ఐచ్ఛికం|సంభాషణలు లేదా వ్యక్తిగత వివరాలు చేర్చవద్దు. గరిష్ఠం 1,000 అక్షరాలు.|అభిప్రాయం పంపండి|ఏది మెరుగుపడాలో చెప్పండి. వర్గం ఎంచుకుని కావాలంటే గమనిక జోడించండి.|లోపం నివేదించండి|మెరుగుదల సూచించండి|ధన్యవాదాలు. మీ అభిప్రాయం సేవ్ అయింది.|పంపుతోంది…|అభిప్రాయం దాటవేయి|మెరుగుపరచడానికి సహకరించినందుకు ధన్యవాదాలు. మళ్లీ స్వాగతం.|ప్రయత్నించినందుకు ధన్యవాదాలు. జాగ్రత్త!|అభిప్రాయం నిర్ధారించబడలేదు. మళ్లీ ప్రయత్నించండి; మీ సమాధానం ఇక్కడే ఉంది.|అభిప్రాయం పంపడానికి ఒక కారణం ఎంచుకోండి.|అభిప్రాయం ఐచ్ఛికం మరియు గోప్యం; పేరు లేదా ఇమెయిల్ అవసరం లేదు. సాధారణ యాప్, పరికర వివరాలు సమస్యలను అర్థం చేసుకోవడానికి ఉపయోగపడతాయి. వ్యక్తిగత వివరాలు లేదా సంభాషణలు చేర్చవద్దు.",
      "రూపం|సిస్టమ్|లైట్|డార్క్|భాష|సులభ నియంత్రణలతో ChatGPT చదివి వినిపించడం.|విరామం ఇవ్వండి, వెనక్కు జరపండి, వేగం మార్చండి, ఆడియో డౌన్‌లోడ్ చేయండి. వింటూనే సంభాషణలో ఉండండి.|Chrome కోసం పొందండి|Edge కోసం పొందండి|డెస్క్‌టాప్ Chrome, Edge మరియు అనుకూల బ్రౌజర్‌ల కోసం. ఇన్‌స్టాల్ చేయడానికి కంప్యూటర్‌లో తెరవండి.|మీకు నచ్చినట్లు వినండి|మెరుగ్గా వినడానికి మూడు దశలు|బ్రౌజర్ స్టోర్ నుంచి పొడిగింపును ఇన్‌స్టాల్ చేయండి.|ChatGPT తెరిచి పూర్తయిన సమాధానంపై చదివి వినిపించడం ప్రారంభించండి.|ప్లేయర్ నుంచి విరామం, సీకింగ్, వేగం లేదా ఆడియో సేవ్ చేయడం నియంత్రించండి.|గోప్యత|పొడిగింపులో అనలిటిక్స్ లేదా టెలిమెట్రీ లేదు. ఆడియో, సంభాషణలు బ్రౌజర్‌లోనే ఉంటాయి. బ్రౌజర్ సింక్ ప్రాధాన్యతలను సమకాలీకరించవచ్చు.|Infoxica స్వతంత్ర ఓపెన్ సోర్స్ ప్రాజెక్ట్. OpenAIతో అనుబంధం లేదా ఆమోదం లేదు.|వెబ్‌సైట్‌ను మరింత ఉపయోగకరంగా చేయడంలో సహకరించండి|ఏ పేజీలు ఉపయోగపడుతున్నాయో, ప్రజలు పొడిగింపును ఎలా కనుగొంటున్నారో తెలుసుకోవడానికి సందర్శనలు మరియు స్టోర్ లింక్ క్లిక్‌లను Google Analytics కొలవడానికి అనుమతిస్తారా? పొడిగింపులో, అన్‌ఇన్‌స్టాల్ సర్వేలో అనలిటిక్స్ లేదు. మీ ఎంపికను ఎప్పుడైనా మార్చవచ్చు.|అనలిటిక్స్ అనుమతించు|వద్దు, ధన్యవాదాలు|అనలిటిక్స్ ప్రాధాన్యతలు|మీ అనుమతి తర్వాతే వెబ్‌సైట్ Google Analytics వాడుతుంది. సందర్శనలు, స్టోర్ క్లిక్‌లను కొలుస్తుంది; ఇన్‌స్టాల్‌లు లేదా పొడిగింపు వాడకాన్ని కాదు. అనలిటిక్స్ ప్రాధాన్యతల్లో అనుమతిని తీసివేయవచ్చు.|అన్‌ఇన్‌స్టాల్ తర్వాత కూడా అభిప్రాయం ఐచ్ఛికం, గోప్యం. పేరు లేదా ఇమెయిల్ అవసరం లేదు. వ్యక్తిగత వివరాలు లేదా సంభాషణలు చేర్చవద్దు.|ChatGPT చదివి వినిపించే ప్లేబ్యాక్ నియంత్రణలు|ప్రస్తుతం అందుబాటులో ఉన్న వెర్షన్ కోసం స్టోర్ చూడండి.|అధికారిక వెబ్‌సైట్"
    ].join("|").split("|"),
    ta: [
      "மிதக்கும் கட்டுப்பாடுகளை மறை|மறைக்கும்போது|செயலற்ற குமிழியை மட்டும் மறை|குமிழியையும் பிளேயரையும் மறை|ஒலி தொடரும். இங்கே அல்லது குறுக்குவழியால் கட்டுப்பாடுகளை மீட்டெடுக்கவும்.|மிதக்கும் கட்டுப்பாடுகளைக் காட்டு / மறை|ஒதுக்கப்படவில்லை|குறுக்குவழியை மாற்று|ChatGPTயில் உரைப் புலங்களுக்கு வெளியே பின்னணி விசைகள் இயங்கும். காட்டு/மறை குறுக்குவழி தட்டச்சின்போதும் இயங்கும்.|கேட்கத் தொடங்கவும்|ChatGPT திறந்து முடிந்த பதிலில் உரக்க வாசித்தலைத் தொடங்கவும். பிளேயரில் இடைநிறுத்தம், நகர்த்தல், வேகம் அல்லது பதிவிறக்கத்தைப் பயன்படுத்தவும்.|புரிந்தது|உதவி மற்றும் சிக்கல் தீர்வு|உரக்க வாசித்தல் தொடங்குகிறது…|பதிலின் அருகிலுள்ள ChatGPT உரக்க வாசிக்கும் பொத்தானைப் பயன்படுத்தவும்.|மீண்டும் இயக்க முடியவில்லை. பதிலின் உரக்க வாசிக்கும் பொத்தானைப் பயன்படுத்தவும்.|ஒலியைப் பதிவிறக்க முடியவில்லை. உரக்க வாசித்தலைத் தொடங்கி ஒலி ஏறியதும் மீண்டும் முயலவும்.|பதிவிறக்கம் தயாராகிறது…|அமைப்பைச் சேமிக்க முடியவில்லை. மீண்டும் முயலவும்.|ChatGPT வழங்கிய ஒலி வடிவமே பதிவிறக்கத்தில் பயன்படும். நீட்டிப்பு வடிவத்தை மாற்றாது.|இடம் குறைந்தால் செய்திப் பெட்டிக்கு மேலே இரண்டு பட்டைகள் தோன்றும்.",
      "நீங்கள் வெளியேறுவது வருத்தமாக உள்ளது \uD83D\uDC9B|ChatGPT ஒலிக் கட்டுப்பாடுகளை முயன்றதற்கு நன்றி. எதை மேம்படுத்தலாம்?|ஒரு காரணத்தைத் தேர்ந்தெடுத்து அனுப்பவும். தட்டச்சு தேவையில்லை.|சரியாக இயங்கவில்லை.|குமிழி அல்லது பிளேயர் இடையூறாக இருந்தது.|ChatGPT அல்லது உலாவி மெதுவானது.|பயன்படுத்தக் கடினமாக இருந்தது.|தேவையான அம்சம் இல்லை.|எனது மொழிக்குப் போதிய ஆதரவு இல்லை.|இனி தேவையில்லை.|வேறு காரணம்.|குறிப்பு சேர்க்கவும் — விருப்பத்தேர்வு|உரையாடல் அல்லது தனிப்பட்ட விவரங்களைச் சேர்க்க வேண்டாம். அதிகபட்சம் 1,000 எழுத்துகள்.|கருத்தை அனுப்பு|எதை மேம்படுத்தலாம் எனக் கூறவும். வகையைத் தேர்ந்தெடுத்து விரும்பினால் குறிப்பு சேர்க்கவும்.|பிழையைப் புகாரளி|மேம்பாட்டைப் பரிந்துரை|நன்றி. உங்கள் கருத்து சேமிக்கப்பட்டது.|அனுப்புகிறது…|கருத்தைத் தவிர்|மேம்படுத்த உதவியதற்கு நன்றி. மீண்டும் வரவேற்கிறோம்.|முயன்றதற்கு நன்றி. நலமாக இருங்கள்!|கருத்து உறுதியாகவில்லை. மீண்டும் முயலவும்; உங்கள் பதில் இங்கேயே உள்ளது.|கருத்து அனுப்ப ஒரு காரணத்தைத் தேர்ந்தெடுக்கவும்.|கருத்து விருப்பத்தேர்வும் தனிப்பட்டதும் ஆகும்; பெயர் அல்லது மின்னஞ்சல் தேவையில்லை. அடிப்படை செயலி, சாதன விவரங்கள் சிக்கலைப் புரிந்துகொள்ள உதவும். தனிப்பட்ட விவரங்கள் அல்லது உரையாடல்களைச் சேர்க்க வேண்டாம்.",
      "தோற்றம்|கணினி|வெளிர்|இருண்ட|மொழி|எளிய கட்டுப்பாடுகளுடன் ChatGPT உரக்க வாசித்தல்.|இடைநிறுத்தவும், பின்னே செல்லவும், வேகம் மாற்றவும், ஒலியைப் பதிவிறக்கவும். கேட்டபடியே உரையாடலில் இருங்கள்.|Chromeக்குப் பெறவும்|Edgeக்குப் பெறவும்|டெஸ்க்டாப் Chrome, Edge மற்றும் இணக்கமான உலாவிகளுக்கானது. நிறுவ கணினியில் திறக்கவும்.|உங்கள் விருப்பப்படி கேளுங்கள்|சிறப்பாகக் கேட்க மூன்று படிகள்|உலாவியின் அங்காடியிலிருந்து நீட்டிப்பை நிறுவவும்.|ChatGPT திறந்து முடிந்த பதிலில் உரக்க வாசித்தலைத் தொடங்கவும்.|பிளேயரில் இடைநிறுத்தவும், நகர்த்தவும், வேகம் மாற்றவும் அல்லது ஒலியைச் சேமிக்கவும்.|தனியுரிமை|நீட்டிப்பில் பகுப்பாய்வும் தொலைதரவுச் சேகரிப்பும் இல்லை. ஒலியும் உரையாடல்களும் உலாவியிலேயே இருக்கும். உலாவி ஒத்திசைவு விருப்பங்களை ஒத்திசைக்கலாம்.|Infoxicaவின் சுதந்திர திறந்த மூலத் திட்டம். OpenAI உடன் தொடர்போ அங்கீகாரமோ இல்லை.|இந்த இணையதளத்தை மேம்படுத்த உதவவும்|எந்தப் பக்கங்கள் பயன்படுகின்றன, மக்கள் நீட்டிப்பை எப்படிக் கண்டறிகிறார்கள் என்பதை அறிய வருகைகள் மற்றும் அங்காடி இணைப்பு கிளிக்குகளை Google Analytics அளவிட அனுமதிப்பீர்களா? நீட்டிப்பிலும் நீக்கல் கருத்துக்கணிப்பிலும் பகுப்பாய்வு இல்லை. எப்போது வேண்டுமானாலும் தேர்வை மாற்றலாம்.|பகுப்பாய்வை அனுமதி|வேண்டாம், நன்றி|பகுப்பாய்வு விருப்பங்கள்|உங்கள் அனுமதிக்குப் பிறகே இணையதளம் Google Analytics பயன்படுத்தும். வருகைகளையும் அங்காடி கிளிக்குகளையும் அளவிடும்; நிறுவல்களையோ நீட்டிப்பு பயன்பாட்டையோ அல்ல. பகுப்பாய்வு விருப்பங்களில் அனுமதியைத் திரும்பப் பெறலாம்.|நீக்கிய பிறகும் கருத்து விருப்பத்தேர்வும் தனிப்பட்டதும் ஆகும். பெயர் அல்லது மின்னஞ்சல் தேவையில்லை. தனிப்பட்ட விவரங்கள் அல்லது உரையாடல்களைச் சேர்க்க வேண்டாம்.|ChatGPT உரக்க வாசித்தல் கட்டுப்பாடுகள்|தற்போதைய பதிப்பை அங்காடியில் பார்க்கவும்.|அதிகாரப்பூர்வ இணையதளம்"
    ].join("|").split("|"),
    ar: [
      "إخفاء أدوات التحكم العائمة|عند الإخفاء|إخفاء الفقاعة الخاملة فقط|إخفاء الفقاعة والمشغّل|يستمر الصوت. أعد أدوات التحكم من هنا أو بالاختصار.|إظهار / إخفاء أدوات التحكم العائمة|غير معيّن|تخصيص الاختصار|تعمل مفاتيح التشغيل خارج حقول النص في ChatGPT. يعمل اختصار الإظهار أثناء الكتابة أيضاً.|ابدأ الاستماع|افتح ChatGPT وابدأ القراءة بصوت عالٍ لرد مكتمل. استخدم المشغّل للإيقاف المؤقت والتنقل وتغيير السرعة والتنزيل.|فهمت|المساعدة وحل المشكلات|جارٍ بدء القراءة بصوت عالٍ…|ابدأ بزر القراءة بصوت عالٍ بجانب الرد في ChatGPT.|تعذر استئناف التشغيل. ابدأ مجدداً بزر القراءة بجانب الرد.|تعذر تنزيل الصوت. ابدأ القراءة وانتظر تحميل الصوت ثم أعد المحاولة.|جارٍ تحضير التنزيل…|تعذر حفظ الإعداد. أعد المحاولة.|تستخدم التنزيلات الصيغة التي يوفرها ChatGPT. لا تحوّل الإضافة صيغة الصوت.|عند ضيق المساحة يظهر شريطان فوق مربع الرسالة.",
      "نأسف لمغادرتك \uD83D\uDC9B|شكراً لتجربة أدوات صوت ChatGPT. ما الذي يمكن تحسينه؟|اختر سبباً وأرسله. لا حاجة للكتابة.|لم يعمل بشكل صحيح.|كانت الفقاعة أو المشغّل عائقاً.|أبطأ ChatGPT أو المتصفح.|كان صعب الاستخدام.|افتقد ميزة أحتاجها.|لم يدعم لغتي جيداً.|لم أعد أحتاجه.|سبب آخر.|إضافة ملاحظة — اختياري|لا تدرج محادثات أو تفاصيل شخصية. الحد الأقصى 1,000 حرف.|إرسال الملاحظات|أخبرنا بما يمكن تحسينه. اختر فئة وأضف ملاحظة اختيارية.|الإبلاغ عن خلل|اقتراح تحسين|شكراً. تم حفظ ملاحظاتك.|جارٍ الإرسال…|تخطي الملاحظات|شكراً لمساعدتنا على التحسين. نرحب بعودتك دائماً.|شكراً لتجربتنا. مع السلامة!|لم يتأكد إرسال الملاحظات. أعد المحاولة؛ إجابتك ما زالت هنا.|اختر سبباً لإرسال الملاحظات.|ملاحظاتك اختيارية وخاصة؛ لا يلزم اسم أو بريد إلكتروني. تساعد معلومات التطبيق والجهاز الأساسية في فهم المشكلات. لا تدرج بيانات شخصية أو محادثات.",
      "المظهر|النظام|فاتح|داكن|اللغة|قراءة ChatGPT بصوت عالٍ، مع أدوات تحكم عملية.|أوقف مؤقتاً وأرجع وغيّر السرعة ونزّل الصوت. تابع المحادثة أثناء الاستماع.|احصل عليه لمتصفح Chrome|احصل عليه لمتصفح Edge|لمتصفحات Chrome وEdge والمتصفحات المتوافقة على الكمبيوتر. افتح الصفحة على الكمبيوتر للتثبيت.|استمع بطريقتك|ثلاث خطوات لاستماع أفضل|ثبّت الإضافة من متجر المتصفح.|افتح ChatGPT وابدأ القراءة بصوت عالٍ لرد مكتمل.|أوقف مؤقتاً وتنقل وغيّر السرعة أو احفظ الصوت من المشغّل.|الخصوصية|لا تحليلات أو قياس عن بُعد في الإضافة. يبقى الصوت والمحادثات في المتصفح. قد تزامن خدمة المتصفح التفضيلات.|مشروع مستقل مفتوح المصدر من Infoxica. غير تابع لـOpenAI وغير معتمد منها.|ساعدنا في تحسين هذا الموقع|هل تسمح لـGoogle Analytics بقياس زيارات الموقع ونقرات روابط المتاجر لفهم الصفحات المفيدة وكيفية اكتشاف الإضافة؟ لا تحليلات في الإضافة أو استبيان الإزالة. يمكنك تغيير اختيارك متى شئت.|السماح بالتحليلات|لا، شكراً|تفضيلات التحليلات|يستخدم الموقع Google Analytics بعد موافقتك فقط لقياس الزيارات ونقرات المتاجر، وليس التثبيت أو استخدام الإضافة. يمكنك سحب الموافقة من تفضيلات التحليلات.|الملاحظات اختيارية وخاصة حتى بعد الإزالة. لا يلزم اسم أو بريد إلكتروني. لا تدرج بيانات شخصية أو محادثات.|أدوات تشغيل القراءة بصوت عالٍ في ChatGPT|تحقق من المتجر لمعرفة الإصدار المتاح حالياً.|الموقع الرسمي"
    ].join("|").split("|"),
    fa: [
      "پنهان کردن کنترل‌های شناور|هنگام پنهان بودن|فقط حباب غیرفعال پنهان شود|حباب و پخش‌کننده پنهان شوند|صدا ادامه دارد. کنترل‌ها را از اینجا یا با میان‌بر برگردانید.|نمایش / پنهان کردن کنترل‌های شناور|تعیین نشده|تنظیم میان‌بر|کلیدهای پخش بیرون از کادرهای متن ChatGPT کار می‌کنند. میان‌بر نمایش هنگام تایپ هم کار می‌کند.|شروع گوش دادن|ChatGPT را باز کنید و بلندخوانی یک پاسخ کامل را شروع کنید. با پخش‌کننده مکث کنید، جابه‌جا شوید، سرعت را تغییر دهید یا دانلود کنید.|متوجه شدم|راهنما و رفع اشکال|در حال شروع بلندخوانی…|با دکمه بلندخوانی ChatGPT کنار پاسخ شروع کنید.|ادامه پخش ممکن نشد. دوباره از دکمه بلندخوانی کنار پاسخ شروع کنید.|دانلود صدا ممکن نشد. بلندخوانی را شروع کنید و پس از بارگیری صدا دوباره تلاش کنید.|در حال آماده‌سازی دانلود…|تنظیم ذخیره نشد. دوباره تلاش کنید.|دانلودها از قالب صدای ارائه‌شده توسط ChatGPT استفاده می‌کنند. افزونه قالب صدا را تبدیل نمی‌کند.|در فضای کم دو نوار بالای کادر پیام ظاهر می‌شوند.",
      "از رفتنتان متأسفیم \uD83D\uDC9B|از امتحان کنترل‌های صدای ChatGPT سپاسگزاریم. چه چیزی را بهتر کنیم؟|یک دلیل انتخاب و ارسال کنید. نیازی به تایپ نیست.|درست کار نمی‌کرد.|حباب یا پخش‌کننده مزاحم بود.|ChatGPT یا مرورگر را کند کرد.|کار با آن سخت بود.|قابلیت مورد نیازم را نداشت.|زبان من خوب پشتیبانی نمی‌شد.|دیگر به آن نیاز ندارم.|دلیل دیگر.|افزودن یادداشت — اختیاری|گفتگو یا اطلاعات شخصی ننویسید. حداکثر 1,000 نویسه.|ارسال بازخورد|بگویید چه چیزی بهتر شود. دسته را انتخاب کنید و اگر خواستید یادداشت بنویسید.|گزارش خطا|پیشنهاد بهبود|سپاسگزاریم. بازخورد شما ذخیره شد.|در حال ارسال…|رد کردن بازخورد|از کمک به بهبود سپاسگزاریم. همیشه خوش آمدید.|از امتحان کردن سپاسگزاریم. بدرود!|بازخورد تأیید نشد. دوباره تلاش کنید؛ پاسختان هنوز اینجاست.|برای ارسال بازخورد یک دلیل انتخاب کنید.|بازخورد اختیاری و خصوصی است؛ نام یا ایمیل لازم نیست. اطلاعات پایه برنامه و دستگاه به درک مشکلات کمک می‌کند. اطلاعات شخصی یا گفتگوها را ننویسید.",
      "ظاهر|سیستم|روشن|تیره|زبان|بلندخوانی ChatGPT با کنترل‌های کاربردی.|مکث کنید، عقب بروید، سرعت را تغییر دهید و صدا را دانلود کنید. هنگام گوش دادن در گفتگو بمانید.|دریافت برای Chrome|دریافت برای Edge|برای Chrome، Edge و مرورگرهای سازگار رایانه. برای نصب صفحه را در رایانه باز کنید.|به روش خود گوش دهید|سه گام برای شنیدن بهتر|افزونه را از فروشگاه مرورگر نصب کنید.|ChatGPT را باز کنید و بلندخوانی یک پاسخ کامل را شروع کنید.|از پخش‌کننده مکث کنید، جابه‌جا شوید، سرعت را تغییر دهید یا صدا را ذخیره کنید.|حریم خصوصی|افزونه تحلیل‌گر یا تله‌متری ندارد. صدا و گفتگوها در مرورگر می‌مانند. همگام‌سازی مرورگر ممکن است ترجیحات را همگام کند.|پروژه مستقل و متن‌باز Infoxica؛ وابسته به OpenAI یا مورد تأیید آن نیست.|کمک کنید این وب‌سایت مفیدتر شود|برای شناخت صفحه‌های مفید و روش پیدا کردن افزونه، به Google Analytics اجازه اندازه‌گیری بازدیدها و کلیک پیوندهای فروشگاه را می‌دهید؟ افزونه و نظرسنجی حذف بدون تحلیل‌گر می‌مانند. هر زمان می‌توانید انتخاب را تغییر دهید.|اجازه تحلیل|نه، ممنون|ترجیحات تحلیل|این وب‌سایت فقط با اجازه شما از Google Analytics برای بازدیدها و کلیک فروشگاه استفاده می‌کند؛ نه نصب یا استفاده افزونه. از ترجیحات تحلیل می‌توانید اجازه را پس بگیرید.|بازخورد حتی پس از حذف اختیاری و خصوصی است. نام یا ایمیل لازم نیست. اطلاعات شخصی یا گفتگوها را ننویسید.|کنترل‌های پخش بلندخوانی ChatGPT|برای نسخه موجود فروشگاه را بررسی کنید.|وب‌سایت رسمی"
    ].join("|").split("|"),
    he: [
      "הסתרת הבקרות הצפות|בעת הסתרה|הסתרת בועה לא פעילה בלבד|הסתרת הבועה והנגן|השמע ממשיך לפעול. החזירו את הבקרות כאן או בקיצור מקשים.|הצגה / הסתרה של הבקרות הצפות|לא הוקצה|התאמת קיצור|מקשי הנגינה פועלים מחוץ לשדות טקסט ב־ChatGPT. קיצור ההצגה פועל גם בזמן הקלדה.|התחלת האזנה|פתחו ChatGPT והתחילו הקראה של תשובה שהושלמה. השתמשו בנגן להשהיה, דילוג, שינוי מהירות או הורדה.|הבנתי|עזרה ופתרון בעיות|מתחיל הקראה…|התחילו בכפתור ההקראה של ChatGPT ליד התשובה.|לא ניתן לחדש נגינה. התחילו שוב בכפתור ההקראה ליד התשובה.|לא ניתן להוריד שמע. התחילו הקראה, המתינו לטעינה ונסו שוב.|מכין הורדה…|לא ניתן לשמור את ההגדרה. נסו שוב.|ההורדה משתמשת בפורמט השמע שסיפק ChatGPT. התוסף אינו ממיר פורמט.|כשאין מספיק מקום מופיעים שני סרגלים מעל תיבת ההודעה.",
      "מצטערים שאתם עוזבים \uD83D\uDC9B|תודה שניסיתם את בקרת שמע ChatGPT. מה נוכל לשפר?|בחרו סיבה ושלחו. אין צורך להקליד.|לא עבד כראוי.|הבועה או הנגן הפריעו.|האט את ChatGPT או הדפדפן.|היה קשה לשימוש.|חסרה תכונה שהייתי צריך.|התמיכה בשפה שלי לא הייתה טובה.|אין לי צורך בו יותר.|סיבה אחרת.|הוספת הערה — רשות|אל תכללו שיחות או פרטים אישיים. עד 1,000 תווים.|שליחת משוב|ספרו מה אפשר לשפר. בחרו קטגוריה והוסיפו הערה אם תרצו.|דיווח על תקלה|הצעת שיפור|תודה. המשוב נשמר.|שולח…|דילוג על משוב|תודה על העזרה בשיפור. תמיד נשמח לראותכם שוב.|תודה שניסיתם. להתראות!|המשוב לא אושר. נסו שוב; התשובה עדיין כאן.|בחרו סיבה אחת לשליחת משוב.|המשוב הוא רשות ופרטי; אין צורך בשם או בדוא״ל. פרטי יישום ומכשיר בסיסיים עוזרים להבין בעיות. אל תכללו פרטים אישיים או שיחות.",
      "מראה|מערכת|בהיר|כהה|שפה|הקראת ChatGPT עם בקרות נוחות.|השהו, חזרו אחורה, שנו מהירות והורידו שמע. הישארו בשיחה בזמן ההאזנה.|קבלו ל־Chrome|קבלו ל־Edge|עבור Chrome, Edge ודפדפנים תואמים במחשב. פתחו במחשב כדי להתקין.|האזינו בדרך שלכם|שלושה צעדים להאזנה טובה יותר|התקינו את התוסף מחנות הדפדפן.|פתחו ChatGPT והתחילו הקראה של תשובה שהושלמה.|השהו, דלגו, שנו מהירות או שמרו שמע מהנגן.|פרטיות|בתוסף אין ניתוח שימוש או טלמטריה. השמע והשיחות נשארים בדפדפן. סנכרון הדפדפן עשוי לסנכרן העדפות.|פרויקט עצמאי בקוד פתוח מאת Infoxica. אינו קשור ל־OpenAI ואינו מאושר על ידה.|עזרו להפוך את האתר לשימושי יותר|האם לאפשר ל־Google Analytics למדוד ביקורים וקליקים לחנויות כדי להבין אילו דפים שימושיים ואיך מגלים את התוסף? בתוסף ובסקר ההסרה אין ניתוח שימוש. ניתן לשנות את הבחירה בכל עת.|אישור ניתוח שימוש|לא תודה|העדפות ניתוח שימוש|האתר משתמש ב־Google Analytics רק לאחר אישור למדידת ביקורים וקליקים לחנויות, ולא התקנות או שימוש בתוסף. ניתן לבטל אישור בהעדפות ניתוח שימוש.|המשוב הוא רשות ופרטי גם אחרי הסרה. אין צורך בשם או בדוא״ל. אל תכללו פרטים אישיים או שיחות.|בקרות נגינה להקראת ChatGPT|בדקו בחנות איזו גרסה זמינה כעת.|האתר הרשמי"
    ].join("|").split("|")
  };
  // src/shared/i18n/audience-release.json
  var audience_release_default = {
    pl: {
      hide: "Ukryj pływające elementy sterujące",
      hideMode: "Kiedy jest ukryty",
      idleOnly: "Ukryj tylko bezczynny dymek",
      allUi: "Ukryj bańkę i gracza",
      hideHint: "Dźwięk nadal działa. Przywróć kontrolę tutaj lub za pomocą skrótu.",
      visibilityShortcut: "Pokaż/ukryj pływające elementy sterujące",
      unassigned: "Nie przydzielono",
      customize: "Dostosuj skrót",
      shortcutScope: "Klawisze odtwarzania działają na ChatGPT poza polami tekstowymi. Skrót widoczności działa także podczas pisania.",
      quickStart: "Zacznij słuchać",
      quickStartBody: "Otwórz ChatGPT i uruchom czytanie na głos przy gotowej odpowiedzi. Za pomocą odtwarzacza możesz wstrzymywać, przewijać, zmieniać prędkość i pobierać dźwięk.",
      dismiss: "Rozumiem",
      help: "Pomoc i rozwiązywanie problemów",
      pending: "Zaczynam czytać na głos…",
      nativeHelp: "Rozpocznij odtwarzanie za pomocą przycisku Czytaj na głos w ChatGPT obok odpowiedzi.",
      playError: "Nie można wznowić odtwarzania. Rozpocznij ponownie czytanie na głos, korzystając z przycisku odpowiedzi na ChatGPT.",
      downloadError: "Nie można pobrać dźwięku. Rozpocznij czytanie na głos, poczekaj na załadowanie dźwięku i spróbuj ponownie.",
      downloading: "Przygotowuję pobieranie…",
      savedError: "Nie można zapisać ustawienia. Spróbuj ponownie.",
      sourceFormat: "Pobierane pliki korzystają z formatu audio udostępnianego przez ChatGPT. Rozszerzenie nie konwertuje dźwięku.",
      compactHelp: "Gdy przestrzeń jest ograniczona, nad oknem komunikatu pojawiają się dwie zaokrąglone kapsuły.",
      surveyTitle: "Przykro mi, że odchodzisz 💛",
      surveyIntro: "Dziękujemy za wypróbowanie ChatGPT Audio Controls. Co mogliśmy zrobić lepiej?",
      surveyHint: "Wybierz jeden powód i wyślij. Nie ma potrzeby wpisywania.",
      reasonBroken: "To nie zadziałało poprawnie.",
      reasonIntrusive: "Bańka lub gracz stanęli na przeszkodzie.",
      reasonSlow: "Spowalnia ChatGPT lub moją przeglądarkę.",
      reasonDifficult: "Trudno było z niego korzystać.",
      reasonMissing: "Brakowało funkcji, której potrzebowałem.",
      reasonLanguage: "Mój język nie był dobrze obsługiwany.",
      reasonUnneeded: "Już tego nie potrzebuję.",
      reasonOther: "Coś innego.",
      addNote: "Dodaj notatkę – opcjonalnie",
      noteHint: "Nie podawaj rozmów ani danych osobowych. Maksymalnie 1000 znaków.",
      send: "Wyślij opinię",
      feedbackIntro: "Powiedz nam, co mogłoby działać lepiej. Wybierz kategorię i dodaj opcjonalną notatkę.",
      feedbackBug: "Zgłoś błąd",
      feedbackSuggestion: "Zaproponuj ulepszenie",
      feedbackThanks: "Dziękuję. Twoja opinia została zapisana.",
      sending: "Wysyłam…",
      skip: "Pomiń informację zwrotną",
      thanks: "Dziękujemy, że pomogłeś nam się ulepszyć. Zawsze możesz wrócić.",
      goodbye: "Dziękujemy, że mogliśmy spróbować. Dbać o siebie!",
      feedbackError: "Twoja opinia nie została potwierdzona. Spróbuj ponownie; twoja odpowiedź wciąż tu jest.",
      chooseReason: "Wybierz jeden powód, aby wysłać opinię.",
      feedbackPrivacy: "Pomóż nam ulepszyć ChatGPT Audio Controls. Twoja opinia jest opcjonalna i prywatna – nie jest potrzebne żadne imię i nazwisko ani adres e-mail. Podstawowe informacje o aplikacji i urządzeniu pomagają nam zrozumieć problemy. Proszę pominąć dane osobowe i rozmowy.",
      appearance: "Wygląd",
      themeSystem: "Systemu",
      themeLight: "Światło",
      themeDark: "Ciemny",
      language: "Język",
      siteTitle: "ChatGPT Czytaj na głos ze sterowaniem, które dotrzymuje kroku.",
      siteIntro: "Wstrzymuj, przewijaj do tyłu, zmieniaj prędkość odtwarzania i pobieraj dźwięk. Pozostań w rozmowie, słuchając.",
      chrome: "Pobierz dla Chrome",
      edge: "Zdobądź to dla Edge'a",
      desktop: "Dla komputerów stacjonarnych Chrome, Edge i kompatybilnych przeglądarek. Otwórz tę stronę na swoim komputerze, aby zainstalować.",
      features: "Słuchaj na swój sposób",
      setup: "Trzy kroki do lepszego słuchania",
      stepInstall: "Zainstaluj rozszerzenie ze sklepu swojej przeglądarki.",
      stepRead: "Otwórz ChatGPT i rozpocznij czytanie na głos po ukończeniu odpowiedzi.",
      stepControl: "Zatrzymuj, szukaj, zmieniaj prędkość lub zapisuj dźwięk z odtwarzacza.",
      privacy: "Prywatność",
      privacyBody: "Rozszerzenie nie zawiera analiz ani telemetrii. Obsługa dźwięku i rozmów pozostaje w Twojej przeglądarce. Synchronizacja przeglądarki może synchronizować preferencje.",
      independent: "Niezależny projekt open source autorstwa Infoxica. Nie jest powiązany ani nie jest wspierany przez OpenAI.",
      analyticsTitle: "Pomóż nam uczynić tę witrynę bardziej użyteczną",
      analyticsBody: "Pomóż nam dowiedzieć się, które strony są przydatne i jak ludzie odkrywają rozszerzenie. Zezwolić Google Analytics na mierzenie wizyt w witrynie i kliknięć linków do sklepu? Ankieta dotycząca rozszerzenia i dezinstalacji pozostaje wolna od analiz. Możesz zmienić swój wybór w dowolnym momencie.",
      accept: "Zezwól na analizę",
      decline: "Nie, dziękuję",
      preferences: "Preferencje analityczne",
      websitePrivacy: "Ta strona internetowa korzysta z Google Analytics dopiero po wyrażeniu przez Ciebie zgody. Mierzy wizyty i kliknięcia linków do sklepu, a nie instalacje czy wykorzystanie rozszerzeń. Możesz wycofać zgodę, korzystając z preferencji Analytics.",
      feedbackPolicy: "Twoja opinia jest opcjonalna i prywatna, nawet po odinstalowaniu. Nie jest wymagane żadne imię i nazwisko ani adres e-mail. Nie podawaj danych osobowych ani rozmów.",
      screenshot: "ChatGPT Sterowanie odtwarzaniem na głos",
      available: "Sprawdź w swoim sklepie aktualnie dostępną wersję.",
      website: "Oficjalna strona internetowa"
    },
    hu: {
      hide: "Lebegő vezérlők elrejtése",
      hideMode: "Amikor rejtve van",
      idleOnly: "Csak az üresjárati buborék elrejtése",
      allUi: "Buborék és lejátszó elrejtése",
      hideHint: "A hang továbbra is működik. Állítsa vissza a vezérlőket itt vagy a parancsikon segítségével.",
      visibilityShortcut: "Lebegő vezérlők megjelenítése/elrejtése",
      unassigned: "Nincs hozzárendelve",
      customize: "Parancsikon testreszabása",
      shortcutScope: "A lejátszási gombok a szövegmezőkön kívül működnek a ChatGPT-n. A láthatósági billentyűparancs gépelés közben is működik.",
      quickStart: "Kezdje el hallgatni",
      quickStartBody: "Nyissa meg a ChatGPT-t, és indítsa el a Hangos felolvasást a kész válasz esetén. Használja a lejátszót szüneteltetésre, keresésre, sebesség módosítására vagy letöltésre.",
      dismiss: "Értem",
      help: "Segítség és hibaelhárítás",
      pending: "Hangos felolvasás indítása…",
      nativeHelp: "Indítsa el a lejátszást a ChatGPT Felolvasás gombjával a válasz mellett.",
      playError: "A lejátszást nem lehetett folytatni. Indítsa újra a Hangos olvasást a ChatGPT válaszgombjával.",
      downloadError: "A hangot nem lehetett letölteni. Indítsa el a Hangos olvasást, várja meg, amíg a hang betöltődik, majd próbálja újra.",
      downloading: "Letöltés előkészítése…",
      savedError: "A beállítást nem sikerült elmenteni. Kérjük, próbálja újra.",
      sourceFormat: "A letöltések a ChatGPT által biztosított hangformátumot használják. A kiterjesztés nem konvertálja a hangot.",
      compactHelp: "Ha a hely korlátozott, két lekerekített kapszula jelenik meg az üzenetablak felett.",
      surveyTitle: "Sajnálom, hogy elmentél 💛",
      surveyIntro: "Köszönjük, hogy kipróbálta a ChatGPT Audio Controls-t. Mit csinálhattunk volna jobban?",
      surveyHint: "Válasszon egy okot, és küldje el. Nincs szükség gépelésre.",
      reasonBroken: "Nem működött megfelelően.",
      reasonIntrusive: "A buborék vagy a játékos az útjába került.",
      reasonSlow: "Lelassította a ChatGPT-t vagy a böngészőmet.",
      reasonDifficult: "Nehéz volt használni.",
      reasonMissing: "Hiányzott egy funkció, amire szükségem volt.",
      reasonLanguage: "A nyelvemet nem támogatták megfelelően.",
      reasonUnneeded: "már nincs szükségem rá.",
      reasonOther: "Valami mást.",
      addNote: "Megjegyzés hozzáadása – opcionális",
      noteHint: "Kérjük, ne adjon meg beszélgetéseket vagy személyes adatokat. Maximum 1000 karakter.",
      send: "Visszajelzés küldése",
      feedbackIntro: "Mondja el, mi működhet jobban. Válasszon egy kategóriát, és adjon hozzá egy opcionális megjegyzést.",
      feedbackBug: "Hiba bejelentése",
      feedbackSuggestion: "Javasoljon javítást",
      feedbackThanks: "Köszönöm. Visszajelzését elmentettük.",
      sending: "Küldés…",
      skip: "Visszajelzés kihagyása",
      thanks: "Köszönjük, hogy segít a fejlesztésben. Mindig szívesen visszatérsz.",
      goodbye: "Köszönjük, hogy kipróbált minket. Vigyázz magadra!",
      feedbackError: "Visszajelzését nem erősítették meg. Kérjük, próbálja újra; a válaszod még mindig itt van.",
      chooseReason: "Válasszon egy okot a visszajelzés küldésére.",
      feedbackPrivacy: "Segítsen nekünk a ChatGPT Audio Controls jobbá tételében. Visszajelzése nem kötelező és privát – nincs szükség névre vagy e-mail-címre. Az alapvető alkalmazás- és eszközadatok segítenek megérteni a problémákat. Kérjük, hagyja el személyes adatait vagy beszélgetéseit.",
      appearance: "Megjelenés",
      themeSystem: "Rendszer",
      themeLight: "Fény",
      themeDark: "Sötét",
      language: "Nyelv",
      siteTitle: "ChatGPT Hangos olvasás, lépést tartó vezérlőkkel.",
      siteIntro: "Szünet, visszatekerés, lejátszási sebesség módosítása és hang letöltése. Maradjon a beszélgetésben, miközben hallgat.",
      chrome: "Szerezze be a Chrome-hoz",
      edge: "Szerezd meg Edge-nek",
      desktop: "Asztali Chrome, Edge és kompatibilis böngészőkhöz. Nyissa meg ezt az oldalt számítógépén a telepítéshez.",
      features: "Hallgasd meg az utat",
      setup: "Három lépés a jobb hallgatáshoz",
      stepInstall: "Telepítse a bővítményt a böngésző áruházából.",
      stepRead: "Nyissa meg a ChatGPT-t, és indítsa el a Hangos felolvasást a kész válasz esetén.",
      stepControl: "Szüneteltesse, keresse, módosítsa a sebességet, vagy mentse a hangot a lejátszóról.",
      privacy: "Adatvédelem",
      privacyBody: "A bővítmény nem rendelkezik elemzéssel vagy telemetriával. A hang- és beszélgetéskezelés a böngészőben marad. A böngésző szinkronizálása szinkronizálhatja a beállításokat.",
      independent: "A Infoxica független nyílt forráskódú projektje. Nem áll kapcsolatban a OpenAI-val, és nem támogatja azt.",
      analyticsTitle: "Segítsen nekünk, hogy hasznosabbá tegyük ezt a weboldalt",
      analyticsBody: "Segítsen nekünk megtudni, mely oldalak hasznosak, és hogyan fedezik fel az emberek a bővítményt. Engedélyezi a Google Analytics számára, hogy mérje a webhelylátogatásokat és a bolti linkekre leadott kattintásokat? A bővítmény és az eltávolítási felmérés nem tartalmaz elemzéseket. A választást bármikor módosíthatja.",
      accept: "Engedélyezze az elemzést",
      decline: "Nem köszönöm",
      preferences: "Analytics-beállítások",
      websitePrivacy: "Ez a webhely csak azután használja a Google Analytics szolgáltatást, miután Ön engedélyezte. A látogatásokat és a bolti linkekre leadott kattintásokat méri, nem a telepítéseket vagy a bővítmények használatát. Az engedélyt visszavonhatja az Analytics beállításaival.",
      feedbackPolicy: "Visszajelzése nem kötelező és privát, még az eltávolítás után is. Nincs szükség névre vagy e-mail címre. Kérjük, ne adjon meg személyes adatokat vagy beszélgetéseket.",
      screenshot: "ChatGPT Hangos olvasás lejátszási vezérlők",
      available: "Keresse fel üzletében az aktuálisan elérhető verziót.",
      website: "Hivatalos honlap"
    },
    sv: {
      hide: "Dölj flytande kontroller",
      hideMode: "När den är gömd",
      idleOnly: "Dölj endast inaktiv bubbla",
      allUi: "Göm bubbla och spelare",
      hideHint: "Ljudet fortsätter att fungera. Återställ kontroller här eller med genvägen.",
      visibilityShortcut: "Visa / dölj flytande kontroller",
      unassigned: "Ej tilldelad",
      customize: "Anpassa genväg",
      shortcutScope: "Uppspelningsknapparna fungerar på ChatGPT utanför textfälten. Synlighetsgenvägen fungerar även när du skriver.",
      quickStart: "Börja lyssna",
      quickStartBody: "Öppna ChatGPT och välj Läs högt på ett färdigt svar. Använd spelaren för att pausa, spola, ändra hastighet eller ladda ner ljudet.",
      dismiss: "Jag förstår",
      help: "Hjälp och felsökning",
      pending: "Börjar högläsning...",
      nativeHelp: "Starta uppspelningen med ChatGPTs högläsningsknapp bredvid svaret.",
      playError: "Uppspelningen kunde inte återupptas. Börja högläsning igen med hjälp av ChatGPTs svarsknapp.",
      downloadError: "Det gick inte att ladda ner ljudet. Starta högläsning, vänta tills ljudet laddas och försök sedan igen.",
      downloading: "Förbereder din nedladdning...",
      savedError: "Inställningen kunde inte sparas. Försök igen.",
      sourceFormat: "Nedladdningar använder ljudformatet som tillhandahålls av ChatGPT. Tillägget konverterar inte ljud.",
      compactHelp: "När utrymmet är begränsat visas två rundade kapslar ovanför meddelanderutan.",
      surveyTitle: "Tråkigt att du går 💛",
      surveyIntro: "Tack för att du testade ChatGPT Audio Controls. Vad kunde vi ha gjort bättre?",
      surveyHint: "Välj en anledning och skicka. Ingen skrivning behövs.",
      reasonBroken: "Det fungerade inte korrekt.",
      reasonIntrusive: "Bubblan eller spelaren kom i vägen.",
      reasonSlow: "Det saktade ner ChatGPT eller min webbläsare.",
      reasonDifficult: "Det var svårt att använda.",
      reasonMissing: "En funktion jag behövde saknades.",
      reasonLanguage: "Mitt språk stöddes inte bra.",
      reasonUnneeded: "Jag behöver det inte längre.",
      reasonOther: "Något annat.",
      addNote: "Lägg till en anteckning – valfritt",
      noteHint: "Inkludera inte konversationer eller personliga uppgifter. Högst 1 000 tecken.",
      send: "Skicka feedback",
      feedbackIntro: "Berätta för oss vad som kan fungera bättre. Välj en kategori och lägg till en valfri anteckning.",
      feedbackBug: "Rapportera ett fel",
      feedbackSuggestion: "Föreslå en förbättring",
      feedbackThanks: "Tack. Din feedback har sparats.",
      sending: "Skickar...",
      skip: "Hoppa över feedback",
      thanks: "Tack för att du hjälper oss att förbättras. Du är alltid välkommen tillbaka.",
      goodbye: "Tack för att du gav oss ett försök. Ta hand om dig!",
      feedbackError: "Din feedback har inte bekräftats. Försök igen. ditt svar finns kvar.",
      chooseReason: "Välj en anledning att skicka feedback.",
      feedbackPrivacy: "Hjälp oss att göra ChatGPT Audio Controls bättre. Din feedback är valfri och privat – inget namn eller e-post behövs. Grundläggande app- och enhetsinformation hjälper oss att förstå problem. Vänligen lämna ut personliga uppgifter eller konversationer.",
      appearance: "Utseende",
      themeSystem: "System",
      themeLight: "Ljus",
      themeDark: "Mörkt",
      language: "Språk",
      siteTitle: "ChatGPT Läs högt, med kontroller som hänger med.",
      siteIntro: "Pausa, spola tillbaka, ändra uppspelningshastighet och ladda ner ljud. Håll dig i konversationen medan du lyssnar.",
      chrome: "Skaffa det för Chrome",
      edge: "Skaffa det till Edge",
      desktop: "För stationära Chrome, Edge och kompatibla webbläsare. Öppna den här sidan på din dator för att installera.",
      features: "Lyssna på ditt sätt",
      setup: "Tre steg till bättre lyssnande",
      stepInstall: "Installera tillägget från din webbläsares butik.",
      stepRead: "Öppna ChatGPT och börja läsa högt på ett färdigt svar.",
      stepControl: "Pausa, sök, ändra hastighet eller spara ljudet från spelaren.",
      privacy: "Sekretess",
      privacyBody: "Tillägget har ingen analys eller telemetri. Ljud- och konversationshantering stannar i din webbläsare. Webbläsarsynkronisering kan synkronisera inställningar.",
      independent: "Ett oberoende projekt med öppen källkod av Infoxica. Ej ansluten till eller godkänd av OpenAI.",
      analyticsTitle: "Hjälp oss att göra den här webbplatsen mer användbar",
      analyticsBody: "Hjälp oss att lära oss vilka sidor som är användbara och hur folk upptäcker tillägget. Tillåta Google Analytics att mäta webbplatsbesök och klick på butikslänkar? Tilläggs- och avinstallationsundersökningen förblir fria från analyser. Du kan ändra ditt val när som helst.",
      accept: "Tillåt analys",
      decline: "Nej tack",
      preferences: "Analytics-inställningar",
      websitePrivacy: "Denna webbplats använder Google Analytics endast efter att du har tillåtit det. Den mäter besök och klick på butikslänkar, inte installationer eller användning av tillägg. Du kan dra tillbaka tillstånd med hjälp av Analytics-inställningar.",
      feedbackPolicy: "Din feedback är valfri och privat, även efter avinstallation. Inget namn eller e-postadress krävs. Vänligen inkludera inte personliga uppgifter eller konversationer.",
      screenshot: "ChatGPT Läs högt uppspelningskontroller",
      available: "Kontrollera din butik för den aktuella versionen.",
      website: "Officiell webbplats"
    },
    cs: {
      hide: "Skrýt plovoucí ovládací prvky",
      hideMode: "Když je skrytý",
      idleOnly: "Skryjte pouze nečinnou bublinu",
      allUi: "Skryjte bublinu a hráče",
      hideHint: "Zvuk funguje dál. Obnovte ovládací prvky zde nebo pomocí zástupce.",
      visibilityShortcut: "Zobrazit / skrýt plovoucí ovládací prvky",
      unassigned: "Nezařazeno",
      customize: "Přizpůsobit zkratku",
      shortcutScope: "Tlačítka přehrávání fungují na ChatGPT mimo textová pole. Zkratka viditelnosti funguje i při psaní.",
      quickStart: "Začněte poslouchat",
      quickStartBody: "Otevřete ChatGPT a po dokončení odpovědi spusťte čtení nahlas. Použijte přehrávač k pozastavení, vyhledávání, změně rychlosti nebo stahování.",
      dismiss: "Rozumím",
      help: "Nápověda a odstraňování problémů",
      pending: "Spouštění čtení nahlas…",
      nativeHelp: "Spusťte přehrávání tlačítkem Read Aloud na ChatGPT vedle odpovědi.",
      playError: "Přehrávání nebylo možné obnovit. Spusťte znovu čtení nahlas pomocí tlačítka odezvy ChatGPT.",
      downloadError: "Zvuk nelze stáhnout. Spusťte čtení nahlas, počkejte, až se načte zvuk, a zkuste to znovu.",
      downloading: "Příprava stahování…",
      savedError: "Nastavení se nepodařilo uložit. Zkuste to prosím znovu.",
      sourceFormat: "Stahování používá zvukový formát poskytovaný ChatGPT. Rozšíření nepřevádí zvuk.",
      compactHelp: "Při omezeném prostoru se nad polem zpráv zobrazí dvě zaoblené kapsle.",
      surveyTitle: "Je mi líto, že odcházíte 💛",
      surveyIntro: "Děkujeme, že jste vyzkoušeli ChatGPT Audio Controls. Co jsme mohli udělat lépe?",
      surveyHint: "Vyberte jeden důvod a odešlete. Není potřeba psát.",
      reasonBroken: "Nefungovalo to správně.",
      reasonIntrusive: "Bublina nebo hráč se postavil do cesty.",
      reasonSlow: "Zpomalilo to ChatGPT nebo můj prohlížeč.",
      reasonDifficult: "Bylo těžké to používat.",
      reasonMissing: "Chyběla funkce, kterou jsem potřeboval.",
      reasonLanguage: "Můj jazyk nebyl dobře podporován.",
      reasonUnneeded: "už to nepotřebuji.",
      reasonOther: "Něco jiného.",
      addNote: "Přidat poznámku – volitelné",
      noteHint: "Neuvádějte prosím konverzace ani osobní údaje. Maximálně 1 000 znaků.",
      send: "Odeslat zpětnou vazbu",
      feedbackIntro: "Řekněte nám, co by mohlo fungovat lépe. Vyberte kategorii a přidejte volitelnou poznámku.",
      feedbackBug: "Nahlásit chybu",
      feedbackSuggestion: "Navrhněte zlepšení",
      feedbackThanks: "děkuji. Vaše zpětná vazba byla uložena.",
      sending: "Odesílání…",
      skip: "Přeskočit zpětnou vazbu",
      thanks: "Děkujeme, že nám pomáháte zlepšovat se. Jste vždy vítáni zpět.",
      goodbye: "Děkujeme, že jste nás vyzkoušeli. opatruj se!",
      feedbackError: "Vaše zpětná vazba nebyla potvrzena. Zkuste to znovu; vaše odpověď je stále zde.",
      chooseReason: "Vyberte jeden důvod k odeslání zpětné vazby.",
      feedbackPrivacy: "Pomozte nám vylepšit ChatGPT Audio Controls. Vaše zpětná vazba je volitelná a soukromá – nepotřebujete žádné jméno ani e-mail. Základní podrobnosti o aplikaci a zařízení nám pomáhají porozumět problémům. Vynechejte prosím osobní údaje nebo konverzace.",
      appearance: "Vzhled",
      themeSystem: "Systém",
      themeLight: "Světlo",
      themeDark: "Tmavý",
      language: "Jazyk",
      siteTitle: "ChatGPT Čtení nahlas s ovládacími prvky, které udrží krok.",
      siteIntro: "Pozastavit, přetočit zpět, změnit rychlost přehrávání a stáhnout zvuk. Zůstaňte v konverzaci, zatímco posloucháte.",
      chrome: "Získejte to pro Chrome",
      edge: "Získejte to pro Edge",
      desktop: "Pro stolní prohlížeče Chrome, Edge a kompatibilní prohlížeče. Pro instalaci otevřete tuto stránku v počítači.",
      features: "Poslouchej svou cestu",
      setup: "Tři kroky k lepšímu poslechu",
      stepInstall: "Nainstalujte rozšíření z obchodu vašeho prohlížeče.",
      stepRead: "Otevřete ChatGPT a po dokončení odpovědi spusťte čtení nahlas.",
      stepControl: "Pozastavit, vyhledat, změnit rychlost nebo uložit zvuk z přehrávače.",
      privacy: "soukromí",
      privacyBody: "Rozšíření nemá žádnou analytiku ani telemetrii. Zpracování zvuku a konverzace zůstává ve vašem prohlížeči. Synchronizace prohlížeče může synchronizovat předvolby.",
      independent: "Nezávislý open-source projekt od Infoxica. Není přidružena ani podporována OpenAI.",
      analyticsTitle: "Pomozte nám udělat tento web užitečnějším",
      analyticsBody: "Pomozte nám zjistit, které stránky jsou užitečné a jak lidé rozšíření objevují. Povolit službě Google Analytics měřit návštěvy webu a kliknutí na odkazy na prodejnu? Průzkum rozšíření a odinstalace zůstává bez analytiky. Svou volbu můžete kdykoli změnit.",
      accept: "Povolit analýzu",
      decline: "Ne, děkuji",
      preferences: "Předvolby Analytics",
      websitePrivacy: "Tento web používá Google Analytics pouze tehdy, když to povolíte. Měří návštěvy a kliknutí na odkazy v obchodě, nikoli instalace nebo použití rozšíření. Oprávnění můžete zrušit pomocí předvoleb Analytics.",
      feedbackPolicy: "Vaše zpětná vazba je volitelná a soukromá, a to i po odinstalaci. Není vyžadováno žádné jméno ani e-mail. Neuvádějte prosím osobní údaje ani konverzace.",
      screenshot: "Ovládací prvky přehrávání ChatGPT Read Aloud",
      available: "Aktuální dostupnou verzi najdete ve svém obchodě.",
      website: "Oficiální stránky"
    },
    uk: {
      hide: "Приховати плаваючі елементи керування",
      hideMode: "Коли приховано",
      idleOnly: "Приховати лише спливаючу підказку",
      allUi: "Приховати підказку та гравця",
      hideHint: "Аудіо продовжує працювати. Відновіть елементи керування тут або за допомогою ярлика.",
      visibilityShortcut: "Показати/сховати плаваючі елементи керування",
      unassigned: "Не призначено",
      customize: "Налаштувати ярлик",
      shortcutScope: "Клавіші відтворення працюють на ChatGPT поза текстовими полями. Ярлик видимості також працює під час введення тексту.",
      quickStart: "Почніть слухати",
      quickStartBody: "Відкрийте ChatGPT і почніть читати вголос після готової відповіді. Використовуйте плеєр для паузи, пошуку, зміни швидкості або завантаження.",
      dismiss: "зрозумів",
      help: "Допомога та усунення несправностей",
      pending: "Початок читання вголос…",
      nativeHelp: "Почніть відтворення за допомогою кнопки «Прочитати вголос» ChatGPT поруч із відповіддю.",
      playError: "Відтворення не вдалося відновити. Знову почніть читати вголос, використовуючи кнопку відповіді ChatGPT.",
      downloadError: "Не вдалося завантажити аудіо. Почніть «Читати вголос», зачекайте, доки завантажиться аудіо, а потім повторіть спробу.",
      downloading: "Підготовка завантаження…",
      savedError: "Налаштування не вдалося зберегти. Спробуйте ще раз.",
      sourceFormat: "Для завантажень використовується аудіоформат, наданий ChatGPT. Розширення не перетворює звук.",
      compactHelp: "Коли простір обмежений, над вікном повідомлення з’являються дві округлі капсули.",
      surveyTitle: "Шкода, що ви йдете 💛",
      surveyIntro: "Дякуємо, що спробували ChatGPT Audio Controls. Що ми могли зробити краще?",
      surveyHint: "Виберіть одну причину та надішліть. Вводити текст не потрібно.",
      reasonBroken: "Це не спрацювало правильно.",
      reasonIntrusive: "Міхур або гравець став на заваді.",
      reasonSlow: "Це сповільнило ChatGPT або мій браузер.",
      reasonDifficult: "Його було важко використовувати.",
      reasonMissing: "Не вистачало потрібної мені функції.",
      reasonLanguage: "Моя мова погано підтримується.",
      reasonUnneeded: "Мені це більше не потрібно.",
      reasonOther: "Щось інше.",
      addNote: "Додати примітку — за бажанням",
      noteHint: "Будь ласка, не включайте розмови чи особисті дані. Максимум 1000 символів.",
      send: "Надіслати відгук",
      feedbackIntro: "Розкажіть нам, що може працювати краще. Виберіть категорію та додайте додаткову примітку.",
      feedbackBug: "Повідомити про помилку",
      feedbackSuggestion: "Запропонуйте покращення",
      feedbackThanks: "дякую Ваш відгук збережено.",
      sending: "Надсилання…",
      skip: "Пропустити відгук",
      thanks: "Дякуємо, що допомагаєте нам покращуватися. Вам завжди раді повернутися.",
      goodbye: "Дякуємо, що спробували. Бережіть себе!",
      feedbackError: "Ваш відгук не підтверджено. Спробуйте ще раз; ваша відповідь все ще тут.",
      chooseReason: "Виберіть одну причину, щоб надіслати відгук.",
      feedbackPrivacy: "Допоможіть нам зробити ChatGPT Audio Controls кращим. Ваш відгук необов’язковий і конфіденційний — ім’я чи електронна адреса не потрібні. Основні відомості про програму та пристрій допомагають нам зрозуміти проблеми. Будь ласка, не вказуйте особисті дані чи розмови.",
      appearance: "Зовнішній вигляд",
      themeSystem: "система",
      themeLight: "світло",
      themeDark: "Темний",
      language: "Мова",
      siteTitle: "ChatGPT Читайте вголос із елементами керування, які не відстають.",
      siteIntro: "Пауза, перемотування назад, зміна швидкості відтворення та завантаження аудіо. Залишайтеся в розмові, слухаючи.",
      chrome: "Отримайте для Chrome",
      edge: "Отримайте це для Edge",
      desktop: "Для настільних комп’ютерів Chrome, Edge і сумісних браузерів. Щоб установити, відкрийте цю сторінку на своєму комп’ютері.",
      features: "Слухай свій шлях",
      setup: "Три кроки до кращого слухання",
      stepInstall: "Установіть розширення з магазину вашого браузера.",
      stepRead: "Відкрийте ChatGPT і почніть читати вголос після готової відповіді.",
      stepControl: "Призупиняйте, шукайте, змінюйте швидкість або зберігайте аудіо з плеєра.",
      privacy: "Конфіденційність",
      privacyBody: "Розширення не має аналітики чи телеметрії. Обробка аудіо та розмов залишається у вашому браузері. Синхронізація браузера може синхронізувати налаштування.",
      independent: "Незалежний проект із відкритим кодом від Infoxica. Не пов’язаний із OpenAI і не схвалений ним.",
      analyticsTitle: "Допоможіть нам зробити цей веб-сайт кориснішим",
      analyticsBody: "Допоможіть нам дізнатися, які сторінки корисні та як люди дізнаються про розширення. Дозволити Google Analytics вимірювати відвідування веб-сайтів і кліки посилань на магазини? Опитування щодо розширення та видалення не містить аналітики. Ви можете будь-коли змінити свій вибір.",
      accept: "Дозволити аналітику",
      decline: "Ні, дякую",
      preferences: "Налаштування аналітики",
      websitePrivacy: "Цей веб-сайт використовує Google Analytics лише після вашого дозволу. Він вимірює відвідування та кліки посилань на магазини, а не встановлення чи використання розширень. Ви можете відкликати дозвіл за допомогою налаштувань Analytics.",
      feedbackPolicy: "Ваш відгук необов’язковий і приватний навіть після видалення. Ім'я чи електронна адреса не потрібні. Будь ласка, не вказуйте особисті дані чи розмови.",
      screenshot: "ChatGPT Елементи керування відтворенням Read Aloud",
      available: "Перевірте у своєму магазині доступну версію.",
      website: "Офіційний сайт"
    },
    ca: {
      hide: "Amaga els controls flotants",
      hideMode: "Quan s'amaga",
      idleOnly: "Amaga només la bombolla inactiva",
      allUi: "Amaga la bombolla i el jugador",
      hideHint: "L'àudio continua funcionant. Restaura els controls aquí o amb la drecera.",
      visibilityShortcut: "Mostra/amaga els controls flotants",
      unassigned: "No assignat",
      customize: "Personalitza la drecera",
      shortcutScope: "Les tecles de reproducció funcionen amb ChatGPT fora dels camps de text. La drecera de visibilitat també funciona mentre s'escriu.",
      quickStart: "Comença a escoltar",
      quickStartBody: "Obriu ChatGPT i comenceu a llegir en veu alta amb una resposta completa. Utilitzeu el reproductor per fer una pausa, cercar, canviar la velocitat o descarregar.",
      dismiss: "Ho entenc",
      help: "Ajuda i resolució de problemes",
      pending: "Començant a llegir en veu alta...",
      nativeHelp: "Inicieu la reproducció amb el botó Llegir en veu alta de ChatGPT al costat de la resposta.",
      playError: "La reproducció no s'ha pogut reprendre. Torneu a començar a llegir en veu alta utilitzant el botó de resposta de ChatGPT.",
      downloadError: "No s'ha pogut baixar l'àudio. Comenceu a llegir en veu alta, espereu que es carregui l'àudio i torneu-ho a provar.",
      downloading: "S'està preparant la baixada...",
      savedError: "No s'ha pogut desar la configuració. Si us plau, torna-ho a provar.",
      sourceFormat: "Les baixades utilitzen el format d'àudio proporcionat per ChatGPT. L'extensió no converteix l'àudio.",
      compactHelp: "Quan l'espai és limitat, apareixen dues càpsules arrodonides a sobre del quadre de missatge.",
      surveyTitle: "Em sap greu veure't 💛",
      surveyIntro: "Gràcies per provar ChatGPT Audio Controls. Què podríem haver fet millor?",
      surveyHint: "Trieu un motiu i envieu-lo. No cal escriure.",
      reasonBroken: "No va funcionar correctament.",
      reasonIntrusive: "La bombolla o el jugador es va entorpir.",
      reasonSlow: "Ha alentit ChatGPT o el meu navegador.",
      reasonDifficult: "Era difícil d'utilitzar.",
      reasonMissing: "Faltava una característica que necessitava.",
      reasonLanguage: "El meu idioma no estava ben recolzat.",
      reasonUnneeded: "ja no ho necessito.",
      reasonOther: "Alguna cosa més.",
      addNote: "Afegeix una nota: opcional",
      noteHint: "Si us plau, no incloguis converses ni dades personals. Màxim 1.000 caràcters.",
      send: "Envieu comentaris",
      feedbackIntro: "Digueu-nos què podria funcionar millor. Trieu una categoria i afegiu una nota opcional.",
      feedbackBug: "Informar d'un error",
      feedbackSuggestion: "Suggereix una millora",
      feedbackThanks: "Gràcies. Els vostres comentaris s'han desat.",
      sending: "S'està enviant…",
      skip: "Omet comentaris",
      thanks: "Gràcies per ajudar-nos a millorar. Sempre seràs benvingut.",
      goodbye: "Gràcies per provar-nos. Cuida't!",
      feedbackError: "La teva opinió no s'ha confirmat. Si us plau, torna-ho a provar; la teva resposta encara està aquí.",
      chooseReason: "Trieu un motiu per enviar comentaris.",
      feedbackPrivacy: "Ajuda'ns a millorar ChatGPT Audio Controls. Els vostres comentaris són opcionals i privats; no cal cap nom ni correu electrònic. Els detalls bàsics de l'aplicació i del dispositiu ens ajuden a entendre els problemes. Si us plau, deixeu de banda les dades personals o les converses.",
      appearance: "Aparença",
      themeSystem: "Sistema",
      themeLight: "Llum",
      themeDark: "Fosc",
      language: "Llengua",
      siteTitle: "ChatGPT Llegir en veu alta, amb controls que es mantenen al dia.",
      siteIntro: "Posa en pausa, rebobina, canvia la velocitat de reproducció i baixa l'àudio. Mantingueu-vos en la conversa mentre escolteu.",
      chrome: "Obteniu-lo per a Chrome",
      edge: "Aconsegueix-ho per a Edge",
      desktop: "Per a navegadors d'escriptori Chrome, Edge i compatibles. Obriu aquesta pàgina al vostre ordinador per instal·lar-lo.",
      features: "Escolta la teva manera",
      setup: "Tres passos per escoltar millor",
      stepInstall: "Instal·leu l'extensió des de la botiga del vostre navegador.",
      stepRead: "Obriu ChatGPT i comenceu a llegir en veu alta amb una resposta completa.",
      stepControl: "Posa en pausa, cerca, canvia la velocitat o desa l'àudio del reproductor.",
      privacy: "Privadesa",
      privacyBody: "L'extensió no té analítiques ni telemetria. La gestió d'àudio i converses es manté al vostre navegador. La sincronització del navegador pot sincronitzar les preferències.",
      independent: "Un projecte independent de codi obert de Infoxica. No està afiliat ni avalat per OpenAI.",
      analyticsTitle: "Ajudeu-nos a fer que aquest lloc web sigui més útil",
      analyticsBody: "Ajuda'ns a saber quines pàgines són útils i com la gent descobreix l'extensió. Voleu permetre que Google Analytics mesura les visites al lloc web i els clics als enllaços de botiga? L'enquesta d'extensió i desinstal·lació es manté lliure d'analítica. Podeu canviar la vostra elecció en qualsevol moment.",
      accept: "Permet analítiques",
      decline: "No gràcies",
      preferences: "Preferències d'anàlisi",
      websitePrivacy: "Aquest lloc web utilitza Google Analytics només després que ho permeteu. Mesura les visites i els clics als enllaços de la botiga, no les instal·lacions ni l'ús d'extensions. Podeu retirar el permís mitjançant les preferències d'Analytics.",
      feedbackPolicy: "Els vostres comentaris són opcionals i privats, fins i tot després de la desinstal·lació. No es requereix cap nom ni correu electrònic. Si us plau, no incloguis dades personals ni converses.",
      screenshot: "ChatGPT Controls de reproducció de lectura en veu alta",
      available: "Comproveu a la vostra botiga la versió disponible actualment.",
      website: "Web oficial"
    },
    el: {
      hide: "Απόκρυψη αιωρούμενων στοιχείων ελέγχου",
      hideMode: "Όταν κρύβεται",
      idleOnly: "Απόκρυψη μόνο φυσαλίδων σε αδράνεια",
      allUi: "Απόκρυψη φούσκας και αναπαραγωγής",
      hideHint: "Ο ήχος συνεχίζει να λειτουργεί. Επαναφέρετε τα στοιχεία ελέγχου εδώ ή με τη συντόμευση.",
      visibilityShortcut: "Εμφάνιση / απόκρυψη αιωρούμενων στοιχείων ελέγχου",
      unassigned: "Δεν έχει ανατεθεί",
      customize: "Προσαρμογή συντόμευσης",
      shortcutScope: "Τα πλήκτρα αναπαραγωγής λειτουργούν σε ChatGPT εκτός πεδίων κειμένου. Η συντόμευση ορατότητας λειτουργεί επίσης κατά την πληκτρολόγηση.",
      quickStart: "Αρχίστε να ακούτε",
      quickStartBody: "Ανοίξτε το ChatGPT και ξεκινήστε το Read Aloud σε μια ολοκληρωμένη απάντηση. Χρησιμοποιήστε τη συσκευή αναπαραγωγής για παύση, αναζήτηση, αλλαγή ταχύτητας ή λήψη.",
      dismiss: "Κατάλαβα",
      help: "Βοήθεια και αντιμετώπιση προβλημάτων",
      pending: "Έναρξη ανάγνωσης δυνατά…",
      nativeHelp: "Ξεκινήστε την αναπαραγωγή με το κουμπί Read Aloud του ChatGPT δίπλα στην απόκριση.",
      playError: "Δεν ήταν δυνατή η συνέχιση της αναπαραγωγής. Ξεκινήστε ξανά την ανάγνωση δυνατά χρησιμοποιώντας το κουμπί απόκρισης του ChatGPT.",
      downloadError: "Δεν ήταν δυνατή η λήψη του ήχου. Ξεκινήστε το Read Aloud, περιμένετε να φορτώσει ο ήχος και δοκιμάστε ξανά.",
      downloading: "Προετοιμασία λήψης…",
      savedError: "Δεν ήταν δυνατή η αποθήκευση της ρύθμισης. Δοκιμάστε ξανά.",
      sourceFormat: "Οι λήψεις χρησιμοποιούν τη μορφή ήχου που παρέχεται από το ChatGPT. Η επέκταση δεν μετατρέπει ήχο.",
      compactHelp: "Όταν ο χώρος είναι περιορισμένος, δύο στρογγυλεμένες κάψουλες εμφανίζονται πάνω από το πλαίσιο μηνύματος.",
      surveyTitle: "Λυπάμαι που σε βλέπω να πηγαίνεις 💛",
      surveyIntro: "Ευχαριστούμε που δοκιμάσατε το ChatGPT Audio Controls. Τι θα μπορούσαμε να είχαμε κάνει καλύτερα;",
      surveyHint: "Διάλεξε έναν λόγο και στείλε. Δεν χρειάζεται πληκτρολόγηση.",
      reasonBroken: "Δεν λειτούργησε σωστά.",
      reasonIntrusive: "Η φούσκα ή ο παίκτης μπήκε εμπόδιο.",
      reasonSlow: "Επιβράδυνε το ChatGPT ή το πρόγραμμα περιήγησής μου.",
      reasonDifficult: "Ήταν δύσκολο στη χρήση.",
      reasonMissing: "Έλειπε ένα χαρακτηριστικό που χρειαζόμουν.",
      reasonLanguage: "Η γλώσσα μου δεν υποστηριζόταν καλά.",
      reasonUnneeded: "δεν το χρειάζομαι πια.",
      reasonOther: "Κάτι άλλο.",
      addNote: "Προσθήκη σημείωσης — προαιρετική",
      noteHint: "Μην συμπεριλάβετε συνομιλίες ή προσωπικά στοιχεία. Μέγιστο 1.000 χαρακτήρες.",
      send: "Αποστολή σχολίων",
      feedbackIntro: "Πείτε μας τι θα μπορούσε να λειτουργήσει καλύτερα. Επιλέξτε μια κατηγορία και προσθέστε μια προαιρετική σημείωση.",
      feedbackBug: "Αναφορά σφάλματος",
      feedbackSuggestion: "Προτείνετε μια βελτίωση",
      feedbackThanks: "Ευχαριστώ. Τα σχόλιά σας έχουν αποθηκευτεί.",
      sending: "Αποστολή…",
      skip: "Παράλειψη σχολίων",
      thanks: "Σας ευχαριστούμε που μας βοηθάτε να βελτιωθούμε. Είστε πάντα ευπρόσδεκτοι πίσω.",
      goodbye: "Ευχαριστούμε που μας κάνατε μια δοκιμή. Φροντίζω!",
      feedbackError: "Τα σχόλιά σας δεν επιβεβαιώθηκαν. Δοκιμάστε ξανά. η απάντησή σου είναι ακόμα εδώ.",
      chooseReason: "Επιλέξτε έναν λόγο για να στείλετε σχόλια.",
      feedbackPrivacy: "Βοηθήστε μας να κάνουμε το ChatGPT Audio Controls καλύτερο. Τα σχόλιά σας είναι προαιρετικά και ιδιωτικά—δεν απαιτείται όνομα ή email. Οι βασικές λεπτομέρειες εφαρμογής και συσκευής μας βοηθούν να κατανοήσουμε προβλήματα. Παρακαλούμε να παραλείψετε προσωπικά στοιχεία ή συνομιλίες.",
      appearance: "Εμφάνιση",
      themeSystem: "Σύστημα",
      themeLight: "Φως",
      themeDark: "Σκοτεινό",
      language: "Γλώσσα",
      siteTitle: "ChatGPT Διαβάστε δυνατά, με χειριστήρια που συμβαδίζουν.",
      siteIntro: "Παύση, επαναφορά, αλλαγή ταχύτητας αναπαραγωγής και λήψη ήχου. Μείνετε στη συζήτηση ενώ ακούτε.",
      chrome: "Αποκτήστε το για Chrome",
      edge: "Αποκτήστε το για τον Edge",
      desktop: "Για επιτραπέζιους υπολογιστές Chrome, Edge και συμβατά προγράμματα περιήγησης. Ανοίξτε αυτή τη σελίδα στον υπολογιστή σας για εγκατάσταση.",
      features: "Ακούστε τον τρόπο σας",
      setup: "Τρία βήματα για καλύτερη ακρόαση",
      stepInstall: "Εγκαταστήστε την επέκταση από το κατάστημα του προγράμματος περιήγησής σας.",
      stepRead: "Ανοίξτε το ChatGPT και ξεκινήστε το Read Aloud σε μια ολοκληρωμένη απάντηση.",
      stepControl: "Παύση, αναζήτηση, αλλαγή ταχύτητας ή αποθήκευση του ήχου από τη συσκευή αναπαραγωγής.",
      privacy: "Απόρρητο",
      privacyBody: "Η επέκταση δεν έχει αναλυτικά στοιχεία ή τηλεμετρία. Ο χειρισμός ήχου και συνομιλίας παραμένει στο πρόγραμμα περιήγησής σας. Ο συγχρονισμός του προγράμματος περιήγησης μπορεί να συγχρονίσει τις προτιμήσεις.",
      independent: "Ένα ανεξάρτητο έργο ανοιχτού κώδικα από τον Infoxica. Δεν συνδέεται ούτε υποστηρίζεται από το OpenAI.",
      analyticsTitle: "Βοηθήστε μας να κάνουμε αυτόν τον ιστότοπο πιο χρήσιμο",
      analyticsBody: "Βοηθήστε μας να μάθουμε ποιες σελίδες είναι χρήσιμες και πώς οι χρήστες ανακαλύπτουν την επέκταση. Να επιτρέπεται στο Google Analytics να μετράει τις επισκέψεις στον ιστότοπο και τα κλικ σε συνδέσμους καταστήματος; Η έρευνα επέκτασης και απεγκατάστασης δεν περιέχει αναλυτικά στοιχεία. Μπορείτε να αλλάξετε την επιλογή σας ανά πάσα στιγμή.",
      accept: "Να επιτρέπεται η ανάλυση",
      decline: "Όχι ευχαριστώ",
      preferences: "Προτιμήσεις Analytics",
      websitePrivacy: "Αυτός ο ιστότοπος χρησιμοποιεί το Google Analytics μόνο αφού το επιτρέψετε. Μετρά επισκέψεις και κλικ σε συνδέσμους καταστήματος, όχι εγκαταστάσεις ή χρήση επεκτάσεων. Μπορείτε να αποσύρετε την άδεια χρησιμοποιώντας τις προτιμήσεις του Analytics.",
      feedbackPolicy: "Τα σχόλιά σας είναι προαιρετικά και ιδιωτικά, ακόμη και μετά την απεγκατάσταση. Δεν απαιτείται όνομα ή email. Μην συμπεριλάβετε προσωπικά στοιχεία ή συνομιλίες.",
      screenshot: "ChatGPT Στοιχεία ελέγχου αναπαραγωγής ανάγνωσης δυνατά",
      available: "Ελέγξτε το κατάστημά σας για την τρέχουσα διαθέσιμη έκδοση.",
      website: "Επίσημος ιστότοπος"
    },
    ro: {
      hide: "Ascunde controalele plutitoare",
      hideMode: "Când este ascuns",
      idleOnly: "Ascundeți numai balonul inactiv",
      allUi: "Ascunde balonul și jucătorul",
      hideHint: "Audio continuă să funcționeze. Restabiliți controalele aici sau cu comanda rapidă.",
      visibilityShortcut: "Afișează / ascunde comenzile plutitoare",
      unassigned: "Nu este atribuit",
      customize: "Personalizați comanda rapidă",
      shortcutScope: "Tastele de redare funcționează pe ChatGPT în afara câmpurilor de text. Comanda rapidă de vizibilitate funcționează și în timpul tastării.",
      quickStart: "Începe să asculți",
      quickStartBody: "Deschideți ChatGPT și porniți citirea cu voce tare a unui răspuns finalizat. Folosiți playerul pentru a pune pauză, a derula, a schimba viteza sau a descărca sunetul.",
      dismiss: "Am înțeles",
      help: "Ajutor și depanare",
      pending: "Începe să citești cu voce tare...",
      nativeHelp: "Începeți redarea cu butonul Citiți cu voce tare al lui ChatGPT de lângă răspuns.",
      playError: "Redarea nu a putut fi reluată. Începeți Citiți cu voce tare din nou folosind butonul de răspuns al lui ChatGPT.",
      downloadError: "Audio nu a putut fi descărcat. Începeți Citiți cu voce tare, așteptați ca sunetul să se încarce, apoi încercați din nou.",
      downloading: "Se pregătește descărcarea...",
      savedError: "Setarea nu a putut fi salvată. Vă rugăm să încercați din nou.",
      sourceFormat: "Descărcările folosesc formatul audio oferit de ChatGPT. Extensia nu convertește audio.",
      compactHelp: "Când spațiul este limitat, două capsule rotunjite apar deasupra casetei de mesaje.",
      surveyTitle: "Îmi pare rău să văd că pleci 💛",
      surveyIntro: "Vă mulțumim că ați încercat ChatGPT Audio Controls. Ce am fi putut face mai bine?",
      surveyHint: "Alegeți un motiv și trimiteți. Nu este nevoie de tastare.",
      reasonBroken: "Nu a funcționat corect.",
      reasonIntrusive: "Balonul sau jucătorul au ieșit în cale.",
      reasonSlow: "A încetinit ChatGPT sau browserul meu.",
      reasonDifficult: "A fost greu de folosit.",
      reasonMissing: "O caracteristică de care aveam nevoie lipsea.",
      reasonLanguage: "Limba mea nu a fost bine susținută.",
      reasonUnneeded: "nu mai am nevoie.",
      reasonOther: "Altceva.",
      addNote: "Adăugați o notă - opțional",
      noteHint: "Vă rugăm să nu includeți conversații sau detalii personale. Maximum 1.000 de caractere.",
      send: "Trimite feedback",
      feedbackIntro: "Spune-ne ce ar putea funcționa mai bine. Alegeți o categorie și adăugați o notă opțională.",
      feedbackBug: "Raportați o eroare",
      feedbackSuggestion: "Sugerați o îmbunătățire",
      feedbackThanks: "Multumesc. Feedbackul dvs. a fost salvat.",
      sending: "Se trimite…",
      skip: "Omite feedback-ul",
      thanks: "Vă mulțumim că ne ajutați să ne îmbunătățim. Ești întotdeauna binevenit înapoi.",
      goodbye: "Vă mulțumim că ne-ați încercat. Ai grijă!",
      feedbackError: "Feedbackul dvs. nu a fost confirmat. Vă rugăm să încercați din nou; raspunsul tau este inca aici.",
      chooseReason: "Alegeți un motiv pentru a trimite feedback.",
      feedbackPrivacy: "Ajutați-ne să facem ChatGPT Audio Controls mai bun. Feedbackul dvs. este opțional și privat - nu este nevoie de nume sau e-mail. Detaliile de bază ale aplicației și dispozitivului ne ajută să înțelegem problemele. Vă rugăm să omiteți detaliile personale sau conversațiile.",
      appearance: "Aspectul",
      themeSystem: "Sistem",
      themeLight: "Lumină",
      themeDark: "Întuneric",
      language: "Limba",
      siteTitle: "ChatGPT Citiți cu voce tare, cu comenzi care țin pasul.",
      siteIntro: "Întrerupeți, derulați înapoi, modificați viteza de redare și descărcați audio. Rămâneți în conversație în timp ce ascultați.",
      chrome: "Obțineți-l pentru Chrome",
      edge: "Ia-l pentru Edge",
      desktop: "Pentru desktop Chrome, Edge și browsere compatibile. Deschideți această pagină pe computer pentru a instala.",
      features: "Ascultă-ți în felul tău",
      setup: "Trei pași pentru o ascultare mai bună",
      stepInstall: "Instalați extensia din magazinul browserului dvs.",
      stepRead: "Deschideți ChatGPT și începeți Citiți cu voce tare la un răspuns finalizat.",
      stepControl: "Întrerupeți, căutați, schimbați viteza sau salvați sunetul de pe player.",
      privacy: "Confidențialitate",
      privacyBody: "Extensia nu are analize sau telemetrie. Gestionarea sunetului și a conversațiilor rămân în browser. Sincronizarea browserului poate sincroniza preferințele.",
      independent: "Un proiect independent open-source de Infoxica. Nu este afiliat sau susținut de OpenAI.",
      analyticsTitle: "Ajutați-ne să facem acest site mai util",
      analyticsBody: "Ajutați-ne să aflăm ce pagini sunt utile și cum descoperă oamenii extensia. Permiteți Google Analytics să măsoare vizitele pe site și clicurile pe link-uri la magazine? Sondajul de extensie și dezinstalare rămâne fără analize. Îți poți schimba alegerea oricând.",
      accept: "Permite analize",
      decline: "Nu, mulțumesc",
      preferences: "Preferințe de analiză",
      websitePrivacy: "Acest site web folosește Google Analytics numai după ce permiteți acest lucru. Măsoară vizitele și clicurile pe link-uri la magazin, nu instalările sau utilizarea extensiilor. Puteți retrage permisiunea utilizând preferințele Analytics.",
      feedbackPolicy: "Feedbackul dvs. este opțional și privat, chiar și după dezinstalare. Nu este necesar niciun nume sau e-mail. Vă rugăm să nu includeți detalii personale sau conversații.",
      screenshot: "ChatGPT Comenzi de redare Citiți cu voce tare",
      available: "Verificați magazinul dvs. pentru versiunea disponibilă în prezent.",
      website: "Site oficial"
    },
    nb: {
      hide: "Skjul flytende kontroller",
      hideMode: "Når skjult",
      idleOnly: "Skjul kun inaktiv boble",
      allUi: "Skjul boble og spiller",
      hideHint: "Lyden fortsetter å fungere. Gjenopprett kontrollene her eller med snarveien.",
      visibilityShortcut: "Vis / skjul flytende kontroller",
      unassigned: "Ikke tildelt",
      customize: "Tilpass snarveien",
      shortcutScope: "Avspillingstaster fungerer på ChatGPT utenfor tekstfelt. Synlighetssnarveien fungerer også mens du skriver.",
      quickStart: "Begynn å lytte",
      quickStartBody: "Åpne ChatGPT og start høytlesing på et fullført svar. Bruk spilleren til å sette på pause, søke, endre hastighet eller laste ned.",
      dismiss: "Skjønner det",
      help: "Hjelp og feilsøking",
      pending: "Starter høytlesing...",
      nativeHelp: "Start avspilling med ChatGPTs Les høyt-knapp ved siden av svaret.",
      playError: "Avspillingen kunne ikke fortsette. Start høytlesing igjen ved å bruke ChatGPTs svarknapp.",
      downloadError: "Lyden kunne ikke lastes ned. Start høytlesing, vent til lyden lastes inn, og prøv på nytt.",
      downloading: "Forbereder nedlastingen …",
      savedError: "Innstillingen kunne ikke lagres. Vennligst prøv igjen.",
      sourceFormat: "Nedlastinger bruker lydformatet levert av ChatGPT. Utvidelsen konverterer ikke lyd.",
      compactHelp: "Når plassen er begrenset, vises to avrundede kapsler over meldingsboksen.",
      surveyTitle: "Beklager å se at du går 💛",
      surveyIntro: "Takk for at du prøver ChatGPT Audio Controls. Hva kunne vi gjort bedre?",
      surveyHint: "Velg en grunn og send. Ingen skriving nødvendig.",
      reasonBroken: "Det fungerte ikke riktig.",
      reasonIntrusive: "Boblen eller spilleren kom i veien.",
      reasonSlow: "Det bremset ChatGPT eller nettleseren min.",
      reasonDifficult: "Det var vanskelig å bruke.",
      reasonMissing: "En funksjon jeg trengte manglet.",
      reasonLanguage: "Språket mitt ble ikke støttet godt.",
      reasonUnneeded: "Jeg trenger det ikke lenger.",
      reasonOther: "Noe annet.",
      addNote: "Legg til et notat – valgfritt",
      noteHint: "Vennligst ikke inkluder samtaler eller personlige detaljer. Maksimalt 1000 tegn.",
      send: "Send tilbakemelding",
      feedbackIntro: "Fortell oss hva som kan fungere bedre. Velg en kategori og legg til et valgfritt notat.",
      feedbackBug: "Rapporter en feil",
      feedbackSuggestion: "Foreslå en forbedring",
      feedbackThanks: "Takk. Tilbakemeldingen din er lagret.",
      sending: "Sender …",
      skip: "Hopp over tilbakemelding",
      thanks: "Takk for at du hjelper oss å forbedre oss. Du er alltid velkommen tilbake.",
      goodbye: "Takk for at du prøvde oss. Pass på!",
      feedbackError: "Tilbakemeldingen din ble ikke bekreftet. Vennligst prøv igjen; svaret ditt er fortsatt her.",
      chooseReason: "Velg én grunn til å sende tilbakemelding.",
      feedbackPrivacy: "Hjelp oss å gjøre ChatGPT Audio Controls bedre. Tilbakemeldingen din er valgfri og privat – ingen navn eller e-post er nødvendig. Grunnleggende app- og enhetsdetaljer hjelper oss å forstå problemer. Vennligst utelat personlige opplysninger eller samtaler.",
      appearance: "Utseende",
      themeSystem: "System",
      themeLight: "Lys",
      themeDark: "Mørkt",
      language: "Språk",
      siteTitle: "ChatGPT Les høyt, med kontroller som følger med.",
      siteIntro: "Pause, spole tilbake, endre avspillingshastighet og last ned lyd. Hold deg i samtalen mens du lytter.",
      chrome: "Få den til Chrome",
      edge: "Få den til Edge",
      desktop: "For stasjonære Chrome, Edge og kompatible nettlesere. Åpne denne siden på datamaskinen din for å installere.",
      features: "Lytt på din måte",
      setup: "Tre trinn til bedre lytting",
      stepInstall: "Installer utvidelsen fra nettleserens butikk.",
      stepRead: "Åpne ChatGPT og start høytlesing på et fullført svar.",
      stepControl: "Sett på pause, søk, endre hastighet eller lagre lyden fra spilleren.",
      privacy: "Personvern",
      privacyBody: "Utvidelsen har ingen analyser eller telemetri. Lyd- og samtalehåndtering forblir i nettleseren din. Nettlesersynkronisering kan synkronisere preferanser.",
      independent: "Et uavhengig åpen kildekode-prosjekt av Infoxica. Ikke tilknyttet eller godkjent av OpenAI.",
      analyticsTitle: "Hjelp oss med å gjøre denne nettsiden mer nyttig",
      analyticsBody: "Hjelp oss å finne ut hvilke sider som er nyttige og hvordan folk oppdager utvidelsen. Vil du tillate at Google Analytics måle nettstedbesøk og klikk på butikklinker? Utvidelses- og avinstalleringsundersøkelsen forblir fri for analyser. Du kan endre valget ditt når som helst.",
      accept: "Tillat analyser",
      decline: "Nei takk",
      preferences: "Analytics-preferanser",
      websitePrivacy: "Denne nettsiden bruker kun Google Analytics etter at du tillater det. Den måler besøk og klikk på butikklinker, ikke installasjoner eller utvidelsesbruk. Du kan trekke tilbake tillatelsen ved å bruke Analytics-preferanser.",
      feedbackPolicy: "Tilbakemeldingen din er valgfri og privat, selv etter avinstallering. Ingen navn eller e-post er nødvendig. Vennligst ikke inkluder personlige opplysninger eller samtaler.",
      screenshot: "ChatGPT Les høyt avspillingskontroller",
      available: "Sjekk butikken din for tilgjengelig versjon.",
      website: "Offisiell nettside"
    }
  };
  // src/shared/i18n/release-locales.json
  var release_locales_default = {
    ja: {
      hide: "フローティングコントロールを非表示",
      hideMode: "非表示にする範囲",
      idleOnly: "待機中のバブルのみ",
      allUi: "バブルとプレーヤー",
      hideHint: "音声は引き続き利用できます。ここかショートカットで操作パネルを再表示できます。",
      visibilityShortcut: "フローティングコントロールの表示／非表示",
      unassigned: "未割り当て",
      customize: "ショートカットを変更",
      shortcutScope: "再生キーはChatGPTの入力欄の外で使えます。表示切り替えは入力中も使えます。",
      quickStart: "読み上げを始める",
      quickStartBody: "ChatGPTで回答の生成が終わったら「読み上げ」を開始します。プレーヤーで一時停止、シーク、速度変更、ダウンロードができます。",
      dismiss: "わかりました",
      help: "ヘルプとトラブルシューティング",
      pending: "読み上げを開始しています…",
      nativeHelp: "ChatGPTの回答横にある読み上げボタンで開始してください。",
      playError: "再開できませんでした。ChatGPTの読み上げボタンでやり直してください。",
      downloadError: "音声をダウンロードできませんでした。読み上げを開始し、音声の読み込み後に再試行してください。",
      downloading: "ダウンロードを準備しています…",
      savedError: "設定を保存できませんでした。もう一度お試しください。",
      sourceFormat: "ChatGPTが提供する音声形式でダウンロードします。音声形式の変換は行いません。",
      compactHelp: "スペースが足りない場合、2つの丸い操作パネルを入力欄の上に表示します。",
      surveyTitle: "ご利用ありがとうございました 💛",
      surveyIntro: "ChatGPT Audio Controlsをお試しいただきありがとうございます。改善できることはありますか？",
      surveyHint: "理由を1つ選んで送信してください。文字入力は不要です。",
      reasonBroken: "正しく動作しなかった",
      reasonIntrusive: "バブルやプレーヤーが邪魔だった",
      reasonSlow: "ChatGPTやブラウザーが遅くなった",
      reasonDifficult: "使い方が難しかった",
      reasonMissing: "必要な機能がなかった",
      reasonLanguage: "自分の言語への対応が不十分だった",
      reasonUnneeded: "もう必要なくなった",
      reasonOther: "その他",
      addNote: "メモを追加（任意）",
      noteHint: "会話や個人情報を含めないでください。1,000文字まで。",
      send: "フィードバックを送信",
      feedbackIntro: "改善できる点を教えてください。カテゴリを選び、必要に応じてメモを追加してください。",
      feedbackBug: "不具合を報告",
      feedbackSuggestion: "改善を提案",
      feedbackThanks: "ありがとうございます。フィードバックを保存しました。",
      sending: "送信しています…",
      skip: "送信せず終了",
      thanks: "改善へのご協力ありがとうございます。またのご利用をお待ちしています。",
      goodbye: "お試しいただきありがとうございました。",
      feedbackError: "送信を確認できませんでした。回答は残っています。もう一度お試しください。",
      chooseReason: "理由を1つ選んでください。",
      feedbackPrivacy: "ChatGPT Audio Controlsの改善にご協力ください。フィードバックは任意で、非公開です。名前やメールは不要です。アプリや端末の基本情報は問題の理解に役立ちます。個人情報や会話は含めないでください。",
      appearance: "外観",
      themeSystem: "システム",
      themeLight: "ライト",
      themeDark: "ダーク",
      language: "言語",
      siteTitle: "ChatGPTの読み上げを、もっと使いやすく。",
      siteIntro: "一時停止、巻き戻し、速度変更、音声ダウンロード。会話を読みながら音声を聞けます。",
      chrome: "Chromeに追加",
      edge: "Edgeに追加",
      desktop: "パソコン版Chrome、Edgeなどの対応ブラウザー用です。インストールするにはパソコンでこのページを開いてください。",
      features: "自分のペースで聞く",
      setup: "3ステップで快適な読み上げ",
      stepInstall: "ブラウザーのストアから拡張機能をインストールします。",
      stepRead: "ChatGPTで生成済みの回答の読み上げを開始します。",
      stepControl: "プレーヤーで一時停止、シーク、速度変更、音声保存ができます。",
      privacy: "プライバシー",
      privacyBody: "拡張機能にアクセス解析やテレメトリーはありません。音声と会話の処理はブラウザー内で行います。設定はブラウザーの同期機能で同期される場合があります。",
      independent: "Infoxicaによる独立したオープンソースプロジェクトです。OpenAIとは提携しておらず、承認も受けていません。",
      analyticsTitle: "もっと役立つサイトにするために",
      analyticsBody: "役立つページや、この拡張機能を知ったきっかけを把握するため、ご協力ください。Google Analytics によるサイト訪問とストアリンクのクリック計測を許可しますか？拡張機能とアンインストール時のアンケートではアクセス解析を行いません。設定はいつでも変更できます。",
      accept: "解析を許可",
      decline: "許可しない",
      preferences: "アクセス解析の設定",
      websitePrivacy: "このサイトは同意後にのみGoogle Analyticsを使用します。計測対象は閲覧とストアリンクのクリックであり、インストールや拡張機能の利用ではありません。アクセス解析の設定から同意を取り消せます。",
      feedbackPolicy: "フィードバックはアンインストール後も任意で、公開されません。氏名やメールアドレスは不要です。個人情報や会話の内容は含めないでください。",
      screenshot: "ChatGPT読み上げの再生コントロール",
      available: "現在利用できるバージョンは各ストアでご確認ください。",
      website: "公式サイト"
    },
    ko: {
      hide: "플로팅 컨트롤 숨기기",
      hideMode: "숨길 범위",
      idleOnly: "대기 중인 버블만 숨기기",
      allUi: "버블과 플레이어 숨기기",
      hideHint: "오디오는 계속 사용할 수 있습니다. 여기 또는 단축키로 컨트롤을 다시 표시하세요.",
      visibilityShortcut: "플로팅 컨트롤 표시 / 숨기기",
      unassigned: "지정되지 않음",
      customize: "단축키 변경",
      shortcutScope: "재생 키는 ChatGPT 입력란 밖에서 작동합니다. 표시 단축키는 입력 중에도 작동합니다.",
      quickStart: "듣기 시작",
      quickStartBody: "ChatGPT에서 완성된 응답의 소리 내어 읽기를 시작하세요. 플레이어로 일시 정지, 탐색, 속도 변경, 다운로드할 수 있습니다.",
      dismiss: "알겠어요",
      help: "도움말 및 문제 해결",
      pending: "소리 내어 읽기 시작 중…",
      nativeHelp: "ChatGPT 답변 옆의 소리 내어 읽기 버튼으로 시작하세요.",
      playError: "재개하지 못했습니다. ChatGPT의 읽기 버튼으로 다시 시작하세요.",
      downloadError: "오디오를 다운로드하지 못했습니다. 읽기를 시작하고 오디오가 로드된 후 다시 시도하세요.",
      downloading: "다운로드 준비 중…",
      savedError: "설정을 저장하지 못했습니다. 다시 시도하세요.",
      sourceFormat: "ChatGPT에서 제공하는 오디오 형식으로 다운로드합니다. 확장 프로그램은 오디오를 변환하지 않습니다.",
      compactHelp: "공간이 부족하면 둥근 컨트롤 두 개가 입력창 위에 표시됩니다.",
      surveyTitle: "함께해 주셔서 감사해요 💛",
      surveyIntro: "ChatGPT Audio Controls를 사용해 주셔서 감사합니다. 무엇을 개선하면 좋을까요?",
      surveyHint: "이유 하나를 골라 보내주세요. 글을 쓰지 않아도 됩니다.",
      reasonBroken: "제대로 작동하지 않았어요.",
      reasonIntrusive: "버블이나 플레이어가 방해됐어요.",
      reasonSlow: "ChatGPT나 브라우저가 느려졌어요.",
      reasonDifficult: "사용하기 어려웠어요.",
      reasonMissing: "필요한 기능이 없었어요.",
      reasonLanguage: "제 언어 지원이 부족했어요.",
      reasonUnneeded: "더 이상 필요하지 않아요.",
      reasonOther: "다른 이유가 있어요.",
      addNote: "메모 추가 — 선택 사항",
      noteHint: "대화나 개인정보는 포함하지 마세요. 최대 1,000자입니다.",
      send: "피드백 보내기",
      feedbackIntro: "개선할 점을 알려 주세요. 분류를 선택하고 필요한 경우 메모를 추가하세요.",
      feedbackBug: "오류 신고",
      feedbackSuggestion: "개선 제안",
      feedbackThanks: "감사합니다. 의견이 저장되었습니다.",
      sending: "보내는 중…",
      skip: "피드백 건너뛰기",
      thanks: "개선에 도움을 주셔서 감사합니다. 언제든 다시 찾아주세요.",
      goodbye: "사용해 주셔서 감사합니다. 안녕히 가세요!",
      feedbackError: "피드백 저장을 확인하지 못했습니다. 답변은 유지됩니다. 다시 시도하세요.",
      chooseReason: "보낼 이유 하나를 선택하세요.",
      feedbackPrivacy: "ChatGPT Audio Controls를 개선할 수 있도록 의견을 들려주세요. 의견은 선택 사항이며 비공개로 보관됩니다. 이름이나 이메일은 필요하지 않습니다. 기본 앱 및 기기 정보는 문제를 이해하는 데 도움이 됩니다. 개인 정보나 대화 내용은 제외해 주세요.",
      appearance: "화면 모드",
      themeSystem: "시스템",
      themeLight: "라이트",
      themeDark: "다크",
      language: "언어",
      siteTitle: "더 편리하게 제어하는 ChatGPT 소리 내어 읽기.",
      siteIntro: "일시 정지, 되감기, 속도 변경, 오디오 다운로드. 대화를 보면서 편하게 들으세요.",
      chrome: "Chrome용 설치",
      edge: "Edge용 설치",
      desktop: "데스크톱 Chrome, Edge 및 호환 브라우저용입니다. 설치하려면 컴퓨터에서 이 페이지를 여세요.",
      features: "내 방식대로 듣기",
      setup: "세 단계로 편하게 듣기",
      stepInstall: "브라우저 스토어에서 확장 프로그램을 설치하세요.",
      stepRead: "ChatGPT에서 완성된 응답의 소리 내어 읽기를 시작하세요.",
      stepControl: "플레이어로 일시 정지, 탐색, 속도 변경, 오디오 저장을 하세요.",
      privacy: "개인정보 보호",
      privacyBody: "확장 프로그램에는 분석이나 원격 측정이 없습니다. 오디오와 대화 처리는 브라우저 안에서 이루어집니다. 브라우저 동기화로 설정이 동기화될 수 있습니다.",
      independent: "Infoxica의 독립적인 오픈소스 프로젝트입니다. OpenAI와 제휴하거나 보증받지 않았습니다.",
      analyticsTitle: "더 유용한 웹사이트를 함께 만들어요",
      analyticsBody: "어떤 페이지가 유용하고 사람들이 확장 프로그램을 어떻게 발견하는지 알려 주세요. Google Analytics로 웹사이트 방문과 스토어 링크 클릭을 측정하도록 허용하시겠어요? 확장 프로그램과 삭제 설문에는 분석 도구가 없습니다. 언제든 선택을 변경할 수 있습니다.",
      accept: "분석 허용",
      decline: "거절",
      preferences: "분석 설정",
      websitePrivacy: "이 웹사이트는 동의한 경우에만 Google Analytics를 사용합니다. 방문과 스토어 링크 클릭을 측정하며 설치나 확장 프로그램 사용은 측정하지 않습니다. 분석 설정에서 동의를 철회할 수 있습니다.",
      feedbackPolicy: "삭제 후에도 피드백은 선택 사항이며 비공개로 처리됩니다. 이름이나 이메일은 필요하지 않습니다. 개인 정보나 대화 내용은 포함하지 마세요.",
      screenshot: "ChatGPT 소리 내어 읽기 재생 컨트롤",
      available: "현재 제공되는 버전은 각 스토어에서 확인하세요.",
      website: "공식 웹사이트"
    },
    hi: {
      hide: "फ़्लोटिंग कंट्रोल छिपाएँ",
      hideMode: "छिपाने का तरीका",
      idleOnly: "केवल निष्क्रिय बबल छिपाएँ",
      allUi: "बबल और प्लेयर छिपाएँ",
      hideHint: "ऑडियो चलता रहेगा। कंट्रोल यहाँ या शॉर्टकट से वापस दिखाएँ।",
      visibilityShortcut: "फ़्लोटिंग कंट्रोल दिखाएँ / छिपाएँ",
      unassigned: "असाइन नहीं किया गया",
      customize: "शॉर्टकट बदलें",
      shortcutScope: "प्लेबैक कुंजियाँ ChatGPT में टेक्स्ट फ़ील्ड के बाहर काम करती हैं। दिखाने/छिपाने का शॉर्टकट टाइप करते समय भी काम करता है।",
      quickStart: "सुनना शुरू करें",
      quickStartBody: "ChatGPT खोलें और पूरे हो चुके उत्तर पर Read Aloud शुरू करें। प्लेयर से रोकें, आगे-पीछे जाएँ, गति बदलें या डाउनलोड करें।",
      dismiss: "समझ गया",
      help: "मदद और समस्या समाधान",
      pending: "Read Aloud शुरू हो रहा है…",
      nativeHelp: "ChatGPT के उत्तर के पास मौजूद Read Aloud बटन से शुरू करें।",
      playError: "प्लेबैक फिर शुरू नहीं हो सका। ChatGPT के Read Aloud बटन से दोबारा शुरू करें।",
      downloadError: "ऑडियो डाउनलोड नहीं हो सका। Read Aloud शुरू करें, ऑडियो लोड होने दें, फिर कोशिश करें।",
      downloading: "डाउनलोड तैयार हो रहा है…",
      savedError: "सेटिंग सेव नहीं हुई। दोबारा कोशिश करें।",
      sourceFormat: "डाउनलोड में ChatGPT का दिया हुआ ऑडियो फ़ॉर्मैट रहता है। एक्सटेंशन ऑडियो का फ़ॉर्मैट नहीं बदलता।",
      compactHelp: "जगह कम होने पर दोनों गोल कंट्रोल संदेश बॉक्स के ऊपर दिखते हैं।",
      surveyTitle: "आपका साथ छूट रहा है 💛",
      surveyIntro: "ChatGPT Audio Controls आज़माने के लिए धन्यवाद। हम क्या बेहतर कर सकते थे?",
      surveyHint: "एक कारण चुनें और भेजें। टाइप करना ज़रूरी नहीं है।",
      reasonBroken: "यह सही से काम नहीं कर रहा था।",
      reasonIntrusive: "बबल या प्लेयर बीच में आ रहा था।",
      reasonSlow: "इससे ChatGPT या ब्राउज़र धीमा हो गया।",
      reasonDifficult: "इसे इस्तेमाल करना मुश्किल था।",
      reasonMissing: "मेरे काम का कोई फ़ीचर नहीं था।",
      reasonLanguage: "मेरी भाषा का सपोर्ट अच्छा नहीं था।",
      reasonUnneeded: "अब मुझे इसकी ज़रूरत नहीं है।",
      reasonOther: "कोई और कारण।",
      addNote: "नोट जोड़ें — वैकल्पिक",
      noteHint: "कृपया बातचीत या निजी जानकारी न लिखें। अधिकतम 1,000 अक्षर।",
      send: "फ़ीडबैक भेजें",
      feedbackIntro: "बताएँ कि हम क्या सुधार सकते हैं। श्रेणी चुनें और चाहें तो टिप्पणी जोड़ें।",
      feedbackBug: "समस्या बताएँ",
      feedbackSuggestion: "सुधार सुझाएँ",
      feedbackThanks: "धन्यवाद। आपकी प्रतिक्रिया सहेज ली गई है।",
      sending: "भेज रहे हैं…",
      skip: "फ़ीडबैक छोड़ें",
      thanks: "बेहतर बनाने में मदद के लिए धन्यवाद। आपका हमेशा स्वागत है।",
      goodbye: "इसे आज़माने के लिए धन्यवाद। अपना ख़याल रखें!",
      feedbackError: "फ़ीडबैक सेव होने की पुष्टि नहीं हुई। आपका उत्तर यहीं है। दोबारा कोशिश करें।",
      chooseReason: "फ़ीडबैक भेजने के लिए एक कारण चुनें।",
      feedbackPrivacy: "ChatGPT Audio Controls को बेहतर बनाने में मदद करें। प्रतिक्रिया देना वैकल्पिक है और इसे निजी रखा जाता है—नाम या ईमेल की जरूरत नहीं है। ऐप और डिवाइस की बुनियादी जानकारी से समस्या समझने में मदद मिलती है। कृपया निजी जानकारी या बातचीत शामिल न करें।",
      appearance: "दिखावट",
      themeSystem: "सिस्टम",
      themeLight: "हल्का",
      themeDark: "गहरा",
      language: "भाषा",
      siteTitle: "ChatGPT Read Aloud, अब आसान कंट्रोल के साथ।",
      siteIntro: "रोकें, पीछे जाएँ, गति बदलें और ऑडियो डाउनलोड करें। सुनते हुए बातचीत से जुड़े रहें।",
      chrome: "Chrome के लिए पाएँ",
      edge: "Edge के लिए पाएँ",
      desktop: "डेस्कटॉप Chrome, Edge और संगत ब्राउज़र के लिए। इंस्टॉल करने के लिए यह पेज कंप्यूटर पर खोलें।",
      features: "अपने अंदाज़ में सुनें",
      setup: "बेहतर सुनने के तीन चरण",
      stepInstall: "अपने ब्राउज़र के स्टोर से एक्सटेंशन इंस्टॉल करें।",
      stepRead: "ChatGPT खोलें और पूरे हो चुके उत्तर पर Read Aloud शुरू करें।",
      stepControl: "प्लेयर से रोकें, आगे-पीछे जाएँ, गति बदलें या ऑडियो सेव करें।",
      privacy: "गोपनीयता",
      privacyBody: "एक्सटेंशन में एनालिटिक्स या टेलीमेट्री नहीं है। ऑडियो और बातचीत की प्रोसेसिंग आपके ब्राउज़र में होती है। ब्राउज़र सिंक से सेटिंग सिंक हो सकती हैं।",
      independent: "Infoxica का स्वतंत्र ओपन-सोर्स प्रोजेक्ट। OpenAI से संबद्ध या अनुमोदित नहीं है।",
      analyticsTitle: "इस वेबसाइट को और उपयोगी बनाने में मदद करें",
      analyticsBody: "जानने में मदद करें कि कौन से पेज उपयोगी हैं और लोग एक्सटेंशन तक कैसे पहुँचते हैं। क्या Google Analytics को वेबसाइट विज़िट और स्टोर लिंक क्लिक मापने की अनुमति देंगे? एक्सटेंशन और अनइंस्टॉल सर्वे में एनालिटिक्स नहीं चलता। आप अपना निर्णय कभी भी बदल सकते हैं।",
      accept: "एनालिटिक्स की अनुमति दें",
      decline: "नहीं, धन्यवाद",
      preferences: "एनालिटिक्स सेटिंग",
      websitePrivacy: "यह वेबसाइट आपकी अनुमति के बाद ही Google Analytics इस्तेमाल करती है। यह विज़िट और स्टोर लिंक क्लिक मापती है, इंस्टॉल या एक्सटेंशन का उपयोग नहीं। एनालिटिक्स सेटिंग से अनुमति वापस ले सकते हैं।",
      feedbackPolicy: "अनइंस्टॉल करने के बाद भी प्रतिक्रिया देना वैकल्पिक है और आपकी प्रतिक्रिया निजी रहती है। नाम या ईमेल की ज़रूरत नहीं है। कृपया निजी जानकारी या बातचीत शामिल न करें।",
      screenshot: "ChatGPT Read Aloud के प्लेबैक कंट्रोल",
      available: "फ़िलहाल उपलब्ध वर्शन के लिए अपना स्टोर देखें।",
      website: "आधिकारिक वेबसाइट"
    },
    fr: {
      hide: "Masquer les commandes flottantes",
      hideMode: "Éléments à masquer",
      idleOnly: "Masquer seulement la bulle inactive",
      allUi: "Masquer la bulle et le lecteur",
      hideHint: "L’audio reste disponible. Rétablissez les commandes ici ou avec le raccourci.",
      visibilityShortcut: "Afficher / masquer les commandes flottantes",
      unassigned: "Non attribué",
      customize: "Modifier le raccourci",
      shortcutScope: "Les touches de lecture fonctionnent hors des champs de texte de ChatGPT. Le raccourci d’affichage fonctionne aussi pendant la saisie.",
      quickStart: "Commencer à écouter",
      quickStartBody: "Ouvrez ChatGPT et lancez la lecture à voix haute d’une réponse terminée. Utilisez le lecteur pour mettre en pause, avancer, changer la vitesse ou télécharger.",
      dismiss: "Compris",
      help: "Aide et dépannage",
      pending: "Démarrage de la lecture…",
      nativeHelp: "Démarrez avec le bouton de lecture à côté de la réponse ChatGPT.",
      playError: "Impossible de reprendre. Relancez avec le bouton de lecture de ChatGPT.",
      downloadError: "Impossible de télécharger l’audio. Lancez la lecture à voix haute, attendez le chargement, puis réessayez.",
      downloading: "Préparation du téléchargement…",
      savedError: "Impossible d’enregistrer le réglage. Réessayez.",
      sourceFormat: "Les téléchargements conservent le format audio fourni par ChatGPT. L’extension ne convertit pas l’audio.",
      compactHelp: "Si l’espace manque, les deux capsules apparaissent au-dessus du champ de saisie.",
      surveyTitle: "Dommage de vous voir partir 💛",
      surveyIntro: "Merci d’avoir essayé ChatGPT Audio Controls. Qu’aurions-nous pu améliorer ?",
      surveyHint: "Choisissez une raison et envoyez. Pas besoin d’écrire.",
      reasonBroken: "Cela ne fonctionnait pas correctement.",
      reasonIntrusive: "La bulle ou le lecteur me gênait.",
      reasonSlow: "Cela ralentissait ChatGPT ou mon navigateur.",
      reasonDifficult: "C’était difficile à utiliser.",
      reasonMissing: "Une fonctionnalité nécessaire manquait.",
      reasonLanguage: "Ma langue était mal prise en charge.",
      reasonUnneeded: "Je n’en ai plus besoin.",
      reasonOther: "Autre chose.",
      addNote: "Ajouter une note — facultatif",
      noteHint: "N’incluez pas de conversations ni de données personnelles. Maximum 1 000 caractères.",
      send: "Envoyer mon avis",
      feedbackIntro: "Dites-nous ce qui peut être amélioré. Choisissez une catégorie et ajoutez une note si vous le souhaitez.",
      feedbackBug: "Signaler un bug",
      feedbackSuggestion: "Suggérer une amélioration",
      feedbackThanks: "Merci. Votre commentaire a été enregistré.",
      sending: "Envoi…",
      skip: "Passer",
      thanks: "Merci de nous aider à nous améliorer. Vous serez toujours bienvenu.",
      goodbye: "Merci d’avoir essayé. Bonne continuation !",
      feedbackError: "L’enregistrement n’a pas été confirmé. Votre réponse est conservée ici. Réessayez.",
      chooseReason: "Choisissez une raison pour envoyer votre avis.",
      feedbackPrivacy: "Aidez-nous à améliorer ChatGPT Audio Controls. Votre avis est facultatif et reste privé, sans nom ni e-mail. Quelques informations sur l’application et votre appareil nous aident à comprendre les problèmes. Merci de ne pas inclure de données personnelles ni de conversations.",
      appearance: "Apparence",
      themeSystem: "Système",
      themeLight: "Clair",
      themeDark: "Sombre",
      language: "Langue",
      siteTitle: "La lecture à voix haute de ChatGPT, avec des commandes pratiques.",
      siteIntro: "Pause, retour arrière, vitesse et téléchargement audio. Écoutez tout en suivant la conversation.",
      chrome: "Installer pour Chrome",
      edge: "Installer pour Edge",
      desktop: "Pour Chrome, Edge et les navigateurs compatibles sur ordinateur. Ouvrez cette page sur votre ordinateur pour installer.",
      features: "Écoutez à votre rythme",
      setup: "Trois étapes pour mieux écouter",
      stepInstall: "Installez l’extension depuis la boutique de votre navigateur.",
      stepRead: "Ouvrez ChatGPT et lancez la lecture à voix haute d’une réponse terminée.",
      stepControl: "Mettez en pause, avancez, changez la vitesse ou enregistrez l’audio depuis le lecteur.",
      privacy: "Confidentialité",
      privacyBody: "L’extension n’intègre ni analyse d’audience ni télémétrie. L’audio et les conversations sont traités dans votre navigateur. Les préférences peuvent être synchronisées par le navigateur.",
      independent: "Un projet open source indépendant d’Infoxica. Sans affiliation ni approbation d’OpenAI.",
      analyticsTitle: "Aidez-nous à rendre ce site plus utile",
      analyticsBody: "Aidez-nous à comprendre quelles pages sont utiles et comment les gens découvrent l’extension. Autoriser Google Analytics à mesurer les visites du site et les clics vers les boutiques ? L’extension et le questionnaire de désinstallation restent sans analyse. Vous pouvez changer d’avis à tout moment.",
      accept: "Autoriser l’analyse",
      decline: "Non merci",
      preferences: "Préférences d’analyse",
      websitePrivacy: "Ce site utilise Google Analytics uniquement avec votre accord. Il mesure les visites et les clics vers les boutiques, pas les installations ni l’utilisation de l’extension. Vous pouvez retirer votre accord dans les préférences d’analyse.",
      feedbackPolicy: "Vos commentaires sont facultatifs et privés, même après la désinstallation. Aucun nom ni e-mail n’est requis. Merci de ne pas inclure de données personnelles ni de conversations.",
      screenshot: "Commandes de lecture à voix haute de ChatGPT",
      available: "Consultez votre boutique pour connaître la version disponible.",
      website: "Site officiel"
    },
    de: {
      hide: "Schwebende Steuerelemente ausblenden",
      hideMode: "Ausblenden",
      idleOnly: "Nur inaktive Blase ausblenden",
      allUi: "Blase und Player ausblenden",
      hideHint: "Audio bleibt verfügbar. Steuerelemente hier oder per Tastenkürzel wieder einblenden.",
      visibilityShortcut: "Schwebende Steuerelemente ein-/ausblenden",
      unassigned: "Nicht zugewiesen",
      customize: "Tastenkürzel ändern",
      shortcutScope: "Wiedergabetasten funktionieren in ChatGPT außerhalb von Textfeldern. Das Kürzel zum Einblenden funktioniert auch beim Tippen.",
      quickStart: "Zuhören starten",
      quickStartBody: "Öffne ChatGPT und starte „Vorlesen“ bei einer fertigen Antwort. Im Player kannst du pausieren, spulen, das Tempo ändern oder Audio herunterladen.",
      dismiss: "Verstanden",
      help: "Hilfe und Fehlerbehebung",
      pending: "Vorlesen wird gestartet…",
      nativeHelp: "Mit der Vorlesen-Schaltfläche neben der ChatGPT-Antwort starten.",
      playError: "Fortsetzen fehlgeschlagen. Mit der Vorlesen-Schaltfläche von ChatGPT neu starten.",
      downloadError: "Audio konnte nicht heruntergeladen werden. Starte Vorlesen, warte auf das Laden und versuche es erneut.",
      downloading: "Download wird vorbereitet…",
      savedError: "Die Einstellung konnte nicht gespeichert werden. Bitte erneut versuchen.",
      sourceFormat: "Downloads verwenden das von ChatGPT bereitgestellte Audioformat. Die Erweiterung konvertiert kein Audio.",
      compactHelp: "Bei wenig Platz stehen die beiden abgerundeten Kapseln über dem Eingabefeld.",
      surveyTitle: "Schade, dass du gehst 💛",
      surveyIntro: "Danke, dass du ChatGPT Audio Controls ausprobiert hast. Was könnten wir verbessern?",
      surveyHint: "Wähle einen Grund und sende ihn ab. Tippen ist nicht nötig.",
      reasonBroken: "Es funktionierte nicht richtig.",
      reasonIntrusive: "Die Blase oder der Player war im Weg.",
      reasonSlow: "ChatGPT oder mein Browser wurde langsamer.",
      reasonDifficult: "Die Bedienung war schwierig.",
      reasonMissing: "Eine benötigte Funktion fehlte.",
      reasonLanguage: "Meine Sprache wurde nicht gut unterstützt.",
      reasonUnneeded: "Ich brauche es nicht mehr.",
      reasonOther: "Etwas anderes.",
      addNote: "Notiz hinzufügen — optional",
      noteHint: "Bitte keine Gespräche oder persönlichen Daten angeben. Höchstens 1.000 Zeichen.",
      send: "Feedback senden",
      feedbackIntro: "Was können wir verbessern? Wähle eine Kategorie und füge bei Bedarf eine Notiz hinzu.",
      feedbackBug: "Fehler melden",
      feedbackSuggestion: "Verbesserung vorschlagen",
      feedbackThanks: "Danke. Dein Feedback wurde gespeichert.",
      sending: "Wird gesendet…",
      skip: "Feedback überspringen",
      thanks: "Danke für deine Hilfe bei der Verbesserung. Du bist jederzeit wieder willkommen.",
      goodbye: "Danke fürs Ausprobieren. Alles Gute!",
      feedbackError: "Dein Feedback wurde nicht bestätigt. Deine Antwort bleibt hier erhalten. Bitte erneut versuchen.",
      chooseReason: "Wähle einen Grund für dein Feedback.",
      feedbackPrivacy: "Hilf uns, ChatGPT Audio Controls zu verbessern. Dein Feedback ist freiwillig und bleibt privat – ohne Namen oder E-Mail. Grundlegende Angaben zu App und Gerät helfen uns, Probleme zu verstehen. Bitte keine persönlichen Daten oder Gespräche angeben.",
      appearance: "Darstellung",
      themeSystem: "System",
      themeLight: "Hell",
      themeDark: "Dunkel",
      language: "Sprache",
      siteTitle: "ChatGPT vorlesen lassen — mit praktischer Steuerung.",
      siteIntro: "Pausieren, zurückspulen, Tempo ändern und Audio herunterladen. Höre zu und bleibe im Gespräch.",
      chrome: "Für Chrome installieren",
      edge: "Für Edge installieren",
      desktop: "Für Chrome, Edge und kompatible Desktop-Browser. Öffne diese Seite am Computer zur Installation.",
      features: "Höre in deinem Tempo",
      setup: "In drei Schritten besser zuhören",
      stepInstall: "Installiere die Erweiterung aus dem Store deines Browsers.",
      stepRead: "Öffne ChatGPT und starte Vorlesen bei einer fertigen Antwort.",
      stepControl: "Pausiere, spule, ändere das Tempo oder speichere Audio im Player.",
      privacy: "Datenschutz",
      privacyBody: "Die Erweiterung enthält weder Analyse noch Telemetrie. Audio und Gespräche werden in deinem Browser verarbeitet. Einstellungen können über die Browsersynchronisierung abgeglichen werden.",
      independent: "Ein unabhängiges Open-Source-Projekt von Infoxica. Keine Verbindung zu oder Unterstützung durch OpenAI.",
      analyticsTitle: "Hilf uns, diese Website nützlicher zu machen",
      analyticsBody: "Hilf uns zu verstehen, welche Seiten nützlich sind und wie Menschen die Erweiterung entdecken. Darf Google Analytics Websitebesuche und Klicks auf Store-Links messen? Erweiterung und Deinstallationsumfrage bleiben ohne Analyse. Du kannst deine Wahl jederzeit ändern.",
      accept: "Analyse erlauben",
      decline: "Nein danke",
      preferences: "Analyseeinstellungen",
      websitePrivacy: "Diese Website verwendet Google Analytics nur nach deiner Zustimmung. Gemessen werden Besuche und Store-Link-Klicks, keine Installationen oder Erweiterungsnutzung. Du kannst die Zustimmung in den Analyseeinstellungen widerrufen.",
      feedbackPolicy: "Dein Feedback ist freiwillig und privat, auch nach der Deinstallation. Name oder E-Mail sind nicht erforderlich. Bitte gib keine persönlichen Daten oder Gesprächsinhalte an.",
      screenshot: "Wiedergabesteuerung für ChatGPT Vorlesen",
      available: "Die derzeit verfügbare Version findest du in deinem Store.",
      website: "Offizielle Website"
    },
    it: {
      hide: "Nascondi i controlli mobili",
      hideMode: "Cosa nascondere",
      idleOnly: "Solo la bolla inattiva",
      allUi: "Bolla e lettore",
      hideHint: "L’audio resta disponibile. Ripristina i controlli qui o con la scorciatoia.",
      visibilityShortcut: "Mostra / nascondi i controlli mobili",
      unassigned: "Non assegnata",
      customize: "Modifica scorciatoia",
      shortcutScope: "I tasti di riproduzione funzionano su ChatGPT fuori dai campi di testo. La scorciatoia di visibilità funziona anche mentre scrivi.",
      quickStart: "Inizia ad ascoltare",
      quickStartBody: "Apri ChatGPT e avvia la lettura ad alta voce di una risposta completata. Usa il lettore per mettere in pausa, scorrere, cambiare velocità o scaricare.",
      dismiss: "Capito",
      help: "Aiuto e risoluzione dei problemi",
      pending: "Avvio della lettura…",
      nativeHelp: "Avvia con il pulsante di lettura accanto alla risposta di ChatGPT.",
      playError: "Impossibile riprendere. Riavvia dal pulsante di lettura di ChatGPT.",
      downloadError: "Impossibile scaricare l’audio. Avvia la lettura, attendi il caricamento e riprova.",
      downloading: "Preparazione del download…",
      savedError: "Impossibile salvare l’impostazione. Riprova.",
      sourceFormat: "I download mantengono il formato audio fornito da ChatGPT. L’estensione non converte l’audio.",
      compactHelp: "Se manca spazio, le due capsule appaiono sopra la casella del messaggio.",
      surveyTitle: "Ci dispiace vederti andare 💛",
      surveyIntro: "Grazie per aver provato ChatGPT Audio Controls. Cosa avremmo potuto migliorare?",
      surveyHint: "Scegli un motivo e invia. Non serve scrivere.",
      reasonBroken: "Non funzionava correttamente.",
      reasonIntrusive: "La bolla o il lettore erano d’intralcio.",
      reasonSlow: "Rallentava ChatGPT o il browser.",
      reasonDifficult: "Era difficile da usare.",
      reasonMissing: "Mancava una funzione necessaria.",
      reasonLanguage: "La mia lingua non era supportata bene.",
      reasonUnneeded: "Non mi serve più.",
      reasonOther: "Un altro motivo.",
      addNote: "Aggiungi una nota — facoltativa",
      noteHint: "Non includere conversazioni o dati personali. Massimo 1.000 caratteri.",
      send: "Invia feedback",
      feedbackIntro: "Dicci cosa possiamo migliorare. Scegli una categoria e aggiungi una nota facoltativa.",
      feedbackBug: "Segnala un errore",
      feedbackSuggestion: "Suggerisci un miglioramento",
      feedbackThanks: "Grazie. Il tuo feedback è stato salvato.",
      sending: "Invio…",
      skip: "Salta il feedback",
      thanks: "Grazie per aiutarci a migliorare. Ti accoglieremo sempre volentieri.",
      goodbye: "Grazie per la prova. A presto!",
      feedbackError: "Il salvataggio non è stato confermato. La risposta è ancora qui. Riprova.",
      chooseReason: "Scegli un motivo per inviare il feedback.",
      feedbackPrivacy: "Aiutaci a migliorare ChatGPT Audio Controls. Il tuo feedback è facoltativo e privato: non servono nome o e-mail. Alcune informazioni di base su app e dispositivo ci aiutano a capire i problemi. Non includere dati personali o conversazioni.",
      appearance: "Aspetto",
      themeSystem: "Sistema",
      themeLight: "Chiaro",
      themeDark: "Scuro",
      language: "Lingua",
      siteTitle: "La lettura ad alta voce di ChatGPT, con controlli pratici.",
      siteIntro: "Pausa, riavvolgimento, velocità e download audio. Ascolta senza perdere il filo della conversazione.",
      chrome: "Installa per Chrome",
      edge: "Installa per Edge",
      desktop: "Per Chrome, Edge e browser compatibili su computer. Apri questa pagina sul computer per installare.",
      features: "Ascolta a modo tuo",
      setup: "Tre passi per ascoltare meglio",
      stepInstall: "Installa l’estensione dallo store del browser.",
      stepRead: "Apri ChatGPT e avvia la lettura ad alta voce di una risposta completata.",
      stepControl: "Metti in pausa, scorri, cambia velocità o salva l’audio dal lettore.",
      privacy: "Privacy",
      privacyBody: "L’estensione non contiene analisi o telemetria. Audio e conversazioni vengono gestiti nel browser. La sincronizzazione del browser può sincronizzare le preferenze.",
      independent: "Un progetto open source indipendente di Infoxica. Non affiliato né approvato da OpenAI.",
      analyticsTitle: "Aiutaci a rendere questo sito più utile",
      analyticsBody: "Aiutaci a capire quali pagine sono utili e come le persone scoprono l’estensione. Consentire a Google Analytics di misurare visite e clic verso gli store? L’estensione e il sondaggio di disinstallazione restano senza analisi. Puoi cambiare scelta in qualsiasi momento.",
      accept: "Consenti analisi",
      decline: "No grazie",
      preferences: "Preferenze di analisi",
      websitePrivacy: "Questo sito usa Google Analytics solo con il tuo consenso. Misura visite e clic verso gli store, non installazioni o uso dell’estensione. Puoi revocare il consenso nelle preferenze di analisi.",
      feedbackPolicy: "Il tuo feedback è facoltativo e privato, anche dopo la disinstallazione. Non servono nome o e-mail. Non includere dati personali o conversazioni.",
      screenshot: "Controlli di riproduzione per la lettura ad alta voce di ChatGPT",
      available: "Controlla lo store per la versione attualmente disponibile.",
      website: "Sito ufficiale"
    },
    id: {
      hide: "Sembunyikan kontrol mengambang",
      hideMode: "Bagian yang disembunyikan",
      idleOnly: "Hanya gelembung saat tidak aktif",
      allUi: "Gelembung dan pemutar",
      hideHint: "Audio tetap berfungsi. Tampilkan kembali kontrol di sini atau dengan pintasan.",
      visibilityShortcut: "Tampilkan / sembunyikan kontrol mengambang",
      unassigned: "Belum ditetapkan",
      customize: "Ubah pintasan",
      shortcutScope: "Tombol pemutaran bekerja di ChatGPT di luar kolom teks. Pintasan visibilitas juga bekerja saat mengetik.",
      quickStart: "Mulai mendengarkan",
      quickStartBody: "Buka ChatGPT dan mulai Baca dengan lantang pada respons yang selesai. Gunakan pemutar untuk menjeda, menggeser, mengubah kecepatan, atau mengunduh.",
      dismiss: "Mengerti",
      help: "Bantuan dan pemecahan masalah",
      pending: "Memulai Baca dengan lantang…",
      nativeHelp: "Mulai dengan tombol Baca dengan lantang di samping jawaban ChatGPT.",
      playError: "Tidak dapat melanjutkan. Mulai ulang dengan tombol baca ChatGPT.",
      downloadError: "Audio tidak dapat diunduh. Mulai pembacaan, tunggu audio dimuat, lalu coba lagi.",
      downloading: "Menyiapkan unduhan…",
      savedError: "Pengaturan tidak dapat disimpan. Coba lagi.",
      sourceFormat: "Unduhan menggunakan format audio dari ChatGPT. Ekstensi tidak mengonversi audio.",
      compactHelp: "Jika ruang sempit, dua kapsul tampil di atas kotak pesan.",
      surveyTitle: "Sayang harus berpisah 💛",
      surveyIntro: "Terima kasih telah mencoba ChatGPT Audio Controls. Apa yang bisa kami perbaiki?",
      surveyHint: "Pilih satu alasan lalu kirim. Tidak perlu mengetik.",
      reasonBroken: "Tidak berfungsi dengan benar.",
      reasonIntrusive: "Gelembung atau pemutar menghalangi.",
      reasonSlow: "ChatGPT atau browser menjadi lambat.",
      reasonDifficult: "Sulit digunakan.",
      reasonMissing: "Fitur yang saya perlukan belum ada.",
      reasonLanguage: "Bahasa saya kurang didukung.",
      reasonUnneeded: "Saya tidak membutuhkannya lagi.",
      reasonOther: "Alasan lain.",
      addNote: "Tambahkan catatan — opsional",
      noteHint: "Jangan sertakan percakapan atau informasi pribadi. Maksimal 1.000 karakter.",
      send: "Kirim masukan",
      feedbackIntro: "Beri tahu kami apa yang perlu ditingkatkan. Pilih kategori dan tambahkan catatan jika perlu.",
      feedbackBug: "Laporkan bug",
      feedbackSuggestion: "Sarankan perbaikan",
      feedbackThanks: "Terima kasih. Masukan Anda telah disimpan.",
      sending: "Mengirim…",
      skip: "Lewati masukan",
      thanks: "Terima kasih telah membantu kami memperbaiki layanan. Anda selalu diterima kembali.",
      goodbye: "Terima kasih sudah mencoba. Semoga hari Anda menyenangkan!",
      feedbackError: "Penyimpanan masukan belum dikonfirmasi. Jawaban Anda masih ada di sini. Coba lagi.",
      chooseReason: "Pilih satu alasan untuk mengirim masukan.",
      feedbackPrivacy: "Bantu kami meningkatkan ChatGPT Audio Controls. Masukan Anda bersifat sukarela dan pribadi—tanpa nama atau email. Informasi dasar aplikasi dan perangkat membantu kami memahami masalah. Jangan sertakan data pribadi atau percakapan.",
      appearance: "Tampilan",
      themeSystem: "Sistem",
      themeLight: "Terang",
      themeDark: "Gelap",
      language: "Bahasa",
      siteTitle: "Baca dengan lantang di ChatGPT, dengan kontrol yang praktis.",
      siteIntro: "Jeda, mundur, ubah kecepatan, dan unduh audio. Tetap ikuti percakapan sambil mendengarkan.",
      chrome: "Pasang untuk Chrome",
      edge: "Pasang untuk Edge",
      desktop: "Untuk Chrome, Edge, dan browser kompatibel di desktop. Buka halaman ini di komputer untuk memasang.",
      features: "Dengarkan dengan cara Anda",
      setup: "Tiga langkah untuk mendengarkan lebih nyaman",
      stepInstall: "Pasang ekstensi dari toko browser Anda.",
      stepRead: "Buka ChatGPT dan mulai Baca dengan lantang pada respons yang selesai.",
      stepControl: "Jeda, geser, ubah kecepatan, atau simpan audio dari pemutar.",
      privacy: "Privasi",
      privacyBody: "Ekstensi tidak memiliki analitik atau telemetri. Audio dan percakapan diproses dalam browser Anda. Sinkronisasi browser dapat menyinkronkan preferensi.",
      independent: "Proyek sumber terbuka independen oleh Infoxica. Tidak berafiliasi atau didukung oleh OpenAI.",
      analyticsTitle: "Bantu kami membuat situs ini lebih bermanfaat",
      analyticsBody: "Bantu kami memahami halaman yang berguna dan cara orang menemukan ekstensi ini. Izinkan Google Analytics mengukur kunjungan situs dan klik tautan toko? Ekstensi dan survei penghapusan tetap tanpa analitik. Anda dapat mengubah pilihan kapan saja.",
      accept: "Izinkan analitik",
      decline: "Tidak, terima kasih",
      preferences: "Preferensi analitik",
      websitePrivacy: "Situs ini menggunakan Google Analytics hanya setelah Anda mengizinkannya. Yang diukur adalah kunjungan dan klik tautan toko, bukan pemasangan atau penggunaan ekstensi. Anda dapat mencabut izin melalui Preferensi analitik.",
      feedbackPolicy: "Masukan Anda bersifat sukarela dan pribadi, bahkan setelah menghapus ekstensi. Nama atau email tidak diperlukan. Jangan sertakan data pribadi atau percakapan.",
      screenshot: "Kontrol pemutaran Baca dengan lantang ChatGPT",
      available: "Periksa toko Anda untuk versi yang tersedia saat ini.",
      website: "Situs resmi"
    },
    tr: {
      hide: "Yüzen kontrolleri gizle",
      hideMode: "Gizlenecek öğeler",
      idleOnly: "Yalnızca boşta duran balonu gizle",
      allUi: "Balonu ve oynatıcıyı gizle",
      hideHint: "Ses çalışmaya devam eder. Kontrolleri buradan veya kısayolla geri getirin.",
      visibilityShortcut: "Yüzen kontrolleri göster / gizle",
      unassigned: "Atanmamış",
      customize: "Kısayolu değiştir",
      shortcutScope: "Oynatma tuşları ChatGPT’de metin alanları dışında çalışır. Görünürlük kısayolu yazarken de çalışır.",
      quickStart: "Dinlemeye başlayın",
      quickStartBody: "ChatGPT’yi açıp tamamlanmış bir yanıtta Sesli Oku’yu başlatın. Oynatıcıyla duraklatın, sarın, hızı değiştirin veya indirin.",
      dismiss: "Anladım",
      help: "Yardım ve sorun giderme",
      pending: "Sesli okuma başlatılıyor…",
      nativeHelp: "ChatGPT yanıtının yanındaki Sesli Oku düğmesiyle başlatın.",
      playError: "Devam edilemedi. ChatGPT Sesli Oku düğmesiyle yeniden başlatın.",
      downloadError: "Ses indirilemedi. Sesli okumayı başlatıp sesin yüklenmesini bekleyin, ardından tekrar deneyin.",
      downloading: "İndirme hazırlanıyor…",
      savedError: "Ayar kaydedilemedi. Lütfen tekrar deneyin.",
      sourceFormat: "İndirmeler ChatGPT’nin sağladığı ses biçimini kullanır. Uzantı ses dönüştürmez.",
      compactHelp: "Alan dar olduğunda iki yuvarlak kapsül mesaj kutusunun üstünde görünür.",
      surveyTitle: "Ayrıldığınıza üzüldük 💛",
      surveyIntro: "ChatGPT Audio Controls’ü denediğiniz için teşekkürler. Neyi daha iyi yapabilirdik?",
      surveyHint: "Bir neden seçip gönderin. Yazmanız gerekmez.",
      reasonBroken: "Doğru çalışmıyordu.",
      reasonIntrusive: "Balon veya oynatıcı engel oluyordu.",
      reasonSlow: "ChatGPT’yi veya tarayıcımı yavaşlatıyordu.",
      reasonDifficult: "Kullanımı zordu.",
      reasonMissing: "İhtiyacım olan bir özellik eksikti.",
      reasonLanguage: "Dilim yeterince desteklenmiyordu.",
      reasonUnneeded: "Artık ihtiyacım yok.",
      reasonOther: "Başka bir neden.",
      addNote: "Not ekle — isteğe bağlı",
      noteHint: "Lütfen konuşma veya kişisel bilgi eklemeyin. En fazla 1.000 karakter.",
      send: "Geri bildirim gönder",
      feedbackIntro: "Neleri iyileştirebileceğimizi söyleyin. Bir kategori seçin ve isterseniz not ekleyin.",
      feedbackBug: "Hata bildir",
      feedbackSuggestion: "İyileştirme öner",
      feedbackThanks: "Teşekkürler. Geri bildiriminiz kaydedildi.",
      sending: "Gönderiliyor…",
      skip: "Geri bildirimi atla",
      thanks: "Geliştirmemize yardım ettiğiniz için teşekkürler. Her zaman yeniden bekleriz.",
      goodbye: "Denediğiniz için teşekkürler. Hoşça kalın!",
      feedbackError: "Geri bildirimin kaydı doğrulanamadı. Yanıtınız burada duruyor. Tekrar deneyin.",
      chooseReason: "Geri bildirim göndermek için bir neden seçin.",
      feedbackPrivacy: "ChatGPT Audio Controls’u geliştirmemize yardımcı olun. Geri bildiriminiz isteğe bağlıdır ve gizli tutulur; ad veya e-posta gerekmez. Temel uygulama ve cihaz bilgileri sorunları anlamamıza yardımcı olur. Lütfen kişisel bilgi veya konuşma eklemeyin.",
      appearance: "Görünüm",
      themeSystem: "Sistem",
      themeLight: "Açık",
      themeDark: "Koyu",
      language: "Dil",
      siteTitle: "ChatGPT Sesli Oku, kullanışlı kontrollerle.",
      siteIntro: "Duraklatın, geri sarın, hızı değiştirin ve sesi indirin. Dinlerken konuşmayı takip edin.",
      chrome: "Chrome için yükle",
      edge: "Edge için yükle",
      desktop: "Masaüstü Chrome, Edge ve uyumlu tarayıcılar içindir. Yüklemek için bu sayfayı bilgisayarınızda açın.",
      features: "Kendi temponuzda dinleyin",
      setup: "Daha iyi dinlemek için üç adım",
      stepInstall: "Uzantıyı tarayıcınızın mağazasından yükleyin.",
      stepRead: "ChatGPT’yi açıp tamamlanmış bir yanıtta Sesli Oku’yu başlatın.",
      stepControl: "Oynatıcıyla duraklatın, sarın, hızı değiştirin veya sesi kaydedin.",
      privacy: "Gizlilik",
      privacyBody: "Uzantıda analiz veya telemetri yoktur. Ses ve konuşmalar tarayıcınızda işlenir. Tercihler tarayıcı eşitlemesiyle eşitlenebilir.",
      independent: "Infoxica’nın bağımsız açık kaynak projesi. OpenAI ile bağlantılı değildir ve OpenAI tarafından onaylanmamıştır.",
      analyticsTitle: "Bu siteyi daha yararlı yapmamıza yardımcı olun",
      analyticsBody: "Hangi sayfaların yararlı olduğunu ve insanların uzantıyı nasıl keşfettiğini anlamamıza yardımcı olun. Google Analytics’in site ziyaretlerini ve mağaza bağlantısı tıklamalarını ölçmesine izin veriyor musunuz? Uzantı ve kaldırma anketinde analiz yapılmaz. Seçiminizi istediğiniz zaman değiştirebilirsiniz.",
      accept: "Analize izin ver",
      decline: "Hayır, teşekkürler",
      preferences: "Analiz tercihleri",
      websitePrivacy: "Bu site Google Analytics’i yalnızca izninizle kullanır. Ziyaretleri ve mağaza bağlantısı tıklamalarını ölçer; yüklemeleri veya uzantı kullanımını ölçmez. Analiz tercihlerinden izninizi geri çekebilirsiniz.",
      feedbackPolicy: "Kaldırdıktan sonra da geri bildiriminiz isteğe bağlı ve gizlidir. Ad veya e-posta gerekmez. Lütfen kişisel bilgileri ya da konuşmaları eklemeyin.",
      screenshot: "ChatGPT Sesli Oku oynatma kontrolleri",
      available: "Kullanılabilir sürüm için mağazanızı kontrol edin.",
      website: "Resmî web sitesi"
    },
    vi: {
      hide: "Ẩn bộ điều khiển nổi",
      hideMode: "Phạm vi ẩn",
      idleOnly: "Chỉ ẩn bong bóng khi không hoạt động",
      allUi: "Ẩn bong bóng và trình phát",
      hideHint: "Âm thanh vẫn hoạt động. Khôi phục bộ điều khiển tại đây hoặc bằng phím tắt.",
      visibilityShortcut: "Hiện / ẩn bộ điều khiển nổi",
      unassigned: "Chưa gán",
      customize: "Tùy chỉnh phím tắt",
      shortcutScope: "Phím phát hoạt động trên ChatGPT ngoài ô nhập văn bản. Phím ẩn/hiện cũng hoạt động khi đang gõ.",
      quickStart: "Bắt đầu nghe",
      quickStartBody: "Mở ChatGPT và bật Đọc to trên một phản hồi đã hoàn tất. Dùng trình phát để tạm dừng, tua, đổi tốc độ hoặc tải xuống.",
      dismiss: "Đã hiểu",
      help: "Trợ giúp và khắc phục sự cố",
      pending: "Đang bắt đầu đọc to…",
      nativeHelp: "Bắt đầu bằng nút Đọc to bên cạnh câu trả lời của ChatGPT.",
      playError: "Không thể tiếp tục. Hãy bắt đầu lại bằng nút Đọc to của ChatGPT.",
      downloadError: "Không thể tải âm thanh. Bật Đọc to, chờ âm thanh tải xong rồi thử lại.",
      downloading: "Đang chuẩn bị tải xuống…",
      savedError: "Không thể lưu cài đặt. Vui lòng thử lại.",
      sourceFormat: "Tệp tải xuống giữ nguyên định dạng âm thanh do ChatGPT cung cấp. Tiện ích không chuyển đổi âm thanh.",
      compactHelp: "Khi thiếu chỗ, hai cụm điều khiển bo tròn nằm phía trên ô nhập.",
      surveyTitle: "Tiếc khi phải chia tay bạn 💛",
      surveyIntro: "Cảm ơn bạn đã thử ChatGPT Audio Controls. Chúng tôi có thể làm tốt hơn điều gì?",
      surveyHint: "Chọn một lý do rồi gửi. Không cần gõ chữ.",
      reasonBroken: "Tiện ích hoạt động không đúng.",
      reasonIntrusive: "Bong bóng hoặc trình phát gây vướng.",
      reasonSlow: "ChatGPT hoặc trình duyệt bị chậm.",
      reasonDifficult: "Khó sử dụng.",
      reasonMissing: "Thiếu tính năng tôi cần.",
      reasonLanguage: "Ngôn ngữ của tôi chưa được hỗ trợ tốt.",
      reasonUnneeded: "Tôi không còn cần nữa.",
      reasonOther: "Lý do khác.",
      addNote: "Thêm ghi chú — không bắt buộc",
      noteHint: "Vui lòng không nhập nội dung trò chuyện hoặc thông tin cá nhân. Tối đa 1.000 ký tự.",
      send: "Gửi phản hồi",
      feedbackIntro: "Hãy cho biết điều cần cải thiện. Chọn danh mục và thêm ghi chú nếu muốn.",
      feedbackBug: "Báo lỗi",
      feedbackSuggestion: "Đề xuất cải tiến",
      feedbackThanks: "Cảm ơn. Phản hồi của bạn đã được lưu.",
      sending: "Đang gửi…",
      skip: "Bỏ qua phản hồi",
      thanks: "Cảm ơn bạn đã giúp chúng tôi cải thiện. Luôn chào đón bạn quay lại.",
      goodbye: "Cảm ơn bạn đã dùng thử. Chúc bạn mọi điều tốt lành!",
      feedbackError: "Chưa xác nhận được phản hồi đã lưu. Câu trả lời vẫn ở đây. Vui lòng thử lại.",
      chooseReason: "Chọn một lý do để gửi phản hồi.",
      feedbackPrivacy: "Hãy giúp chúng tôi cải thiện ChatGPT Audio Controls. Góp ý là tự nguyện và được giữ riêng tư—không cần tên hay email. Thông tin cơ bản về ứng dụng và thiết bị giúp chúng tôi hiểu vấn đề. Vui lòng không gửi thông tin cá nhân hoặc nội dung trò chuyện.",
      appearance: "Giao diện",
      themeSystem: "Hệ thống",
      themeLight: "Sáng",
      themeDark: "Tối",
      language: "Ngôn ngữ",
      siteTitle: "Đọc to trên ChatGPT với các nút điều khiển tiện dụng.",
      siteIntro: "Tạm dừng, tua lại, đổi tốc độ và tải âm thanh. Theo dõi cuộc trò chuyện trong khi nghe.",
      chrome: "Cài cho Chrome",
      edge: "Cài cho Edge",
      desktop: "Dành cho Chrome, Edge và trình duyệt tương thích trên máy tính. Mở trang này trên máy tính để cài đặt.",
      features: "Nghe theo cách của bạn",
      setup: "Ba bước để nghe thuận tiện hơn",
      stepInstall: "Cài tiện ích từ cửa hàng trình duyệt.",
      stepRead: "Mở ChatGPT và bật Đọc to trên phản hồi đã hoàn tất.",
      stepControl: "Tạm dừng, tua, đổi tốc độ hoặc lưu âm thanh từ trình phát.",
      privacy: "Quyền riêng tư",
      privacyBody: "Tiện ích không có phân tích hay đo từ xa. Âm thanh và cuộc trò chuyện được xử lý trong trình duyệt. Tùy chọn có thể được đồng bộ bằng chức năng đồng bộ của trình duyệt.",
      independent: "Dự án mã nguồn mở độc lập của Infoxica. Không liên kết hoặc được OpenAI chứng thực.",
      analyticsTitle: "Giúp chúng tôi làm trang web hữu ích hơn",
      analyticsBody: "Giúp chúng tôi biết trang nào hữu ích và mọi người tìm thấy tiện ích bằng cách nào. Cho phép Google Analytics đo lượt truy cập trang web và nhấp liên kết cửa hàng? Tiện ích và khảo sát gỡ cài đặt vẫn không có phân tích. Bạn có thể đổi lựa chọn bất cứ lúc nào.",
      accept: "Cho phép phân tích",
      decline: "Không, cảm ơn",
      preferences: "Tùy chọn phân tích",
      websitePrivacy: "Trang này chỉ dùng Google Analytics sau khi bạn đồng ý. Chúng tôi đo lượt truy cập và nhấp liên kết cửa hàng, không đo lượt cài đặt hay việc sử dụng tiện ích. Bạn có thể rút lại đồng ý trong Tùy chọn phân tích.",
      feedbackPolicy: "Phản hồi của bạn là tự nguyện và riêng tư, kể cả sau khi gỡ cài đặt. Không cần tên hay email. Vui lòng không gửi thông tin cá nhân hoặc nội dung hội thoại.",
      screenshot: "Bộ điều khiển phát Đọc to của ChatGPT",
      available: "Xem cửa hàng để biết phiên bản hiện có.",
      website: "Trang web chính thức"
    },
    th: {
      hide: "ซ่อนตัวควบคุมลอย",
      hideMode: "สิ่งที่จะซ่อน",
      idleOnly: "ซ่อนเฉพาะบับเบิลที่ไม่ได้ใช้งาน",
      allUi: "ซ่อนบับเบิลและเครื่องเล่น",
      hideHint: "เสียงยังทำงาน คืนค่าตัวควบคุมที่นี่หรือใช้แป้นลัด",
      visibilityShortcut: "แสดง / ซ่อนตัวควบคุมลอย",
      unassigned: "ยังไม่ได้กำหนด",
      customize: "เปลี่ยนปุ่มลัด",
      shortcutScope: "ปุ่มเล่นเสียงทำงานใน ChatGPT นอกช่องข้อความ ปุ่มลัดแสดง/ซ่อนใช้ได้ขณะพิมพ์ด้วย",
      quickStart: "เริ่มฟัง",
      quickStartBody: "เปิด ChatGPT แล้วเริ่มอ่านออกเสียงคำตอบที่เสร็จแล้ว ใช้เครื่องเล่นเพื่อหยุดชั่วคราว เลื่อน เปลี่ยนความเร็ว หรือดาวน์โหลด",
      dismiss: "เข้าใจแล้ว",
      help: "ความช่วยเหลือและแก้ปัญหา",
      pending: "กำลังเริ่มอ่านออกเสียง…",
      nativeHelp: "เริ่มด้วยปุ่มอ่านออกเสียงข้างคำตอบของ ChatGPT",
      playError: "เล่นต่อไม่ได้ โปรดเริ่มใหม่ด้วยปุ่มอ่านออกเสียงของ ChatGPT",
      downloadError: "ดาวน์โหลดเสียงไม่ได้ เริ่มอ่านออกเสียง รอให้เสียงโหลด แล้วลองอีกครั้ง",
      downloading: "กำลังเตรียมดาวน์โหลด…",
      savedError: "บันทึกการตั้งค่าไม่ได้ โปรดลองอีกครั้ง",
      sourceFormat: "ไฟล์ที่ดาวน์โหลดใช้รูปแบบเสียงจาก ChatGPT ส่วนขยายไม่แปลงรูปแบบเสียง",
      compactHelp: "เมื่อพื้นที่ไม่พอ ตัวควบคุมทรงแคปซูลสองส่วนจะแสดงเหนือช่องข้อความ",
      surveyTitle: "เสียดายที่คุณต้องไป 💛",
      surveyIntro: "ขอบคุณที่ลองใช้ ChatGPT Audio Controls เราควรปรับปรุงอะไรบ้าง?",
      surveyHint: "เลือกหนึ่งเหตุผลแล้วส่ง ไม่ต้องพิมพ์",
      reasonBroken: "ทำงานไม่ถูกต้อง",
      reasonIntrusive: "บับเบิลหรือเครื่องเล่นบังสิ่งที่ต้องการ",
      reasonSlow: "ทำให้ ChatGPT หรือเบราว์เซอร์ช้าลง",
      reasonDifficult: "ใช้งานยาก",
      reasonMissing: "ไม่มีฟีเจอร์ที่ต้องการ",
      reasonLanguage: "รองรับภาษาของฉันได้ไม่ดี",
      reasonUnneeded: "ไม่จำเป็นต้องใช้อีกแล้ว",
      reasonOther: "เหตุผลอื่น",
      addNote: "เพิ่มหมายเหตุ — ไม่บังคับ",
      noteHint: "อย่าใส่บทสนทนาหรือข้อมูลส่วนตัว ไม่เกิน 1,000 อักขระ",
      send: "ส่งความคิดเห็น",
      feedbackIntro: "บอกเราว่าควรปรับปรุงอะไร เลือกหมวดหมู่และเพิ่มหมายเหตุได้ตามต้องการ",
      feedbackBug: "รายงานข้อผิดพลาด",
      feedbackSuggestion: "เสนอการปรับปรุง",
      feedbackThanks: "ขอบคุณ บันทึกความคิดเห็นของคุณแล้ว",
      sending: "กำลังส่ง…",
      skip: "ข้ามความคิดเห็น",
      thanks: "ขอบคุณที่ช่วยเราปรับปรุง ยินดีต้อนรับคุณกลับมาเสมอ",
      goodbye: "ขอบคุณที่ลองใช้ ขอให้โชคดี!",
      feedbackError: "ยังยืนยันการบันทึกไม่ได้ คำตอบของคุณยังอยู่ โปรดลองอีกครั้ง",
      chooseReason: "เลือกหนึ่งเหตุผลเพื่อส่งความคิดเห็น",
      feedbackPrivacy: "ช่วยเราปรับปรุง ChatGPT Audio Controls ความคิดเห็นของคุณเป็นทางเลือกและเก็บเป็นส่วนตัว ไม่ต้องระบุชื่อหรืออีเมล ข้อมูลพื้นฐานของแอปและอุปกรณ์ช่วยให้เราเข้าใจปัญหา โปรดไม่ใส่ข้อมูลส่วนตัวหรือบทสนทนา",
      appearance: "รูปแบบ",
      themeSystem: "ระบบ",
      themeLight: "สว่าง",
      themeDark: "มืด",
      language: "ภาษา",
      siteTitle: "อ่านออกเสียงใน ChatGPT พร้อมตัวควบคุมที่ใช้ง่าย",
      siteIntro: "หยุดชั่วคราว ย้อนกลับ เปลี่ยนความเร็ว และดาวน์โหลดเสียง ติดตามบทสนทนาได้ขณะฟัง",
      chrome: "ติดตั้งสำหรับ Chrome",
      edge: "ติดตั้งสำหรับ Edge",
      desktop: "สำหรับ Chrome, Edge และเบราว์เซอร์ที่รองรับบนคอมพิวเตอร์ เปิดหน้านี้บนคอมพิวเตอร์เพื่อติดตั้ง",
      features: "ฟังในแบบของคุณ",
      setup: "สามขั้นตอนเพื่อฟังได้สะดวกขึ้น",
      stepInstall: "ติดตั้งส่วนขยายจากร้านค้าของเบราว์เซอร์",
      stepRead: "เปิด ChatGPT แล้วเริ่มอ่านออกเสียงคำตอบที่เสร็จแล้ว",
      stepControl: "หยุดชั่วคราว เลื่อน เปลี่ยนความเร็ว หรือบันทึกเสียงจากเครื่องเล่น",
      privacy: "ความเป็นส่วนตัว",
      privacyBody: "ส่วนขยายไม่มีการวิเคราะห์หรือข้อมูลการใช้งานระยะไกล เสียงและบทสนทนาถูกประมวลผลในเบราว์เซอร์ การซิงค์ของเบราว์เซอร์อาจซิงค์การตั้งค่า",
      independent: "โครงการโอเพนซอร์สอิสระจาก Infoxica ไม่มีความเกี่ยวข้องหรือการรับรองจาก OpenAI",
      analyticsTitle: "ช่วยทำให้เว็บไซต์นี้มีประโยชน์ยิ่งขึ้น",
      analyticsBody: "ช่วยให้เรารู้ว่าหน้าใดมีประโยชน์และผู้คนพบส่วนขยายได้อย่างไร อนุญาตให้ Google Analytics วัดการเข้าชมเว็บไซต์และการคลิกลิงก์ร้านค้าหรือไม่? ส่วนขยายและแบบสอบถามถอนการติดตั้งไม่มีการวิเคราะห์ คุณเปลี่ยนตัวเลือกได้ทุกเมื่อ",
      accept: "อนุญาตการวิเคราะห์",
      decline: "ไม่ ขอบคุณ",
      preferences: "การตั้งค่าการวิเคราะห์",
      websitePrivacy: "เว็บไซต์นี้ใช้ Google Analytics เมื่อคุณยินยอมเท่านั้น วัดการเข้าชมและคลิกลิงก์ร้านค้า ไม่ใช่การติดตั้งหรือการใช้ส่วนขยาย คุณถอนความยินยอมได้ในการตั้งค่าการวิเคราะห์",
      feedbackPolicy: "ความคิดเห็นของคุณเป็นทางเลือกและเป็นส่วนตัว แม้หลังถอนการติดตั้ง ไม่ต้องระบุชื่อหรืออีเมล โปรดอย่าใส่ข้อมูลส่วนตัวหรือบทสนทนา",
      screenshot: "ตัวควบคุมการอ่านออกเสียง ChatGPT",
      available: "ดูเวอร์ชันที่พร้อมใช้งานในร้านค้าของคุณ",
      website: "เว็บไซต์อย่างเป็นทางการ"
    },
    "zh-CN": {
      hide: "隐藏浮动控件",
      hideMode: "隐藏范围",
      idleOnly: "仅隐藏空闲气泡",
      allUi: "隐藏气泡和播放器",
      hideHint: "音频继续正常工作。可在此处或使用快捷键恢复控件。",
      visibilityShortcut: "显示／隐藏浮动控件",
      unassigned: "未分配",
      customize: "自定义快捷键",
      shortcutScope: "播放按键在 ChatGPT 的文本框外生效。显示快捷键在输入时也可使用。",
      quickStart: "开始聆听",
      quickStartBody: "打开 ChatGPT，为已完成的回复启动朗读。使用播放器暂停、跳转、调速或下载。",
      dismiss: "知道了",
      help: "帮助与故障排除",
      pending: "正在启动朗读…",
      nativeHelp: "请使用 ChatGPT 回答旁的朗读按钮开始播放。",
      playError: "无法恢复播放。请使用 ChatGPT 的朗读按钮重新开始。",
      downloadError: "无法下载音频。请启动朗读，等待音频加载后重试。",
      downloading: "正在准备下载…",
      savedError: "无法保存设置。请重试。",
      sourceFormat: "下载使用 ChatGPT 提供的音频格式。扩展不会转换音频格式。",
      compactHelp: "空间不足时，两个圆角控件会显示在输入框上方。",
      surveyTitle: "很遗憾与你告别 💛",
      surveyIntro: "感谢试用 ChatGPT Audio Controls。我们有哪些地方可以改进？",
      surveyHint: "选择一个原因并发送，无需打字。",
      reasonBroken: "无法正常工作。",
      reasonIntrusive: "气泡或播放器挡住了内容。",
      reasonSlow: "让 ChatGPT 或浏览器变慢了。",
      reasonDifficult: "使用起来很困难。",
      reasonMissing: "缺少我需要的功能。",
      reasonLanguage: "对我的语言支持不佳。",
      reasonUnneeded: "我不再需要它了。",
      reasonOther: "其他原因。",
      addNote: "添加备注（选填）",
      noteHint: "请勿包含对话或个人信息。最多 1,000 个字符。",
      send: "发送反馈",
      feedbackIntro: "告诉我们哪些地方可以改进。请选择类别，并可添加备注。",
      feedbackBug: "报告问题",
      feedbackSuggestion: "提出改进建议",
      feedbackThanks: "谢谢，您的反馈已保存。",
      sending: "正在发送…",
      skip: "跳过反馈",
      thanks: "感谢帮助我们改进。随时欢迎你回来。",
      goodbye: "感谢试用，祝你一切顺利！",
      feedbackError: "尚未确认反馈已保存。你的答案仍在，请重试。",
      chooseReason: "请选择一个原因后发送。",
      feedbackPrivacy: "帮助我们改进 ChatGPT Audio Controls。反馈完全自愿且不公开，无需姓名或邮箱。基本的应用和设备信息有助于我们了解问题。请勿包含个人信息或对话内容。",
      appearance: "外观",
      themeSystem: "跟随系统",
      themeLight: "浅色",
      themeDark: "深色",
      language: "语言",
      siteTitle: "让 ChatGPT 朗读更好用的播放控件。",
      siteIntro: "暂停、回退、调速和下载音频。边听边跟上对话。",
      chrome: "安装 Chrome 版",
      edge: "安装 Edge 版",
      desktop: "适用于桌面版 Chrome、Edge 及兼容浏览器。请在电脑上打开本页进行安装。",
      features: "按自己的节奏聆听",
      setup: "三步开启更便捷的聆听",
      stepInstall: "从浏览器商店安装扩展。",
      stepRead: "打开 ChatGPT，为已完成的回复启动朗读。",
      stepControl: "通过播放器暂停、跳转、调速或保存音频。",
      privacy: "隐私",
      privacyBody: "扩展没有分析或遥测。音频和对话处理在浏览器内进行。偏好设置可能通过浏览器同步功能同步。",
      independent: "Infoxica 的独立开源项目。与 OpenAI 无关联，也未经其认可。",
      analyticsTitle: "帮助我们让网站更实用",
      analyticsBody: "帮助我们了解哪些页面有用，以及大家如何发现这款扩展。允许 Google Analytics 统计网站访问和商店链接点击吗？扩展和卸载问卷仍不使用访问分析。你可以随时更改选择。",
      accept: "允许分析",
      decline: "不用，谢谢",
      preferences: "分析偏好设置",
      websitePrivacy: "本网站仅在你同意后使用 Google Analytics。统计内容是访问和商店链接点击，不是安装或扩展使用情况。你可以在分析偏好设置中撤回同意。",
      feedbackPolicy: "反馈由您自愿提交并保持私密，卸载后也一样。无需填写姓名或电子邮件。请勿包含个人信息或对话内容。",
      screenshot: "ChatGPT 朗读播放控件",
      available: "请在商店查看当前可用版本。",
      website: "官方网站"
    },
    "zh-TW": {
      hide: "隱藏浮動控制項",
      hideMode: "隱藏範圍",
      idleOnly: "僅隱藏閒置氣泡",
      allUi: "隱藏氣泡和播放器",
      hideHint: "音訊繼續正常運作。可在此處或使用快捷鍵恢復控制項。",
      visibilityShortcut: "顯示／隱藏浮動控制項",
      unassigned: "未指派",
      customize: "自訂快速鍵",
      shortcutScope: "播放按鍵在 ChatGPT 的文字欄位外生效。顯示快速鍵在輸入時也可使用。",
      quickStart: "開始聆聽",
      quickStartBody: "開啟 ChatGPT，為已完成的回覆啟動朗讀。使用播放器暫停、跳轉、調速或下載。",
      dismiss: "知道了",
      help: "說明與疑難排解",
      pending: "正在啟動朗讀…",
      nativeHelp: "請使用 ChatGPT 回答旁的朗讀按鈕開始播放。",
      playError: "無法恢復播放。請使用 ChatGPT 的朗讀按鈕重新開始。",
      downloadError: "無法下載音訊。請啟動朗讀，等待音訊載入後重試。",
      downloading: "正在準備下載…",
      savedError: "無法儲存設定。請重試。",
      sourceFormat: "下載使用 ChatGPT 提供的音訊格式。擴充功能不會轉換音訊格式。",
      compactHelp: "空間不足時，兩個圓角控制項會顯示在輸入框上方。",
      surveyTitle: "很遺憾與你告別 💛",
      surveyIntro: "感謝試用 ChatGPT Audio Controls。我們有哪些地方可以改進？",
      surveyHint: "選擇一個原因並傳送，無需打字。",
      reasonBroken: "無法正常運作。",
      reasonIntrusive: "氣泡或播放器擋住了內容。",
      reasonSlow: "讓 ChatGPT 或瀏覽器變慢了。",
      reasonDifficult: "使用起來很困難。",
      reasonMissing: "缺少我需要的功能。",
      reasonLanguage: "對我的語言支援不佳。",
      reasonUnneeded: "我不再需要它了。",
      reasonOther: "其他原因。",
      addNote: "新增備註（選填）",
      noteHint: "請勿包含對話或個人資訊。最多 1,000 個字元。",
      send: "傳送意見",
      feedbackIntro: "告訴我們哪些地方可以改善。請選擇類別，並可新增備註。",
      feedbackBug: "回報問題",
      feedbackSuggestion: "提出改善建議",
      feedbackThanks: "謝謝，您的回饋已儲存。",
      sending: "正在傳送…",
      skip: "略過意見回饋",
      thanks: "感謝協助我們改進。隨時歡迎你回來。",
      goodbye: "感謝試用，祝你一切順利！",
      feedbackError: "尚未確認意見已儲存。你的答案仍在，請重試。",
      chooseReason: "請選擇一個原因後傳送。",
      feedbackPrivacy: "協助我們改善 ChatGPT Audio Controls。回饋完全自願且不公開，無需姓名或電子郵件。基本的應用程式和裝置資訊有助於我們了解問題。請勿包含個人資料或對話內容。",
      appearance: "外觀",
      themeSystem: "跟隨系統",
      themeLight: "淺色",
      themeDark: "深色",
      language: "語言",
      siteTitle: "讓 ChatGPT 朗讀更好用的播放控制項。",
      siteIntro: "暫停、倒轉、調速和下載音訊。邊聽邊跟上對話。",
      chrome: "安裝 Chrome 版",
      edge: "安裝 Edge 版",
      desktop: "適用於電腦版 Chrome、Edge 及相容瀏覽器。請在電腦上開啟本頁進行安裝。",
      features: "按自己的步調聆聽",
      setup: "三步開啟更便利的聆聽",
      stepInstall: "從瀏覽器商店安裝擴充功能。",
      stepRead: "開啟 ChatGPT，為已完成的回覆啟動朗讀。",
      stepControl: "透過播放器暫停、跳轉、調速或儲存音訊。",
      privacy: "隱私權",
      privacyBody: "擴充功能沒有分析或遙測。音訊和對話處理在瀏覽器內進行。偏好設定可能透過瀏覽器同步功能同步。",
      independent: "Infoxica 的獨立開源專案。與 OpenAI 無關聯，也未經其認可。",
      analyticsTitle: "幫助我們讓網站更實用",
      analyticsBody: "幫助我們了解哪些頁面有用，以及大家如何發現這款擴充功能。允許 Google Analytics 統計網站造訪和商店連結點擊嗎？擴充功能和解除安裝問卷仍不使用存取分析。你可以隨時變更選擇。",
      accept: "允許分析",
      decline: "不用，謝謝",
      preferences: "分析偏好設定",
      websitePrivacy: "本網站僅在你同意後使用 Google Analytics。統計內容是造訪和商店連結點擊，不是安裝或擴充功能使用情況。你可以在分析偏好設定中撤回同意。",
      feedbackPolicy: "意見回饋由您自願提交並保持私密，解除安裝後也一樣。無需填寫姓名或電子郵件。請勿包含個人資訊或對話內容。",
      screenshot: "ChatGPT 朗讀播放控制項",
      available: "請在商店查看目前可用版本。",
      website: "官方網站"
    },
    es: {
      hide: "Ocultar controles flotantes",
      hideMode: "Qué ocultar",
      idleOnly: "Solo la burbuja inactiva",
      allUi: "Burbuja y reproductor",
      hideHint: "El audio sigue funcionando. Recupera los controles aquí o con el atajo.",
      visibilityShortcut: "Mostrar / ocultar controles flotantes",
      unassigned: "Sin asignar",
      customize: "Personalizar atajo",
      shortcutScope: "Las teclas de reproducción funcionan en ChatGPT fuera de los campos de texto. El atajo de visibilidad también funciona al escribir.",
      quickStart: "Empieza a escuchar",
      quickStartBody: "Abre ChatGPT e inicia Leer en voz alta en una respuesta terminada. Usa el reproductor para pausar, desplazarte, cambiar la velocidad o descargar.",
      dismiss: "Entendido",
      help: "Ayuda y solución de problemas",
      pending: "Iniciando lectura…",
      nativeHelp: "Inicia la lectura con el botón de ChatGPT junto a la respuesta.",
      playError: "No se pudo reanudar. Reinicia con el botón de lectura de ChatGPT.",
      downloadError: "No se pudo descargar el audio. Inicia la lectura, espera a que cargue el audio y vuelve a intentarlo.",
      downloading: "Preparando descarga…",
      savedError: "No se pudo guardar el ajuste. Vuelve a intentarlo.",
      sourceFormat: "Las descargas usan el formato de audio de ChatGPT. La extensión no convierte el audio.",
      compactHelp: "Si falta espacio, las dos cápsulas aparecen encima del cuadro de mensaje.",
      surveyTitle: "Sentimos verte partir 💛",
      surveyIntro: "Gracias por probar ChatGPT Audio Controls. ¿Qué podríamos haber mejorado?",
      surveyHint: "Elige un motivo y envía. No hace falta escribir.",
      reasonBroken: "No funcionaba correctamente.",
      reasonIntrusive: "La burbuja o el reproductor estorbaba.",
      reasonSlow: "Ralentizaba ChatGPT o mi navegador.",
      reasonDifficult: "Era difícil de usar.",
      reasonMissing: "Faltaba una función que necesitaba.",
      reasonLanguage: "Mi idioma no estaba bien soportado.",
      reasonUnneeded: "Ya no lo necesito.",
      reasonOther: "Otro motivo.",
      addNote: "Añadir una nota — opcional",
      noteHint: "No incluyas conversaciones ni datos personales. Máximo 1.000 caracteres.",
      send: "Enviar comentarios",
      feedbackIntro: "Cuéntanos qué podemos mejorar. Elige una categoría y añade una nota opcional.",
      feedbackBug: "Informar de un error",
      feedbackSuggestion: "Sugerir una mejora",
      feedbackThanks: "Gracias. Tus comentarios se han guardado.",
      sending: "Enviando…",
      skip: "Omitir comentarios",
      thanks: "Gracias por ayudarnos a mejorar. Siempre serás bienvenido.",
      goodbye: "Gracias por probarlo. ¡Cuídate!",
      feedbackError: "No se confirmó el guardado. Tu respuesta sigue aquí. Vuelve a intentarlo.",
      chooseReason: "Elige un motivo para enviar tus comentarios.",
      feedbackPrivacy: "Ayúdanos a mejorar ChatGPT Audio Controls. Tus comentarios son opcionales y privados, sin nombre ni correo. Algunos datos básicos de la aplicación y del dispositivo nos ayudan a entender los problemas. No incluyas datos personales ni conversaciones.",
      appearance: "Apariencia",
      themeSystem: "Sistema",
      themeLight: "Claro",
      themeDark: "Oscuro",
      language: "Idioma",
      siteTitle: "Leer en voz alta de ChatGPT, con controles prácticos.",
      siteIntro: "Pausa, retrocede, cambia la velocidad y descarga audio. Sigue la conversación mientras escuchas.",
      chrome: "Instalar para Chrome",
      edge: "Instalar para Edge",
      desktop: "Para Chrome, Edge y navegadores compatibles de escritorio. Abre esta página en tu ordenador para instalar.",
      features: "Escucha a tu manera",
      setup: "Tres pasos para escuchar mejor",
      stepInstall: "Instala la extensión desde la tienda de tu navegador.",
      stepRead: "Abre ChatGPT e inicia Leer en voz alta en una respuesta terminada.",
      stepControl: "Pausa, desplázate, cambia la velocidad o guarda el audio desde el reproductor.",
      privacy: "Privacidad",
      privacyBody: "La extensión no tiene analítica ni telemetría. El audio y las conversaciones se procesan en tu navegador. La sincronización del navegador puede sincronizar las preferencias.",
      independent: "Un proyecto independiente de código abierto de Infoxica. Sin afiliación ni respaldo de OpenAI.",
      analyticsTitle: "Ayúdanos a hacer esta web más útil",
      analyticsBody: "Ayúdanos a saber qué páginas son útiles y cómo descubren la extensión. ¿Permites que Google Analytics mida las visitas y los clics hacia las tiendas? La extensión y la encuesta de desinstalación siguen sin analítica. Puedes cambiar tu elección cuando quieras.",
      accept: "Permitir analítica",
      decline: "No, gracias",
      preferences: "Preferencias de analítica",
      websitePrivacy: "Esta web usa Google Analytics solo tras tu consentimiento. Mide visitas y clics a las tiendas, no instalaciones ni uso de la extensión. Puedes retirar tu consentimiento en Preferencias de analítica.",
      feedbackPolicy: "Tus comentarios son opcionales y privados, incluso después de desinstalar. No necesitas dar tu nombre ni correo electrónico. No incluyas datos personales ni conversaciones.",
      screenshot: "Controles de reproducción de Leer en voz alta de ChatGPT",
      available: "Consulta tu tienda para ver la versión disponible.",
      website: "Sitio web oficial"
    },
    "pt-BR": {
      hide: "Ocultar controles flutuantes",
      hideMode: "O que ocultar",
      idleOnly: "Somente a bolha inativa",
      allUi: "Bolha e player",
      hideHint: "O áudio continua funcionando. Restaure os controles aqui ou pelo atalho.",
      visibilityShortcut: "Mostrar / ocultar controles flutuantes",
      unassigned: "Não atribuído",
      customize: "Personalizar atalho",
      shortcutScope: "As teclas de reprodução funcionam no ChatGPT fora dos campos de texto. O atalho de visibilidade também funciona enquanto você digita.",
      quickStart: "Comece a ouvir",
      quickStartBody: "Abra o ChatGPT e inicie Ler em voz alta em uma resposta concluída. Use o player para pausar, avançar, alterar a velocidade ou baixar.",
      dismiss: "Entendi",
      help: "Ajuda e solução de problemas",
      pending: "Iniciando leitura…",
      nativeHelp: "Inicie pelo botão Ler em voz alta ao lado da resposta do ChatGPT.",
      playError: "Não foi possível retomar. Reinicie pelo botão Ler em voz alta do ChatGPT.",
      downloadError: "Não foi possível baixar o áudio. Inicie a leitura, aguarde o áudio carregar e tente novamente.",
      downloading: "Preparando download…",
      savedError: "Não foi possível salvar a configuração. Tente novamente.",
      sourceFormat: "Os downloads usam o formato de áudio fornecido pelo ChatGPT. A extensão não converte o áudio.",
      compactHelp: "Quando falta espaço, as duas cápsulas aparecem acima da caixa de mensagem.",
      surveyTitle: "É uma pena ver você partir 💛",
      surveyIntro: "Obrigado por experimentar o ChatGPT Audio Controls. O que poderíamos ter feito melhor?",
      surveyHint: "Escolha um motivo e envie. Não precisa digitar.",
      reasonBroken: "Não funcionava corretamente.",
      reasonIntrusive: "A bolha ou o player atrapalhava.",
      reasonSlow: "Deixava o ChatGPT ou meu navegador lento.",
      reasonDifficult: "Era difícil de usar.",
      reasonMissing: "Faltava um recurso de que eu precisava.",
      reasonLanguage: "Meu idioma não era bem suportado.",
      reasonUnneeded: "Não preciso mais.",
      reasonOther: "Outro motivo.",
      addNote: "Adicionar uma nota — opcional",
      noteHint: "Não inclua conversas nem dados pessoais. Máximo de 1.000 caracteres.",
      send: "Enviar feedback",
      feedbackIntro: "Conte o que podemos melhorar. Escolha uma categoria e adicione uma observação opcional.",
      feedbackBug: "Relatar um erro",
      feedbackSuggestion: "Sugerir uma melhoria",
      feedbackThanks: "Obrigado. Seu feedback foi salvo.",
      sending: "Enviando…",
      skip: "Pular feedback",
      thanks: "Obrigado por nos ajudar a melhorar. Você será sempre bem-vindo.",
      goodbye: "Obrigado por experimentar. Tudo de bom!",
      feedbackError: "O salvamento não foi confirmado. Sua resposta continua aqui. Tente novamente.",
      chooseReason: "Escolha um motivo para enviar o feedback.",
      feedbackPrivacy: "Ajude a melhorar o ChatGPT Audio Controls. Seu feedback é opcional e privado, sem nome ou e-mail. Informações básicas do aplicativo e do dispositivo ajudam a entender os problemas. Não inclua dados pessoais nem conversas.",
      appearance: "Aparência",
      themeSystem: "Sistema",
      themeLight: "Claro",
      themeDark: "Escuro",
      language: "Idioma",
      siteTitle: "Ler em voz alta do ChatGPT, com controles práticos.",
      siteIntro: "Pause, volte, altere a velocidade e baixe o áudio. Acompanhe a conversa enquanto ouve.",
      chrome: "Instalar para Chrome",
      edge: "Instalar para Edge",
      desktop: "Para Chrome, Edge e navegadores compatíveis no computador. Abra esta página no computador para instalar.",
      features: "Ouça do seu jeito",
      setup: "Três passos para ouvir melhor",
      stepInstall: "Instale a extensão pela loja do seu navegador.",
      stepRead: "Abra o ChatGPT e inicie Ler em voz alta em uma resposta concluída.",
      stepControl: "Pause, avance, altere a velocidade ou salve o áudio pelo player.",
      privacy: "Privacidade",
      privacyBody: "A extensão não tem análise nem telemetria. O áudio e as conversas são processados no seu navegador. As preferências podem ser sincronizadas pela sincronização do navegador.",
      independent: "Um projeto independente de código aberto da Infoxica. Sem afiliação ou endosso da OpenAI.",
      analyticsTitle: "Ajude a tornar este site mais útil",
      analyticsBody: "Ajude a entender quais páginas são úteis e como as pessoas descobrem a extensão. Permitir que o Google Analytics meça visitas e cliques nos links das lojas? A extensão e a pesquisa de desinstalação continuam sem análise. Você pode mudar sua escolha quando quiser.",
      accept: "Permitir análise",
      decline: "Não, obrigado",
      preferences: "Preferências de análise",
      websitePrivacy: "Este site usa o Google Analytics somente com sua permissão. Mede visitas e cliques nas lojas, não instalações nem uso da extensão. Você pode retirar a permissão nas Preferências de análise.",
      feedbackPolicy: "Seu feedback é opcional e privado, mesmo após desinstalar. Não é necessário informar nome ou e-mail. Não inclua dados pessoais nem conversas.",
      screenshot: "Controles de reprodução de Ler em voz alta do ChatGPT",
      available: "Confira na loja a versão disponível.",
      website: "Site oficial"
    },
    ru: {
      hide: "Скрыть плавающие элементы управления",
      hideMode: "Что скрывать",
      idleOnly: "Только неактивный значок",
      allUi: "Значок и плеер",
      hideHint: "Аудио продолжает работать. Верните управление здесь или сочетанием клавиш.",
      visibilityShortcut: "Показать / скрыть плавающие элементы управления",
      unassigned: "Не назначено",
      customize: "Настроить сочетание",
      shortcutScope: "Клавиши воспроизведения работают в ChatGPT вне текстовых полей. Сочетание для видимости работает и при вводе текста.",
      quickStart: "Начните слушать",
      quickStartBody: "Откройте ChatGPT и запустите чтение вслух готового ответа. Плеер позволяет ставить на паузу, перематывать, менять скорость и скачивать аудио.",
      dismiss: "Понятно",
      help: "Помощь и устранение неполадок",
      pending: "Запуск чтения вслух…",
      nativeHelp: "Начните чтение кнопкой рядом с ответом ChatGPT.",
      playError: "Не удалось продолжить. Запустите чтение заново кнопкой ChatGPT.",
      downloadError: "Не удалось скачать аудио. Начните чтение вслух, дождитесь загрузки и повторите.",
      downloading: "Подготовка загрузки…",
      savedError: "Не удалось сохранить настройку. Повторите попытку.",
      sourceFormat: "Скачивается аудио в формате, предоставленном ChatGPT. Расширение не конвертирует аудио.",
      compactHelp: "Если места мало, две округлые панели появятся над полем ввода.",
      surveyTitle: "Жаль, что вы уходите 💛",
      surveyIntro: "Спасибо, что попробовали ChatGPT Audio Controls. Что мы могли бы улучшить?",
      surveyHint: "Выберите одну причину и отправьте. Печатать не нужно.",
      reasonBroken: "Работало неправильно.",
      reasonIntrusive: "Значок или плеер мешал.",
      reasonSlow: "ChatGPT или браузер стал работать медленнее.",
      reasonDifficult: "Было сложно пользоваться.",
      reasonMissing: "Не хватало нужной функции.",
      reasonLanguage: "Мой язык плохо поддерживался.",
      reasonUnneeded: "Мне больше не нужно расширение.",
      reasonOther: "Другая причина.",
      addNote: "Добавить заметку — необязательно",
      noteHint: "Не указывайте переписку или личные данные. Не более 1 000 символов.",
      send: "Отправить отзыв",
      feedbackIntro: "Расскажите, что можно улучшить. Выберите категорию и при желании добавьте комментарий.",
      feedbackBug: "Сообщить об ошибке",
      feedbackSuggestion: "Предложить улучшение",
      feedbackThanks: "Спасибо. Ваш отзыв сохранён.",
      sending: "Отправка…",
      skip: "Пропустить отзыв",
      thanks: "Спасибо за помощь в улучшении. Будем рады вашему возвращению.",
      goodbye: "Спасибо, что попробовали. Всего доброго!",
      feedbackError: "Сохранение отзыва не подтверждено. Ответ остался здесь. Повторите попытку.",
      chooseReason: "Выберите одну причину для отправки отзыва.",
      feedbackPrivacy: "Помогите улучшить ChatGPT Audio Controls. Отзыв добровольный и непубличный — имя и почта не нужны. Основные сведения о приложении и устройстве помогают разобраться в проблемах. Не включайте личные данные или переписку.",
      appearance: "Оформление",
      themeSystem: "Системное",
      themeLight: "Светлое",
      themeDark: "Тёмное",
      language: "Язык",
      siteTitle: "Чтение вслух в ChatGPT с удобным управлением.",
      siteIntro: "Пауза, перемотка, скорость и скачивание аудио. Следите за разговором, пока слушаете.",
      chrome: "Установить для Chrome",
      edge: "Установить для Edge",
      desktop: "Для настольных Chrome, Edge и совместимых браузеров. Откройте эту страницу на компьютере для установки.",
      features: "Слушайте в своём темпе",
      setup: "Три шага к удобному прослушиванию",
      stepInstall: "Установите расширение из магазина вашего браузера.",
      stepRead: "Откройте ChatGPT и запустите чтение вслух готового ответа.",
      stepControl: "Ставьте на паузу, перематывайте, меняйте скорость и сохраняйте аудио в плеере.",
      privacy: "Конфиденциальность",
      privacyBody: "В расширении нет аналитики или телеметрии. Аудио и разговоры обрабатываются в браузере. Настройки могут синхронизироваться средствами браузера.",
      independent: "Независимый проект Infoxica с открытым исходным кодом. Не связан с OpenAI и не одобрен ею.",
      analyticsTitle: "Помогите сделать сайт полезнее",
      analyticsBody: "Помогите понять, какие страницы полезны и как люди находят расширение. Разрешить Google Analytics измерять посещения сайта и переходы в магазины? В расширении и опросе при удалении аналитики нет. Вы можете изменить свой выбор в любое время.",
      accept: "Разрешить аналитику",
      decline: "Нет, спасибо",
      preferences: "Настройки аналитики",
      websitePrivacy: "Сайт использует Google Analytics только с вашего согласия. Измеряются посещения и переходы в магазины, а не установки или использование расширения. Согласие можно отозвать в настройках аналитики.",
      feedbackPolicy: "Ваш отзыв добровольный и непубличный, даже после удаления расширения. Имя и электронная почта не нужны. Не включайте личные данные или переписку.",
      screenshot: "Управление воспроизведением чтения вслух ChatGPT",
      available: "Доступную версию смотрите в магазине.",
      website: "Официальный сайт"
    },
    "pt-PT": {
      hide: "Ocultar controlos flutuantes",
      hideMode: "O que ocultar",
      idleOnly: "Apenas o balão inativo",
      allUi: "Balão e leitor",
      hideHint: "O áudio continua a funcionar. Restaure os controlos aqui ou com o atalho.",
      visibilityShortcut: "Mostrar / ocultar controlos flutuantes",
      unassigned: "Não atribuído",
      customize: "Personalizar atalho",
      shortcutScope: "As teclas de reprodução funcionam no ChatGPT fora dos campos de texto. O atalho de visibilidade também funciona enquanto escreve.",
      quickStart: "Comece a ouvir",
      quickStartBody: "Abra o ChatGPT e inicie Ler em voz alta numa resposta concluída. Use o leitor para pausar, avançar, alterar a velocidade ou transferir.",
      dismiss: "Entendi",
      help: "Ajuda e solução de problemas",
      pending: "Iniciando leitura…",
      nativeHelp: "Inicie pelo botão Ler em voz alta junto da resposta do ChatGPT.",
      playError: "Não foi possível retomar. Reinicie pelo botão Ler em voz alta do ChatGPT.",
      downloadError: "Não foi possível transferir o áudio. Inicie a leitura, aguarde o carregamento e tente novamente.",
      downloading: "A preparar a transferência…",
      savedError: "Não foi possível guardar a definição. Tente novamente.",
      sourceFormat: "As transferências usam o formato de áudio fornecido pelo ChatGPT. A extensão não converte o áudio.",
      compactHelp: "Quando falta espaço, as duas cápsulas aparecem acima da caixa de mensagem.",
      surveyTitle: "É uma pena vê-lo partir 💛",
      surveyIntro: "Obrigado por experimentar o ChatGPT Audio Controls. O que poderíamos ter feito melhor?",
      surveyHint: "Escolha um motivo e envie. Não precisa de escrever.",
      reasonBroken: "Não funcionava corretamente.",
      reasonIntrusive: "O balão ou o leitor atrapalhava.",
      reasonSlow: "Tornava o ChatGPT ou o meu navegador lento.",
      reasonDifficult: "Era difícil de usar.",
      reasonMissing: "Faltava uma funcionalidade de que precisava.",
      reasonLanguage: "O meu idioma não era bem suportado.",
      reasonUnneeded: "Não preciso mais.",
      reasonOther: "Outro motivo.",
      addNote: "Adicionar uma nota — opcional",
      noteHint: "Não inclua conversas nem dados pessoais. Máximo de 1.000 caracteres.",
      send: "Enviar opinião",
      feedbackIntro: "Diga-nos o que podemos melhorar. Escolha uma categoria e adicione uma nota opcional.",
      feedbackBug: "Comunicar um erro",
      feedbackSuggestion: "Sugerir uma melhoria",
      feedbackThanks: "Obrigado. O seu feedback foi guardado.",
      sending: "A enviar…",
      skip: "Ignorar opinião",
      thanks: "Obrigado por nos ajudar a melhorar. Será sempre bem-vindo.",
      goodbye: "Obrigado por experimentar. Tudo de bom!",
      feedbackError: "A gravação não foi confirmada. A sua resposta continua aqui. Tente novamente.",
      chooseReason: "Escolha um motivo para enviar a opinião.",
      feedbackPrivacy: "Ajude a melhorar o ChatGPT Audio Controls. A sua opinião é facultativa e privada, sem nome ou e-mail. Informações básicas da aplicação e do dispositivo ajudam a compreender os problemas. Não inclua dados pessoais nem conversas.",
      appearance: "Aspeto",
      themeSystem: "Sistema",
      themeLight: "Claro",
      themeDark: "Escuro",
      language: "Idioma",
      siteTitle: "Ler em voz alta do ChatGPT, com controlos práticos.",
      siteIntro: "Pause, recue, altere a velocidade e transfira o áudio. Acompanhe a conversa enquanto ouve.",
      chrome: "Instalar para Chrome",
      edge: "Instalar para Edge",
      desktop: "Para Chrome, Edge e navegadores compatíveis no computador. Abra esta página no computador para instalar.",
      features: "Ouça à sua maneira",
      setup: "Três passos para ouvir melhor",
      stepInstall: "Instale a extensão pela loja do seu navegador.",
      stepRead: "Abra o ChatGPT e inicie Ler em voz alta numa resposta concluída.",
      stepControl: "Pause, avance, altere a velocidade ou guarde o áudio no leitor.",
      privacy: "Privacidade",
      privacyBody: "A extensão não tem análise nem telemetria. O áudio e as conversas são processados no seu navegador. As preferências podem ser sincronizadas através da sincronização do navegador.",
      independent: "Um projeto independente de código aberto da Infoxica. Sem afiliação ou endosso da OpenAI.",
      analyticsTitle: "Ajude a tornar este site mais útil",
      analyticsBody: "Ajude a perceber quais páginas são úteis e como as pessoas descobrem a extensão. Permitir que o Google Analytics meça visitas e cliques nas ligações das lojas? A extensão e o questionário de desinstalação continuam sem análise. Pode mudar a sua escolha a qualquer momento.",
      accept: "Permitir análise",
      decline: "Não, obrigado",
      preferences: "Preferências de análise",
      websitePrivacy: "Este site usa o Google Analytics apenas com a sua permissão. Mede visitas e cliques nas lojas, não instalações nem utilização da extensão. Pode retirar a permissão nas Preferências de análise.",
      feedbackPolicy: "A sua opinião é facultativa e privada, mesmo após a desinstalação. Não é necessário indicar nome ou e-mail. Não inclua dados pessoais nem conversas.",
      screenshot: "Controlos de reprodução de Ler em voz alta do ChatGPT",
      available: "Consulte a loja para saber a versão disponível.",
      website: "Site oficial"
    }
  };

  // src/shared/i18n/release-copy.ts
  var releaseEnglish = {
    hide: "Hide floating controls",
    hideMode: "When hidden",
    idleOnly: "Hide idle bubble only",
    allUi: "Hide bubble and player",
    hideHint: "Audio keeps working. Restore controls here or with the shortcut.",
    visibilityShortcut: "Show / hide floating controls",
    unassigned: "Not assigned",
    customize: "Customize shortcut",
    shortcutScope: "Playback keys work on ChatGPT outside text fields. The visibility shortcut also works while typing.",
    quickStart: "Start listening",
    quickStartBody: "Open ChatGPT and start Read Aloud on a completed response. Use the player to pause, seek, change speed, or download.",
    dismiss: "Got it",
    help: "Help and troubleshooting",
    pending: "Starting Read Aloud…",
    nativeHelp: "Start playback with ChatGPT’s Read Aloud button beside the response.",
    playError: "Playback could not resume. Start Read Aloud again using ChatGPT’s response button.",
    downloadError: "Audio could not be downloaded. Start Read Aloud, wait for audio to load, then try again.",
    downloading: "Preparing your download…",
    savedError: "The setting could not be saved. Please try again.",
    sourceFormat: "Downloads use the audio format provided by ChatGPT. The extension does not convert audio.",
    compactHelp: "When space is limited, two rounded capsules appear above the message box.",
    surveyTitle: "Sorry to see you go \uD83D\uDC9B",
    surveyIntro: "Thanks for trying ChatGPT Audio Controls. What could we have done better?",
    surveyHint: "Pick one reason and send. No typing needed.",
    reasonBroken: "It didn’t work correctly.",
    reasonIntrusive: "The bubble or player got in the way.",
    reasonSlow: "It slowed down ChatGPT or my browser.",
    reasonDifficult: "It was difficult to use.",
    reasonMissing: "A feature I needed was missing.",
    reasonLanguage: "My language wasn’t supported well.",
    reasonUnneeded: "I don’t need it anymore.",
    reasonOther: "Something else.",
    addNote: "Add a note — optional",
    noteHint: "Please don’t include conversations or personal details. Maximum 1,000 characters.",
    send: "Send feedback",
    feedbackIntro: "Tell us what could work better. Choose a category and add an optional note.",
    feedbackBug: "Report a bug",
    feedbackSuggestion: "Suggest an improvement",
    feedbackThanks: "Thank you. Your feedback has been saved.",
    sending: "Sending…",
    skip: "Skip feedback",
    thanks: "Thank you for helping us improve. You’re always welcome back.",
    goodbye: "Thanks for giving us a try. Take care!",
    feedbackError: "Your feedback wasn’t confirmed. Please try again; your answer is still here.",
    chooseReason: "Choose one reason to send feedback.",
    feedbackPrivacy: "Help us make ChatGPT Audio Controls better. Your feedback is optional and private—no name or email needed. Basic app and device details help us understand issues. Please leave out personal details or conversations.",
    appearance: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    siteTitle: "ChatGPT Read Aloud, with controls that keep up.",
    siteIntro: "Pause, rewind, change playback speed and download audio. Stay in the conversation while you listen.",
    chrome: "Get it for Chrome",
    edge: "Get it for Edge",
    desktop: "For desktop Chrome, Edge and compatible browsers. Open this page on your computer to install.",
    features: "Listen your way",
    setup: "Three steps to better listening",
    stepInstall: "Install the extension from your browser’s store.",
    stepRead: "Open ChatGPT and start Read Aloud on a completed response.",
    stepControl: "Pause, seek, change speed or save the audio from the player.",
    privacy: "Privacy",
    privacyBody: "The extension has no analytics or telemetry. Audio and conversation handling stay in your browser. Browser sync may synchronize preferences.",
    independent: "An independent open-source project by Infoxica. Not affiliated with or endorsed by OpenAI.",
    analyticsTitle: "Help us make this website more useful",
    analyticsBody: "Help us learn which pages are useful and how people discover the extension. Allow Google Analytics to measure website visits and store-link clicks? The extension and uninstall survey stay free of analytics. You can change your choice anytime.",
    accept: "Allow analytics",
    decline: "No thanks",
    preferences: "Analytics preferences",
    websitePrivacy: "This website uses Google Analytics only after you allow it. It measures visits and store-link clicks, not installations or extension usage. You can withdraw permission using Analytics preferences.",
    feedbackPolicy: "Your feedback is optional and private, even after uninstalling. No name or email is required. Please don’t include personal details or conversations.",
    screenshot: "ChatGPT Read Aloud playback controls",
    available: "Check your store for the currently available version.",
    website: "Official website"
  };
  var expanded = Object.fromEntries(Object.entries(expandedRelease).map(([code, values]) => {
    const keys = Object.keys(releaseEnglish);
    if (values.length !== keys.length || values.some((v) => !v.trim()))
      throw new Error(`Incomplete release locale ${code}: ${values.length}/${keys.length}`);
    return [code, Object.fromEntries(keys.map((key, i) => [key, values[i]]))];
  }));
  var releaseLocales = { en: releaseEnglish, ...release_locales_default, ...expanded, ...audience_release_default };
  function getReleaseCopy(language) {
    return releaseLocales[resolveLanguage(language)] || releaseEnglish;
  }

  // src/shared/i18n/features.ts
  var english = ["Player layout", "Desktop", "Narrow screen", "Automatic", "Placement", "Arrangement", "Horizontal row", "Horizontal stack", "Vertical column", "L shape", "Seek pill first", "Circle side", "Left", "Right", "Reset layout", "Drag to arrange", "Full audio is ready to download", "Notify when full audio is ready", "Shortcut assignment is available on desktop browsers.", "Reset speed to 1×", "Increase volume", "Decrease volume", "Mute / unmute", "Top left", "Top center", "Top right", "Left center", "Right center", "Bottom left", "Bottom center", "Bottom right", "Saved on this device", "Swap pills"];
  var catalogs = {
    en: english,
    hi: "प्लेयर का विन्यास|डेस्कटॉप|छोटी स्क्रीन|स्वचालित|स्थान|विन्यास|क्षैतिज पंक्ति|क्षैतिज समूह|लंबवत स्तंभ|L आकार|सीक पिल पहले|गोले की ओर|बायाँ|दायाँ|विन्यास रीसेट करें|व्यवस्थित करने के लिए खींचें|पूरा ऑडियो डाउनलोड के लिए तैयार है|पूरा ऑडियो तैयार होने पर सूचित करें|शॉर्टकट डेस्कटॉप ब्राउज़र में निर्धारित कर सकते हैं।|गति 1× पर रीसेट करें|आवाज़ बढ़ाएँ|आवाज़ घटाएँ|म्यूट / अनम्यूट|ऊपर बाएँ|ऊपर बीच में|ऊपर दाएँ|बाएँ बीच में|दाएँ बीच में|नीचे बाएँ|नीचे बीच में|नीचे दाएँ|इस डिवाइस पर सहेजा गया|पिल बदलें".split("|"),
    bn: "প্লেয়ারের বিন্যাস|ডেস্কটপ|ছোট পর্দা|স্বয়ংক্রিয়|অবস্থান|বিন্যাস|অনুভূমিক সারি|অনুভূমিক স্তূপ|উল্লম্ব স্তম্ভ|L আকৃতি|আগে সিক পিল|বৃত্তের দিক|বাম|ডান|বিন্যাস রিসেট করুন|সাজাতে টানুন|সম্পূর্ণ অডিও ডাউনলোডের জন্য প্রস্তুত|সম্পূর্ণ অডিও প্রস্তুত হলে জানান|ডেস্কটপ ব্রাউজারে শর্টকাট নির্ধারণ করা যায়।|গতি 1× করুন|শব্দ বাড়ান|শব্দ কমান|নিঃশব্দ / শব্দ চালু|ওপরে বামে|ওপরে মাঝখানে|ওপরে ডানে|বামে মাঝখানে|ডানে মাঝখানে|নিচে বামে|নিচে মাঝখানে|নিচে ডানে|এই ডিভাইসে সংরক্ষিত|পিল অদলবদল".split("|"),
    mr: "प्लेयरची मांडणी|डेस्कटॉप|लहान स्क्रीन|स्वयंचलित|स्थान|मांडणी|आडवी ओळ|आडवा संच|उभा स्तंभ|L आकार|सीक पिल आधी|वर्तुळाची बाजू|डावी|उजवी|मांडणी रीसेट करा|मांडणीसाठी ओढा|संपूर्ण ऑडिओ डाउनलोडसाठी तयार आहे|संपूर्ण ऑडिओ तयार झाल्यावर कळवा|डेस्कटॉप ब्राउझरमध्ये शॉर्टकट ठरवता येतात.|वेग 1× करा|आवाज वाढवा|आवाज कमी करा|आवाज बंद / सुरू|वर डावीकडे|वर मध्यभागी|वर उजवीकडे|डावीकडे मध्यभागी|उजवीकडे मध्यभागी|खाली डावीकडे|खाली मध्यभागी|खाली उजवीकडे|या डिव्हाइसवर जतन केले|पिल अदलाबदल करा".split("|"),
    te: "ప్లేయర్ అమరిక|డెస్క్‌టాప్|చిన్న తెర|స్వయంచాలక|స్థానం|అమరిక|అడ్డ వరుస|అడ్డ దొంతర|నిలువు వరుస|L ఆకారం|సీక్ పిల్ ముందు|వృత్తం వైపు|ఎడమ|కుడి|అమరికను రీసెట్ చేయండి|అమర్చడానికి లాగండి|పూర్తి ఆడియో డౌన్‌లోడ్‌కు సిద్ధంగా ఉంది|పూర్తి ఆడియో సిద్ధమైనప్పుడు తెలియజేయండి|డెస్క్‌టాప్ బ్రౌజర్‌లలో షార్ట్‌కట్‌లను కేటాయించవచ్చు.|వేగాన్ని 1× చేయండి|శబ్దాన్ని పెంచండి|శబ్దాన్ని తగ్గించండి|మ్యూట్ / అన్‌మ్యూట్|పై ఎడమ|పై మధ్య|పై కుడి|ఎడమ మధ్య|కుడి మధ్య|దిగువ ఎడమ|దిగువ మధ్య|దిగువ కుడి|ఈ పరికరంలో సేవ్ చేయబడింది|పిల్‌లను మార్చండి".split("|"),
    ta: "பிளேயர் அமைப்பு|டெஸ்க்டாப்|சிறிய திரை|தானியங்கி|இடம்|அமைப்பு|கிடைமட்ட வரிசை|கிடைமட்ட அடுக்கு|செங்குத்து வரிசை|L வடிவம்|தேடல் பட்டை முதலில்|வட்டத்தின் பக்கம்|இடது|வலது|அமைப்பை மீட்டமை|அமைக்க இழுக்கவும்|முழு ஒலியும் பதிவிறக்கத் தயார்|முழு ஒலி தயாரானதும் அறிவிக்கவும்|டெஸ்க்டாப் உலாவிகளில் குறுக்குவழிகளை அமைக்கலாம்.|வேகத்தை 1× ஆக்கு|ஒலியை அதிகரி|ஒலியைக் குறை|ஒலி முடக்கு / இயக்கு|மேல் இடது|மேல் நடு|மேல் வலது|இடது நடு|வலது நடு|கீழ் இடது|கீழ் நடு|கீழ் வலது|இந்தச் சாதனத்தில் சேமிக்கப்பட்டது|பட்டைகளை மாற்று".split("|"),
    ar: "تخطيط المشغّل|سطح المكتب|شاشة صغيرة|تلقائي|الموضع|الترتيب|صف أفقي|تكديس أفقي|عمود رأسي|شكل L|شريط التقدم أولاً|جانب الدائرة|يسار|يمين|إعادة ضبط التخطيط|اسحب للترتيب|الصوت الكامل جاهز للتنزيل|إشعاري عند جاهزية الصوت الكامل|تعيين الاختصارات متاح في متصفحات سطح المكتب.|إعادة السرعة إلى 1×|رفع الصوت|خفض الصوت|كتم / إلغاء الكتم|أعلى اليسار|أعلى الوسط|أعلى اليمين|وسط اليسار|وسط اليمين|أسفل اليسار|أسفل الوسط|أسفل اليمين|محفوظ على هذا الجهاز|تبديل الشريطين".split("|"),
    fa: "چیدمان پخش‌کننده|رایانه|صفحه کوچک|خودکار|موقعیت|چیدمان|ردیف افقی|چیدمان افقی روی هم|ستون عمودی|شکل L|نوار جابه‌جایی اول|سمت دایره|چپ|راست|بازنشانی چیدمان|برای چیدن بکشید|صدای کامل برای دانلود آماده است|هنگام آماده شدن صدای کامل اطلاع بده|تعیین میان‌بر در مرورگرهای رایانه در دسترس است.|بازنشانی سرعت به 1×|افزایش صدا|کاهش صدا|بی‌صدا / باصدا|بالا چپ|بالا وسط|بالا راست|وسط چپ|وسط راست|پایین چپ|پایین وسط|پایین راست|در این دستگاه ذخیره شد|جابه‌جایی نوارها".split("|"),
    he: "פריסת הנגן|מחשב|מסך צר|אוטומטי|מיקום|סידור|שורה אופקית|ערימה אופקית|עמודה אנכית|צורת L|סרגל ההתקדמות ראשון|צד העיגול|שמאל|ימין|איפוס פריסה|גררו לסידור|השמע המלא מוכן להורדה|הודעה כשהשמע המלא מוכן|הקצאת קיצורים זמינה בדפדפנים במחשב.|איפוס מהירות ל־1×|הגברת עוצמה|הנמכת עוצמה|השתקה / ביטול השתקה|למעלה משמאל|למעלה במרכז|למעלה מימין|באמצע משמאל|באמצע מימין|למטה משמאל|למטה במרכז|למטה מימין|נשמר במכשיר זה|החלפת הסרגלים".split("|"),
    tr: "Oynatıcı düzeni|Masaüstü|Dar ekran|Otomatik|Konum|Düzen|Yatay sıra|Yatay yığın|Dikey sütun|L şekli|Önce ilerleme çubuğu|Daire tarafı|Sol|Sağ|Düzeni sıfırla|Düzenlemek için sürükleyin|Sesin tamamı indirilmeye hazır|Sesin tamamı hazır olduğunda bildir|Kısayol atama masaüstü tarayıcılarda kullanılabilir.|Hızı 1× olarak sıfırla|Sesi artır|Sesi azalt|Sesi kapat / aç|Sol üst|Üst orta|Sağ üst|Sol orta|Sağ orta|Sol alt|Alt orta|Sağ alt|Bu cihazda kaydedildi|Çubukları değiştir".split("|"),
    de: "Player-Anordnung|Desktop|Schmaler Bildschirm|Automatisch|Position|Anordnung|Horizontale Reihe|Horizontal gestapelt|Vertikale Spalte|L-Form|Zeitleiste zuerst|Kreisseite|Links|Rechts|Anordnung zurücksetzen|Zum Anordnen ziehen|Die vollständige Audiodatei ist zum Download bereit|Benachrichtigen, wenn die gesamte Audiodatei bereit ist|Tastenkürzel können in Desktop-Browsern zugewiesen werden.|Tempo auf 1× zurücksetzen|Lauter|Leiser|Stumm / Ton an|Oben links|Oben Mitte|Oben rechts|Links Mitte|Rechts Mitte|Unten links|Unten Mitte|Unten rechts|Auf diesem Gerät gespeichert|Leisten tauschen".split("|"),
    fr: "Disposition du lecteur|Ordinateur|Écran étroit|Automatique|Position|Disposition|Rangée horizontale|Pile horizontale|Colonne verticale|Forme en L|Progression en premier|Côté du cercle|Gauche|Droite|Réinitialiser la disposition|Glisser pour organiser|Le fichier audio complet est prêt à télécharger|Notifier lorsque le fichier audio complet est prêt|Les raccourcis se configurent dans les navigateurs de bureau.|Rétablir la vitesse à 1×|Augmenter le volume|Baisser le volume|Couper / rétablir le son|En haut à gauche|En haut au centre|En haut à droite|Au milieu à gauche|Au milieu à droite|En bas à gauche|En bas au centre|En bas à droite|Enregistré sur cet appareil|Permuter les barres".split("|"),
    es: "Diseño del reproductor|Escritorio|Pantalla estrecha|Automático|Posición|Disposición|Fila horizontal|Pila horizontal|Columna vertical|Forma de L|Barra de progreso primero|Lado del círculo|Izquierda|Derecha|Restablecer diseño|Arrastra para organizar|El audio completo está listo para descargar|Avisar cuando el audio completo esté listo|Los atajos se asignan en navegadores de escritorio.|Restablecer velocidad a 1×|Subir volumen|Bajar volumen|Silenciar / activar sonido|Arriba izquierda|Arriba centro|Arriba derecha|Centro izquierda|Centro derecha|Abajo izquierda|Abajo centro|Abajo derecha|Guardado en este dispositivo|Intercambiar barras".split("|"),
    "pt-BR": "Layout do player|Computador|Tela estreita|Automático|Posição|Disposição|Linha horizontal|Pilha horizontal|Coluna vertical|Formato L|Barra de progresso primeiro|Lado do círculo|Esquerda|Direita|Redefinir layout|Arraste para organizar|O áudio completo está pronto para baixar|Avisar quando o áudio completo estiver pronto|Atalhos podem ser atribuídos em navegadores de computador.|Redefinir velocidade para 1×|Aumentar volume|Diminuir volume|Silenciar / ativar som|Superior esquerdo|Superior central|Superior direito|Centro esquerdo|Centro direito|Inferior esquerdo|Inferior central|Inferior direito|Salvo neste dispositivo|Trocar barras".split("|"),
    "pt-PT": "Disposição do leitor|Computador|Ecrã estreito|Automático|Posição|Disposição|Linha horizontal|Pilha horizontal|Coluna vertical|Forma em L|Barra de progresso primeiro|Lado do círculo|Esquerda|Direita|Repor disposição|Arraste para organizar|O áudio completo está pronto a transferir|Avisar quando o áudio completo estiver pronto|Os atalhos podem ser atribuídos em navegadores de computador.|Repor velocidade em 1×|Aumentar volume|Diminuir volume|Silenciar / ativar som|Superior esquerdo|Superior central|Superior direito|Centro esquerdo|Centro direito|Inferior esquerdo|Inferior central|Inferior direito|Guardado neste dispositivo|Trocar barras".split("|"),
    it: "Disposizione del lettore|Desktop|Schermo stretto|Automatico|Posizione|Disposizione|Riga orizzontale|Pila orizzontale|Colonna verticale|Forma a L|Prima la barra di avanzamento|Lato del cerchio|Sinistra|Destra|Ripristina disposizione|Trascina per organizzare|L’audio completo è pronto per il download|Avvisa quando l’audio completo è pronto|I tasti rapidi si assegnano nei browser desktop.|Ripristina velocità a 1×|Aumenta volume|Riduci volume|Disattiva / attiva audio|In alto a sinistra|In alto al centro|In alto a destra|Al centro a sinistra|Al centro a destra|In basso a sinistra|In basso al centro|In basso a destra|Salvato su questo dispositivo|Scambia barre".split("|"),
    ru: "Расположение плеера|Компьютер|Узкий экран|Автоматически|Позиция|Расположение|Горизонтальный ряд|Горизонтальный блок|Вертикальный столбец|Форма L|Сначала шкала времени|Сторона круга|Слева|Справа|Сбросить расположение|Перетащите для размещения|Полная аудиозапись готова к скачиванию|Уведомлять о готовности полной аудиозаписи|Сочетания клавиш назначаются в браузерах на компьютере.|Сбросить скорость до 1×|Увеличить громкость|Уменьшить громкость|Выключить / включить звук|Сверху слева|Сверху по центру|Сверху справа|Слева по центру|Справа по центру|Снизу слева|Снизу по центру|Снизу справа|Сохранено на этом устройстве|Поменять панели местами".split("|"),
    "zh-CN": "播放器布局|桌面|窄屏|自动|位置|排列|水平一行|水平堆叠|垂直一列|L 形|进度条在前|圆钮位置|左|右|重置布局|拖动以排列|完整音频已可下载|完整音频就绪时通知|快捷键分配仅适用于桌面浏览器。|重置速度为 1×|增大音量|减小音量|静音 / 取消静音|左上|顶部中央|右上|左侧中央|右侧中央|左下|底部中央|右下|已保存在此设备|交换控件".split("|"),
    "zh-TW": "播放器配置|桌面|窄螢幕|自動|位置|排列|水平一行|水平堆疊|垂直一列|L 形|進度列在前|圓鈕位置|左|右|重設配置|拖曳以排列|完整音訊已可下載|完整音訊就緒時通知|快速鍵指派僅適用於桌面瀏覽器。|重設速度為 1×|提高音量|降低音量|靜音 / 取消靜音|左上|頂端中央|右上|左側中央|右側中央|左下|底部中央|右下|已儲存在此裝置|交換控制項".split("|"),
    ja: "プレーヤーの配置|デスクトップ|狭い画面|自動|位置|配置|横一列|横に積む|縦一列|L字型|シークバーを先に|丸ボタンの位置|左|右|配置をリセット|ドラッグして配置|音声全体をダウンロードできます|音声全体の準備ができたら通知|ショートカットの割り当てはデスクトップのブラウザーで利用できます。|速度を1×に戻す|音量を上げる|音量を下げる|ミュート切替|左上|上中央|右上|左中央|右中央|左下|下中央|右下|この端末に保存済み|バーを入れ替える".split("|"),
    ko: "플레이어 배치|데스크톱|좁은 화면|자동|위치|배치|가로 한 줄|가로 쌓기|세로 한 줄|L자형|탐색 막대 먼저|원형 버튼 위치|왼쪽|오른쪽|배치 초기화|드래그하여 배치|전체 오디오를 다운로드할 수 있습니다|전체 오디오 준비 시 알림|단축키 지정은 데스크톱 브라우저에서 가능합니다.|속도를 1×로 초기화|음량 높이기|음량 낮추기|음소거 전환|왼쪽 위|가운데 위|오른쪽 위|왼쪽 가운데|오른쪽 가운데|왼쪽 아래|가운데 아래|오른쪽 아래|이 기기에 저장됨|막대 바꾸기".split("|"),
    id: "Tata letak pemutar|Desktop|Layar sempit|Otomatis|Posisi|Susunan|Baris horizontal|Tumpukan horizontal|Kolom vertikal|Bentuk L|Bilah pencarian dahulu|Sisi lingkaran|Kiri|Kanan|Atur ulang tata letak|Seret untuk menyusun|Audio lengkap siap diunduh|Beri tahu saat audio lengkap siap|Pintasan dapat ditetapkan di browser desktop.|Atur ulang kecepatan ke 1×|Naikkan volume|Turunkan volume|Bisukan / aktifkan suara|Kiri atas|Tengah atas|Kanan atas|Kiri tengah|Kanan tengah|Kiri bawah|Tengah bawah|Kanan bawah|Disimpan di perangkat ini|Tukar bilah".split("|"),
    vi: "Bố cục trình phát|Máy tính|Màn hình hẹp|Tự động|Vị trí|Bố cục|Hàng ngang|Xếp chồng ngang|Cột dọc|Hình chữ L|Thanh tua trước|Phía nút tròn|Trái|Phải|Đặt lại bố cục|Kéo để sắp xếp|Toàn bộ âm thanh đã sẵn sàng tải xuống|Thông báo khi toàn bộ âm thanh sẵn sàng|Có thể gán phím tắt trên trình duyệt máy tính.|Đặt lại tốc độ 1×|Tăng âm lượng|Giảm âm lượng|Tắt / bật tiếng|Trên trái|Trên giữa|Trên phải|Giữa trái|Giữa phải|Dưới trái|Dưới giữa|Dưới phải|Đã lưu trên thiết bị này|Đổi chỗ các thanh".split("|"),
    th: "เค้าโครงเครื่องเล่น|เดสก์ท็อป|หน้าจอแคบ|อัตโนมัติ|ตำแหน่ง|การจัดวาง|แถวแนวนอน|ซ้อนแนวนอน|คอลัมน์แนวตั้ง|รูปตัว L|แถบเลื่อนก่อน|ด้านของวงกลม|ซ้าย|ขวา|รีเซ็ตเค้าโครง|ลากเพื่อจัดวาง|เสียงทั้งหมดพร้อมดาวน์โหลดแล้ว|แจ้งเมื่อเสียงทั้งหมดพร้อม|กำหนดแป้นลัดได้ในเบราว์เซอร์เดสก์ท็อป|รีเซ็ตความเร็วเป็น 1×|เพิ่มระดับเสียง|ลดระดับเสียง|ปิด / เปิดเสียง|บนซ้าย|บนกลาง|บนขวา|กลางซ้าย|กลางขวา|ล่างซ้าย|ล่างกลาง|ล่างขวา|บันทึกในอุปกรณ์นี้แล้ว|สลับแถบ".split("|")
  };
  Object.assign(catalogs, Object.fromEntries(Object.entries(audience_features_default).map(([code, copy]) => [code, copy.features])));
  var dockLabels = { en: "Composer dock", hi: "चैट इनपुट से जुड़ा प्लेयर", bn: "চ্যাট ইনপুটে যুক্ত প্লেয়ার", mr: "चॅट इनपुटला जोडलेला प्लेयर", te: "చాట్ ఇన్‌పుట్‌కు జోడించిన ప్లేయర్", ta: "அரட்டை உள்ளீட்டுடன் இணைந்த பிளேயர்", ar: "مشغّل مثبت بحقل الدردشة", fa: "پخش‌کننده متصل به کادر گفتگو", he: "נגן צמוד לתיבת הצ׳אט", "zh-CN": "输入框停靠", "zh-TW": "輸入框停靠", vi: "Gắn vào ô nhập", th: "ยึดกับช่องพิมพ์", es: "Acoplado al cuadro de texto", "pt-BR": "Acoplado à caixa de texto", "pt-PT": "Acoplado à caixa de texto", ru: "У поля ввода", fr: "Ancré au champ de saisie", de: "Am Eingabefeld andocken", ja: "入力欄にドッキング", ko: "입력창에 고정", id: "Menempel pada kotak pesan", it: "Agganciato al campo di testo", tr: "Mesaj kutusuna sabitle" };
  Object.assign(dockLabels, Object.fromEntries(Object.entries(audience_features_default).map(([code, copy]) => [code, copy.dock])));
  function featureCopy(language) {
    const a = catalogs[resolveLanguage(language)] || english;
    return { presets: { original: a[3], composer: dockLabels[resolveLanguage(language)], "top-left": a[23], "top-right": a[25], left: a[26], right: a[27], "bottom-left": a[28], "bottom-right": a[30] }, layout: a[0], desktop: a[1], narrow: a[2], auto: a[3], placement: a[4], arrangement: a[5], arrangements: a.slice(6, 10), seekFirst: a[10], circleSide: a[11], left: a[12], right: a[13], reset: a[14], drag: a[15], ready: a[16], notify: a[17], desktopShortcuts: a[18], speedReset: a[19], volumeUp: a[20], volumeDown: a[21], mute: a[22], anchors: a.slice(23, 31), saved: a[31], swap: a[32] };
  }
  var seekCommands = {
    en: "Seek backward|Seek forward",
    hi: "पीछे जाएँ|आगे जाएँ",
    bn: "পিছনে যান|সামনে যান",
    mr: "मागे जा|पुढे जा",
    te: "వెనక్కి వెళ్లండి|ముందుకు వెళ్లండి",
    ta: "பின்னால் நகர்த்து|முன்னால் நகர்த்து",
    ar: "الرجوع للخلف|التقدم للأمام",
    fa: "رفتن به عقب|رفتن به جلو",
    he: "דילוג אחורה|דילוג קדימה",
    "zh-CN": "向后跳转|向前跳转",
    "zh-TW": "向後跳轉|向前跳轉",
    vi: "Tua lùi|Tua tới",
    th: "ย้อนกลับ|ข้ามไปข้างหน้า",
    es: "Retroceder|Avanzar",
    "pt-BR": "Retroceder|Avançar",
    "pt-PT": "Retroceder|Avançar",
    ru: "Перемотать назад|Перемотать вперёд",
    fr: "Reculer|Avancer",
    de: "Zurückspulen|Vorspulen",
    ja: "巻き戻す|早送りする",
    ko: "뒤로 탐색|앞으로 탐색",
    id: "Mundur|Maju",
    it: "Indietro|Avanti",
    tr: "Geri sar|İleri sar"
  };
  Object.assign(seekCommands, Object.fromEntries(Object.entries(audience_features_default).map(([code, copy]) => [code, copy.seekCommands.join("|")])));
  function commandLabels(language, step) {
    const t = getTranslations(language), c = featureCopy(language), r = getReleaseCopy(language);
    return { "play-pause": t.content.shortcutsPopover.playPause, "seek-back": step === undefined ? seekCommands[resolveLanguage(language)].split("|")[0] : t.content.shortcutsPopover.back.replace("{s}", String(step)), "seek-forward": step === undefined ? seekCommands[resolveLanguage(language)].split("|")[1] : t.content.shortcutsPopover.forward.replace("{s}", String(step)), "speed-decrease": t.shortcuts.speedDecrease.action, "speed-increase": t.shortcuts.speedIncrease.action, "speed-reset": c.speedReset, "volume-increase": c.volumeUp, "volume-decrease": c.volumeDown, "toggle-mute": c.mute, "download-audio": t.content.tooltips.download, "toggle-collapse": `${t.content.tooltips.collapse} / ${t.content.tooltips.expand}`, "toggle-floating-ui": r.visibilityShortcut, "reset-layout": c.reset, "open-help": t.content.tooltips.shortcuts, "open-settings": t.popup.header.openOptions };
  }

  // src/shared/i18n/donations.ts
  var keys = ["title", "value", "costs", "optional", "privacy", "once", "donate", "later", "never", "reminders"];
  var donationCatalogs = {
    bn: [
      "উন্নয়ন চালিয়ে যেতে পাশে থাকুন",
      "ChatGPT Audio Controls কি আপনার দিন সহজ করেছে, সময় বাঁচিয়েছে বা আরও কাজ করতে সাহায্য করেছে? এটি আপনার জীবনে কাজে লাগলে এবং গোপনীয়তাকে সম্মান করা টুল পছন্দ করলে, এর উন্নয়নে সহায়তা করার কথা ভাবুন।",
      "এক্সটেনশন তৈরি ও উন্নত করতে আমি যে AI সাবস্ক্রিপশন ব্যবহার করি, তার বাড়তে থাকা খরচ মেটাতে আপনার অবদান সাহায্য করে। এটি আমাকে কাজ চালিয়ে যাওয়ার অনুপ্রেরণাও দেয়।",
      "অনুদান দিতে পারছেন না? কোনো সমস্যা নেই। আপনার সৎ অভিজ্ঞতা—কাজে কী সাহায্য করেছে এবং কী আরও ভালো হতে পারে—জানানোও অনেক মূল্যবান। পাশে থাকার জন্য ধন্যবাদ। \uD83D\uDE4F",
      "অনুদান দিন বা না দিন, গোপনীয়তার সুরক্ষা ও সব সুবিধা সবার জন্য উপলব্ধ।",
      "GitHub Sponsors-এর মাধ্যমে এককালীন সহায়তা · মার্কিন ডলার",
      "অনুদান দিন",
      "পরে মনে করিয়ে দিন",
      "আর জিজ্ঞাসা করবেন না",
      "পর্যালোচনা ও সহায়তার অনুস্মারক দেখান"
    ],
    mr: [
      "विकास सुरू ठेवण्यासाठी साथ द्या",
      "ChatGPT Audio Controls मुळे तुमचा दिवस सोपा झाला, वेळ वाचला किंवा अधिक काम करता आले का? ते तुमच्यासाठी उपयोगी ठरले असेल आणि गोपनीयतेचा आदर करणारी साधने तुम्हाला महत्त्वाची वाटत असतील, तर विकासाला हातभार लावण्याचा विचार करा.",
      "एक्सटेंशन तयार करण्यासाठी आणि सुधारण्यासाठी मी वापरत असलेल्या AI सदस्यतांचा वाढता खर्च भागवायला तुमचे योगदान मदत करते. पुढे काम करण्याची प्रेरणाही मिळते.",
      "योगदान देणे शक्य नाही? काहीच हरकत नाही. तुमचा प्रामाणिक अनुभव—कामात कशी मदत झाली आणि काय सुधारता येईल—सांगणेही मोलाचे आहे. सोबत असल्याबद्दल धन्यवाद. \uD83D\uDE4F",
      "योगदान दिले किंवा नाही तरी गोपनीयतेचे संरक्षण आणि सर्व सुविधा प्रत्येकासाठी उपलब्ध आहेत.",
      "GitHub Sponsors द्वारे एकदाच योगदान · अमेरिकी डॉलर",
      "योगदान द्या",
      "नंतर आठवण करून द्या",
      "पुन्हा विचारू नका",
      "अभिप्राय आणि सहकार्याची स्मरणपत्रे दाखवा"
    ],
    te: [
      "అభివృద్ధిని కొనసాగించడానికి తోడ్పడండి",
      "ChatGPT Audio Controls మీ రోజును సులభం చేసిందా, సమయం ఆదా చేసిందా లేదా ఎక్కువ పని చేయడానికి సహాయపడిందా? ఇది మీకు ఉపయోగపడి, గోప్యతను గౌరవించే సాధనాలను మీరు విలువైనవిగా భావిస్తే, దీని అభివృద్ధికి తోడ్పడాలని ఆలోచించండి.",
      "ఎక్స్‌టెన్షన్‌ను రూపొందించి మెరుగుపరచడానికి నేను ఉపయోగించే AI చందాల పెరుగుతున్న ఖర్చును భరించడానికి మీ సహాయం ఉపయోగపడుతుంది. ముందుకు సాగడానికి నాకు ప్రేరణ కూడా ఇస్తుంది.",
      "విరాళం ఇవ్వలేకపోతున్నారా? పరవాలేదు. మీ పనిలో ఎలా సహాయపడింది, ఏమి మెరుగుపరచవచ్చు అనే నిజాయితీగల అనుభవాన్ని పంచుకోవడం కూడా ఎంతో విలువైనది. తోడుగా ఉన్నందుకు ధన్యవాదాలు. \uD83D\uDE4F",
      "విరాళం ఇచ్చినా ఇవ్వకపోయినా గోప్యత రక్షణ, అన్ని సదుపాయాలు అందరికీ అందుబాటులో ఉంటాయి.",
      "GitHub Sponsors ద్వారా ఒకసారి సహాయం · అమెరికన్ డాలర్లు",
      "విరాళం ఇవ్వండి",
      "తర్వాత గుర్తు చేయండి",
      "మళ్లీ అడగవద్దు",
      "సమీక్ష, సహాయం రిమైండర్‌లను చూపించు"
    ],
    ta: [
      "தொடர்ந்து உருவாக்க உதவுங்கள்",
      "ChatGPT Audio Controls உங்கள் நாளை எளிதாக்கியதா, நேரத்தைச் சேமித்ததா அல்லது மேலும் வேலை செய்ய உதவியதா? உங்கள் வாழ்வில் பயனளித்திருந்தால், தனியுரிமையை மதிக்கும் கருவிகளை நீங்கள் விரும்பினால், இதன் மேம்பாட்டிற்கு ஆதரவு அளிக்கலாம்.",
      "நீட்சியை உருவாக்கவும் மேம்படுத்தவும் நான் பயன்படுத்தும் AI சந்தாக்களின் அதிகரிக்கும் செலவைச் சமாளிக்க உங்கள் பங்களிப்பு உதவும். தொடர்ந்து பணியாற்ற ஊக்கமும் தரும்.",
      "நன்கொடை அளிக்க இயலவில்லையா? பரவாயில்லை. உங்கள் வேலைத்திறனுக்கு எது உதவியது, எதை மேம்படுத்தலாம் என்ற நேர்மையான அனுபவத்தைப் பகிர்வதும் மதிப்புமிக்கது. உடனிருப்பதற்கு நன்றி. \uD83D\uDE4F",
      "நன்கொடை அளித்தாலும் அளிக்காவிட்டாலும் தனியுரிமைப் பாதுகாப்பும் அனைத்து அம்சங்களும் அனைவருக்கும் கிடைக்கும்.",
      "GitHub Sponsors வழியாக ஒருமுறை ஆதரவு · அமெரிக்க டாலர்கள்",
      "நன்கொடை அளிக்கவும்",
      "பிறகு நினைவூட்டவும்",
      "மீண்டும் கேட்க வேண்டாம்",
      "மதிப்புரை மற்றும் ஆதரவு நினைவூட்டல்களைக் காட்டு"
    ],
    he: [
      "עזרו לי להמשיך לפתח",
      "האם ChatGPT Audio Controls הקל על היום שלכם, חסך לכם זמן או עזר לכם להספיק יותר? אם הוא הוסיף ערך לחייכם ואתם מעריכים כלים שמכבדים את הפרטיות שלכם, שקלו לתמוך בפיתוח.",
      "התרומה שלכם עוזרת לכסות את העלות הגדלה של מנויי הבינה המלאכותית שבהם אני משתמש לפיתוח התוסף ולשיפורו. היא גם נותנת לי עוד מוטיבציה להמשיך.",
      "לא יכולים לתרום? זה לגמרי בסדר. גם שיתוף החוויה הכנה שלכם—מה עזר לכם לעבוד ביעילות ומה אפשר לשפר—חשוב מאוד. תודה שאתם כאן. \uD83D\uDE4F",
      "הפרטיות וכל התכונות זמינות לכולם, עם תרומה או בלעדיה.",
      "תמיכה חד־פעמית דרך GitHub Sponsors · דולר אמריקאי",
      "תרומה",
      "להזכיר לי בהמשך",
      "לא לשאול שוב",
      "הצגת תזכורות לביקורות ולתמיכה"
    ],
    th: [
      "ช่วยให้ฉันพัฒนาต่อไปได้",
      "ChatGPT Audio Controls ทำให้วันของคุณง่ายขึ้น ประหยัดเวลา หรือช่วยให้ทำงานได้มากขึ้นไหม? หากส่วนขยายนี้มีประโยชน์ต่อชีวิตคุณ และคุณให้ความสำคัญกับเครื่องมือที่เคารพความเป็นส่วนตัว ลองพิจารณาสนับสนุนการพัฒนาได้เลย",
      "เงินสนับสนุนช่วยแบ่งเบาค่าสมัคร AI ที่เพิ่มขึ้น ซึ่งฉันใช้สร้างและปรับปรุงส่วนขยาย และยังเป็นกำลังใจให้ทำต่อไปด้วย",
      "ยังบริจาคไม่ได้ก็ไม่เป็นไรเลย การแบ่งปันประสบการณ์จริงว่าช่วยให้ทำงานดีขึ้นอย่างไรและควรปรับปรุงอะไร ก็มีความหมายมากเช่นกัน ขอบคุณที่อยู่ด้วยกันนะ \uD83D\uDE4F",
      "ทุกคนได้รับการคุ้มครองความเป็นส่วนตัวและใช้ทุกฟีเจอร์ได้ ไม่ว่าจะบริจาคหรือไม่",
      "สนับสนุนครั้งเดียวผ่าน GitHub Sponsors · ดอลลาร์สหรัฐ",
      "บริจาค",
      "เตือนฉันภายหลัง",
      "ไม่ต้องถามอีก",
      "แสดงการเตือนให้รีวิวและสนับสนุน"
    ],
    id: [
      "Bantu saya terus mengembangkan",
      "Apakah ChatGPT Audio Controls memudahkan hari Anda, menghemat waktu, atau membantu menyelesaikan lebih banyak pekerjaan? Jika bermanfaat bagi hidup Anda dan Anda menghargai alat yang menghormati privasi, pertimbangkan untuk mendukung pengembangannya.",
      "Kontribusi Anda membantu menutup biaya langganan AI yang terus meningkat, yang saya gunakan untuk membuat dan menyempurnakan ekstensi. Dukungan ini juga memberi saya semangat untuk terus berkarya.",
      "Belum bisa berdonasi? Tidak apa-apa. Berbagi pengalaman jujur—apa yang membantu produktivitas Anda dan apa yang bisa diperbaiki—juga sangat berarti. Terima kasih sudah hadir. \uD83D\uDE4F",
      "Privasi dan semua fitur tetap tersedia untuk semua orang, dengan atau tanpa donasi.",
      "Dukungan satu kali melalui GitHub Sponsors · Dolar AS",
      "Donasi",
      "Ingatkan nanti",
      "Jangan tanya lagi",
      "Tampilkan pengingat ulasan dan dukungan"
    ],
    hu: [
      "Segíts, hogy folytathassam a fejlesztést",
      "A ChatGPT Audio Controls megkönnyíti a napodat, időt takarít meg, vagy segít többet elvégezni? Ha hasznos számodra, és fontosnak tartod a magánszférádat tiszteletben tartó eszközöket, fontold meg a fejlesztés támogatását.",
      "A hozzájárulásod segít fedezni a bővítmény készítéséhez és javításához használt AI-előfizetéseim növekvő költségét. Emellett motivációt ad a folytatáshoz.",
      "Most nem tudsz adományozni? Semmi gond. Őszinte tapasztalatod megosztása—mi segítette a munkádat, és min lehetne javítani—szintén sokat jelent. Köszönöm, hogy itt vagy. \uD83D\uDE4F",
      "Az adatvédelem és minden funkció mindenkinek elérhető, adománytól függetlenül.",
      "Egyszeri támogatás a GitHub Sponsors felületén · Amerikai dollár",
      "Támogatás",
      "Emlékeztess később",
      "Ne kérdezd újra",
      "Értékelési és támogatási emlékeztetők megjelenítése"
    ],
    cs: [
      "Pomozte mi pokračovat ve vývoji",
      "Usnadňuje vám ChatGPT Audio Controls den, šetří čas nebo pomáhá zvládnout víc? Pokud vám přináší užitek a vážíte si nástrojů, které respektují vaše soukromí, zvažte podporu jeho vývoje.",
      "Váš příspěvek pomáhá pokrýt rostoucí náklady na předplatná AI, která používám k tvorbě a vylepšování rozšíření. Dodává mi také motivaci pokračovat.",
      "Nemůžete přispět? To je úplně v pořádku. Hodně znamená i upřímná zkušenost—co vám pomohlo při práci a co by se dalo zlepšit. Děkuji, že jste tu. \uD83D\uDE4F",
      "Ochrana soukromí a všechny funkce zůstávají dostupné všem, bez ohledu na příspěvek.",
      "Jednorázová podpora přes GitHub Sponsors · Americké dolary",
      "Přispět",
      "Připomenout později",
      "Už se neptat",
      "Zobrazovat připomínky hodnocení a podpory"
    ],
    uk: [
      "Допоможіть мені продовжувати розробку",
      "ChatGPT Audio Controls спрощує ваш день, заощаджує час або допомагає встигати більше? Якщо розширення корисне для вас і ви цінуєте інструменти, що поважають вашу приватність, підтримайте його розвиток.",
      "Ваш внесок допомагає оплачувати підписки на ШІ, вартість яких зростає і які я використовую для створення та вдосконалення розширення. А ще він додає мотивації працювати далі.",
      "Не можете допомогти фінансово? Усе гаразд. Щиро розповісти, як розширення допомагає працювати й що можна покращити, теж дуже цінно. Дякую, що ви з нами. \uD83D\uDE4F",
      "Захист приватності й усі функції доступні кожному незалежно від пожертв.",
      "Разова підтримка через GitHub Sponsors · Долари США",
      "Підтримати",
      "Нагадати пізніше",
      "Більше не запитувати",
      "Показувати нагадування про відгуки та підтримку"
    ],
    ca: [
      "Ajuda’m a continuar creant",
      "ChatGPT Audio Controls t’ha fet el dia més fàcil, t’ha estalviat temps o t’ha ajudat a fer més coses? Si aporta valor a la teva vida i aprecies les eines que respecten la privadesa, considera donar suport al seu desenvolupament.",
      "La teva aportació ajuda a cobrir el cost creixent de les subscripcions d’IA que faig servir per crear i millorar l’extensió. També em dona una mica més de motivació per continuar.",
      "No pots fer un donatiu? No passa res. Compartir la teva experiència sincera—què ha millorat la teva productivitat i què podria millorar—també significa molt. Gràcies per ser aquí. \uD83D\uDE4F",
      "La privadesa i totes les funcions continuen disponibles per a tothom, amb donatius o sense.",
      "Aportació única a través de GitHub Sponsors · Dòlars estatunidencs",
      "Fes un donatiu",
      "Recorda-m’ho més tard",
      "No ho tornis a preguntar",
      "Mostra recordatoris de ressenyes i suport"
    ],
    el: [
      "Βοηθήστε με να συνεχίσω την ανάπτυξη",
      "Το ChatGPT Audio Controls έκανε τη μέρα σας πιο εύκολη, σας εξοικονόμησε χρόνο ή σας βοήθησε να κάνετε περισσότερα; Αν προσφέρει αξία στη ζωή σας και εκτιμάτε εργαλεία που σέβονται το απόρρητό σας, σκεφτείτε να στηρίξετε την ανάπτυξή του.",
      "Η συνεισφορά σας βοηθά να καλυφθεί το αυξανόμενο κόστος των συνδρομών AI που χρησιμοποιώ για τη δημιουργία και βελτίωση της επέκτασης. Μου δίνει και επιπλέον κίνητρο να συνεχίσω.",
      "Δεν μπορείτε να κάνετε δωρεά; Κανένα πρόβλημα. Μια ειλικρινής εμπειρία—τι σας βοήθησε να είστε πιο παραγωγικοί και τι θα μπορούσε να βελτιωθεί—σημαίνει επίσης πολλά. Ευχαριστώ που είστε εδώ. \uD83D\uDE4F",
      "Το απόρρητο και όλες οι λειτουργίες παραμένουν διαθέσιμα σε όλους, με ή χωρίς δωρεά.",
      "Εφάπαξ στήριξη μέσω GitHub Sponsors · Δολάρια ΗΠΑ",
      "Δωρεά",
      "Υπενθύμιση αργότερα",
      "Να μη ρωτηθώ ξανά",
      "Εμφάνιση υπενθυμίσεων αξιολόγησης και στήριξης"
    ],
    nb: [
      "Hjelp meg å fortsette utviklingen",
      "Har ChatGPT Audio Controls gjort dagen din enklere, spart tid eller hjulpet deg å få mer gjort? Hvis det har gitt deg noe nyttig og du verdsetter verktøy som respekterer personvernet ditt, vurder å støtte utviklingen.",
      "Bidraget ditt hjelper med å dekke de økende kostnadene til KI-abonnementene jeg bruker for å lage og forbedre utvidelsen. Det gir meg også ekstra motivasjon til å fortsette.",
      "Kan du ikke bidra økonomisk? Det er helt greit. Å dele din ærlige erfaring—hva som har hjulpet deg å jobbe mer effektivt, og hva som kan bli bedre—betyr også mye. Takk for at du er her. \uD83D\uDE4F",
      "Personvern og alle funksjoner er tilgjengelige for alle, uansett om de gir et bidrag.",
      "Engangsbidrag via GitHub Sponsors · Amerikanske dollar",
      "Gi et bidrag",
      "Minn meg på det senere",
      "Ikke spør igjen",
      "Vis påminnelser om omtaler og støtte"
    ],
    en: [
      "Help me keep building",
      "Has ChatGPT Audio Controls made your day a little easier, saved you time, or helped you get more done? If it has added value to your life—and you value tools that respect your privacy—please consider supporting its development.",
      "Your contribution helps cover the rising cost of the AI subscriptions I use to build and improve the extension. It also gives me a little extra motivation to keep going.",
      "Can’t donate? That’s completely okay. Sharing your honest experience—what helped your productivity and what could be better—means a lot too. Thank you for being here. \uD83D\uDE4F",
      "Privacy and all features remain available to everyone, whether or not you donate.",
      "One-time support through GitHub Sponsors · US dollars",
      "Donate",
      "Remind me later",
      "Don’t ask again",
      "Show review and support reminders"
    ],
    "pt-BR": [
      "Ajude-me a continuar criando",
      "O ChatGPT Audio Controls facilitou seu dia, economizou tempo ou ajudou você a fazer mais? Se ele faz diferença na sua vida e você valoriza ferramentas que respeitam sua privacidade, considere apoiar seu desenvolvimento.",
      "Sua contribuição ajuda a pagar o custo crescente das assinaturas de IA que uso para criar e melhorar a extensão. Também me dá uma motivação extra para continuar.",
      "Não pode doar? Tudo bem! Compartilhar sua experiência sincera — o que ajudou sua produtividade e o que pode melhorar — também significa muito. Obrigado por estar aqui. \uD83D\uDE4F",
      "A privacidade e todos os recursos continuam disponíveis para todos, com ou sem doação.",
      "Apoio único pelo GitHub Sponsors · Dólares americanos",
      "Doar",
      "Lembrar mais tarde",
      "Não perguntar novamente",
      "Mostrar lembretes de avaliação e apoio"
    ],
    "pt-PT": [
      "Ajude-me a continuar a desenvolver",
      "O ChatGPT Audio Controls tornou o seu dia mais fácil, poupou-lhe tempo ou ajudou-o a fazer mais? Se acrescentou valor à sua vida e valoriza ferramentas que respeitam a sua privacidade, considere apoiar o desenvolvimento.",
      "O seu contributo ajuda a pagar o custo crescente das subscrições de IA que uso para criar e melhorar a extensão. Também me dá uma motivação extra para continuar.",
      "Não pode contribuir? Não há problema. Partilhar a sua experiência sincera — o que ajudou a sua produtividade e o que pode melhorar — também significa muito. Obrigado por estar aqui. \uD83D\uDE4F",
      "A privacidade e todas as funcionalidades continuam disponíveis para todos, com ou sem donativo.",
      "Contributo único através do GitHub Sponsors · Dólares americanos",
      "Contribuir",
      "Lembrar mais tarde",
      "Não voltar a perguntar",
      "Mostrar lembretes de avaliação e apoio"
    ],
    ja: [
      "開発を続ける力をください",
      "ChatGPT Audio Controls で日々の作業が少し楽になったり、時間を節約できたりしましたか？暮らしに役立ち、プライバシーを大切にするツールを応援したいと感じたら、開発へのご支援をご検討ください。",
      "ご支援は、拡張機能の開発や改善に使う AI サブスクリプションの増え続ける費用を補う助けになります。開発を続ける励みにもなります。",
      "寄付できなくても、もちろん大丈夫です。作業効率がどう変わったか、何を改善できるかなど、率直な感想も大きな力になります。使ってくださってありがとうございます。\uD83D\uDE4F",
      "寄付の有無にかかわらず、プライバシー保護とすべての機能を利用できます。",
      "GitHub Sponsors での一回限りの支援 · 米ドル",
      "寄付する",
      "後で通知する",
      "今後表示しない",
      "レビューと支援のお願いを表示する"
    ],
    es: [
      "Ayúdame a seguir creando",
      "¿ChatGPT Audio Controls te ha facilitado el día, ahorrado tiempo o ayudado a hacer más? Si aporta valor a tu vida y aprecias las herramientas que respetan tu privacidad, considera apoyar su desarrollo.",
      "Tu aportación ayuda a cubrir el coste creciente de las suscripciones de IA que uso para crear y mejorar la extensión. También me da un poco más de motivación para seguir.",
      "¿No puedes donar? No pasa nada. Compartir tu experiencia sincera —qué ha mejorado tu productividad y qué podría mejorar— también significa mucho. Gracias por estar aquí. \uD83D\uDE4F",
      "La privacidad y todas las funciones siguen disponibles para todos, donen o no.",
      "Aportación única mediante GitHub Sponsors · Dólares estadounidenses",
      "Donar",
      "Recordármelo más tarde",
      "No volver a preguntar",
      "Mostrar recordatorios de reseñas y apoyo"
    ],
    de: [
      "Hilf mir, weiterzuentwickeln",
      "Macht ChatGPT Audio Controls deinen Alltag leichter, spart es dir Zeit oder hilft es dir, mehr zu schaffen? Wenn es dir etwas bringt und du Werkzeuge schätzt, die deine Privatsphäre respektieren, unterstütze gerne die Entwicklung.",
      "Dein Beitrag hilft, die steigenden Kosten der KI-Abos zu decken, die ich für die Entwicklung und Verbesserung der Erweiterung nutze. Er motiviert mich auch, weiterzumachen.",
      "Du kannst nicht spenden? Das ist völlig in Ordnung. Auch deine ehrliche Erfahrung —was dir bei der Arbeit hilft und was besser sein könnte— bedeutet mir viel. Danke, dass du dabei bist. \uD83D\uDE4F",
      "Datenschutz und alle Funktionen stehen allen zur Verfügung, unabhängig von einer Spende.",
      "Einmalige Unterstützung über GitHub Sponsors · US-Dollar",
      "Spenden",
      "Später erinnern",
      "Nicht erneut fragen",
      "Erinnerungen an Bewertungen und Unterstützung anzeigen"
    ],
    vi: [
      "Giúp tôi tiếp tục phát triển",
      "ChatGPT Audio Controls có giúp ngày của bạn nhẹ nhàng hơn, tiết kiệm thời gian hoặc làm được nhiều việc hơn không? Nếu tiện ích mang lại giá trị và bạn trân trọng các công cụ tôn trọng quyền riêng tư, hãy cân nhắc ủng hộ việc phát triển.",
      "Đóng góp của bạn giúp trang trải chi phí ngày càng tăng của các gói AI tôi dùng để xây dựng và cải thiện tiện ích. Đó cũng là động lực để tôi tiếp tục.",
      "Chưa thể đóng góp? Hoàn toàn không sao. Chia sẻ trải nghiệm thật —điều gì giúp bạn làm việc hiệu quả hơn và điều gì cần cải thiện— cũng rất đáng quý. Cảm ơn bạn đã đồng hành. \uD83D\uDE4F",
      "Quyền riêng tư và mọi tính năng luôn dành cho tất cả mọi người, dù có đóng góp hay không.",
      "Ủng hộ một lần qua GitHub Sponsors · Đô la Mỹ",
      "Ủng hộ",
      "Nhắc tôi sau",
      "Không hỏi lại",
      "Hiện lời nhắc đánh giá và ủng hộ"
    ],
    fr: [
      "Aidez-moi à continuer à créer",
      "ChatGPT Audio Controls vous facilite la vie, vous fait gagner du temps ou vous aide à en faire plus ? Si cette extension vous est utile et que vous appréciez les outils qui respectent votre vie privée, pensez à soutenir son développement.",
      "Votre contribution aide à couvrir le coût croissant des abonnements à l’IA que j’utilise pour créer et améliorer l’extension. Elle me donne aussi un peu plus de motivation pour continuer.",
      "Vous ne pouvez pas faire de don ? Aucun souci. Partager votre expérience sincère —ce qui a amélioré votre productivité et ce qui pourrait être mieux— compte aussi beaucoup. Merci d’être là. \uD83D\uDE4F",
      "La confidentialité et toutes les fonctionnalités restent accessibles à tous, avec ou sans don.",
      "Soutien ponctuel via GitHub Sponsors · Dollars américains",
      "Faire un don",
      "Me le rappeler plus tard",
      "Ne plus demander",
      "Afficher les rappels d’avis et de soutien"
    ],
    hi: [
      "विकास जारी रखने में मेरा साथ दें",
      "क्या ChatGPT Audio Controls ने आपका दिन आसान बनाया, समय बचाया या अधिक काम करने में मदद की? अगर इससे आपके जीवन में कुछ अच्छा बदलाव आया है और आप निजता का सम्मान करने वाले टूल पसंद करते हैं, तो इसके विकास में योगदान देने पर विचार करें।",
      "आपका योगदान उन AI सदस्यताओं की बढ़ती लागत में मदद करता है जिनसे मैं एक्सटेंशन बनाता और बेहतर करता हूँ। इससे मुझे आगे काम करने की प्रेरणा भी मिलती है।",
      "योगदान नहीं दे सकते? बिल्कुल ठीक है। अपना सच्चा अनुभव साझा करें—काम में क्या मदद मिली और क्या बेहतर हो सकता है। यह भी बहुत मायने रखता है। साथ देने के लिए धन्यवाद। \uD83D\uDE4F",
      "योगदान दें या न दें, निजता की सुरक्षा और सभी सुविधाएँ सबके लिए उपलब्ध हैं।",
      "GitHub Sponsors के ज़रिए एक बार का योगदान · अमेरिकी डॉलर",
      "योगदान दें",
      "बाद में याद दिलाएँ",
      "दोबारा न पूछें",
      "समीक्षा और सहयोग के रिमाइंडर दिखाएँ"
    ],
    "zh-CN": [
      "支持我继续开发",
      "ChatGPT Audio Controls 是否让你的日常更轻松、节省了时间，或提高了效率？如果它为你的生活带来了价值，而你也重视尊重隐私的工具，欢迎支持它的开发。",
      "你的支持将帮助支付我用于开发和改进扩展的 AI 订阅费用，这些费用正在不断上涨。它也会给我继续开发的动力。",
      "暂时无法捐助？完全没关系。分享真实的使用体验——它如何提高了你的效率，还有哪些地方需要改进——也很有意义。感谢你的陪伴。\uD83D\uDE4F",
      "无论是否捐助，所有人都能获得同样的隐私保护和全部功能。",
      "通过 GitHub Sponsors 一次性支持 · 美元",
      "捐助",
      "稍后提醒我",
      "不再询问",
      "显示评价与支持提醒"
    ],
    "zh-TW": [
      "支持我繼續開發",
      "ChatGPT Audio Controls 是否讓你的日常更輕鬆、節省了時間，或提高了效率？如果它為你的生活帶來了價值，而你也重視尊重隱私的工具，歡迎支持它的開發。",
      "你的支持將幫助支付我用於開發和改善擴充功能的 AI 訂閱費用，這些費用正持續增加。也會給我繼續開發的動力。",
      "暫時無法捐助？完全沒關係。分享真實的使用體驗——它如何提升你的工作效率，還有哪些地方需要改善——也很有意義。感謝你的陪伴。\uD83D\uDE4F",
      "無論是否捐助，所有人都能享有相同的隱私保護和完整功能。",
      "透過 GitHub Sponsors 單次支持 · 美元",
      "捐助",
      "稍後提醒我",
      "不再詢問",
      "顯示評價與支持提醒"
    ],
    ru: [
      "Помогите мне продолжать разработку",
      "ChatGPT Audio Controls делает ваш день проще, экономит время или помогает успевать больше? Если расширение приносит вам пользу и вы цените инструменты, уважающие вашу приватность, поддержите его развитие.",
      "Ваш вклад помогает оплачивать дорожающие подписки на ИИ, которые я использую для разработки и улучшения расширения. А ещё это дополнительная мотивация продолжать работу.",
      "Не можете помочь деньгами? Всё в порядке. Честный рассказ о том, как расширение помогает вам работать и что можно улучшить, тоже очень важен. Спасибо, что вы с нами. \uD83D\uDE4F",
      "Защита приватности и все функции доступны всем независимо от пожертвований.",
      "Разовый взнос через GitHub Sponsors · Доллары США",
      "Поддержать",
      "Напомнить позже",
      "Больше не спрашивать",
      "Показывать напоминания об отзывах и поддержке"
    ],
    pl: [
      "Pomóż mi dalej rozwijać rozszerzenie",
      "Czy ChatGPT Audio Controls ułatwia Ci dzień, oszczędza czas lub pomaga zrobić więcej? Jeśli wnosi coś dobrego do Twojego życia i cenisz narzędzia szanujące prywatność, rozważ wsparcie jego rozwoju.",
      "Twoja wpłata pomaga pokryć rosnące koszty subskrypcji AI, których używam do tworzenia i ulepszania rozszerzenia. Daje mi też dodatkową motywację do dalszej pracy.",
      "Nie możesz wpłacić? Nic nie szkodzi. Szczera opinia o tym, co pomaga Ci w pracy i co można poprawić, też wiele znaczy. Dziękuję, że tu jesteś. \uD83D\uDE4F",
      "Prywatność i wszystkie funkcje są dostępne dla każdego, niezależnie od wpłat.",
      "Jednorazowe wsparcie przez GitHub Sponsors · Dolary amerykańskie",
      "Wesprzyj",
      "Przypomnij później",
      "Nie pytaj ponownie",
      "Pokaż przypomnienia o opinii i wsparciu"
    ],
    tr: [
      "Geliştirmeye devam etmeme destek olun",
      "ChatGPT Audio Controls gününüzü kolaylaştırdı, zaman kazandırdı veya daha çok iş yapmanıza yardımcı oldu mu? Hayatınıza değer kattıysa ve gizliliğe saygılı araçları önemsiyorsanız geliştirilmesine destek olmayı düşünün.",
      "Katkınız, uzantıyı geliştirmek için kullandığım yapay zekâ aboneliklerinin artan maliyetlerini karşılamaya yardımcı olur. Ayrıca devam etmek için bana motivasyon verir.",
      "Bağış yapamıyor musunuz? Hiç sorun değil. Verimliliğinize nasıl katkı sağladığını ve nelerin iyileştirilebileceğini dürüstçe paylaşmanız da çok değerli. Burada olduğunuz için teşekkürler. \uD83D\uDE4F",
      "Bağış yapılsa da yapılmasa da gizlilik koruması ve tüm özellikler herkese açıktır.",
      "GitHub Sponsors üzerinden tek seferlik destek · ABD doları",
      "Bağış yap",
      "Daha sonra hatırlat",
      "Bir daha sorma",
      "Değerlendirme ve destek hatırlatmalarını göster"
    ],
    ko: [
      "계속 개발할 수 있도록 응원해 주세요",
      "ChatGPT Audio Controls 덕분에 일상이 조금 편해졌거나 시간을 아끼고 더 많은 일을 할 수 있었나요? 삶에 도움이 되었고 개인정보를 존중하는 도구를 중요하게 생각한다면 개발 후원을 고려해 주세요.",
      "후원금은 확장 프로그램을 개발하고 개선하는 데 사용하는 AI 구독 비용을 충당하는 데 도움이 됩니다. 계속 개발할 힘도 됩니다.",
      "후원이 어려워도 괜찮습니다. 생산성에 어떤 도움이 되었는지, 무엇을 개선하면 좋을지 솔직한 경험을 나눠 주시는 것도 큰 힘이 됩니다. 함께해 주셔서 감사합니다. \uD83D\uDE4F",
      "후원 여부와 관계없이 모든 분께 동일한 개인정보 보호와 모든 기능을 제공합니다.",
      "GitHub Sponsors를 통한 일회성 후원 · 미국 달러",
      "후원하기",
      "나중에 알림",
      "다시 묻지 않기",
      "리뷰 및 후원 알림 표시"
    ],
    fa: [
      "کمک کنید توسعه را ادامه بدهم",
      "آیا ChatGPT Audio Controls روزتان را آسان‌تر کرده، در وقتتان صرفه‌جویی کرده یا کمک کرده کار بیشتری انجام دهید؟ اگر برایتان مفید بوده و ابزارهای حامی حریم خصوصی را ارزشمند می‌دانید، حمایت از توسعهٔ آن را در نظر بگیرید.",
      "کمک شما بخشی از هزینهٔ رو‌به‌رشد اشتراک‌های هوش مصنوعی را تأمین می‌کند که برای ساخت و بهبود افزونه استفاده می‌کنم. همچنین به من انگیزه می‌دهد که ادامه بدهم.",
      "امکان کمک مالی ندارید؟ کاملاً قابل درک است. بیان صادقانهٔ تجربه‌تان—اینکه چه کمکی به بهره‌وری‌تان کرده و چه چیزی بهتر می‌شود—هم بسیار ارزشمند است. ممنون که همراهید. \uD83D\uDE4F",
      "حریم خصوصی و همهٔ امکانات، چه کمک مالی کنید چه نکنید، برای همه فراهم است.",
      "حمایت یک‌باره از طریق GitHub Sponsors · دلار آمریکا",
      "حمایت مالی",
      "بعداً یادآوری کن",
      "دیگر نپرس",
      "نمایش یادآورهای نظر دادن و حمایت"
    ],
    ar: [
      "ساعدني على مواصلة التطوير",
      "هل جعلت ChatGPT Audio Controls يومك أسهل، أو وفرت وقتك، أو ساعدتك على إنجاز المزيد؟ إذا أضافت قيمة إلى حياتك وتقدّر الأدوات التي تحترم خصوصيتك، ففكّر في دعم تطويرها.",
      "تساعد مساهمتك في تغطية التكلفة المتزايدة لاشتراكات الذكاء الاصطناعي التي أستخدمها لبناء الإضافة وتحسينها. كما تمنحني دافعًا إضافيًا للاستمرار.",
      "لا يمكنك التبرع؟ لا بأس إطلاقًا. مشاركة تجربتك الصادقة—كيف ساعدتك على الإنتاجية وما الذي يمكن تحسينه—تعني لي الكثير أيضًا. شكرًا لوجودك هنا. \uD83D\uDE4F",
      "الخصوصية وجميع الميزات متاحة للجميع، سواء تبرعت أم لا.",
      "دعم لمرة واحدة عبر GitHub Sponsors · بالدولار الأمريكي",
      "تبرّع",
      "ذكّرني لاحقًا",
      "لا تسأل مرة أخرى",
      "إظهار تذكيرات التقييم والدعم"
    ],
    it: [
      "Aiutami a continuare a sviluppare",
      "ChatGPT Audio Controls ti ha semplificato la giornata, fatto risparmiare tempo o aiutato a fare di più? Se ha portato valore alla tua vita e apprezzi gli strumenti che rispettano la privacy, considera di sostenerne lo sviluppo.",
      "Il tuo contributo aiuta a coprire i costi crescenti degli abbonamenti IA che uso per creare e migliorare l’estensione. Mi dà anche una motivazione in più per continuare.",
      "Non puoi donare? Va benissimo. Condividere la tua esperienza sincera—cosa ha migliorato la tua produttività e cosa potrebbe funzionare meglio—conta molto. Grazie di esserci. \uD83D\uDE4F",
      "La privacy e tutte le funzioni restano disponibili per tutti, con o senza donazioni.",
      "Contributo una tantum tramite GitHub Sponsors · Dollari statunitensi",
      "Dona",
      "Ricordamelo più tardi",
      "Non chiedere più",
      "Mostra promemoria per recensioni e sostegno"
    ],
    sv: [
      "Hjälp mig att fortsätta utveckla",
      "Har ChatGPT Audio Controls gjort din dag enklare, sparat tid eller hjälpt dig att få mer gjort? Om det gör nytta i ditt liv och du uppskattar verktyg som respekterar din integritet, överväg att stödja utvecklingen.",
      "Ditt bidrag hjälper till att täcka de ökande kostnaderna för AI-abonnemangen jag använder för att bygga och förbättra tillägget. Det ger mig också extra motivation att fortsätta.",
      "Kan du inte bidra ekonomiskt? Det är helt okej. Att dela din ärliga upplevelse—vad som hjälpt din produktivitet och vad som kan bli bättre—betyder också mycket. Tack för att du är här. \uD83D\uDE4F",
      "Integritetsskydd och alla funktioner är tillgängliga för alla, oavsett bidrag.",
      "Engångsbidrag via GitHub Sponsors · Amerikanska dollar",
      "Donera",
      "Påminn mig senare",
      "Fråga inte igen",
      "Visa påminnelser om omdömen och stöd"
    ],
    ro: [
      "Ajută-mă să continui dezvoltarea",
      "ChatGPT Audio Controls ți-a ușurat ziua, ți-a economisit timp sau te-a ajutat să faci mai multe? Dacă îți este util și apreciezi instrumentele care îți respectă confidențialitatea, ia în considerare susținerea dezvoltării.",
      "Contribuția ta ajută la acoperirea costurilor tot mai mari ale abonamentelor AI pe care le folosesc pentru a crea și îmbunătăți extensia. Îmi oferă și un plus de motivație să continui.",
      "Nu poți dona? Este absolut în regulă. Contează mult și să împărtășești sincer ce te-a ajutat să fii mai productiv și ce ar putea fi îmbunătățit. Mulțumesc că ești aici. \uD83D\uDE4F",
      "Confidențialitatea și toate funcțiile rămân disponibile tuturor, indiferent de donații.",
      "Contribuție unică prin GitHub Sponsors · Dolari americani",
      "Donează",
      "Amintește-mi mai târziu",
      "Nu mai întreba",
      "Arată mementouri pentru recenzii și susținere"
    ]
  };
  function donationCopy(language) {
    const values = donationCatalogs[resolveLanguage(language)] || donationCatalogs.en;
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  }

  // src/shared/i18n/support.ts
  var supportCatalogs = {
    en: ["Help shape ChatGPT Audio Controls", "Have an idea? Share a suggestion or leave an honest review to support the extension.", "Share a suggestion", "Write a review"],
    hi: ["ChatGPT Audio Controls को बेहतर बनाएँ", "कोई सुझाव है? अपना सुझाव साझा करें या समीक्षा लिखकर एक्सटेंशन का समर्थन करें।", "सुझाव साझा करें", "समीक्षा लिखें"],
    bn: ["ChatGPT Audio Controls আরও ভালো করুন", "কোনো ধারণা আছে? পরামর্শ দিন বা সৎ পর্যালোচনা লিখে এক্সটেনশনকে সমর্থন করুন।", "পরামর্শ দিন", "পর্যালোচনা লিখুন"],
    mr: ["ChatGPT Audio Controls अधिक चांगले बनवा", "काही कल्पना आहे? सूचना द्या किंवा प्रामाणिक अभिप्राय लिहून विस्ताराला पाठिंबा द्या.", "सूचना द्या", "अभिप्राय लिहा"],
    te: ["ChatGPT Audio Controls మెరుగుదలకు తోడ్పడండి", "ఏదైనా ఆలోచన ఉందా? సూచన పంచుకోండి లేదా నిజాయితీగా సమీక్ష రాసి ఎక్స్‌టెన్షన్‌కు మద్దతివ్వండి.", "సూచన పంచుకోండి", "సమీక్ష రాయండి"],
    ta: ["ChatGPT Audio Controls மேம்பட உதவுங்கள்", "யோசனை உள்ளதா? ஆலோசனையைப் பகிருங்கள் அல்லது நேர்மையான மதிப்புரையை எழுதி நீட்சியை ஆதரியுங்கள்.", "ஆலோசனையைப் பகிரவும்", "மதிப்புரை எழுதவும்"],
    ar: ["ساهم في تحسين ChatGPT Audio Controls", "لديك فكرة؟ شارك اقتراحًا أو اكتب مراجعة صادقة لدعم الإضافة.", "شارك اقتراحًا", "اكتب مراجعة"],
    fa: ["به بهبود ChatGPT Audio Controls کمک کنید", "ایده‌ای دارید؟ پیشنهاد خود را به اشتراک بگذارید یا با نوشتن یک نقد صادقانه از افزونه حمایت کنید.", "ارسال پیشنهاد", "نوشتن نقد"],
    he: ["עזרו לשפר את ChatGPT Audio Controls", "יש לכם רעיון? שתפו הצעה או כתבו ביקורת כנה כדי לתמוך בתוסף.", "שיתוף הצעה", "כתיבת ביקורת"],
    "zh-CN": ["一起改进 ChatGPT Audio Controls", "有想法吗？分享建议或留下真实评价，支持这个扩展。", "分享建议", "撰写评价"],
    "zh-TW": ["一起改進 ChatGPT Audio Controls", "有想法嗎？分享建議或留下真實評價，支持這個擴充功能。", "分享建議", "撰寫評價"],
    vi: ["Cùng cải thiện ChatGPT Audio Controls", "Bạn có ý tưởng? Gửi đề xuất hoặc viết đánh giá chân thực để ủng hộ tiện ích.", "Gửi đề xuất", "Viết đánh giá"],
    th: ["ช่วยพัฒนา ChatGPT Audio Controls", "มีไอเดียไหม? ส่งข้อเสนอแนะหรือเขียนรีวิวอย่างตรงไปตรงมาเพื่อสนับสนุนส่วนขยาย", "ส่งข้อเสนอแนะ", "เขียนรีวิว"],
    es: ["Ayuda a mejorar ChatGPT Audio Controls", "¿Tienes una idea? Comparte una sugerencia o deja una reseña sincera para apoyar la extensión.", "Comparte una sugerencia", "Escribe una reseña"],
    "pt-BR": ["Ajude a melhorar o ChatGPT Audio Controls", "Tem uma ideia? Envie uma sugestão ou deixe uma avaliação sincera para apoiar a extensão.", "Enviar sugestão", "Escrever avaliação"],
    "pt-PT": ["Ajude a melhorar o ChatGPT Audio Controls", "Tem uma ideia? Partilhe uma sugestão ou deixe uma avaliação sincera para apoiar a extensão.", "Partilhar sugestão", "Escrever avaliação"],
    ru: ["Помогите улучшить ChatGPT Audio Controls", "Есть идея? Поделитесь предложением или оставьте честный отзыв в поддержку расширения.", "Предложить идею", "Написать отзыв"],
    fr: ["Améliorons ChatGPT Audio Controls", "Une idée ? Partagez une suggestion ou laissez un avis sincère pour soutenir l’extension.", "Partager une suggestion", "Rédiger un avis"],
    de: ["ChatGPT Audio Controls mitgestalten", "Eine Idee? Teile einen Vorschlag oder unterstütze die Erweiterung mit einer ehrlichen Bewertung.", "Vorschlag teilen", "Bewertung schreiben"],
    ja: ["ChatGPT Audio Controls の改善にご協力ください", "アイデアはありますか？提案や率直なレビューで拡張機能を応援してください。", "提案を送る", "レビューを書く"],
    ko: ["ChatGPT Audio Controls 개선에 참여하세요", "아이디어가 있나요? 제안을 보내거나 솔직한 리뷰로 확장 프로그램을 응원해 주세요.", "제안 보내기", "리뷰 작성"],
    id: ["Bantu tingkatkan ChatGPT Audio Controls", "Punya ide? Bagikan saran atau tulis ulasan jujur untuk mendukung ekstensi.", "Bagikan saran", "Tulis ulasan"],
    it: ["Aiuta a migliorare ChatGPT Audio Controls", "Hai un’idea? Condividi un suggerimento o lascia una recensione sincera per sostenere l’estensione.", "Invia un suggerimento", "Scrivi una recensione"],
    tr: ["ChatGPT Audio Controls’u geliştirmeye yardımcı olun", "Bir fikriniz mi var? Önerinizi paylaşın veya uzantıyı desteklemek için dürüst bir değerlendirme yazın.", "Öneri paylaş", "Değerlendirme yaz"]
  };
  Object.assign(supportCatalogs, Object.fromEntries(Object.entries(audience_features_default).map(([code, copy]) => [code, copy.support])));
  var supportCopy = (language) => supportCatalogs[resolveLanguage(language)];

  // src/shared/support.ts
  var SPONSOR_AMOUNTS = [1, 3, 5, 10];
  var SPONSOR_URL = "https://github.com/sponsors/infoxica";
  function sponsorURL(amount) {
    if (!SPONSOR_AMOUNTS.includes(amount))
      throw new Error("Unsupported contribution");
    return `${SPONSOR_URL}/sponsorships?frequency=one-time&amount=${amount}`;
  }
  var REVIEW_URLS = {
    chrome: "https://chromewebstore.google.com/detail/aifalimlfgiepmbejcemcofninobaiea/reviews",
    edge: "https://microsoftedge.microsoft.com/addons/detail/chatgpt-audio-controls-/cmhbacgmcgiolpidfjcpefkhbbeamemf#review-section"
  };
  function reviewStores(agent) {
    if (/Edg(A|iOS)?\//.test(agent))
      return ["edge"];
    if (/Chrome\//.test(agent) && !/OPR\//.test(agent))
      return ["chrome"];
    return ["chrome", "edge"];
  }

  // src/shared/engagement.ts
  var ENGAGEMENT_KEY = "cgpt-ra-engagement-v1";
  var DAY = 86400000;
  var freshRequest = () => ({ status: "new", displays: 0, shownAt: 0, afterTime: 0, afterUses: 0 });
  var defaultEngagement = () => ({ version: 1, uses: 0, enabled: true, lastShown: 0, review: freshRequest(), donation: freshRequest() });
  var integer = (n) => Number.isSafeInteger(n) && Number(n) >= 0;
  function validateEngagement(value) {
    if (value === undefined || value === null)
      return defaultEngagement();
    const s = value;
    if (s.version !== 1 || !integer(s.uses) || typeof s.enabled !== "boolean" || !integer(s.lastShown) || !["review", "donation"].every((k) => {
      const r = s[k];
      return r && ["new", "shown", "later", "done"].includes(r.status) && integer(r.displays) && r.displays <= 2 && integer(r.shownAt) && integer(r.afterTime) && integer(r.afterUses);
    }))
      throw new Error("Invalid engagement state");
    return structuredClone(s);
  }
  function eligibleRequest(s, now) {
    if (!s.enabled || s.lastShown > 0 && now - s.lastShown < DAY)
      return;
    for (const kind of ["donation", "review"])
      if (s[kind].status === "new" && s.uses >= (kind === "donation" ? 10 : 4))
        return kind;
    for (const kind of ["review", "donation"]) {
      const r = s[kind];
      if (r.status === "later" && r.displays === 1 && now >= r.afterTime && s.uses >= r.afterUses)
        return kind;
    }
  }
  function reduceEngagement(value, action, now = Date.now()) {
    const state = validateEngagement(value);
    if (action.type === "qualify")
      state.uses = Math.min(Number.MAX_SAFE_INTEGER, state.uses + 1);
    if (action.type === "enable") {
      state.enabled = action.enabled;
      if (!state.enabled)
        for (const kind of ["review", "donation"]) {
          if (state[kind].status === "shown" || state[kind].status === "later")
            state[kind].status = "done";
        }
    }
    if (action.type === "opened")
      state[action.kind].status = "done";
    if (action.type === "respond") {
      const r = state[action.kind];
      if (r.status === "shown" && r.shownAt === action.display) {
        r.status = action.response === "later" && r.displays === 1 ? "later" : "done";
        r.afterTime = now + 14 * DAY;
        r.afterUses = state.uses + 10;
      }
    }
    if (action.type === "claim") {
      const kind = eligibleRequest(state, now);
      if (kind) {
        const r = state[kind];
        r.displays++;
        r.status = "shown";
        r.shownAt = state.lastShown = now;
        return { state, prompt: { kind, reminder: r.displays === 2, display: now } };
      }
    }
    return { state };
  }

  // src/shared/engagement-client.ts
  var standalone = true;
  var SOURCE = "chatgpt-audio-controls-engagement";
  var lastSession = 0;
  async function engagementRequest(action) {
    if (standalone) {
      if (!navigator.locks)
        throw new Error("Local coordination unavailable");
      return navigator.locks.request(ENGAGEMENT_KEY, () => {
        const value = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || "null");
        if (action.type === "qualify") {
          if (action.session <= lastSession)
            return { state: validateEngagement(value) };
          lastSession = action.session;
        }
        const result = reduceEngagement(value, action);
        if (action.type !== "read") {
          localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(result.state));
          window.dispatchEvent(new Event("cgpt-ra-engagement-change"));
        }
        return result;
      });
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      const reply = await chrome.runtime.sendMessage({ type: "engagement", action });
      if (!reply?.ok)
        throw new Error("Could not save support preferences");
      return reply.result;
    }
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const finish = () => {
        clearTimeout(timer);
        window.removeEventListener("message", listener);
      };
      const listener = (event) => {
        if (event.source !== window || event.data?.source !== SOURCE || event.data.type !== "result" || event.data.id !== id)
          return;
        finish();
        event.data.ok ? resolve(event.data.result) : reject(new Error("Support storage unavailable"));
      };
      const timer = setTimeout(() => {
        finish();
        reject(new Error("Support bridge unavailable"));
      }, 4000);
      window.addEventListener("message", listener);
      window.postMessage({ source: SOURCE, type: "request", id, action }, "*");
    });
  }
  function watchEngagement(changed) {
    const message = (event) => {
      if (event.source === window && event.data?.source === SOURCE && event.data.type === "changed")
        changed();
    };
    const storage = (event) => {
      if (event.key === ENGAGEMENT_KEY)
        changed();
    };
    const chromeStorage = (changes, area) => {
      if (area === "local" && changes[ENGAGEMENT_KEY])
        changed();
    };
    window.addEventListener("message", message);
    window.addEventListener("storage", storage);
    window.addEventListener("cgpt-ra-engagement-change", changed);
    if (!standalone && typeof chrome !== "undefined")
      chrome.storage?.onChanged?.addListener(chromeStorage);
    return () => {
      window.removeEventListener("message", message);
      window.removeEventListener("storage", storage);
      window.removeEventListener("cgpt-ra-engagement-change", changed);
      if (!standalone && typeof chrome !== "undefined")
        chrome.storage?.onChanged?.removeListener(chromeStorage);
    };
  }

  // src/content/standalone-settings.ts
  async function openStandaloneSettings(settings, changed) {
    document.getElementById("cgpt-ra-settings-dialog")?.remove();
    let layout = defaultLayout();
    try {
      layout = await readLayout();
    } catch {}
    const dialog = document.createElement("dialog");
    dialog.id = "cgpt-ra-settings-dialog";
    dialog.dir = languageDirection(settings.language);
    dialog.lang = resolveLanguage(settings.language);
    const c = featureCopy(settings.language), r = getReleaseCopy(settings.language);
    const d = donationCopy(settings.language), support = supportCopy(settings.language);
    const section = document.createElement("section");
    section.className = "cgpt-ra-standalone-support";
    const title = document.createElement("h2");
    title.textContent = d.title;
    section.append(title);
    for (const text of [d.value, d.costs, d.once, d.privacy, d.optional]) {
      const p = document.createElement("p");
      p.textContent = text;
      section.append(p);
    }
    const links = document.createElement("div");
    links.className = "cgpt-ra-support-links";
    const link = (href, text, kind) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = text;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.onclick = () => {
        engagementRequest({ type: "opened", kind }).catch(showError);
      };
      links.append(a);
    };
    for (const amount of SPONSOR_AMOUNTS)
      link(sponsorURL(amount), `US$${amount}`, "donation");
    for (const store of ["chrome", "edge"])
      link(REVIEW_URLS[store], `${support[3]} · ${store === "chrome" ? "Chrome" : "Edge"}`, "review");
    section.append(links);
    const reminderRow = document.createElement("label"), reminder = document.createElement("input");
    reminder.type = "checkbox";
    reminder.disabled = true;
    reminderRow.textContent = d.reminders;
    reminderRow.append(reminder);
    section.append(reminderRow);
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    section.append(error);
    function showError() {
      error.textContent = r.savedError;
    }
    const refresh = () => {
      engagementRequest({ type: "read" }).then(({ state }) => {
        reminder.checked = state.enabled;
        reminder.disabled = false;
      }).catch(showError);
    };
    reminder.onchange = () => {
      const enabled = reminder.checked;
      reminder.disabled = true;
      engagementRequest({ type: "enable", enabled }).then(refresh).catch(() => {
        showError();
        refresh();
      });
    };
    refresh();
    const stop = watchEngagement(refresh);
    dialog.addEventListener("close", stop, { once: true });
    dialog.append(section);
    const heading = document.createElement("h2");
    heading.textContent = c.layout;
    dialog.append(heading);
    const fields = (label, options, value, update) => {
      const row = document.createElement("label"), select = document.createElement("select");
      row.textContent = label;
      for (const [value, name] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = name;
        select.append(option);
      }
      select.value = value;
      select.onchange = () => update(select.value);
      row.append(select);
      dialog.append(row);
      return select;
    };
    fields(r.language, SUPPORTED_LANGUAGES.map((l) => [l.code, l.code === "auto" ? getTranslations(settings.language).options.general.languageAuto : l.nativeName]), settings.language, (v) => {
      settings = { ...settings, language: v };
    });
    const notify = document.createElement("label"), checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settings.notifyDownloadReady;
    checkbox.onchange = () => {
      settings = { ...settings, notifyDownloadReady: checkbox.checked };
    };
    notify.textContent = c.notify;
    notify.append(checkbox);
    dialog.append(notify);
    for (const profile of ["desktop", "narrow"]) {
      const h = document.createElement("h3");
      h.textContent = c[profile];
      dialog.append(h);
      const update = (patch) => {
        layout = { ...layout, [profile]: { ...layout[profile], ...patch } };
      };
      fields(c.placement, (profile === "narrow" ? ["composer"] : PRESETS).map((preset) => [preset, c.presets[preset]]), layout[profile].preset, (v) => update({ preset: v }));
      fields(c.seekFirst, [["true", c.seekFirst], ["false", c.swap]], String(layout[profile].seekFirst), (v) => update({ seekFirst: v === "true" }));
    }
    const commit = async () => {
      try {
        await writeLayout(layout);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
        changed(settings);
        window.postMessage({ source: "chatgpt-audio-controls-settings-bridge", type: "CGPT_RA_LAYOUT_UPDATE", layout }, "*");
        dialog.close();
      } catch {
        const error = document.createElement("p");
        error.setAttribute("role", "alert");
        error.textContent = r.savedError;
        dialog.append(error);
      }
    };
    const reset = document.createElement("button");
    reset.className = "cgpt-ra-danger";
    reset.textContent = c.reset;
    reset.onclick = () => {
      layout = defaultLayout();
      commit();
    };
    const save = document.createElement("button");
    save.textContent = r.dismiss;
    save.onclick = () => void commit();
    dialog.append(reset, save);
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }

  // src/content/layout-geometry.ts
  var intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  var fits = (r, v) => r.x >= v.x - 0.5 && r.y >= v.y - 0.5 && r.x + r.width <= v.x + v.width + 0.5 && r.y + r.height <= v.y + v.height + 0.5;
  var distanceToRect = (x, y, r) => Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height));
  function magneticOffset(x, y, r) {
    const distance = distanceToRect(x, y, r);
    if (distance > 24)
      return null;
    const dx = r.x + r.width / 2 - x, dy = r.y + r.height / 2 - y, length = Math.hypot(dx, dy);
    const pull = Math.min(length, 12 * (1 - distance / 24));
    return { x: length ? dx / length * pull : 0, y: length ? dy / length * pull : 0 };
  }
  var rect = (x, y, width, height) => ({ x, y, width, height });
  function dockGeometry(p, v, expanded, composer, rtl = false, narrow = v.width < 744, environment = {}) {
    let area = { ...v };
    for (let attempt = 0;attempt <= (environment.actions?.length || 0); attempt++) {
      const result = resolveGeometry(p, area, expanded, composer, rtl, narrow, environment);
      if (!result)
        return null;
      const parts = expanded ? [result.seek, result.controls, result.circle] : [result.circle];
      const collision = environment.actions?.find((o) => parts.some((r) => intersects(r, { x: o.x - 8, y: o.y - 8, width: o.width + 16, height: o.height + 16 })));
      if (!collision)
        return result;
      if (!p.preset.startsWith("top"))
        return null;
      const bottom = area.y + area.height;
      area.y = Math.max(area.y, collision.y + collision.height + 8);
      area.height = bottom - area.y;
    }
    return null;
  }
  function resolveGeometry(p, v, expanded, composer, rtl, narrow, environment) {
    const gap = 6, thick = 48, seekLength = 244, controlsLength = 356;
    let a, b, circle, circleVisual, verticalSeek = false, verticalControls = false, surface;
    if (p.preset === "composer") {
      if (!composer || composer.width < 232)
        return null;
      const width = composer.width, stacked = narrow, dockControlsLength = width < 600 ? 220 : controlsLength;
      if (!stacked && width < 430)
        return null;
      const contentWidth = width - 12, controlsHeight = 48;
      const height = stacked ? 48 + controlsHeight + 4 : 52;
      surface = rect(composer.x, composer.y - height, width, height);
      const firstY = surface.y + 2;
      if (stacked) {
        a = rect(composer.x + 6, firstY, contentWidth, 48);
        b = rect(composer.x + 6, firstY + 48, contentWidth, controlsHeight);
        if (!p.seekFirst) {
          b.y = firstY;
          a.y = firstY + controlsHeight;
        }
      } else {
        a = rect(composer.x + 6, firstY, width - dockControlsLength - 62, 48);
        b = rect(a.x + a.width + 4, firstY, dockControlsLength, 48);
        if (!p.seekFirst) {
          b.x = composer.x + 6;
          a.x = b.x + b.width + 4;
        }
      }
      circle = rect(rtl ? composer.x + 2 : composer.x + width - 46, stacked ? a.y + 2 : firstY + 2, 44, 44);
      if (stacked) {
        a.width -= 44;
        if (rtl)
          a.x += 44;
      }
      if (!stacked && rtl) {
        a.x += 44;
        b.x += 44;
        circle.x = composer.x + 2;
      }
      if (!expanded) {
        circle.y = composer.y - 44;
        const radius = rtl ? environment.cornerLeft || 0 : environment.cornerRight || 0;
        circle.x = rtl ? composer.x + radius : composer.x + width - radius - 44;
      }
      circleVisual = rect(circle.x + 6, circle.y + (expanded ? 8 : 16), 32, 28);
    } else if (p.preset === "original") {
      const width = Math.min(420, v.width - 50);
      const leftSpace = composer ? composer.x - v.x - gap : 0;
      const rightSpace = composer ? v.x + v.width - composer.x - composer.width - 44 - gap * 2 : 0;
      if (composer && leftSpace >= (p.seekFirst ? 220 : controlsLength) && rightSpace >= (p.seekFirst ? controlsLength : 220)) {
        const length = Math.min(560, p.seekFirst ? leftSpace : rightSpace);
        circle = rect(composer.x + composer.width + gap, composer.y + 2, 44, 44);
        a = rect(p.seekFirst ? composer.x - length - gap : circle.x + 44 + gap, composer.y, length, 48);
        b = rect(p.seekFirst ? circle.x + 44 + gap : composer.x - controlsLength - gap, composer.y, controlsLength, 48);
      } else {
        const h = width < 356 ? 92 : 48;
        const bottom = composer ? Math.min(v.y + v.height, composer.y - 8) : v.y + v.height;
        a = rect(v.x + (v.width - width - 50) / 2, bottom - h - 54, width, 48);
        b = rect(a.x, a.y + 54, width, h);
        circle = rect(b.x + width + 6, bottom - 44, 44, 44);
        if (!p.seekFirst) {
          b.y = a.y;
          a.y = b.y + h + 6;
        }
      }
    } else {
      const side = p.preset === "left" || p.preset === "right";
      const left = p.preset.includes("left"), top = p.preset.startsWith("top");
      const seekVertical = side || (top ? !p.seekFirst : p.seekFirst);
      let available = seekVertical ? v.height - (side ? controlsLength + 56 : 54) : v.width - 54;
      if (!side && !top && !seekVertical && composer && v.y + v.height > composer.y && v.y + v.height - thick < composer.y + composer.height) {
        available = (left ? composer.x - v.x : v.x + v.width - composer.x - composer.width) - thick - gap * 2;
        if (expanded && available < 220)
          return null;
      }
      const adaptiveSeek = Math.max(seekVertical ? seekLength : 220, Math.min(seekVertical ? 420 : 560, available));
      const firstLength = p.seekFirst ? adaptiveSeek : controlsLength;
      const secondLength = p.seekFirst ? controlsLength : adaptiveSeek;
      if (side) {
        a = rect(0, 0, thick, firstLength);
        circle = rect(2, firstLength + gap, 44, 44);
        b = rect(0, firstLength + gap + 44 + gap, thick, secondLength);
        verticalSeek = verticalControls = true;
      } else if (top) {
        circle = rect(left ? 2 : firstLength + gap + 2, 2, 44, 44);
        a = rect(left ? thick + gap : 0, 0, firstLength, thick);
        b = rect(left ? 0 : firstLength + gap, thick + gap, thick, secondLength);
        verticalSeek = !p.seekFirst;
        verticalControls = p.seekFirst;
      } else {
        a = rect(left ? 0 : secondLength + gap, 0, thick, firstLength);
        circle = rect(a.x + 2, firstLength + gap + 2, 44, 44);
        b = rect(left ? thick + gap : 0, firstLength + gap, secondLength, thick);
        verticalSeek = p.seekFirst;
        verticalControls = !p.seekFirst;
      }
      const parts = [a, b, circle], w = Math.max(...parts.map((r) => r.x + r.width)), h = Math.max(...parts.map((r) => r.y + r.height));
      const x = left ? v.x : v.x + v.width - w;
      const y = side ? v.y + (v.height - h) / 2 : top ? v.y : v.y + v.height - h;
      for (const r of parts) {
        r.x += x;
        r.y += y;
      }
      const seek = p.seekFirst ? a : b, controls = p.seekFirst ? b : a;
      const result = { seek, controls, circle, verticalSeek, verticalControls };
      return (expanded ? [seek, controls, circle] : [circle]).every((r) => fits(r, v)) ? result : null;
    }
    const result = { seek: a, controls: b, circle, circleVisual, verticalSeek, verticalControls, surface, attachedToComposer: !!surface };
    return (expanded ? [a, b, circle, ...surface ? [surface] : []] : [circle]).every((r) => fits(r, v)) ? result : null;
  }

  // src/content/icons.ts
  var LUCIDE_ICONS = {
    x: '<path d="m6 6 12 12M18 6 6 18"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    ellipsis: '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
    "chevron-up": '<path d="m18 15-6-6-6 6"></path>',
    "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
    "grip-vertical": '<circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
    play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',
    square: '<rect x="5" y="5" width="14" height="14" rx="2"></rect>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
    "volume-2": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>',
    "volume-1": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
    "volume-x": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line>',
    "circle-help": '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
    "rotate-cw": '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"></path><path d="M21 3v5h-5"></path>',
    "loader-circle": '<path d="M21 12a9 9 0 1 1-6.22-8.56"></path>',
    "chevron-right": '<polyline points="9 18 15 12 9 6"></polyline>',
    "chevron-left": '<polyline points="15 18 9 12 15 6"></polyline>',
    "minimize-2": '<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>',
    "chatgpt-audio": `
    <g transform="translate(12,12) scale(0.35)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(60)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(120)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(180)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(240)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(300)" />
      <circle cx="0" cy="0" r="10" fill="var(--cgpt-ra-accent)" stroke="#ffffff" stroke-width="1.5" />
      <polygon points="-2,-4 5,0 -2,4" fill="#ffffff" stroke="none" />
    </g>
  `
  };
  function getLucideSvg(name, className = "") {
    const body = LUCIDE_ICONS[name] || LUCIDE_ICONS["circle-help"];
    return `
    <svg
      class="cgpt-ra-lucide ${className}"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >${body}</svg>
  `;
  }
  function setIcon(button, iconName, extraHTML = "") {
    if (!button)
      return;
    const iconKey = `${iconName}\x00${extraHTML}`;
    if (button.dataset.cgptRaIcon === iconKey)
      return;
    button.dataset.cgptRaIcon = iconKey;
    button.innerHTML = getLucideSvg(iconName) + extraHTML;
  }

  // src/content/player-layout.ts
  var standalone2 = true;
  var source = "chatgpt-audio-controls-settings-bridge";
  var bounds = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  function visibleBounds(el) {
    const r = bounds(el);
    if (r.width <= 0 || r.height <= 0 || getComputedStyle(el).visibility !== "visible")
      return null;
    let { x: left, y: top } = r, right = r.x + r.width, bottom = r.y + r.height;
    for (let node = el;node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.opacity === "0" || style.contentVisibility === "hidden")
        return null;
      if (node === el || style.display === "contents")
        continue;
      const clipX = /^(hidden|clip|scroll|auto)$/.test(style.overflowX);
      const clipY = /^(hidden|clip|scroll|auto)$/.test(style.overflowY);
      if (clipX || clipY) {
        const clip = node.getBoundingClientRect();
        if (clipX) {
          left = Math.max(left, clip.left);
          right = Math.min(right, clip.right);
        }
        if (clipY) {
          top = Math.max(top, clip.top);
          bottom = Math.min(bottom, clip.bottom);
        }
      }
    }
    return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
  }

  class PlayerLayout {
    seek;
    controls;
    circle;
    changed;
    failed;
    language;
    preferences = defaultLayout();
    expanded = false;
    composer = null;
    surface = document.createElement("div");
    join = document.createElement("div");
    layer = document.createElement("div");
    overlay = null;
    cancelDrag = null;
    dragging = false;
    motion = 220;
    previous = "";
    lastExpanded = false;
    extras = document.createElement("div");
    more = document.createElement("button");
    pending = new Map;
    constructor(seek, controls, circle, changed, failed, language) {
      this.seek = seek;
      this.controls = controls;
      this.circle = circle;
      this.changed = changed;
      this.failed = failed;
      this.language = language;
      this.surface.id = "cgpt-ra-dock";
      this.surface.setAttribute("aria-hidden", "true");
      this.layer.id = "cgpt-ra-layer";
      document.body.append(this.layer);
      this.layer.append(this.surface, seek, controls, circle);
      this.join.className = "cgpt-ra-dock-join";
      this.join.setAttribute("aria-hidden", "true");
      this.join.hidden = true;
      this.layer.prepend(this.join);
      if (standalone2) {
        try {
          this.preferences = migrateLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null"));
        } catch {}
      }
      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== source)
          return;
        if (event.data.type === "CGPT_RA_LAYOUT_UPDATE" && isLayout(event.data.layout)) {
          this.cancelDrag?.();
          const next = event.data.layout;
          if (JSON.stringify(next) === JSON.stringify(defaultLayout()))
            this.motion = 280;
          this.preferences = next;
          this.changed();
        }
        if (event.data.type === "CGPT_RA_LAYOUT_SAVED") {
          const job = this.pending.get(event.data.id);
          if (!job)
            return;
          clearTimeout(job.timer);
          this.pending.delete(event.data.id);
          event.data.ok ? job.resolve() : job.reject();
        }
      });
      window.addEventListener("storage", (event) => {
        if (!standalone2 || event.key !== LAYOUT_KEY)
          return;
        this.cancelDrag?.();
        try {
          this.preferences = migrateLayout(JSON.parse(event.newValue || "null"));
          this.changed();
        } catch {}
      });
      this.installDrag(circle);
      for (const pill of [seek, controls]) {
        const grip = document.createElement("button");
        grip.type = "button";
        grip.className = "cgpt-ra-grip";
        grip.innerHTML = getLucideSvg("grip-vertical");
        pill.prepend(grip);
        this.installDrag(grip, pill);
      }
      this.extras.className = "cgpt-ra-extras";
      this.extras.id = "cgpt-ra-extras";
      for (const el of controls.querySelectorAll(":scope > .cgpt-ra-speed-wrap, :scope > .cgpt-ra-volume-wrap, :scope > .cgpt-ra-download, :scope > .cgpt-ra-help-wrap"))
        this.extras.append(el);
      this.more.type = "button";
      this.more.className = "cgpt-ra-icon-btn cgpt-ra-more";
      this.more.innerHTML = getLucideSvg("ellipsis");
      this.more.setAttribute("aria-controls", this.extras.id);
      this.more.setAttribute("aria-expanded", "false");
      this.more.onclick = () => {
        const open = this.extras.classList.toggle("cgpt-open");
        this.more.setAttribute("aria-expanded", String(open));
        if (!open)
          this.extras.querySelectorAll(".cgpt-open").forEach((el) => el.classList.remove("cgpt-open"));
        this.positionPopovers();
      };
      controls.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.extras.classList.contains("cgpt-open")) {
          this.extras.classList.remove("cgpt-open");
          this.extras.querySelectorAll(".cgpt-open").forEach((el) => el.classList.remove("cgpt-open"));
          this.more.setAttribute("aria-expanded", "false");
          this.more.focus();
        }
      });
      controls.append(this.more, this.extras);
      window.postMessage({ source, type: "CGPT_RA_LAYOUT_REQUEST" }, "*");
    }
    async reset() {
      this.cancelDrag?.();
      this.motion = 280;
      await this.save(defaultLayout());
    }
    async save(value) {
      try {
        if (standalone2)
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(value));
        else
          await new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            const timer = setTimeout(() => {
              this.pending.delete(id);
              reject();
            }, 4000);
            this.pending.set(id, { resolve, reject, timer });
            window.postMessage({ source, type: "CGPT_RA_LAYOUT_SAVE", id, layout: value }, "*");
          });
        this.preferences = value;
      } catch {
        this.failed();
      }
      this.changed();
    }
    viewport() {
      const v = window.visualViewport, safe = getComputedStyle(this.circle);
      const inset = (side) => Math.max(12, parseFloat(safe.getPropertyValue("--cgpt-safe-" + side)) || 0);
      const left = inset("left"), right = inset("right"), top = inset("top"), bottom = inset("bottom");
      return { x: (v?.offsetLeft || 0) + left, y: (v?.offsetTop || 0) + top, width: Math.max(44, (v?.width || innerWidth) - left - right), height: Math.max(44, (v?.height || innerHeight) - top - bottom) };
    }
    obstacles() {
      return Array.from(document.querySelectorAll('header, [role="banner"], nav[aria-label], [data-testid="page-header"], [data-testid="app-shell-sidebar"], #app-shell-sidebar')).filter((e) => !e.closest('[id^="cgpt-ra"], article, [data-message-author-role], [data-testid^="conversation-turn"], [data-writing-block]')).map(visibleBounds).filter((r) => !!r && r.width <= innerWidth && (r.height < innerHeight * 0.7 || r.width < innerWidth * 0.45));
    }
    nativeActions() {
      return Array.from(document.querySelectorAll('header button, [role="banner"] button, [data-testid="page-header"] button, [data-testid="conversation-header"] button, #conversation-header-actions button, [data-testid="share-chat-button"], [data-testid="conversation-options-button"]')).filter((e) => !e.closest('[id^="cgpt-ra"], article, [data-message-author-role], [data-testid^="conversation-turn"], [data-writing-block], form, [contenteditable]')).map(bounds).filter((r) => r.width > 0 && r.height > 0);
    }
    geometry(p, expanded) {
      const viewport = this.viewport(), obstacles = this.obstacles(), area = { ...viewport };
      for (const o of obstacles) {
        if (o.width > viewport.width * 0.45 && o.y < area.y + 90 && o.y + o.height < area.y + area.height / 2) {
          const bottom = area.y + area.height;
          area.y = Math.max(area.y, o.y + o.height + 8);
          area.height = bottom - area.y;
        }
        if (o.height > viewport.height * 0.6 && o.width < viewport.width * 0.45 && o.x <= area.x) {
          const right = area.x + area.width;
          area.x = Math.max(area.x, o.x + o.width + 8);
          area.width = right - area.x;
        }
      }
      const c = this.composer ? bounds(this.composer) : undefined;
      const native = this.composer && getComputedStyle(this.composer);
      const radius = (value) => value?.endsWith("%") ? (parseFloat(value) || 0) * (c?.width || 0) / 100 : parseFloat(value || "") || 0;
      const environment = { actions: this.nativeActions(), cornerLeft: radius(native?.borderTopLeftRadius), cornerRight: radius(native?.borderTopRightRadius) };
      let result = dockGeometry(p, area, expanded, c, languageDirection(this.language()) === "rtl", layoutProfile(innerWidth) === "narrow", environment);
      if (result && c && p.preset !== "composer" && expanded && [result.seek, result.controls, result.circle].some((r) => intersects(r, c)) && p.preset.startsWith("bottom")) {
        result = dockGeometry(p, { ...area, height: c.y - area.y - 8 }, expanded, c, false, false, environment);
      }
      if (!result)
        return null;
      const parts = expanded ? [result.seek, result.controls, result.circle] : [result.circle];
      if (parts.some((r) => !fits(r, viewport) || obstacles.some((o) => intersects(r, o)) || c && intersects(r, c)))
        return null;
      return result;
    }
    compactGeometry(profile, expanded) {
      const v = this.viewport(), obstacles = this.obstacles(), c = this.composer && bounds(this.composer);
      const bottoms = [c ? c.y - 8 : v.y + v.height, v.y + v.height, v.y + 100];
      for (const bottom of bottoms) {
        const g = dockGeometry({ ...profile, preset: "composer" }, v, expanded, { x: v.x, y: bottom, width: v.width, height: 0 }, languageDirection(this.language()) === "rtl", true);
        if (!g)
          continue;
        const parts = expanded ? [g.surface, g.circle] : [g.circle];
        if (parts.every((r) => !obstacles.some((o) => intersects(r, o)) && (!c || !intersects(r, c))))
          return { ...g, attachedToComposer: false };
      }
      return null;
    }
    sync(composer, expanded) {
      this.composer = composer;
      this.expanded = expanded;
      if (!this.layer.isConnected && document.body) {
        this.cancelDrag?.();
        document.body.append(this.layer);
        this.previous = "";
      }
      if (this.dragging)
        return;
      const key = layoutProfile(innerWidth), profile = this.preferences[key];
      const geometry = this.geometry(profile, expanded) || this.compactGeometry(profile, expanded);
      const composerStyle = composer && getComputedStyle(composer);
      const nativeShadow = composerStyle?.boxShadow;
      const corners = composerStyle ? [composerStyle.borderTopLeftRadius, composerStyle.borderTopRightRadius] : undefined;
      const signature = JSON.stringify([geometry, expanded, this.language(), composerStyle?.backgroundColor, composerStyle?.borderLeftColor, nativeShadow, corners]);
      if (this.previous === signature) {
        this.surface.hidden = !geometry?.surface || this.circle.classList.contains("cgpt-ra-hidden");
        this.join.hidden = this.surface.hidden || !expanded || !geometry?.attachedToComposer;
        this.positionPopovers();
        return;
      }
      const elements = [this.seek, this.controls, this.circle, this.surface, this.join];
      const before = elements.map(bounds);
      for (const el of elements) {
        el.getAnimations().forEach((a) => a.cancel());
        el.style.transform = "";
      }
      if (!geometry) {
        this.seek.classList.add("cgpt-ra-fit-hidden");
        this.controls.classList.add("cgpt-ra-fit-hidden");
        this.surface.hidden = true;
        this.join.hidden = true;
        const v = this.viewport();
        const candidates = [
          this.geometry({ preset: "composer", seekFirst: true }, false)?.circle,
          { x: v.x + v.width - 44, y: v.y, width: 44, height: 44 },
          { x: v.x, y: v.y, width: 44, height: 44 }
        ].filter((r) => !!r);
        this.place(this.circle, candidates.find((r) => !this.obstacles().some((o) => intersects(r, o))) || candidates[0]);
        this.circle.classList.remove("cgpt-ra-dock-toggle");
        this.circle.classList.add("cgpt-ra-logo");
        setIcon(this.circle, "chatgpt-audio");
        return;
      }
      const changed = this.previous !== signature, animate = !!this.previous && changed && !this.reducedMotion();
      const duration = expanded !== this.lastExpanded ? 200 : this.motion;
      this.previous = signature;
      this.motion = 220;
      const docked = !!geometry.surface;
      for (const el of [this.seek, this.controls]) {
        el.classList.remove("cgpt-ra-fit-hidden");
        el.classList.toggle("cgpt-ra-in-dock", docked);
        el.inert = !expanded;
      }
      this.seek.classList.toggle("cgpt-ra-vertical", geometry.verticalSeek);
      this.controls.classList.toggle("cgpt-ra-vertical", geometry.verticalControls);
      this.controls.classList.toggle("cgpt-ra-wrap", geometry.controls.width < 356 && !geometry.verticalControls);
      this.controls.classList.toggle("cgpt-ra-compact-dock", docked && geometry.controls.width < 356);
      this.more.title = getTranslations(this.language()).popup.tabs.controls;
      this.more.setAttribute("aria-label", this.more.title);
      this.circle.dataset.preset = profile.preset;
      this.circle.classList.toggle("cgpt-ra-dock-toggle", docked);
      this.circle.classList.toggle("cgpt-ra-logo", !expanded);
      setIcon(this.circle, expanded ? docked ? "chevron-down" : "minimize-2" : "chatgpt-audio");
      if (geometry.circleVisual) {
        this.circle.style.setProperty("--toggle-top", geometry.circleVisual.y - geometry.circle.y + "px");
      }
      this.place(this.seek, geometry.seek);
      this.place(this.controls, geometry.controls);
      this.place(this.circle, geometry.circle);
      this.surface.hidden = !docked || this.circle.classList.contains("cgpt-ra-hidden");
      this.join.hidden = this.surface.hidden || !expanded || !geometry.attachedToComposer;
      if (geometry.surface) {
        this.place(this.surface, geometry.surface);
        const style = composerStyle;
        this.surface.style.background = style && style.backgroundColor !== "rgba(0, 0, 0, 0)" ? style.backgroundColor : getComputedStyle(this.controls).getPropertyValue("--cgpt-ra-bg");
        if (geometry.attachedToComposer)
          this.paintJoin(this.join, geometry.surface, this.surface.style.background);
        this.surface.style.borderColor = style?.borderLeftColor || "";
        this.surface.style.borderWidth = style?.borderLeftWidth || "";
        this.surface.style.borderStyle = style?.borderLeftStyle || "";
        this.surface.style.borderBottomWidth = geometry.attachedToComposer ? "0" : style?.borderLeftWidth || "";
        this.surface.style.boxShadow = nativeShadow || "none";
        this.surface.style.clipPath = geometry.attachedToComposer ? "inset(-8px -8px 0)" : "none";
        this.circle.style.setProperty("--dock-border", style?.borderLeftColor || "var(--cgpt-ra-border)");
        this.circle.style.setProperty("--dock-border-width", style?.borderLeftWidth || "1px");
        this.circle.style.setProperty("--dock-border-style", style?.borderLeftStyle || "solid");
        this.circle.style.setProperty("--dock-shadow", nativeShadow || "none");
        this.circle.style.setProperty("--dock-background", this.surface.style.background);
        this.surface.style.borderTopLeftRadius = corners?.[0] || "28px";
        this.surface.style.borderTopRightRadius = corners?.[1] || "28px";
        this.surface.style.borderBottomLeftRadius = this.surface.style.borderBottomRightRadius = geometry.attachedToComposer ? "0" : "24px";
      }
      this.surface.classList.toggle("cgpt-ra-dock-closed", !expanded);
      if (animate) {
        elements.forEach((el, i) => {
          const after = bounds(el), old = before[i];
          if (el.hidden || !after.width || !old.width)
            return;
          let from = { transform: "translate(" + (old.x - after.x) + "px," + (old.y - after.y) + "px)" };
          if (docked && expanded !== this.lastExpanded && el !== this.circle) {
            const travel = geometry.surface.height;
            el.animate(expanded ? [{ transform: "translateY(" + travel + "px)", clipPath: "inset(0 0 100% 0)" }, { transform: "translateY(0)", clipPath: "inset(0)" }] : [{ transform: "translateY(0)", clipPath: "inset(0)", visibility: "visible" }, { transform: "translateY(" + travel + "px)", clipPath: "inset(0 0 100% 0)", visibility: "visible" }], { duration, easing: "cubic-bezier(.2,.8,.2,1)" });
          } else {
            el.animate([from, { transform: "translate(0,0)" }], { duration, easing: "cubic-bezier(.16,1,.3,1)" });
          }
        });
      }
      this.lastExpanded = expanded;
      const copy = featureCopy(this.language());
      for (const grip of [this.seek, this.controls].map((e) => e.querySelector(".cgpt-ra-grip"))) {
        grip.title = copy.drag;
        grip.setAttribute("aria-label", copy.drag);
      }
      this.circle.title = this.circle.getAttribute("aria-label") + " · " + copy.drag;
      this.positionPopovers();
    }
    reducedMotion() {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    place(el, r) {
      for (const [key, value] of Object.entries({ left: r.x, top: r.y, width: r.width, height: r.height }))
        if (el.style.getPropertyValue(key) !== value + "px")
          el.style.setProperty(key, value + "px");
    }
    positionPopovers() {
      const v = this.viewport();
      this.more.setAttribute("aria-expanded", String(this.extras.classList.contains("cgpt-open")));
      for (const pop of this.controls.querySelectorAll(".cgpt-ra-extras, .cgpt-ra-popover, .cgpt-ra-volume-popover")) {
        const trigger = (pop === this.extras ? this.more : pop.parentElement).getBoundingClientRect();
        const above = Math.max(44, trigger.top - v.y - 8), below = Math.max(44, v.y + v.height - trigger.bottom - 8), placeAbove = above >= below;
        pop.style.maxWidth = v.width + "px";
        pop.style.maxHeight = Math.min(v.height, placeAbove ? above : below) + "px";
        const w = pop.offsetWidth || 180, h = pop.offsetHeight || 200;
        if (pop.classList.contains("cgpt-ra-volume-popover")) {
          let rail = bounds(this.controls);
          const gap = 8;
          if (this.controls.classList.contains("cgpt-ra-compact-dock") && this.extras.classList.contains("cgpt-open")) {
            const extras = bounds(this.extras);
            const right = Math.max(rail.x + rail.width, extras.x + extras.width), bottom = Math.max(rail.y + rail.height, extras.y + extras.height);
            rail = { x: Math.min(rail.x, extras.x), y: Math.min(rail.y, extras.y), width: 0, height: 0 };
            rail.width = right - rail.x;
            rail.height = bottom - rail.y;
          }
          pop.style.maxHeight = v.height + "px";
          const height = pop.offsetHeight || 165;
          const left = { x: rail.x - w - gap, y: Math.max(v.y, Math.min(v.y + v.height - height, trigger.top)), width: w, height };
          const right = { ...left, x: rail.x + rail.width + gap };
          const top = { ...left, x: Math.max(v.x, Math.min(v.x + v.width - w, trigger.left)), y: rail.y - height - gap };
          const bottom = { ...top, y: rail.y + rail.height + gap };
          const sides = rail.x + rail.width / 2 > v.x + v.width / 2 ? [left, right] : [right, left];
          const sideways = this.controls.classList.contains("cgpt-ra-vertical") || this.circle.dataset.preset?.startsWith("top");
          const target = (sideways ? [...sides, top, bottom] : [top, bottom, ...sides]).find((r) => fits(r, v));
          if (target) {
            pop.style.left = target.x + "px";
            pop.style.top = target.y + "px";
            continue;
          }
        }
        pop.style.left = Math.max(v.x, Math.min(v.x + v.width - w, trigger.left)) + "px";
        pop.style.top = Math.max(v.y, Math.min(v.y + v.height - h, placeAbove ? trigger.top - h - 8 : trigger.bottom + 8)) + "px";
      }
    }
    paintJoin(element, surface, color) {
      if (!this.composer)
        return;
      const style = getComputedStyle(this.composer), composer = bounds(this.composer);
      let height = 0;
      for (const [side, value] of [["left", style.borderTopLeftRadius], ["right", style.borderTopRightRadius]]) {
        const [x, y = x] = value.split(" ");
        const pixels = (v, size) => (parseFloat(v) || 0) * (v.endsWith("%") ? size / 100 : 1);
        const rx = pixels(x, composer.width), ry = pixels(y, composer.height);
        const scale = Math.min(1, composer.width / (2 * rx || 1), composer.height / (2 * ry || 1));
        element.style.setProperty("--join-" + side + "-x", rx * scale + "px");
        element.style.setProperty("--join-" + side + "-y", ry * scale + "px");
        height = Math.max(height, ry * scale);
      }
      element.style.setProperty("--join-color", color);
      this.place(element, { x: surface.x, y: surface.y + surface.height, width: surface.width, height });
    }
    installDrag(handle, pill) {
      let suppressClick = false;
      handle.addEventListener("click", (event) => {
        if (suppressClick && event.detail !== 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          suppressClick = false;
        }
      }, true);
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !event.isPrimary)
          return;
        this.cancelDrag?.();
        suppressClick = false;
        const key = layoutProfile(innerWidth), current = this.preferences[key];
        if (!pill && key === "narrow")
          return;
        const { clientX: x, clientY: y } = event;
        let dragging = false, selected = null, done = false;
        const offsets = new Map;
        let targets = [];
        const moving = pill ? [pill] : [this.seek, this.controls, this.circle, this.surface, this.join].filter((el) => !el.hidden && (this.expanded || el === this.circle));
        handle.setPointerCapture(event.pointerId);
        const move = (e) => {
          if (e.pointerId !== event.pointerId)
            return;
          if (!dragging && Math.hypot(e.clientX - x, e.clientY - y) <= 8)
            return;
          if (!dragging) {
            dragging = this.dragging = true;
            suppressClick = true;
            this.controls.querySelectorAll(".cgpt-open").forEach((el) => el.classList.remove("cgpt-open"));
            for (const el of moving) {
              const visible = bounds(el);
              el.getAnimations().forEach((a) => a.cancel());
              el.style.transform = "";
              const resting = bounds(el);
              offsets.set(el, { x: visible.x - resting.x, y: visible.y - resting.y });
              el.classList.add("cgpt-ra-dragging");
            }
            this.overlay = document.createElement("div");
            this.overlay.id = "cgpt-ra-drop-targets";
            this.overlay.setAttribute("aria-hidden", "true");
            const profiles = pill ? [{ ...current, seekFirst: !current.seekFirst }] : PRESETS.map((preset) => ({ preset, seekFirst: current.seekFirst }));
            for (const profile of profiles) {
              const geometry = this.geometry(profile, true);
              if (!geometry)
                continue;
              const element = document.createElement("div");
              element.className = "cgpt-ra-drop-target";
              element.dataset.preset = profile.preset;
              element.dataset.seekFirst = String(profile.seekFirst);
              if (!pill && geometry.attachedToComposer && geometry.surface) {
                const join = document.createElement("div");
                join.className = "cgpt-ra-dock-join";
                this.paintJoin(join, geometry.surface, "var(--cgpt-drop-fill)");
                element.append(join);
              }
              const parts = pill ? [[pill === this.seek ? "seek" : "controls", pill === this.seek ? geometry.seek : geometry.controls]] : geometry.surface ? [["surface", geometry.surface], ["circle", geometry.circleVisual || geometry.circle]] : [["seek", geometry.seek], ["controls", geometry.controls], ["circle", geometry.circle]];
              for (const [kind, r] of parts) {
                const outline = document.createElement("div");
                outline.className = "cgpt-ra-drop-shape";
                outline.dataset.part = kind;
                this.place(outline, r);
                const native = this.composer && getComputedStyle(this.composer);
                outline.style.borderRadius = kind === "surface" ? (native?.borderTopLeftRadius || "28px") + " " + (native?.borderTopRightRadius || "28px") + " 0 0" : "24px";
                element.append(outline);
              }
              const hit = pill ? pill === this.seek ? geometry.seek : geometry.controls : geometry.circle;
              this.overlay.append(element);
              targets.push({ element, profile, hit });
            }
            document.body.append(this.overlay);
          }
          e.preventDefault();
          const nearest = targets.map((target) => ({ target, distance: distanceToRect(e.clientX, e.clientY, target.hit) })).filter((t) => t.distance <= 24).sort((a, b) => a.distance - b.distance)[0]?.target;
          selected = nearest?.profile || null;
          for (const target of targets)
            target.element.classList.toggle("cgpt-ra-drop-active", target === nearest);
          const pull = nearest && !this.reducedMotion() ? magneticOffset(e.clientX, e.clientY, nearest.hit) : null;
          for (const el of moving)
            el.style.transform = "translate(" + (e.clientX - x + (offsets.get(el)?.x || 0) + (pull?.x || 0)) + "px," + (e.clientY - y + (offsets.get(el)?.y || 0) + (pull?.y || 0)) + "px)";
        };
        const finish = (commit) => {
          if (done)
            return;
          done = true;
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          handle.removeEventListener("pointercancel", cancel);
          handle.removeEventListener("lostpointercapture", cancel);
          window.removeEventListener("keydown", escape);
          window.removeEventListener("resize", cancel);
          window.removeEventListener("scroll", cancel, true);
          window.visualViewport?.removeEventListener("resize", cancel);
          window.visualViewport?.removeEventListener("scroll", cancel);
          if (handle.hasPointerCapture(event.pointerId))
            handle.releasePointerCapture(event.pointerId);
          this.overlay?.remove();
          this.overlay = null;
          this.cancelDrag = null;
          this.dragging = false;
          moving.forEach((el) => el.classList.remove("cgpt-ra-dragging"));
          if (dragging) {
            this.previous = "drag";
            if (commit && selected)
              this.save({ ...this.preferences, [key]: selected });
            else
              this.changed();
          }
        };
        const up = () => finish(true), cancel = () => finish(false), escape = (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
          }
        };
        this.cancelDrag = cancel;
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", cancel);
        handle.addEventListener("lostpointercapture", cancel);
        window.addEventListener("keydown", escape);
        window.addEventListener("resize", cancel);
        window.addEventListener("scroll", cancel, true);
        window.visualViewport?.addEventListener("resize", cancel);
        window.visualViewport?.addEventListener("scroll", cancel);
      });
    }
  }

  // src/content/ready-toast.ts
  class ReadyToast {
    element = null;
    timer;
    clear() {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.element?.remove();
      this.element = null;
    }
    show(message, download, dismiss, direction, onDownload, language = "en") {
      this.clear();
      const el = document.createElement("div");
      el.id = "cgpt-ra-ready-toast";
      el.dir = direction;
      el.lang = language;
      const text = document.createElement("span");
      text.setAttribute("role", "status");
      text.setAttribute("aria-live", "polite");
      const action = document.createElement("button");
      action.textContent = download;
      action.type = "button";
      const close = document.createElement("button");
      close.innerHTML = getLucideSvg("x");
      close.setAttribute("aria-label", dismiss);
      close.title = dismiss;
      close.className = "cgpt-ra-toast-dismiss";
      close.type = "button";
      action.onclick = () => {
        this.clear();
        onDownload();
      };
      close.onclick = () => this.clear();
      const icon = document.createElement("span");
      icon.className = "cgpt-ra-toast-success";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = getLucideSvg("check");
      el.append(icon, text, action, close);
      document.body.append(el);
      text.textContent = message;
      this.element = el;
      let remaining = 5000, started = performance.now(), hovered = false;
      const pause = () => {
        if (this.timer !== undefined) {
          clearTimeout(this.timer);
          this.timer = undefined;
          remaining = Math.max(0, remaining - (performance.now() - started));
        }
      };
      const resume = () => {
        if (this.element === el && !hovered && !el.contains(document.activeElement)) {
          pause();
          started = performance.now();
          this.timer = setTimeout(() => this.clear(), remaining);
        }
      };
      el.addEventListener("mouseenter", () => {
        hovered = true;
        pause();
      });
      el.addEventListener("mouseleave", () => {
        hovered = false;
        resume();
      });
      el.addEventListener("focusin", pause);
      el.addEventListener("focusout", () => queueMicrotask(resume));
      resume();
    }
  }

  // src/content/listening-use.ts
  class ListeningUse {
    session = 0;
    previous = null;
    seconds = 0;
    covered = 0;
    whole = false;
    counted = false;
    observe(a) {
      if (a.event === "start" || a.session !== this.session) {
        this.session = a.session;
        this.seconds = this.covered = 0;
        this.counted = false;
        this.whole = a.position <= 0.05;
        this.previous = a;
        return false;
      }
      const p = this.previous;
      if (a.event === "seek")
        this.whole = false;
      if (p && ["progress", "pause", "ended"].includes(a.event) && p.advancing) {
        const elapsed = (a.now - p.now) / 1000, delta = a.position - p.position;
        if (elapsed > 0 && elapsed <= 2 && delta > 0 && delta <= elapsed * p.rate + 0.15) {
          this.seconds += Math.min(elapsed, delta / p.rate);
          this.covered += delta;
        } else if (delta < -0.05 || delta > elapsed * p.rate + 0.15)
          this.whole = false;
      }
      this.previous = a;
      const completeShort = a.event === "ended" && a.duration > 0 && a.duration < 20 && this.whole && this.covered >= a.duration - 0.1;
      if (!this.counted && (this.seconds >= 20 || completeShort)) {
        this.counted = true;
        return true;
      }
      return false;
    }
  }

  // src/content/support-prompts.ts
  function promptPosition(view, size, anchor, obstacles) {
    const pad = 12, gap = 12, { width, height } = size;
    if (width > view.width - pad * 2 || height > view.height - pad * 2)
      return;
    const clampX = (x) => Math.max(view.x + pad, Math.min(x, view.x + view.width - width - pad));
    const positions = [
      { x: clampX(anchor.x + anchor.width - width), y: anchor.y - height - gap },
      { x: clampX(anchor.x), y: anchor.y + anchor.height + gap },
      { x: anchor.x - width - gap, y: anchor.y },
      { x: anchor.x + anchor.width + gap, y: anchor.y },
      { x: view.x + pad, y: view.y + pad },
      { x: view.x + view.width - width - pad, y: view.y + pad }
    ];
    return positions.find((p) => p.x >= view.x + pad && p.y >= view.y + pad && p.x + width <= view.x + view.width - pad && p.y + height <= view.y + view.height - pad && obstacles.every((r) => p.x + width + 8 <= r.x || r.x + r.width + 8 <= p.x || p.y + height + 8 <= r.y || r.y + r.height + 8 <= p.y));
  }
  var visible = (el) => {
    const style = getComputedStyle(el), r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  };

  class SupportPrompts {
    context;
    listening = new ListeningUse;
    pausedAt = 0;
    hasSession = false;
    session = 0;
    epoch = 0;
    element = null;
    current;
    busy = false;
    broken = false;
    path = location.pathname;
    lastTyping = 0;
    state = null;
    constructor(context) {
      this.context = context;
      setInterval(() => void this.tick(), 750);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.element) {
          event.preventDefault();
          this.respond("dismiss");
          return;
        }
        const el = event.target;
        if (el?.closest('input,textarea,[contenteditable="true"],[role="textbox"]') && !this.element?.contains(el))
          this.lastTyping = Date.now();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.element)
          this.element.style.visibility = "hidden";
      });
      const refresh = () => {
        engagementRequest({ type: "read" }).then(({ state }) => {
          this.state = state;
          if (!state.enabled || this.current && state[this.current.kind].status !== "shown")
            this.clear();
        }).catch(() => this.fail());
      };
      watchEngagement(refresh);
      refresh();
    }
    observe(activity) {
      if (activity.event === "dispose") {
        this.hasSession = false;
        this.pausedAt = 0;
        this.clear();
        return;
      }
      if (activity.event === "start" || activity.session !== this.session) {
        this.session = activity.session;
        this.hasSession = true;
        this.pausedAt = 0;
        this.clear();
      }
      if (this.listening.observe(activity))
        engagementRequest({ type: "qualify", session: activity.session }).then(({ state }) => {
          this.state = state;
        }).catch(() => this.fail());
      if (activity.event === "pause" || activity.event === "ended") {
        if (!this.pausedAt)
          this.pausedAt = Date.now();
      } else if (activity.advancing) {
        this.pausedAt = 0;
        this.clear();
      }
    }
    fail() {
      this.broken = true;
      this.clear();
    }
    clear() {
      this.epoch++;
      this.element?.remove();
      this.element = null;
      this.current = undefined;
    }
    unsafe() {
      const context = this.context();
      return document.hidden || context.hidden || Date.now() - this.lastTyping < 3000 || Boolean(document.querySelector(".cgpt-ra-dragging")) || Array.from(document.querySelectorAll('dialog[open],[role="dialog"],[role="menu"],[role="listbox"],[popover]:popover-open,.cgpt-open,#cgpt-ra-ready-toast')).some(visible);
    }
    position(el) {
      const viewport = window.visualViewport;
      const view = { x: viewport?.offsetLeft || 0, y: viewport?.offsetTop || 0, width: viewport?.width || innerWidth, height: viewport?.height || innerHeight };
      el.style.width = `${Math.min(380, view.width - 24)}px`;
      const controls = Array.from(document.querySelectorAll("#cgpt-ra-left,#cgpt-ra-right,#cgpt-ra-floating-toggle")).filter(visible);
      if (!controls.length)
        return false;
      const composer = this.context().composer;
      const native = Array.from(document.querySelectorAll('header,nav,[role="navigation"]')).filter((e) => !e.closest("article,[data-message-author-role],[data-writing-block]") && visible(e));
      const obstacles = [...controls, ...native, ...composer ? [composer] : []].map((el) => el.getBoundingClientRect());
      const anchor = controls[0].getBoundingClientRect();
      const position = promptPosition(view, el.getBoundingClientRect(), anchor, obstacles);
      if (!position)
        return false;
      el.style.left = `${position.x}px`;
      el.style.top = `${position.y}px`;
      return true;
    }
    async tick() {
      if (location.pathname !== this.path) {
        this.path = location.pathname;
        this.hasSession = false;
        this.clear();
      }
      if (this.element) {
        if (this.context().hidden) {
          this.clear();
          return;
        }
        if (this.current && this.element.lang !== resolveLanguage(this.context().language)) {
          this.element.remove();
          this.element = this.build(this.current.kind, this.current.reminder);
          document.body.append(this.element);
        }
        this.element.style.visibility = this.unsafe() || !this.position(this.element) ? "hidden" : "visible";
        return;
      }
      if (this.busy || this.broken || !this.hasSession || !this.pausedAt || !this.state || !eligibleRequest(this.state, Date.now()) || Date.now() - this.pausedAt < 3000 || this.unsafe())
        return;
      this.busy = true;
      const epoch = this.epoch;
      let preview;
      try {
        const { state } = await engagementRequest({ type: "read" });
        const kind = eligibleRequest(state, Date.now());
        if (!kind || epoch !== this.epoch || this.unsafe())
          return;
        preview = this.build(kind, state[kind].displays === 1);
        preview.style.visibility = "hidden";
        document.body.append(preview);
        if (!this.position(preview))
          return;
        const result = await engagementRequest({ type: "claim" });
        this.state = result.state;
        if (!result.prompt || epoch !== this.epoch || this.unsafe())
          return;
        preview.remove();
        preview = this.build(result.prompt.kind, result.prompt.reminder);
        preview.style.visibility = "hidden";
        document.body.append(preview);
        if (!this.position(preview))
          return;
        this.current = result.prompt;
        this.element = preview;
        preview = undefined;
        this.element.style.visibility = "visible";
        const status = this.element.querySelector('[role="status"]');
        status.textContent = this.element.querySelector("h2").textContent;
      } catch {
        this.fail();
      } finally {
        preview?.remove();
        this.busy = false;
      }
    }
    async respond(response) {
      const current = this.current;
      this.clear();
      if (current)
        try {
          await engagementRequest({ type: "respond", kind: current.kind, display: current.display, response });
        } catch {
          this.fail();
        }
    }
    build(kind, reminder) {
      const language = this.context().language, d = donationCopy(language), s = supportCopy(language || "auto");
      const el = document.createElement("section");
      el.id = "cgpt-ra-support-prompt";
      el.dir = languageDirection(language);
      el.lang = resolveLanguage(language);
      el.setAttribute("aria-labelledby", "cgpt-ra-support-title");
      const status = document.createElement("span");
      status.className = "cgpt-ra-support-announcement";
      status.setAttribute("role", "status");
      el.append(status);
      const heading = document.createElement("h2");
      heading.id = "cgpt-ra-support-title";
      heading.textContent = kind === "donation" ? d.title : s[0];
      const close = document.createElement("button");
      close.type = "button";
      close.className = "cgpt-ra-support-close";
      close.innerHTML = getLucideSvg("x");
      close.setAttribute("aria-label", d.never);
      close.title = d.never;
      close.onclick = () => void this.respond("dismiss");
      el.append(heading, close);
      const paragraph = (text) => {
        const p = document.createElement("p");
        p.textContent = text;
        el.append(p);
      };
      paragraph(kind === "donation" ? d.value : s[1]);
      const links = document.createElement("div");
      links.className = "cgpt-ra-support-actions";
      const link = (href, text, action, label = text) => {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = text;
        a.setAttribute("aria-label", label);
        a.onclick = () => {
          this.clear();
          engagementRequest({ type: "opened", kind: action }).catch(() => this.fail());
        };
        links.append(a);
      };
      if (kind === "donation") {
        paragraph(d.costs);
        paragraph(d.once);
        for (const amount of SPONSOR_AMOUNTS)
          link(sponsorURL(amount), `US$${amount}`, "donation", `${d.donate} · US$${amount} · GitHub Sponsors`);
      }
      for (const store of reviewStores(navigator.userAgent))
        link(REVIEW_URLS[store], `${s[3]} · ${store === "edge" ? "Edge" : "Chrome"}`, "review");
      el.append(links);
      if (kind === "donation")
        paragraph(d.privacy);
      const actions = document.createElement("div");
      actions.className = "cgpt-ra-support-actions secondary";
      for (const [text, response] of [[d.later, "later"], [d.never, "dismiss"]]) {
        if (reminder && response === "later")
          continue;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.onclick = () => void this.respond(response);
        actions.append(button);
      }
      el.append(actions);
      return el;
    }
  }
  // src/shared/i18n/polish.json
  var polish_default = {
    en: {
      edit: "Edit in browser",
      editHint: "Find {action} on the browser shortcuts page. The browser does not support links to individual commands.",
      layoutDescription: "Keep the original placement, choose a corner or side preset, or dock above the chat input. Drag to move, swap the bars, and remember your layout.",
      gestureReleaseLabel: "Release the button",
      seekPosition: "Playback position"
    },
    bn: {
      edit: "ব্রাউজারে সম্পাদনা করুন",
      editHint: "ব্রাউজার শর্টকাট পৃষ্ঠায় {action} খুঁজুন। ব্রাউজার পৃথক কমান্ডের লিঙ্ক সমর্থন করে না।",
      layoutDescription: "আসল প্লেসমেন্ট রাখুন, একটি কোণা বা সাইড প্রিসেট চয়ন করুন বা চ্যাট ইনপুটের উপরে ডক করুন। সরাতে টেনে আনুন, বারগুলি অদলবদল করুন এবং আপনার লেআউটটি মনে রাখুন।",
      gestureReleaseLabel: "বোতাম ছেড়ে দিলে",
      seekPosition: "প্লেব্যাকের অবস্থান"
    },
    mr: {
      edit: "ब्राउझरमध्ये संपादित करा",
      editHint: "ब्राउझर शॉर्टकट पृष्ठावर {action} शोधा. ब्राउझर वैयक्तिक आदेशांच्या दुव्यांचे समर्थन करत नाही.",
      layoutDescription: "मूळ प्लेसमेंट ठेवा, एक कोपरा किंवा साइड प्रीसेट निवडा किंवा चॅट इनपुटच्या वर डॉक करा. हलविण्यासाठी ड्रॅग करा, बार स्वॅप करा आणि तुमचा लेआउट लक्षात ठेवा.",
      gestureReleaseLabel: "बटण सोडल्यावर",
      seekPosition: "प्लेबॅकची स्थिती"
    },
    te: {
      edit: "బ్రౌజర్‌లో సవరించండి",
      editHint: "బ్రౌజర్ సత్వరమార్గాల పేజీలో {action}ని కనుగొనండి. బ్రౌజర్ వ్యక్తిగత ఆదేశాలకు లింక్‌లకు మద్దతు ఇవ్వదు.",
      layoutDescription: "ఒరిజినల్ ప్లేస్‌మెంట్‌ను ఉంచండి, ఒక మూలను లేదా సైడ్ ప్రీసెట్‌ను ఎంచుకోండి లేదా చాట్ ఇన్‌పుట్ పైన డాక్ చేయండి. తరలించడానికి లాగండి, బార్‌లను మార్చుకోండి మరియు మీ లేఅవుట్‌ను గుర్తుంచుకోండి.",
      gestureReleaseLabel: "బటన్‌ను వదిలినప్పుడు",
      seekPosition: "ప్లేబ్యాక్ స్థానం"
    },
    ta: {
      edit: "உலாவியில் திருத்தவும்",
      editHint: "உலாவி குறுக்குவழிகள் பக்கத்தில் {action} ஐக் கண்டறியவும். தனிப்பட்ட கட்டளைகளுக்கான இணைப்புகளை உலாவி ஆதரிக்காது.",
      layoutDescription: "அசல் இடத்தை வைத்திருங்கள், ஒரு மூலை அல்லது பக்க முன்னமைவைத் தேர்வுசெய்யவும் அல்லது அரட்டை உள்ளீட்டிற்கு மேலே டாக் செய்யவும். நகர்த்த இழுக்கவும், பார்களை மாற்றவும் மற்றும் உங்கள் தளவமைப்பை நினைவில் கொள்ளவும்.",
      gestureReleaseLabel: "பொத்தானை விடும்போது",
      seekPosition: "இயக்க நிலை"
    },
    ar: {
      edit: "تحرير في المتصفح",
      editHint: "ابحث عن {action} في صفحة اختصارات المتصفح. لا يدعم المتصفح الروابط للأوامر الفردية.",
      layoutDescription: "احتفظ بالموضع الأصلي، أو اختر زاوية أو إعدادًا جانبيًا مسبقًا، أو قم بالتثبيت فوق مدخلات الدردشة. اسحب للتحرك، وقم بتبديل الأشرطة، وتذكر التخطيط الخاص بك.",
      gestureReleaseLabel: "عند إفلات الزر",
      seekPosition: "موضع التشغيل"
    },
    fa: {
      edit: "ویرایش در مرورگر",
      editHint: "{action} را در صفحه میانبرهای مرورگر پیدا کنید. مرورگر پیوندهایی به دستورات فردی را پشتیبانی نمی کند.",
      layoutDescription: "مکان اصلی را نگه دارید، یک گوشه یا کناری از پیش تنظیم شده انتخاب کنید، یا بالای ورودی چت قرار بگیرید. بکشید تا حرکت کنید، میله‌ها را عوض کنید و طرح‌بندی خود را به خاطر بسپارید.",
      gestureReleaseLabel: "با رها کردن دکمه",
      seekPosition: "موقعیت پخش"
    },
    he: {
      edit: "ערוך בדפדפן",
      editHint: "מצא את {action} בדף קיצורי הדרך של הדפדפן. הדפדפן אינו תומך בקישורים לפקודות בודדות.",
      layoutDescription: "שמור את המיקום המקורי, בחר פינה או צד מוגדר מראש, או עגן מעל קלט הצ'אט. גרור כדי לזוז, להחליף את הפסים ולזכור את הפריסה שלך.",
      gestureReleaseLabel: "בשחרור הכפתור",
      seekPosition: "מיקום ההשמעה"
    },
    "zh-CN": {
      edit: "在浏览器中编辑",
      editHint: "在浏览器快捷方式页面找到{action}。浏览器不支持指向单个命令的链接。",
      layoutDescription: "保留原始位置，选择角落或侧面预设，或停靠在聊天输入上方。拖动移动、交换栏并记住您的布局。",
      gestureReleaseLabel: "松开按钮",
      seekPosition: "播放位置"
    },
    "zh-TW": {
      edit: "在瀏覽器中編輯",
      editHint: "在瀏覽器捷徑頁面找到{action}。瀏覽器不支援指向單一命令的連結。",
      layoutDescription: "保留原始位置，選擇角落或側面預設，或停靠在聊天輸入上方。拖曳移動、交換欄並記住您的佈局。",
      gestureReleaseLabel: "放開按鈕",
      seekPosition: "播放位置"
    },
    vi: {
      edit: "Chỉnh sửa trong trình duyệt",
      editHint: "Tìm {action} trên trang phím tắt của trình duyệt. Trình duyệt không hỗ trợ liên kết đến các lệnh riêng lẻ.",
      layoutDescription: "Giữ nguyên vị trí ban đầu, chọn cài đặt sẵn ở một góc hoặc một bên hoặc gắn phía trên đầu vào trò chuyện. Kéo để di chuyển, hoán đổi các thanh và ghi nhớ bố cục của bạn.",
      gestureReleaseLabel: "Khi thả nút",
      seekPosition: "Vị trí phát"
    },
    th: {
      edit: "แก้ไขในเบราว์เซอร์",
      editHint: "ค้นหา {action} บนหน้าทางลัดของเบราว์เซอร์ เบราว์เซอร์ไม่รองรับลิงก์ไปยังคำสั่งแต่ละคำสั่ง",
      layoutDescription: "คงตำแหน่งเดิมไว้ เลือกมุมหรือด้านข้างที่กำหนดไว้ล่วงหน้า หรือวางเหนือช่องแชท ลากเพื่อย้าย สลับแถบ และจดจำเค้าโครงของคุณ",
      gestureReleaseLabel: "เมื่อปล่อยปุ่ม",
      seekPosition: "ตำแหน่งการเล่น"
    },
    es: {
      edit: "Editar en el navegador",
      editHint: "Busque {action} en la página de accesos directos del navegador. El navegador no admite enlaces a comandos individuales.",
      layoutDescription: "Mantenga la ubicación original, elija una esquina o un lado preestablecido, o colóquelo encima de la entrada del chat. Arrastra para moverte, cambia las barras y recuerda tu diseño.",
      gestureReleaseLabel: "Al soltar el botón",
      seekPosition: "Posición de reproducción"
    },
    "pt-BR": {
      edit: "Editar no navegador",
      editHint: "Encontre {action} na página de atalhos do navegador. O navegador não oferece suporte a links para comandos individuais.",
      layoutDescription: "Mantenha o posicionamento original, escolha uma predefinição de canto ou lateral ou encaixe acima da entrada do chat. Arraste para mover, troque as barras e lembre-se do seu layout.",
      gestureReleaseLabel: "Ao soltar o botão",
      seekPosition: "Posição da reprodução"
    },
    "pt-PT": {
      edit: "Editar no browser",
      editHint: "Encontre {action} na página de atalhos do browser. O navegador não suporta links para comandos individuais.",
      layoutDescription: "Mantenha o posicionamento original, escolha uma predefinição de canto ou lateral ou encaixe acima da entrada do chat. Arraste para mover, troque as barras e lembre-se do seu layout.",
      gestureReleaseLabel: "Ao soltar o botão",
      seekPosition: "Posição de reprodução"
    },
    ru: {
      edit: "Редактировать в браузере",
      editHint: "Найдите {action} на странице ярлыков браузера. Браузер не поддерживает ссылки на отдельные команды.",
      layoutDescription: "Сохраните исходное расположение, выберите угол или боковую настройку или закрепите ее над полем ввода в чате. Перетаскивайте, меняйте местами полосы и запоминайте расположение.",
      gestureReleaseLabel: "При отпускании кнопки",
      seekPosition: "Позиция воспроизведения"
    },
    hi: {
      edit: "ब्राउज़र में संपादित करें",
      editHint: "ब्राउज़र शॉर्टकट पेज पर {action} ढूंढें। ब्राउज़र अलग-अलग कमांड के लिंक का समर्थन नहीं करता है।",
      layoutDescription: "मूल प्लेसमेंट रखें, एक कोना या साइड प्रीसेट चुनें, या चैट इनपुट के ऊपर डॉक चुनें। स्थानांतरित करने के लिए खींचें, बारों को स्वैप करें और अपना लेआउट याद रखें।",
      gestureReleaseLabel: "बटन छोड़ने पर",
      seekPosition: "प्लेबैक की स्थिति"
    },
    fr: {
      edit: "Modifier dans le navigateur",
      editHint: "Recherchez {action} sur la page des raccourcis du navigateur. Le navigateur ne prend pas en charge les liens vers des commandes individuelles.",
      layoutDescription: "Conservez l'emplacement d'origine, choisissez un coin ou un côté prédéfini, ou placez-le au-dessus de l'entrée du chat. Faites glisser pour vous déplacer, échangez les barres et mémorisez votre disposition.",
      gestureReleaseLabel: "En relâchant le bouton",
      seekPosition: "Position de lecture"
    },
    de: {
      edit: "Im Browser bearbeiten",
      editHint: "Suchen Sie {action} auf der Seite mit den Browser-Verknüpfungen. Der Browser unterstützt keine Links zu einzelnen Befehlen.",
      layoutDescription: "Behalten Sie die ursprüngliche Platzierung bei, wählen Sie eine Eck- oder Seitenvoreinstellung oder docken Sie oberhalb der Chat-Eingabe an. Ziehen Sie zum Verschieben, tauschen Sie die Balken aus und merken Sie sich Ihr Layout.",
      gestureReleaseLabel: "Beim Loslassen",
      seekPosition: "Wiedergabeposition"
    },
    ja: {
      edit: "ブラウザで編集する",
      editHint: "ブラウザのショートカット ページで {action} を見つけます。ブラウザは、個々のコマンドへのリンクをサポートしていません。",
      layoutDescription: "元の配置を維持し、コーナーまたはサイドのプリセットを選択するか、チャット入力の上にドッキングします。ドラッグして移動したり、バーを交換したりして、レイアウトを記憶します。",
      gestureReleaseLabel: "ボタンを離すと",
      seekPosition: "再生位置"
    },
    ko: {
      edit: "브라우저에서 편집",
      editHint: "브라우저 바로가기 페이지에서 {action}를 찾으세요. 브라우저는 개별 명령에 대한 링크를 지원하지 않습니다.",
      layoutDescription: "원래 배치를 유지하고, 모서리나 측면 사전 설정을 선택하거나, 채팅 입력 위에 고정하세요. 드래그하여 이동하고, 막대를 바꾸고, 레이아웃을 기억하세요.",
      gestureReleaseLabel: "버튼을 놓으면",
      seekPosition: "재생 위치"
    },
    id: {
      edit: "Sunting di peramban",
      editHint: "Temukan {action} di halaman pintasan browser. Browser tidak mendukung tautan ke perintah individual.",
      layoutDescription: "Pertahankan penempatan aslinya, pilih preset sudut atau samping, atau dok di atas masukan obrolan. Seret untuk memindahkan, tukar bilah, dan ingat tata letak Anda.",
      gestureReleaseLabel: "Saat tombol dilepas",
      seekPosition: "Posisi pemutaran"
    },
    it: {
      edit: "Modifica nel browser",
      editHint: "Trova {action} nella pagina delle scorciatoie del browser. Il browser non supporta collegamenti a singoli comandi.",
      layoutDescription: "Mantieni la posizione originale, scegli un angolo o un lato preimpostato oppure aggancialo sopra l'input della chat. Trascina per spostare, scambia le barre e ricorda il layout.",
      gestureReleaseLabel: "Al rilascio del pulsante",
      seekPosition: "Posizione di riproduzione"
    },
    tr: {
      edit: "Tarayıcıda düzenle",
      editHint: "Tarayıcı kısayolları sayfasında {action}'yu bulun. Tarayıcı, bireysel komutlara olan bağlantıları desteklemez.",
      layoutDescription: "Orijinal yerleşimi koruyun, bir köşe veya yan ön ayar seçin veya sohbet girişinin üzerine sabitleyin. Taşımak, çubukları değiştirmek ve düzeninizi hatırlamak için sürükleyin.",
      gestureReleaseLabel: "Düğmeyi bıraktığınızda",
      seekPosition: "Oynatma konumu"
    },
    pl: {
      edit: "Edytuj w przeglądarce",
      editHint: "Znajdź {action} na stronie skrótów przeglądarki. Przeglądarka nie obsługuje odnośników do poszczególnych poleceń.",
      layoutDescription: "Zachowaj oryginalne położenie, wybierz róg lub bok ekranu albo umieść odtwarzacz nad polem wiadomości. Przeciągaj i zamieniaj paski — rozszerzenie zapamięta układ.",
      gestureReleaseLabel: "Po zwolnieniu przycisku",
      seekPosition: "Pozycja odtwarzania"
    },
    hu: {
      edit: "Szerkesztés a böngészőben",
      editHint: "Keresse meg a {action} elemet a böngésző parancsikonok oldalán. A böngésző nem támogatja az egyes parancsokra mutató hivatkozásokat.",
      layoutDescription: "Tartsa meg az eredeti elhelyezést, válasszon egy sarok vagy oldal előre beállított értéket, vagy dokkoljon a csevegés bemenete fölé. Húzza a mozgatáshoz, cserélje fel a sávokat, és emlékezzen az elrendezésre.",
      gestureReleaseLabel: "A gomb felengedésekor",
      seekPosition: "Lejátszási pozíció"
    },
    sv: {
      edit: "Redigera i webbläsaren",
      editHint: "Hitta {action} på webbläsarens genvägssida. Webbläsaren stöder inte länkar till enskilda kommandon.",
      layoutDescription: "Behåll den ursprungliga placeringen, välj ett hörn eller en sida, eller docka ovanför meddelandefältet. Dra för att flytta och byta plats på fälten. Tillägget sparar din layout.",
      gestureReleaseLabel: "När du släpper knappen",
      seekPosition: "Uppspelningsposition"
    },
    cs: {
      edit: "Upravit v prohlížeči",
      editHint: "Najděte {action} na stránce zástupců prohlížeče. Prohlížeč nepodporuje odkazy na jednotlivé příkazy.",
      layoutDescription: "Ponechte původní umístění, vyberte přednastavení rohu nebo strany nebo ukotvete nad vstupem chatu. Přetažením se můžete pohybovat, vyměňovat pruhy a pamatovat si rozvržení.",
      gestureReleaseLabel: "Po uvolnění tlačítka",
      seekPosition: "Pozice přehrávání"
    },
    uk: {
      edit: "Редагувати в браузері",
      editHint: "Знайдіть {action} на сторінці ярликів браузера. Браузер не підтримує посилання на окремі команди.",
      layoutDescription: "Збережіть вихідне розташування, виберіть кут або бічні налаштування або закріпіть над введенням чату. Перетягуйте, щоб рухатися, міняйте смужки місцями та запам’ятовуйте свій макет.",
      gestureReleaseLabel: "Після відпускання кнопки",
      seekPosition: "Позиція відтворення"
    },
    ca: {
      edit: "Edita al navegador",
      editHint: "Cerqueu {action} a la pàgina de dreceres del navegador. El navegador no admet enllaços a ordres individuals.",
      layoutDescription: "Manteniu la ubicació original, trieu una cantonada o un lateral preestablert, o acopleu-lo a sobre de l'entrada del xat. Arrossegueu per moure's, intercanvieu les barres i recordeu la vostra disposició.",
      gestureReleaseLabel: "En deixar anar el botó",
      seekPosition: "Posició de reproducció"
    },
    el: {
      edit: "Επεξεργασία στο πρόγραμμα περιήγησης",
      editHint: "Βρείτε το {action} στη σελίδα συντομεύσεων του προγράμματος περιήγησης. Το πρόγραμμα περιήγησης δεν υποστηρίζει συνδέσμους με μεμονωμένες εντολές.",
      layoutDescription: "Διατηρήστε την αρχική τοποθέτηση, επιλέξτε μια γωνιακή ή πλευρική προεπιλογή ή συνδέστε πάνω από την είσοδο συνομιλίας. Σύρετε για να μετακινηθείτε, αλλάξτε τις γραμμές και θυμηθείτε τη διάταξή σας.",
      gestureReleaseLabel: "Όταν αφήσετε το κουμπί",
      seekPosition: "Θέση αναπαραγωγής"
    },
    ro: {
      edit: "Editați în browser",
      editHint: "Găsiți {action} pe pagina de comenzi rapide ale browserului. Browserul nu acceptă link-uri către comenzi individuale.",
      layoutDescription: "Păstrați poziția inițială, alegeți un colț sau o latură a ecranului ori andocați playerul deasupra câmpului de mesaj. Trageți pentru a muta barele sau a le schimba ordinea. Extensia reține aranjamentul.",
      gestureReleaseLabel: "La eliberarea butonului",
      seekPosition: "Poziția redării"
    },
    nb: {
      edit: "Rediger i nettleseren",
      editHint: "Finn {action} på snarveisiden for nettleseren. Nettleseren støtter ikke lenker til individuelle kommandoer.",
      layoutDescription: "Behold den opprinnelige plasseringen, velg en forhåndsinnstilling på hjørnet eller siden, eller forankre over chat-inngangen. Dra for å flytte, bytt stolpene og husk oppsettet ditt.",
      gestureReleaseLabel: "Når du slipper knappen",
      seekPosition: "Avspillingsposisjon"
    }
  };

  // src/shared/i18n/polish.ts
  function polishCopy(language) {
    return polish_default[resolveLanguage(language)] || polish_default.en;
  }

  // src/shared/shortcuts.ts
  var VISIBILITY_COMMAND = "toggle-floating-ui";
  var COMMANDS = ["play-pause", "seek-back", "seek-forward", "speed-decrease", "speed-increase", "speed-reset", "volume-increase", "volume-decrease", "toggle-mute", "download-audio", "toggle-collapse", VISIBILITY_COMMAND, "reset-layout", "open-help", "open-settings"];
  var isPlayerCommand = (value) => typeof value === "string" && COMMANDS.includes(value);
  function matchesShortcut(event, shortcut) {
    const parts = shortcut.toLowerCase().split("+");
    const key = parts.pop();
    const aliases = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", comma: "Comma", period: "Period", space: "Space" };
    const code = aliases[key || ""] || (key?.length === 1 ? /^\d$/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}` : key);
    return event.code.toLowerCase() === code?.toLowerCase() && event.altKey === parts.some((p) => p === "alt" || p === "option") && event.shiftKey === parts.includes("shift") && event.metaKey === parts.some((p) => p === "command" || p === "cmd") && event.ctrlKey === parts.some((p) => p === "ctrl" || p === "macctrl");
  }
  function isMacPlatform(platform = typeof navigator === "undefined" ? "" : navigator.platform) {
    return /mac/i.test(platform);
  }
  function platformKeys(text, mac = isMacPlatform()) {
    return mac ? text.replace(/Alt/g, "Option ⌥").replace(/Shift/g, "Shift ⇧").replace(/Ctrl/g, "Control ⌃").replace(/Command/g, "Command ⌘") : text;
  }
  function playbackAction(event) {
    if (event.isComposing || event.ctrlKey || event.metaKey)
      return null;
    if (event.altKey && !event.shiftKey) {
      if (event.code === "KeyP")
        return "play";
      if (event.key === "ArrowLeft")
        return "back";
      if (event.key === "ArrowRight")
        return "forward";
    }
    if (!event.altKey && !event.shiftKey && (event.code === "Space" || event.code === "KeyK"))
      return "play";
    if (!event.altKey && event.shiftKey && event.code === "Comma")
      return "slower";
    if (!event.altKey && event.shiftKey && event.code === "Period")
      return "faster";
    return null;
  }

  // src/content/playback-session.ts
  class PlaybackSession {
    retain;
    changed;
    failed;
    retained;
    activity;
    media = null;
    host = null;
    owned = null;
    source = "";
    objectURL = "";
    generation = 0;
    pending = null;
    payload = null;
    controller = null;
    wantsPlay = false;
    savedTime = 0;
    savedDuration = 0;
    ready = false;
    advancing = false;
    playAnchor = 0;
    playTimer;
    playAttempt = 0;
    constructor(retain, changed, failed, retained = () => {}, activity = () => {}) {
      this.retain = retain;
      this.changed = changed;
      this.failed = failed;
      this.retained = retained;
      this.activity = activity;
    }
    report(event, media = this.media) {
      try {
        this.activity({ session: this.generation, event, position: this.time, duration: this.duration, rate: media?.playbackRate || 1, advancing: Boolean(media && !media.paused && !media.ended && !media.seeking && media.readyState >= 2), now: performance.now() });
      } catch {}
    }
    isOwned(media) {
      return media === this.owned;
    }
    get url() {
      return this.source;
    }
    get time() {
      return this.owned && !this.ready ? this.savedTime : this.media?.currentTime || 0;
    }
    get duration() {
      return this.owned && !this.ready ? this.savedDuration : this.media?.duration || 0;
    }
    get loading() {
      return this.wantsPlay && (!this.advancing || Boolean(this.pending));
    }
    get playing() {
      return this.advancing && Boolean(this.media && !this.media.paused && !this.media.ended);
    }
    get paused() {
      return !this.wantsPlay;
    }
    attach(media) {
      if (this.isOwned(media))
        return;
      const source = media.src || media.currentSrc;
      if (this.host === media && this.source === source && !this.owned)
        return;
      this.dispose(media);
      this.host = this.media = media;
      this.source = source;
      this.wantsPlay = true;
      this.report("start");
      this.controller = new AbortController;
      this.watch(media);
      this.payload = this.retain(source, this.controller.signal);
      const generation = this.generation;
      this.payload.then((blob) => {
        if (generation === this.generation && !this.controller?.signal.aborted && blob.size > 0)
          this.retained(true);
      }).catch(() => {});
    }
    watch(media) {
      const generation = this.generation;
      const current = () => generation === this.generation && media === this.media;
      const signal = this.controller?.signal;
      for (const name of ["play", "playing", "pause", "ended", "waiting", "timeupdate", "seeking", "seeked", "ratechange"]) {
        media.addEventListener(name, () => {
          if (!current())
            return;
          this.report(name === "timeupdate" ? "progress" : name === "pause" ? "pause" : name === "ended" ? "ended" : name === "seeking" ? "seek" : "boundary", media);
          if (["playing", "seeking", "seeked", "ratechange"].includes(name))
            return;
          if (name === "play" || name === "waiting") {
            if (media.paused)
              return;
            this.advancing = false;
            this.playAnchor = media.currentTime;
            this.wantsPlay = true;
          } else if (name === "pause" || name === "ended") {
            if (media.paused)
              this.wantsPlay = this.advancing = false;
          } else if (!media.paused && media.currentTime > this.playAnchor) {
            this.advancing = true;
            clearTimeout(this.playTimer);
          }
          this.changed(media);
        }, { signal });
      }
    }
    async blob() {
      if (!this.payload)
        throw new Error("No active audio source");
      return this.payload;
    }
    seek(time) {
      this.report("seek");
      this.savedTime = time;
      if (this.media && (!this.owned || this.ready)) {
        this.media.currentTime = time;
        this.playAnchor = this.media.currentTime;
      }
      this.report("boundary");
    }
    toggle() {
      if (!this.media)
        return;
      const attempt = ++this.playAttempt;
      if (this.owned) {
        this.wantsPlay = !this.wantsPlay;
        if (!this.wantsPlay) {
          this.advancing = false;
          clearTimeout(this.playTimer);
          this.media.pause();
        } else if (!this.pending) {
          if (!this.ready)
            this.prepare();
          else
            this.playOwned();
        }
        return;
      }
      if (!this.wantsPlay) {
        this.wantsPlay = true;
        const generation = this.generation;
        this.media.play().catch(() => {
          if (generation === this.generation && attempt === this.playAttempt) {
            this.wantsPlay = false;
            this.failed();
            this.changed(this.media);
          }
        });
        return;
      }
      const host = this.media;
      this.report("pause");
      this.savedTime = host.currentTime || 0;
      this.savedDuration = Number.isFinite(host.duration) ? host.duration : 0;
      if (!this.savedDuration && host.buffered?.length)
        this.savedDuration = host.buffered.end(host.buffered.length - 1);
      const owned = new Audio;
      owned.preload = "auto";
      owned.playbackRate = host.playbackRate;
      owned.defaultPlaybackRate = host.playbackRate;
      owned.volume = host.volume;
      owned.muted = host.muted;
      this.owned = owned;
      this.media = owned;
      this.wantsPlay = false;
      this.advancing = false;
      this.report("boundary");
      this.watch(owned);
      this.changed(owned);
      host.pause();
      this.prepare();
    }
    prepare() {
      const owned = this.owned;
      if (!owned || this.pending)
        return;
      const generation = this.generation;
      const signal = this.controller.signal;
      const current = () => this.generation === generation && this.owned === owned;
      this.pending = (async () => {
        try {
          const blob = await new Promise((resolve, reject) => {
            const aborted = () => finish(new Error("Session replaced"));
            const timer = setTimeout(() => finish(new Error("Audio retention timed out")), 60000);
            const finish = (error, blob) => {
              clearTimeout(timer);
              signal.removeEventListener("abort", aborted);
              error ? reject(error) : resolve(blob);
            };
            signal.addEventListener("abort", aborted, { once: true });
            this.blob().then((blob) => finish(undefined, blob), (error) => finish(error));
          });
          if (!current())
            return;
          if (this.objectURL)
            URL.revokeObjectURL(this.objectURL);
          this.objectURL = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => finish(new Error("Audio load timed out")), 15000);
            const finish = (error) => {
              clearTimeout(timer);
              owned.removeEventListener("loadedmetadata", loaded);
              owned.removeEventListener("error", failed);
              signal.removeEventListener("abort", aborted);
              error ? reject(error) : resolve();
            };
            const loaded = () => finish();
            const failed = () => finish(new Error("Audio load failed"));
            const aborted = () => finish(new Error("Session replaced"));
            owned.addEventListener("loadedmetadata", loaded, { once: true });
            owned.addEventListener("error", failed, { once: true });
            signal.addEventListener("abort", aborted, { once: true });
            owned.src = this.objectURL;
            owned.load();
          });
          if (!current())
            return;
          owned.currentTime = Math.min(this.savedTime, Number.isFinite(owned.duration) ? owned.duration : this.savedTime);
          this.ready = true;
          if (this.wantsPlay)
            this.playOwned();
        } catch {
          if (current()) {
            this.wantsPlay = false;
            this.failed();
          }
        } finally {
          if (current()) {
            this.pending = null;
            this.changed(owned);
          }
        }
      })();
    }
    playOwned() {
      const owned = this.owned, generation = this.generation, attempt = this.playAttempt;
      if (!owned)
        return;
      this.advancing = false;
      this.playAnchor = owned.currentTime;
      clearTimeout(this.playTimer);
      this.playTimer = setTimeout(() => {
        if (generation === this.generation && attempt === this.playAttempt && this.wantsPlay && !this.advancing) {
          this.wantsPlay = false;
          owned.pause();
          this.failed();
          this.changed(owned);
        }
      }, 15000);
      owned.play().catch(() => {
        if (generation === this.generation && attempt === this.playAttempt && this.wantsPlay) {
          clearTimeout(this.playTimer);
          this.wantsPlay = false;
          this.failed();
          this.changed(owned);
        }
      });
    }
    dispose(next) {
      this.report("dispose");
      this.generation++;
      this.retained(false);
      this.playAttempt++;
      clearTimeout(this.playTimer);
      this.controller?.abort();
      this.controller = null;
      const media = this.media;
      this.media = this.host = null;
      if (media && media !== next)
        media.pause();
      if (this.owned) {
        this.owned.removeAttribute("src");
        this.owned.load();
      }
      if (this.objectURL)
        URL.revokeObjectURL(this.objectURL);
      this.owned = null;
      this.objectURL = this.source = "";
      this.pending = this.payload = null;
      this.ready = this.wantsPlay = this.advancing = false;
      this.savedTime = this.savedDuration = 0;
    }
  }

  // src/content/streaming-audio.ts
  class StreamingAudioCapture {
    requests = new Set;
    sources = new Map;
    urls = new Map;
    buffers = new WeakMap;
    begin() {
      let resolve, reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      promise.catch(() => {});
      const controller = new AbortController;
      const request = {
        controller,
        promise,
        resolve,
        reject,
        claimed: false,
        timer: setTimeout(() => {
          controller.abort();
          reject(new Error("Audio capture timed out"));
          this.requests.delete(request);
        }, 60000)
      };
      this.requests.add(request);
      const waiting = [...this.sources.values()].filter((stream) => !stream.request && !stream.settled);
      for (const stream of waiting)
        stream.candidates.push(request);
      const active = waiting.filter((stream) => stream.active);
      if (active.length === 1 && active[0].candidates.length === 1)
        this.bind(active[0], request);
      while (this.requests.size > 4) {
        const oldest = [...this.requests].find((request) => !request.claimed) || this.requests.values().next().value;
        this.releaseRequest(oldest);
      }
      return request;
    }
    complete(request, payload) {
      payload.then((blob) => {
        clearTimeout(request.timer);
        request.resolve(blob);
      }, (error) => {
        clearTimeout(request.timer);
        request.reject(error);
        this.requests.delete(request);
      });
    }
    register(source, url) {
      let resolve, reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      promise.catch(() => {});
      const candidates = [...this.requests].filter((request) => !request.claimed);
      const stream = { candidates, prefix: new Uint8Array, promise, resolve, reject, settled: false, active: false };
      this.sources.set(source, stream);
      this.urls.set(url, stream);
      while (this.sources.size > 8) {
        const oldest = [...this.sources].find(([, value]) => !value.active);
        if (!oldest)
          break;
        oldest[1].settled = true;
        oldest[1].reject(new Error("Unused stream replaced"));
        this.sources.delete(oldest[0]);
        for (const [key, value] of this.urls)
          if (value === oldest[1])
            this.urls.delete(key);
      }
    }
    addBuffer(source, buffer) {
      const stream = this.sources.get(source);
      if (stream)
        this.buffers.set(buffer, stream);
    }
    append(buffer, data) {
      const stream = this.buffers.get(buffer);
      if (!stream || stream.prefix.length >= 4096)
        return;
      const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
      const length = Math.min(bytes.length, 4096 - stream.prefix.length);
      const prefix = new Uint8Array(stream.prefix.length + length);
      prefix.set(stream.prefix);
      prefix.set(bytes.subarray(0, length), stream.prefix.length);
      stream.prefix = prefix;
      if (stream.active && !stream.request && prefix.length >= 1024)
        this.match(stream);
    }
    async match(stream) {
      const matches = await Promise.all(stream.candidates.map(async (request) => {
        try {
          return await this.matches(stream.prefix, await request.promise) ? request : undefined;
        } catch {
          return;
        }
      }));
      const eligible = matches.filter(Boolean);
      if (!stream.settled && eligible.length === 1 && !stream.request && !eligible[0].claimed)
        this.bind(stream, eligible[0]);
    }
    async matches(prefix, blob) {
      const bytes = new Uint8Array(await blob.slice(0, prefix.length).arrayBuffer());
      return bytes.length === prefix.length && bytes.every((byte, index) => byte === prefix[index]);
    }
    bind(stream, request) {
      stream.request = request;
      request.claimed = true;
      request.promise.then(async (blob) => {
        if (stream.settled)
          return;
        if (stream.prefix.length && !await this.matches(stream.prefix, blob))
          throw new Error("Audio stream mismatch");
        stream.settled = true;
        stream.resolve(blob);
      }).catch((error) => {
        stream.settled = true;
        stream.reject(error);
      });
    }
    has(url) {
      return this.urls.has(url);
    }
    retain(url) {
      const stream = this.urls.get(url);
      if (!stream)
        return;
      stream.active = true;
      if (!stream.request) {
        const eligible = stream.candidates.filter((request) => !request.claimed);
        if (eligible.length === 1)
          this.bind(stream, eligible[0]);
        else if (stream.prefix.length >= 1024)
          this.match(stream);
      }
      return stream.promise;
    }
    releaseRequest(request) {
      clearTimeout(request.timer);
      request.controller.abort();
      request.reject(new Error("Audio session replaced"));
      this.requests.delete(request);
    }
    clearExcept(url = "") {
      const keep = this.urls.get(url);
      for (const request of this.requests)
        if (request !== keep?.request && !keep?.candidates.includes(request))
          this.releaseRequest(request);
      for (const [source, stream] of this.sources)
        if (stream !== keep) {
          stream.settled = true;
          stream.reject(new Error("Audio session replaced"));
          this.sources.delete(source);
        }
      for (const [key, stream] of this.urls)
        if (stream !== keep)
          this.urls.delete(key);
    }
  }

  // src/shared/visibility.ts
  function floatingVisibility(hidden, mode, session, expanded) {
    const hideAll = hidden && mode === "all";
    return { player: !hideAll && expanded, launcher: !hideAll && !expanded && (!hidden || session) };
  }

  // src/content/content.ts
  var standalone3 = true;
  (function() {
    const PAGE = typeof window !== "undefined" ? window : globalThis;
    const CONFIG = {
      tapSeekSeconds: 10,
      speeds: SPEED_PRESETS,
      defaultSpeed: 1,
      defaultVolume: 1,
      speedStorage: STORAGE_KEYS.SPEED,
      volumeStorage: STORAGE_KEYS.VOLUME,
      settingsStorage: STORAGE_KEYS.SETTINGS,
      debug: false
    };
    const CHATGPT_THEME_KEYS = ["blue", "green", "purple", "orange", "pink", "yellow", "black"];
    let activeMedia = null;
    let settingsCache = null;
    let commandBindings = {};
    let playerLayout = null;
    const readyToast = new ReadyToast;
    if (standalone3) {
      try {
        settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}") };
      } catch {
        settingsCache = { ...DEFAULT_SETTINGS };
      }
    }
    let sessionSpeed = null;
    let sessionVolume = null;
    const mediaListenersInstalled = new WeakSet;
    let userForcedExpand = false;
    let userForcedCollapsed = false;
    let leftRail = null;
    let rightRail = null;
    let floatingToggle = null;
    let seekSlider = null;
    let currentLabel = null;
    let durationLabel = null;
    let playButton = null;
    let speedButton = null;
    let speedMenu = null;
    let volumeWrap = null;
    let volumeSlider = null;
    let volumeLabel = null;
    let downloadButton = null;
    let sliderDragging = false;
    const MAX_BLOB_MAP_ENTRIES = 4;
    const MAX_BLOB_MAP_BYTES = 64 * 1024 * 1024;
    const blobURLMap = new Map;
    let blobURLBytes = 0;
    function removeBlobURL(url) {
      const blob = blobURLMap.get(url);
      if (!blob)
        return;
      blobURLBytes -= blob.size;
      blobURLMap.delete(url);
    }
    function pruneBlobMap() {
      while (blobURLMap.size > MAX_BLOB_MAP_ENTRIES || blobURLBytes > MAX_BLOB_MAP_BYTES) {
        const firstEntry = blobURLMap.entries().next().value;
        if (!firstEntry)
          break;
        removeBlobURL(firstEntry[0]);
      }
    }
    function rememberBlobURL(url, blob) {
      removeBlobURL(url);
      blobURLMap.set(url, blob);
      blobURLBytes += blob.size;
      pruneBlobMap();
    }
    const cache = {
      currentTimeStr: "",
      durationStr: "",
      isPaused: true,
      speed: 1,
      volume: 1,
      isMuted: false,
      controlsEnabled: false,
      leftWidth: "",
      leftX: "",
      leftY: "",
      rightX: "",
      rightY: "",
      isCollapsed: true,
      floatingHidden: false,
      lastBroadcast: 0,
      lastThemeCheck: ""
    };
    function log(...args) {
      if (CONFIG.debug) {
        console.log("%c[ChatGPT Audio Controls]", "color:#3968c8;font-weight:700", ...args);
      }
    }
    function warn(...args) {
      console.warn("[ChatGPT Audio Controls]", ...args);
    }
    let statusTimer = 0;
    function showStatus(message, error = false) {
      let status = document.getElementById("cgpt-ra-status");
      if (!status) {
        status = document.createElement("div");
        status.id = "cgpt-ra-status";
        status.setAttribute("role", "status");
        document.body.append(status);
      }
      status.dir = languageDirection(settingsCache?.language);
      status.lang = resolveLanguage(settingsCache?.language);
      status.textContent = message;
      status.hidden = false;
      status.dataset.error = String(error);
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => {
        if (status)
          status.hidden = true;
      }, error ? 12000 : 4000);
    }
    function recoveryCopy() {
      return getReleaseCopy(settingsCache?.language);
    }
    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0)
        return "0:00";
      const total = Math.floor(seconds);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor(total % 3600 / 60);
      const secs = total % 60;
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      }
      return `${minutes}:${String(secs).padStart(2, "0")}`;
    }
    function getSavedSpeed() {
      if (sessionSpeed !== null)
        return sessionSpeed;
      const configuredSpeed = Number(settingsCache?.defaultSpeed);
      if (Number.isFinite(configuredSpeed) && configuredSpeed >= 0.25 && configuredSpeed <= 4) {
        return configuredSpeed;
      }
      const n = parseFloat(localStorage.getItem(CONFIG.speedStorage) || "");
      return Number.isFinite(n) && n >= 0.25 && n <= 4 ? n : CONFIG.defaultSpeed;
    }
    function getSavedVolume() {
      if (sessionVolume !== null)
        return sessionVolume;
      const configuredVolume = Number(settingsCache?.defaultVolume);
      if (Number.isFinite(configuredVolume) && configuredVolume >= 0 && configuredVolume <= 1) {
        return configuredVolume;
      }
      const n = parseFloat(localStorage.getItem(CONFIG.volumeStorage) || "");
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : CONFIG.defaultVolume;
    }
    function getSavedSettings() {
      if (settingsCache)
        return settingsCache;
      try {
        const raw = localStorage.getItem(CONFIG.settingsStorage);
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    }
    function getI18n() {
      return getTranslations(settingsCache?.language);
    }
    function applyI18nLabels() {
      const t = getI18n();
      const settings = getSavedSettings();
      const step = settings.tapSeekSeconds || CONFIG.tapSeekSeconds;
      seekSlider?.setAttribute("aria-label", polishCopy(settingsCache?.language).seekPosition);
      for (const el of [leftRail, rightRail, floatingToggle])
        if (el) {
          el.dir = languageDirection(settingsCache?.language);
          el.lang = resolveLanguage(settingsCache?.language);
        }
      if (floatingToggle) {
        floatingToggle.title = t.common.extensionName;
        floatingToggle.setAttribute("aria-label", t.content.tooltips.expand);
      }
      if (rightRail) {
        const backBtn = rightRail.querySelector(".cgpt-ra-back");
        if (backBtn)
          backBtn.title = t.content.tooltips.back.replace("{s}", String(step));
        const playBtn = rightRail.querySelector(".cgpt-ra-play");
        if (playBtn) {
          playBtn.title = platformKeys(t.content.tooltips.playPause);
          playBtn.dataset.defaultTitle = playBtn.title;
        }
        const forwardBtn = rightRail.querySelector(".cgpt-ra-forward");
        if (forwardBtn)
          forwardBtn.title = t.content.tooltips.forward.replace("{s}", String(step));
        const speedBtn = rightRail.querySelector(".cgpt-ra-speed-btn");
        if (speedBtn)
          speedBtn.title = t.content.tooltips.speed;
        const volBtn = rightRail.querySelector(".cgpt-ra-volume-btn");
        if (volBtn)
          volBtn.title = t.content.tooltips.volume;
        const volSlider = rightRail.querySelector(".cgpt-ra-volume-slider");
        if (volSlider)
          volSlider.setAttribute("aria-label", t.content.tooltips.volumeSlider);
        const dlBtn = rightRail.querySelector(".cgpt-ra-download");
        if (dlBtn)
          dlBtn.title = t.content.tooltips.download;
        const helpBtn = rightRail.querySelector(".cgpt-ra-help-wrap .cgpt-ra-icon-btn");
        if (helpBtn)
          helpBtn.title = t.content.tooltips.shortcuts;
        const helpPopover = rightRail.querySelector(".cgpt-ra-popover.cgpt-ra-help");
        if (helpPopover) {
          helpPopover.innerHTML = `
          <div class="cgpt-ra-help-title">${t.content.shortcutsPopover.title}</div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.playPause}</span>
            <span class="cgpt-ra-shortcut-key">Space / K</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.back.replace("{s}", String(step))}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + ←</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.forward.replace("{s}", String(step))}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + →</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.slower}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + ,</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.faster}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + .</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.volumeScroll}</span>
            <span class="cgpt-ra-shortcut-key">${t.content.shortcutsPopover.volumeScrollKey}</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.smoothScrub}</span>
            <span class="cgpt-ra-shortcut-key">${t.content.shortcutsPopover.smoothScrubKey.replace(/{s}/g, String(step))}</span>
          </div>
        `;
          const labels = commandLabels(settingsCache?.language, step);
          for (const command of COMMANDS) {
            const commandRow = document.createElement("div");
            commandRow.className = "cgpt-ra-shortcut-row";
            const label = document.createElement("span");
            label.textContent = labels[command].replace("{s}", String(step));
            const key = document.createElement("span");
            key.className = "cgpt-ra-shortcut-key";
            key.textContent = commandBindings[command] ? platformKeys(commandBindings[command]) : recoveryCopy().unassigned;
            commandRow.append(label, key);
            helpPopover.append(commandRow);
          }
          const scope = document.createElement("p");
          scope.textContent = /Android/i.test(navigator.userAgent) ? featureCopy(settingsCache?.language).desktopShortcuts : recoveryCopy().shortcutScope;
          helpPopover.append(scope);
          const settingsButton = document.createElement("button");
          settingsButton.type = "button";
          settingsButton.textContent = t.popup.header.openOptions;
          settingsButton.onclick = () => dispatchAction("open-settings");
          helpPopover.append(settingsButton);
        }
        const collapseBtn = rightRail.querySelector(".cgpt-ra-collapse-btn");
        if (collapseBtn)
          collapseBtn.title = t.content.tooltips.collapse;
      }
    }
    function installSettingsBridge() {
      window.addEventListener("message", (event) => {
        if (event.source === window && event.data?.source === "chatgpt-audio-controls-settings-bridge" && event.data?.type === "CGPT_RA_COMMAND" && isPlayerCommand(event.data.command) && getSavedSettings().enableShortcuts !== false)
          dispatchAction(event.data.command);
      });
      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "chatgpt-audio-controls-settings-bridge" || event.data?.type !== "CGPT_RA_SETTINGS_UPDATE") {
          return;
        }
        settingsCache = { ...DEFAULT_SETTINGS, ...event.data.settings };
        commandBindings = Object.fromEntries(COMMANDS.map((c) => [c, typeof event.data.commands?.[c] === "string" ? event.data.commands[c].slice(0, 80) : ""]));
        if (!settingsCache.notifyDownloadReady)
          readyToast.clear();
        if (activeMedia) {
          try {
            activeMedia.playbackRate = getSavedSpeed();
            activeMedia.defaultPlaybackRate = getSavedSpeed();
            activeMedia.volume = getSavedVolume();
          } catch (_) {}
        }
        applyI18nLabels();
        updateControls();
        scheduleLayoutSync();
      });
      window.postMessage({
        source: "chatgpt-audio-controls-settings-bridge",
        type: "CGPT_RA_SETTINGS_REQUEST"
      }, "*");
    }
    function parseColorToTheme(colorStr) {
      if (!colorStr)
        return null;
      const str = colorStr.toLowerCase().trim();
      if (str.includes("green") || str === "#10a37f")
        return "green";
      if (str.includes("purple") || str.includes("violet") || str === "#8e55ea")
        return "purple";
      if (str.includes("orange") || str === "#f97316")
        return "orange";
      if (str.includes("pink") || str === "#ec4899")
        return "pink";
      if (str.includes("yellow") || str === "#eab308")
        return "yellow";
      if (str.includes("blue") || str === "#3968c8")
        return "blue";
      const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        if (g > r + 30 && g > b - 10 && g > 110)
          return "green";
        if (b > 140 && r > 90 && g < 130)
          return "purple";
        if (r > 190 && g > 70 && g < 180 && b < 80)
          return "orange";
        if (r > 190 && b > 110 && g < 150)
          return "pink";
        if (r > 170 && g > 140 && b < 80)
          return "yellow";
        if (b > r + 25 && b > g + 5)
          return "blue";
      }
      return null;
    }
    function resolveActiveChatGPTTheme() {
      const attrEl = document.querySelector("[data-chat-theme]");
      const attr = document.documentElement.getAttribute("data-chat-theme") || document.body?.getAttribute("data-chat-theme") || attrEl?.getAttribute("data-chat-theme");
      if (attr && CHATGPT_THEME_KEYS.includes(attr.toLowerCase())) {
        return attr.toLowerCase();
      }
      const classes = `${document.documentElement.className} ${document.body?.className || ""}`.toLowerCase();
      for (const t of ["green", "purple", "orange", "pink", "yellow", "black", "blue"]) {
        if (classes.includes(`theme-${t}`) || classes.includes(`chat-theme-${t}`) || classes.includes(`data-theme-${t}`)) {
          return t;
        }
      }
      const rootStyle = getComputedStyle(document.documentElement);
      const accentRaw = rootStyle.getPropertyValue("--theme-submit-btn-bg").trim() || rootStyle.getPropertyValue("--interactive-bg-accent-secondary-default").trim();
      const fromAccent = parseColorToTheme(accentRaw);
      if (fromAccent)
        return fromAccent;
      const submitBtn = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Voice"], button[data-testid*="submit"]');
      if (submitBtn) {
        const btnStyle = getComputedStyle(submitBtn);
        const fromBtnBg = parseColorToTheme(btnStyle.backgroundColor);
        if (fromBtnBg)
          return fromBtnBg;
        const fromBtnColor = parseColorToTheme(btnStyle.color);
        if (fromBtnColor)
          return fromBtnColor;
      }
      return "blue";
    }
    function detectAndCacheChatGPTTheme() {
      try {
        const isDark = document.documentElement.classList.contains("dark") || !document.documentElement.classList.contains("light");
        const chatTheme = resolveActiveChatGPTTheme();
        const themeKey = `${isDark ? "dark" : "light"}-${chatTheme}`;
        if (cache.lastThemeCheck === themeKey)
          return;
        cache.lastThemeCheck = themeKey;
        const themeCache = {
          isDark,
          chatTheme,
          updatedAt: Date.now()
        };
        localStorage.setItem("cgpt-ra-theme-cache", JSON.stringify(themeCache));
        window.postMessage({
          source: "chatgpt-audio-controls-settings-bridge",
          type: "CGPT_RA_THEME_UPDATE",
          theme: themeCache
        }, "*");
        log("Synchronized ChatGPT Theme:", chatTheme, isDark ? "Dark" : "Light");
      } catch (_) {}
    }
    function broadcastLiveAudioState(force = false) {
      const now = Date.now();
      if (!force && now - cache.lastBroadcast < 500)
        return;
      cache.lastBroadcast = now;
      const isPlaying = playback.playing;
      const current = playback.time;
      const duration = playback.duration;
      const speed = activeMedia?.playbackRate || getSavedSpeed();
      const volume = activeMedia ? activeMedia.volume : getSavedVolume();
      const liveState = {
        hasMedia: Boolean(activeMedia),
        isPlaying,
        currentTime: current,
        duration,
        speed,
        volume,
        isMuted: Boolean(activeMedia?.muted || volume === 0),
        formattedCurrent: formatTime(current),
        formattedDuration: formatTime(duration),
        updatedAt: now
      };
      try {
        localStorage.setItem("cgpt-ra-live-state", JSON.stringify(liveState));
      } catch (_) {}
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        try {
          chrome.storage.local.set({ "cgpt-ra-live-state": liveState });
        } catch (_) {}
      }
    }
    function looksLikeAudio(url, contentType) {
      const u = String(url || "").toLowerCase();
      const type = String(contentType || "").toLowerCase();
      return type.startsWith("audio/") || type.includes("application/ogg") || type.includes("application/octet-stream") && /(audio|speech|voice|tts|synth)/.test(u) || /\.(mp3|m4a|aac|wav|ogg|opus|webm)(?:$|\?)/i.test(u) || /(read.?aloud|text.?to.?speech|tts|synthesi[sz]e|speech)/i.test(u);
    }
    function rememberAudioBlob(blob, sourceURL = "") {
      if (blob.size && blob.size <= MAX_BLOB_MAP_BYTES && looksLikeAudio(sourceURL, blob.type))
        rememberBlobURL(sourceURL, blob);
    }
    const retentionFetch = PAGE.fetch.bind(PAGE);
    const streamingAudio = new StreamingAudioCapture;
    async function readAudio(response) {
      if (Number(response.headers.get("content-length")) > MAX_BLOB_MAP_BYTES || !response.body)
        throw new Error("Audio size unsupported");
      const reader = response.body.getReader();
      const parts = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          size += value.byteLength;
          if (size > MAX_BLOB_MAP_BYTES) {
            reader.cancel().catch(() => {});
            throw new Error("Audio size unsupported");
          }
          parts.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      if (!size)
        throw new Error("Empty audio");
      return new Blob(parts, { type: response.headers.get("content-type") || "application/octet-stream" });
    }
    async function retainAudio(source, signal) {
      if (!source)
        throw new Error("No audio source");
      const stream = streamingAudio.retain(source);
      if (stream)
        return stream;
      const cached = blobURLMap.get(source);
      if (cached)
        return cached;
      const response = await retentionFetch(source, { credentials: "include", signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) });
      if (!response.ok)
        throw new Error("Audio unavailable");
      return readAudio(response);
    }
    const supportPrompts = new SupportPrompts(() => ({ language: settingsCache?.language, hidden: getSavedSettings().floatingUiHidden === true, composer: getComposer() }));
    const playback = new PlaybackSession(retainAudio, (media) => {
      activeMedia = media;
      if (media)
        installMediaListeners(media);
      updateControls();
      broadcastLiveAudioState(true);
      scheduleLayoutSync();
    }, () => showStatus(recoveryCopy().playError, true), (ready) => {
      readyToast.clear();
      if (ready && getSavedSettings().notifyDownloadReady !== false)
        readyToast.show(featureCopy(settingsCache?.language).ready, getI18n().content.tooltips.download, recoveryCopy().dismiss, languageDirection(settingsCache?.language), () => void downloadCurrentAudio(), resolveLanguage(settingsCache?.language));
    }, (activity) => supportPrompts.observe(activity));
    window.addEventListener("pagehide", () => {
      playback.dispose();
      activeMedia = null;
      blobURLMap.clear();
      blobURLBytes = 0;
      streamingAudio.clearExcept();
    });
    function installObjectURLInterceptor() {
      try {
        const urlObj = PAGE.URL;
        if (!urlObj || urlObj.__cgptRAObjectURLHook)
          return;
        const originalCreate = urlObj.createObjectURL.bind(urlObj);
        const originalRevoke = urlObj.revokeObjectURL.bind(urlObj);
        urlObj.createObjectURL = function(object) {
          const url = originalCreate(object);
          if (PAGE.MediaSource && object instanceof PAGE.MediaSource)
            streamingAudio.register(object, url);
          try {
            if (object instanceof PAGE.Blob && object.size && looksLikeAudio(url, object.type)) {
              rememberBlobURL(url, object);
              rememberAudioBlob(object, url);
            }
          } catch (_) {}
          return url;
        };
        urlObj.revokeObjectURL = function(url) {
          removeBlobURL(url);
          return originalRevoke(url);
        };
        Object.defineProperty(urlObj, "__cgptRAObjectURLHook", {
          value: true,
          configurable: true
        });
      } catch (error) {
        warn("Object URL interception failed:", error);
      }
    }
    function installFetchInterceptor() {
      try {
        if (!PAGE.fetch || PAGE.fetch.__cgptRAFetchHook)
          return;
        const originalFetch = PAGE.fetch.bind(PAGE);
        async function wrappedFetch(...args) {
          const inputURL = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
          const signal = args[1]?.signal || args[0]?.signal;
          const capture = looksLikeAudio(inputURL, "") && !signal?.aborted ? streamingAudio.begin() : null;
          let response;
          try {
            response = await originalFetch(...capture ? [args[0], { ...args[1], signal: capture.controller.signal }] : args);
          } catch (error) {
            if (capture)
              streamingAudio.complete(capture, Promise.reject(error));
            throw error;
          }
          try {
            const requestURL = typeof args[0] === "string" ? args[0] : args[0]?.url || response.url || "";
            const type = response.headers?.get("content-type") || "";
            if (looksLikeAudio(requestURL, type)) {
              const pending = readAudio(response.clone());
              if (capture)
                streamingAudio.complete(capture, pending);
              pending.catch(() => {});
            } else if (capture)
              streamingAudio.complete(capture, Promise.reject(new Error("Not audio")));
          } catch (_) {}
          return response;
        }
        wrappedFetch.__cgptRAFetchHook = true;
        PAGE.fetch = wrappedFetch;
        log("fetch() audio capture installed");
      } catch (error) {
        warn("fetch interception failed:", error);
      }
    }
    function installStreamingInterceptor() {
      const source = PAGE.MediaSource?.prototype;
      const buffer = PAGE.SourceBuffer?.prototype;
      if (!source || !buffer || source.__cgptRAStreamHook)
        return;
      const add = source.addSourceBuffer, append = buffer.appendBuffer;
      source.addSourceBuffer = function(...args) {
        const result = add.apply(this, args);
        streamingAudio.addBuffer(this, result);
        return result;
      };
      buffer.appendBuffer = function(data) {
        const result = append.call(this, data);
        streamingAudio.append(this, data);
        return result;
      };
      Object.defineProperty(source, "__cgptRAStreamHook", { value: true, configurable: true });
    }
    function installXHRInterceptor() {
      try {
        const proto = PAGE.XMLHttpRequest?.prototype;
        if (!proto || proto.__cgptRAXHRHook)
          return;
        const originalOpen = proto.open;
        const originalSend = proto.send;
        proto.open = function(method, url, ...rest) {
          this.__cgptRAURL = String(url || "");
          return originalOpen.call(this, method, url, ...rest);
        };
        proto.send = function(...args) {
          this.addEventListener("load", () => {
            try {
              const type = this.getResponseHeader("content-type") || "";
              const url = this.responseURL || this.__cgptRAURL || "";
              if (!looksLikeAudio(url, type))
                return;
              if (this.response instanceof PAGE.Blob) {
                rememberAudioBlob(this.response, url);
              } else if (this.response instanceof PAGE.ArrayBuffer) {
                rememberAudioBlob(new Blob([this.response], { type }), url);
              }
            } catch (_) {}
          }, { once: true });
          return originalSend.apply(this, args);
        };
        Object.defineProperty(proto, "__cgptRAXHRHook", {
          value: true,
          configurable: true
        });
      } catch (error) {
        warn("XHR interception failed:", error);
      }
    }
    function getSeekInfo(media = activeMedia) {
      if (!media)
        return { start: 0, end: 0, seekable: false };
      try {
        if (playback.isOwned(media) && playback.duration > 0)
          return { start: 0, end: playback.duration, seekable: true };
        if (Number.isFinite(media.duration) && media.duration > 0) {
          return { start: 0, end: media.duration, seekable: true };
        }
        if (media.seekable?.length) {
          return {
            start: media.seekable.start(0),
            end: media.seekable.end(media.seekable.length - 1),
            seekable: true
          };
        }
        if (media.buffered?.length) {
          return {
            start: 0,
            end: media.buffered.end(media.buffered.length - 1),
            seekable: true
          };
        }
      } catch (_) {}
      return { start: 0, end: 0, seekable: false };
    }
    function isReadAloudMedia(media) {
      if (media.tagName !== "AUDIO")
        return false;
      const source = media.src || media.currentSrc || "";
      return blobURLMap.has(source) || streamingAudio.has(source) || looksLikeAudio(source, "");
    }
    function attachMedia(media, reason = "detected") {
      if (!media || playback.isOwned(media) || typeof media.play !== "function" || !isReadAloudMedia(media))
        return;
      const source = media.src || media.currentSrc;
      const changed = activeMedia !== media || playback.url !== source;
      playback.attach(media);
      if (changed) {
        streamingAudio.clearExcept(source);
        for (const url of blobURLMap.keys())
          if (url !== source)
            removeBlobURL(url);
      }
      activeMedia = media;
      if (changed) {
        userForcedExpand = true;
        userForcedCollapsed = false;
      }
      if (changed) {
        try {
          media.playbackRate = getSavedSpeed();
          media.defaultPlaybackRate = getSavedSpeed();
          media.volume = getSavedVolume();
        } catch (_) {}
      }
      if (changed)
        installMediaListeners(media);
      setControlsEnabled(true);
      updateControls();
      broadcastLiveAudioState(true);
      scheduleLayoutSync();
      log("Attached media:", reason, media);
    }
    function installMediaListeners(media) {
      if (mediaListenersInstalled.has(media))
        return;
      mediaListenersInstalled.add(media);
      [
        "loadedmetadata",
        "durationchange",
        "timeupdate",
        "ratechange",
        "volumechange",
        "play",
        "pause",
        "ended",
        "canplay"
      ].forEach((name) => {
        media.addEventListener(name, () => {
          if (activeMedia === media) {
            updateControls();
            broadcastLiveAudioState();
            if (name === "play" || name === "pause" || name === "ended") {
              scheduleLayoutSync();
            }
          }
        });
      });
    }
    function installMediaInterceptor() {
      try {
        const proto = PAGE.HTMLMediaElement?.prototype;
        if (!proto || proto.__cgptRAV4Hook)
          return;
        const originalPlay = proto.play;
        const originalPause = proto.pause;
        proto.play = function(...args) {
          const isReadAloud = !playback.isOwned(this) && isReadAloudMedia(this);
          if (isReadAloud)
            attachMedia(this, "play() intercepted");
          const result = originalPlay.apply(this, args);
          queueMicrotask(() => {
            try {
              if (!isReadAloud)
                return;
              this.playbackRate = getSavedSpeed();
              this.defaultPlaybackRate = getSavedSpeed();
              this.volume = getSavedVolume();
            } catch (_) {}
            updateControls();
            broadcastLiveAudioState(true);
          });
          return result;
        };
        proto.pause = function(...args) {
          const result = originalPause.apply(this, args);
          if (this === activeMedia) {
            queueMicrotask(() => {
              updateControls();
              broadcastLiveAudioState(true);
              scheduleLayoutSync();
            });
          }
          return result;
        };
        Object.defineProperty(proto, "__cgptRAV4Hook", {
          value: true,
          configurable: true
        });
        log("HTMLMediaElement hook installed");
      } catch (error) {
        warn("Media hook failed:", error);
      }
    }
    function buildUI() {
      if (leftRail || !document.body)
        return;
      floatingToggle = document.createElement("button");
      floatingToggle.id = "cgpt-ra-floating-toggle";
      floatingToggle.type = "button";
      floatingToggle.innerHTML = getLucideSvg("chevron-up");
      floatingToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCollapsed();
      });
      leftRail = document.createElement("div");
      leftRail.id = "cgpt-ra-left";
      leftRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";
      leftRail.innerHTML = `
      <div class="cgpt-ra-progress-row">
        <span class="cgpt-ra-time">
          <span class="cgpt-ra-current">0:00</span>/<span class="cgpt-ra-duration">0:00</span>
        </span>

        <div class="cgpt-ra-seek-wrap">
          <input class="cgpt-ra-range cgpt-ra-seek-slider cgpt-ra-media-control"
                 type="range" min="0" max="100" step="0.01" value="0" disabled>
        </div>
      </div>
    `;
      rightRail = document.createElement("div");
      rightRail.id = "cgpt-ra-right";
      rightRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";
      rightRail.innerHTML = `
      <div class="cgpt-ra-transport-row cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-back cgpt-ra-media-control"
                disabled>
          ${getLucideSvg("rotate-ccw")}
          <span class="cgpt-ra-ten">10</span>
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                disabled>
          ${getLucideSvg("play")}
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                disabled>
          ${getLucideSvg("rotate-cw")}
          <span class="cgpt-ra-ten">10</span>
        </button>
      </div>

      <div class="cgpt-ra-speed-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-speed-btn" disabled>
          ${getSavedSpeed()}×
        </button>
        <div class="cgpt-ra-popover cgpt-ra-speed-menu"></div>
      </div>

      <div class="cgpt-ra-volume-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-volume-btn" disabled>
          ${getLucideSvg("volume-2")}
        </button>
        <div class="cgpt-ra-volume-popover">
          <input class="cgpt-ra-range cgpt-ra-volume-slider"
                 type="range" min="0" max="1" step="0.01"
                 value="${getSavedVolume()}">
          <span class="cgpt-ra-volume-value">${Math.round(getSavedVolume() * 100)}%</span>
        </div>
      </div>

      <button class="cgpt-ra-icon-btn cgpt-ra-download cgpt-ra-media-control"
              disabled>
        ${getLucideSvg("download")}
      </button>

      <div class="cgpt-ra-help-wrap">
        <button class="cgpt-ra-icon-btn">
          ${getLucideSvg("circle-help")}
        </button>
        <div class="cgpt-ra-popover cgpt-ra-help"></div>
      </div>

    `;
      document.body.append(floatingToggle, leftRail, rightRail);
      playerLayout = new PlayerLayout(leftRail, rightRail, floatingToggle, scheduleLayoutSync, () => showStatus(recoveryCopy().savedError, true), () => settingsCache?.language);
      seekSlider = leftRail.querySelector(".cgpt-ra-seek-slider");
      currentLabel = leftRail.querySelector(".cgpt-ra-current");
      durationLabel = leftRail.querySelector(".cgpt-ra-duration");
      playButton = rightRail.querySelector(".cgpt-ra-play");
      speedButton = rightRail.querySelector(".cgpt-ra-speed-btn");
      speedMenu = rightRail.querySelector(".cgpt-ra-speed-menu");
      volumeWrap = rightRail.querySelector(".cgpt-ra-volume-wrap");
      volumeSlider = rightRail.querySelector(".cgpt-ra-volume-slider");
      volumeLabel = rightRail.querySelector(".cgpt-ra-volume-value");
      downloadButton = rightRail.querySelector(".cgpt-ra-download");
      CONFIG.speeds.forEach((speed) => {
        const item = document.createElement("button");
        item.className = "cgpt-ra-speed-option";
        item.type = "button";
        item.dataset.speed = String(speed);
        item.textContent = `${speed}×`;
        item.addEventListener("click", () => {
          setSpeed(speed);
          rightRail?.querySelector(".cgpt-ra-speed-wrap")?.classList.remove("cgpt-open");
        });
        speedMenu?.appendChild(item);
      });
      speedButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        rightRail?.querySelector(".cgpt-ra-speed-wrap")?.classList.toggle("cgpt-open");
        playerLayout?.positionPopovers();
      });
      document.addEventListener("click", (event) => {
        if (!(event.target instanceof Node) || !rightRail?.contains(event.target)) {
          rightRail?.querySelectorAll(".cgpt-open").forEach((el) => el.classList.remove("cgpt-open"));
          playerLayout?.positionPopovers();
        }
      });
      for (const selector of [".cgpt-ra-help-wrap", ".cgpt-ra-volume-wrap"]) {
        const wrap = rightRail.querySelector(selector);
        wrap?.querySelector("button")?.addEventListener("click", (event) => {
          event.stopPropagation();
          wrap.classList.toggle("cgpt-open");
          playerLayout?.positionPopovers();
        });
      }
      rightRail.addEventListener("click", () => playerLayout?.positionPopovers());
      playButton?.addEventListener("click", togglePlayback);
      installHoldSeek(rightRail.querySelector(".cgpt-ra-back"), -1);
      installHoldSeek(rightRail.querySelector(".cgpt-ra-forward"), 1);
      seekSlider?.addEventListener("pointerdown", () => {
        sliderDragging = true;
      });
      seekSlider?.addEventListener("input", () => {
        if (!activeMedia || !seekSlider || !currentLabel)
          return;
        const target = parseFloat(seekSlider.value);
        seekAbsolute(target, false);
        currentLabel.textContent = formatTime(target);
      });
      const finishSeek = () => {
        if (!sliderDragging || !seekSlider)
          return;
        sliderDragging = false;
        seekAbsolute(parseFloat(seekSlider.value), true);
      };
      seekSlider?.addEventListener("pointerup", finishSeek);
      seekSlider?.addEventListener("pointercancel", finishSeek);
      volumeSlider?.addEventListener("input", () => {
        if (!volumeSlider)
          return;
        setVolume(parseFloat(volumeSlider.value));
      });
      volumeWrap?.addEventListener("wheel", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.05 : -0.05;
        const current = activeMedia ? activeMedia.volume : getSavedVolume();
        setVolume(clamp(current + delta, 0, 1));
      }, { passive: false });
      downloadButton?.addEventListener("click", downloadCurrentAudio);
      applyI18nLabels();
      setControlsEnabled(Boolean(activeMedia));
      detectAndCacheChatGPTTheme();
      syncComposerLayout();
    }
    function setControlsEnabled(enabled) {
      if (!leftRail || !rightRail || cache.controlsEnabled === enabled)
        return;
      cache.controlsEnabled = enabled;
      leftRail.classList.toggle("cgpt-ra-no-media", !enabled);
      rightRail.classList.toggle("cgpt-ra-no-media", !enabled);
      leftRail.querySelectorAll("input").forEach((el) => {
        el.disabled = !enabled;
      });
      rightRail.querySelectorAll(".cgpt-ra-transport-row button, .cgpt-ra-speed-btn, .cgpt-ra-volume-btn, .cgpt-ra-volume-slider, .cgpt-ra-download").forEach((el) => {
        el.disabled = !enabled;
      });
      const helpButton = rightRail.querySelector(".cgpt-ra-help-wrap > button");
      if (helpButton)
        helpButton.disabled = false;
    }
    let layoutRaf = null;
    function scheduleLayoutSync() {
      if (layoutRaf)
        return;
      layoutRaf = requestAnimationFrame(() => {
        layoutRaf = null;
        syncComposerLayout();
      });
    }
    let observedComposer = null;
    const composerObserver = new ResizeObserver(scheduleLayoutSync);
    const composerAttributes = new MutationObserver(scheduleLayoutSync);
    let conversationPath = location.pathname;
    function getComposer() {
      const candidates = document.querySelectorAll('[data-chatgpt-composer], [data-type="unified-composer"]');
      const composer = Array.from(candidates).find((el) => el.getBoundingClientRect().height > 0 && el.querySelector('[data-composer-markdown], #prompt-textarea, [data-testid="composer-text-input"], .ProseMirror[contenteditable="true"], [aria-label="Ask ChatGPT"]'));
      const isComposerEditor = (el) => !el.closest('article, [data-message-author-role], [data-testid^="conversation-turn"], [data-writing-block]') && el.getBoundingClientRect().height > 0;
      const editor = Array.from(document.querySelectorAll('.ProseMirror[contenteditable="true"][aria-label="Ask ChatGPT"]')).find(isComposerEditor);
      if (editor) {
        for (let parent = editor.parentElement;parent && parent !== document.body; parent = parent.parentElement) {
          const style = getComputedStyle(parent), r = parent.getBoundingClientRect();
          if (r.width > 180 && (parent.classList.contains("cgpt-ra-composer-joined") || parseFloat(style.borderTopLeftRadius) >= 12) && style.backgroundColor !== "rgba(0, 0, 0, 0)")
            return parent;
        }
      }
      if (composer)
        return composer;
      const prompt = Array.from(document.querySelectorAll('#prompt-textarea, [data-testid="composer-text-input"], .ProseMirror[contenteditable="true"], [aria-label="Ask ChatGPT"], textarea[placeholder*="Ask"]')).find(isComposerEditor);
      return prompt?.closest("form") || prompt?.parentElement || null;
    }
    function syncComposerLayout() {
      if (!leftRail || !rightRail || !floatingToggle)
        return;
      if (location.pathname !== conversationPath) {
        conversationPath = location.pathname;
        playback.dispose();
        activeMedia = null;
        userForcedExpand = false;
        streamingAudio.clearExcept();
        blobURLMap.clear();
        blobURLBytes = 0;
        updateControls();
      }
      const composer = getComposer();
      if (composer !== observedComposer) {
        composerObserver.disconnect();
        composerAttributes.disconnect();
        observedComposer = composer;
        for (let parent = composer;parent; parent = parent.parentElement) {
          composerObserver.observe(parent);
          composerAttributes.observe(parent, { attributes: true, attributeFilter: ["class", "style", "hidden", "data-state"] });
        }
      }
      const settings = getSavedSettings();
      const hasSession = Boolean(activeMedia && !activeMedia.ended);
      const shouldExpand = !userForcedCollapsed && (hasSession || userForcedExpand);
      const visible = floatingVisibility(Boolean(settings.floatingUiHidden), settings.floatingUiHideMode || "idle-only", hasSession, shouldExpand);
      leftRail.classList.toggle("cgpt-ra-collapsed", !visible.player);
      rightRail.classList.toggle("cgpt-ra-collapsed", !visible.player);
      floatingToggle.classList.toggle("cgpt-ra-hidden", !(visible.launcher || visible.player));
      floatingToggle.setAttribute("aria-expanded", String(visible.player));
      floatingToggle.setAttribute("aria-label", visible.player ? getI18n().content.tooltips.collapse : getI18n().content.tooltips.expand);
      cache.isCollapsed = !visible.player;
      cache.floatingHidden = !visible.launcher;
      playerLayout?.sync(composer, visible.player);
    }
    function installHoldSeek(button, direction) {
      if (!button)
        return;
      let holding = false;
      let holdStarted = 0;
      let lastFrame = 0;
      let becameHold = false;
      let smoothScrubbingEnabled = true;
      let raf = null;
      let pointerId = null;
      const frame = (now) => {
        if (!holding)
          return;
        if (!smoothScrubbingEnabled)
          return;
        const heldFor = (now - holdStarted) / 1000;
        if (heldFor < 0.28) {
          raf = requestAnimationFrame(frame);
          return;
        }
        becameHold = true;
        if (!lastFrame)
          lastFrame = now;
        const dt = Math.max(0, (now - lastFrame) / 1000);
        lastFrame = now;
        let seekRate;
        if (heldFor < 1.5)
          seekRate = 4;
        else if (heldFor < 3)
          seekRate = 10;
        else if (heldFor < 6)
          seekRate = 25;
        else
          seekRate = 50;
        seekRelative(direction * seekRate * dt, false);
        updateControls();
        raf = requestAnimationFrame(frame);
      };
      button.addEventListener("pointerdown", (event) => {
        if (button.disabled || event.button !== 0)
          return;
        event.preventDefault();
        holding = true;
        pointerId = event.pointerId;
        becameHold = false;
        smoothScrubbingEnabled = getSavedSettings().smoothScrubbing !== false;
        holdStarted = performance.now();
        lastFrame = 0;
        try {
          button.setPointerCapture(event.pointerId);
        } catch (_) {}
        raf = requestAnimationFrame(frame);
      });
      const stop = (event) => {
        if (!holding)
          return;
        if (event.pointerId !== pointerId)
          return;
        holding = false;
        if (raf)
          cancelAnimationFrame(raf);
        if (!becameHold) {
          const step = getSavedSettings().tapSeekSeconds || CONFIG.tapSeekSeconds;
          seekRelative(direction * step);
        }
        try {
          if (pointerId !== null && button.hasPointerCapture(pointerId)) {
            button.releasePointerCapture(pointerId);
          }
        } catch (_) {}
        pointerId = null;
      };
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    }
    function seekAbsolute(target, update = true) {
      if (!activeMedia)
        return;
      const info = getSeekInfo(activeMedia);
      if (!info.seekable)
        return;
      target = clamp(target, info.start, info.end);
      try {
        playback.seek(target);
      } catch (error) {
        warn("Seek failed:", error);
      }
      if (update)
        updateControls();
    }
    function seekRelative(seconds, update = true) {
      if (!activeMedia)
        return;
      seekAbsolute(playback.time + seconds, update);
    }
    function togglePlayback() {
      playback.toggle();
      updateControls();
      broadcastLiveAudioState(true);
      scheduleLayoutSync();
    }
    function setSpeed(speed) {
      if (!Number.isFinite(speed) || speed <= 0)
        return;
      sessionSpeed = speed;
      localStorage.setItem(CONFIG.speedStorage, String(speed));
      if (activeMedia) {
        try {
          activeMedia.playbackRate = speed;
          activeMedia.defaultPlaybackRate = speed;
        } catch (_) {}
      }
      updateControls();
      broadcastLiveAudioState(true);
    }
    function setVolume(volume) {
      volume = clamp(volume, 0, 1);
      sessionVolume = volume;
      localStorage.setItem(CONFIG.volumeStorage, String(volume));
      if (activeMedia) {
        try {
          activeMedia.volume = volume;
          activeMedia.muted = false;
        } catch (_) {}
      }
      updateControls();
      broadcastLiveAudioState(true);
    }
    function updateControls() {
      if (!leftRail || !rightRail)
        return;
      if (!activeMedia) {
        setControlsEnabled(false);
        return;
      }
      setControlsEnabled(true);
      const current = playback.time;
      const info = getSeekInfo(activeMedia);
      const formattedCur = formatTime(current);
      if (currentLabel && cache.currentTimeStr !== formattedCur) {
        cache.currentTimeStr = formattedCur;
        currentLabel.textContent = formattedCur;
      }
      const durationNum = Number.isFinite(playback.duration) ? playback.duration : info.seekable ? info.end : 0;
      const formattedDur = durationNum > 0 ? formatTime(durationNum) : "--:--";
      if (durationLabel && cache.durationStr !== formattedDur) {
        cache.durationStr = formattedDur;
        durationLabel.textContent = formattedDur;
      }
      if (seekSlider) {
        if (info.seekable) {
          if (seekSlider.disabled)
            seekSlider.disabled = false;
          seekSlider.min = String(info.start);
          seekSlider.max = String(info.end);
          if (!sliderDragging) {
            seekSlider.value = String(clamp(current, info.start, info.end));
          }
        } else if (!seekSlider.disabled) {
          seekSlider.disabled = true;
        }
      }
      const isPaused = playback.paused;
      playButton?.setAttribute("aria-busy", String(playback.loading));
      playButton?.classList.toggle("cgpt-ra-buffering", playback.loading);
      if (playButton) {
        playButton.dataset.defaultTitle ||= playButton.title;
        playButton.title = playback.loading ? recoveryCopy().pending : playButton.dataset.defaultTitle;
        playButton.setAttribute("aria-label", playButton.title);
      }
      if (cache.isPaused !== isPaused) {
        cache.isPaused = isPaused;
        setIcon(playButton, isPaused ? "play" : "pause");
      }
      const speed = activeMedia.playbackRate || getSavedSpeed();
      if (cache.speed !== speed) {
        cache.speed = speed;
        if (speedButton)
          speedButton.textContent = `${speed}×`;
        speedMenu?.querySelectorAll(".cgpt-ra-speed-option").forEach((item) => {
          item.classList.toggle("cgpt-selected", Math.abs(parseFloat(item.dataset.speed || "0") - speed) < 0.001);
        });
      }
      const volume = activeMedia.volume;
      const isMuted = activeMedia.muted || volume <= 0;
      if (cache.volume !== volume || cache.isMuted !== isMuted) {
        cache.volume = volume;
        cache.isMuted = isMuted;
        if (volumeSlider)
          volumeSlider.value = String(volume);
        if (volumeLabel)
          volumeLabel.textContent = `${Math.round((isMuted ? 0 : volume) * 100)}%`;
        const volumeButton = rightRail.querySelector(".cgpt-ra-volume-btn");
        if (isMuted) {
          setIcon(volumeButton, "volume-x");
        } else if (volume < 0.5) {
          setIcon(volumeButton, "volume-1");
        } else {
          setIcon(volumeButton, "volume-2");
        }
      }
    }
    function extensionFor(mime, url = "") {
      const type = String(mime || "").toLowerCase();
      if (type.includes("mpeg"))
        return "mp3";
      if (type.includes("mp4") || type.includes("m4a") || type.includes("aac"))
        return "m4a";
      if (type.includes("wav"))
        return "wav";
      if (type.includes("ogg") || type.includes("opus"))
        return "ogg";
      if (type.includes("webm"))
        return "webm";
      const match = String(url).match(/\.(mp3|m4a|aac|wav|ogg|opus|webm)(?:$|\?)/i);
      return match ? match[1].toLowerCase() : "mp3";
    }
    async function resolveDownloadBlob() {
      const blob = await playback.blob();
      return { blob, mime: blob.type, url: activeMedia?.currentSrc || activeMedia?.src || "" };
    }
    async function downloadCurrentAudio() {
      if (!activeMedia || !downloadButton)
        return;
      showStatus(recoveryCopy().downloading);
      downloadButton.setAttribute("disabled", "true");
      downloadButton.classList.add("cgpt-ra-download-busy");
      setIcon(downloadButton, "loader-circle");
      try {
        const { blob, mime, url } = await resolveDownloadBlob();
        const ext = extensionFor(mime || blob.type, url);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `chatgpt-read-aloud-${timestamp}.${ext}`;
        const objectURL = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectURL;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectURL), 5000);
        log("Downloaded audio:", filename, blob.size, mime);
      } catch (error) {
        warn("Download failed:", error);
        showStatus(recoveryCopy().downloadError, true);
      } finally {
        downloadButton.classList.remove("cgpt-ra-download-busy");
        downloadButton.removeAttribute("disabled");
        setIcon(downloadButton, "download");
      }
    }
    window.addEventListener("keydown", (event) => {
      const settings = getSavedSettings();
      if (settings.enableShortcuts === false)
        return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches("input, textarea, select, [contenteditable='true']") || target?.isContentEditable || target?.closest("button, a, input, textarea, select, [role='button']")) {
        return;
      }
      if (!activeMedia)
        return;
      const action = playbackAction(event);
      if (!action || Object.values(commandBindings).some((binding) => binding && matchesShortcut(event, binding)))
        return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "play") {
        event.stopImmediatePropagation();
        if (event.repeat)
          return;
      }
      const names = { play: "play-pause", back: "seek-back", forward: "seek-forward", slower: "speed-decrease", faster: "speed-increase" };
      dispatchAction(names[action]);
    }, true);
    function toggleCollapsed() {
      const expanded = !cache.isCollapsed;
      userForcedExpand = !expanded;
      userForcedCollapsed = expanded;
      scheduleLayoutSync();
    }
    function dispatchAction(command) {
      const step = getSavedSettings().tapSeekSeconds || CONFIG.tapSeekSeconds;
      if (command === "toggle-collapse")
        return toggleCollapsed();
      if (command === "reset-layout") {
        playerLayout?.reset();
        return;
      }
      if (command === "open-help") {
        userForcedExpand = true;
        userForcedCollapsed = false;
        rightRail?.querySelector(".cgpt-ra-help-wrap")?.classList.toggle("cgpt-open");
        scheduleLayoutSync();
        return;
      }
      if (command === "open-settings") {
        window.postMessage({ source: "chatgpt-audio-controls-settings-bridge", type: "CGPT_RA_OPEN_SETTINGS" }, "*");
        if (standalone3)
          openStandaloneSettings(settingsCache || DEFAULT_SETTINGS, (value) => {
            settingsCache = value;
            readyToast.clear();
            applyI18nLabels();
            scheduleLayoutSync();
          });
        return;
      }
      if (!activeMedia)
        return;
      if (command === "play-pause")
        togglePlayback();
      if (command === "seek-back")
        seekRelative(-step);
      if (command === "seek-forward")
        seekRelative(step);
      if (command === "speed-decrease")
        changeSpeed(-1);
      if (command === "speed-increase")
        changeSpeed(1);
      if (command === "speed-reset")
        setSpeed(1);
      if (command === "volume-increase")
        setVolume(clamp(activeMedia.volume + 0.05, 0, 1));
      if (command === "volume-decrease")
        setVolume(clamp(activeMedia.volume - 0.05, 0, 1));
      if (command === "toggle-mute") {
        activeMedia.muted = !activeMedia.muted;
        updateControls();
      }
      if (command === "download-audio")
        downloadCurrentAudio();
    }
    function changeSpeed(direction) {
      const current = activeMedia?.playbackRate || getSavedSpeed();
      let closestIndex = 0;
      let closestDistance = Infinity;
      CONFIG.speeds.forEach((speed, index) => {
        const distance = Math.abs(speed - current);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      const next = clamp(closestIndex + direction, 0, CONFIG.speeds.length - 1);
      setSpeed(CONFIG.speeds[next]);
    }
    function scanDOMForPlayingMedia() {
      document.querySelectorAll("audio, video").forEach((media) => {
        if (!media.paused && !media.ended && isReadAloudMedia(media)) {
          attachMedia(media, "DOM fallback");
        }
      });
    }
    let observerTimeout = null;
    let themeTimeout = null;
    function scheduleThemeSync() {
      if (themeTimeout)
        return;
      themeTimeout = window.setTimeout(() => {
        themeTimeout = null;
        detectAndCacheChatGPTTheme();
      }, 250);
    }
    function startObserver() {
      const observer = new MutationObserver(() => {
        if (observerTimeout)
          return;
        observerTimeout = window.setTimeout(() => {
          observerTimeout = null;
          scheduleLayoutSync();
        }, 500);
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      const themeObserver = new MutationObserver(scheduleThemeSync);
      const themeAttributes = ["class", "data-theme", "data-chat-theme", "style"];
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: themeAttributes
      });
      if (document.body) {
        themeObserver.observe(document.body, {
          attributes: true,
          attributeFilter: themeAttributes
        });
      }
      window.addEventListener("resize", scheduleLayoutSync, { passive: true });
      window.visualViewport?.addEventListener("resize", scheduleLayoutSync, { passive: true });
      window.visualViewport?.addEventListener("scroll", scheduleLayoutSync, { passive: true });
      window.addEventListener("scroll", scheduleLayoutSync, { passive: true });
      window.setInterval(() => {
        scanDOMForPlayingMedia();
        scheduleThemeSync();
        scheduleLayoutSync();
      }, 5000);
    }
    function installEarlyHooks() {
      installStreamingInterceptor();
      installObjectURLInterceptor();
      installFetchInterceptor();
      installXHRInterceptor();
      installMediaInterceptor();
    }
    function initUI() {
      if (!document.body) {
        requestAnimationFrame(initUI);
        return;
      }
      installSettingsBridge();
      buildUI();
      startObserver();
      log("ChatGPT Audio Controls Extension Ready");
    }
    installEarlyHooks();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initUI, { once: true });
    } else {
      initUI();
    }
  })();
})();

(function addPlayerStyle(){const root=document.documentElement;if(!root){requestAnimationFrame(addPlayerStyle);return;}const style=document.createElement('style');style.id='cgpt-ra-userscript-style';style.textContent="/*\r\n * ChatGPT Audio Controls Styles\r\n * Extension-owned player styles. Native composer styling is never overridden.\r\n */\r\n\r\n#cgpt-ra-support-prompt,\r\n#cgpt-ra-left,\r\n#cgpt-ra-right,\r\n#cgpt-ra-floating-toggle {\r\n    --cgpt-ra-bg: var(--main-surface-primary, var(--bg-primary, #212121));\r\n    --cgpt-ra-bg-surface: var(--main-surface-secondary, var(--bg-secondary, #303030));\r\n    --cgpt-ra-bg-surface-hover: var(--interactive-bg-secondary-hover, rgba(255, 255, 255, .10));\r\n    --cgpt-ra-border: var(--border-default, rgba(255, 255, 255, .15));\r\n    --cgpt-ra-border-light: var(--border-extra-light, rgba(255, 255, 255, .10));\r\n    --cgpt-ra-text: var(--text-primary, #ffffff);\r\n    --cgpt-ra-muted: var(--text-tertiary, #afafaf);\r\n    --cgpt-ra-disabled: var(--border-extra-light, rgba(255, 255, 255, .28));\r\n    --cgpt-ra-accent: var(--theme-submit-btn-bg, var(--interactive-bg-accent-secondary-default, var(--theme-blue-default, #3a83f7)));\r\n    --cgpt-ra-accent-text: var(--theme-submit-btn-text, var(--interactive-label-primary-default, #ffffff));\r\n}\r\n\r\nhtml.light #cgpt-ra-support-prompt,\r\n[data-theme='light'] #cgpt-ra-support-prompt,\r\nhtml.light #cgpt-ra-left,\r\nhtml.light #cgpt-ra-right,\r\nhtml.light #cgpt-ra-floating-toggle,\r\n[data-theme='light'] #cgpt-ra-left,\r\n[data-theme='light'] #cgpt-ra-right,\r\n[data-theme='light'] #cgpt-ra-floating-toggle {\r\n    --cgpt-ra-bg: var(--main-surface-primary, var(--bg-primary, #ffffff));\r\n    --cgpt-ra-bg-surface: var(--main-surface-secondary, var(--bg-secondary, #f9f9f9));\r\n    --cgpt-ra-bg-surface-hover: var(--interactive-bg-secondary-hover, rgba(0, 0, 0, .07));\r\n    --cgpt-ra-border: var(--border-default, rgba(0, 0, 0, .12));\r\n    --cgpt-ra-border-light: var(--border-extra-light, rgba(0, 0, 0, .08));\r\n    --cgpt-ra-text: var(--text-primary, #0d0d0d);\r\n    --cgpt-ra-muted: var(--text-tertiary, #5d5d5d);\r\n    --cgpt-ra-disabled: var(--border-extra-light, rgba(0, 0, 0, .25));\r\n    --cgpt-ra-accent: var(--theme-submit-btn-bg, var(--interactive-bg-accent-secondary-default, var(--theme-blue-default, #3a83f7)));\r\n    --cgpt-ra-accent-text: var(--theme-submit-btn-text, var(--interactive-label-primary-default, #ffffff));\r\n}\r\n\r\n/*\r\n * ChatGPT defines these theme variables on the [data-chat-theme] subtree.\r\n * Reuse them only on our own elements; no rule here targets native ChatGPT\r\n * controls or writes variables on :root/body.\r\n */\r\n[data-chat-theme='blue'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--blue-theme-submit-btn-bg, #3a83f7);\r\n    --cgpt-ra-accent-text: var(--blue-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='green'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--green-theme-submit-btn-bg, #53b559);\r\n    --cgpt-ra-accent-text: var(--green-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='purple'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--purple-theme-submit-btn-bg, #8952ee);\r\n    --cgpt-ra-accent-text: var(--purple-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='orange'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--orange-theme-submit-btn-bg, #ee7c37);\r\n    --cgpt-ra-accent-text: var(--orange-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='pink'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--pink-theme-submit-btn-bg, #f077af);\r\n    --cgpt-ra-accent-text: var(--pink-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='yellow'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--yellow-theme-submit-btn-bg, #f6c543);\r\n    --cgpt-ra-accent-text: var(--yellow-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='black'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--black-theme-submit-btn-bg, #000000);\r\n    --cgpt-ra-accent-text: var(--black-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n#cgpt-ra-left,\r\n#cgpt-ra-right {\r\n    box-sizing: border-box;\r\n    position: fixed;\r\n    z-index: 9999;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    background: var(--cgpt-ra-bg);\r\n    color: var(--cgpt-ra-text);\r\n    /* Fixed popovers must use the viewport, not a filter-created containing block. */\r\n    backdrop-filter: none;\r\n    -webkit-backdrop-filter: none;\r\n    box-shadow: 0 2px 10px rgba(0, 0, 0, .14);\r\n    opacity: 1 !important;\r\n    transition: opacity .18s ease, visibility .18s ease;\r\n}\r\n\r\n/*\r\n * Fused left player layout (Height 48px, Radius 24px)\r\n */\r\n#cgpt-ra-left {\r\n    min-width: 240px;\r\n    max-width: 430px;\r\n    height: 48px;\r\n    display: block;\r\n    padding: 0 14px;\r\n    border-radius: 24px;\r\n    overflow: visible;\r\n}\r\n\r\n/* Transport controls live in the right rail beside speed/volume controls. */\r\n.cgpt-ra-transport-row {\r\n    position: static;\r\n    z-index: auto;\r\n    height: 36px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    gap: 2px;\r\n    padding: 0;\r\n    margin: 0;\r\n    border: 0;\r\n    border-radius: 0;\r\n    background: transparent;\r\n    box-shadow: none;\r\n}\r\n\r\n.cgpt-ra-transport-row > * {\r\n    position: relative;\r\n    z-index: 1;\r\n}\r\n\r\n/* Buttons in transport row: 36px size, play button 40px primary */\r\n.cgpt-ra-transport-row .cgpt-ra-icon-btn {\r\n    width: 36px;\r\n    height: 36px;\r\n    flex: 0 0 36px;\r\n    border-radius: 50%;\r\n}\r\n\r\n.cgpt-ra-play {\r\n    width: 44px !important;\r\n    height: 44px !important;\r\n    flex: 0 0 44px !important;\r\n    border-radius: 50% !important;\r\n    background-color: var(--cgpt-ra-accent) !important;\r\n    color: var(--cgpt-ra-accent-text) !important;\r\n    box-shadow: none !important;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n}\r\n\r\n.cgpt-ra-play:hover {\r\n    filter: brightness(1.08);\r\n}\r\n\r\n.cgpt-ra-play svg {\r\n    stroke: currentColor;\r\n    fill: currentColor;\r\n}\r\n\r\n.cgpt-ra-seek10 {\r\n    position: relative;\r\n}\r\n\r\n.cgpt-ra-seek10 .cgpt-ra-lucide {\r\n    width: 22px;\r\n    height: 22px;\r\n}\r\n\r\n.cgpt-ra-seek10 .cgpt-ra-ten {\r\n    position: absolute;\r\n    inset: 0;\r\n    display: grid;\r\n    place-items: center;\r\n    padding-top: 2px;\r\n    font-size: 9px;\r\n    font-weight: 700;\r\n    font-family: system-ui, sans-serif;\r\n    pointer-events: none;\r\n}\r\n\r\n.cgpt-ra-progress-row {\r\n    height: 46px;\r\n    display: grid;\r\n    grid-template-columns: 70px minmax(0, 1fr);\r\n    align-items: center;\r\n    gap: 10px;\r\n    padding: 0;\r\n    margin: 0;\r\n    border: 0;\r\n}\r\n\r\n/* Right rail (Height 48px, Radius 24px) */\r\n#cgpt-ra-right {\r\n    width: max-content;\r\n    min-width: 0;\r\n    height: 48px;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    gap: 4px;\r\n    padding: 5px 8px;\r\n    border-radius: 24px;\r\n    white-space: nowrap;\r\n}\r\n\r\n/* Right rail ordering */\r\n.cgpt-ra-speed-wrap { order: 1; }\r\n.cgpt-ra-volume-wrap { order: 2; }\r\n.cgpt-ra-download { order: 3; margin-left: 2px; }\r\n.cgpt-ra-help-wrap { order: 4; margin-left: 2px; }\r\n.cgpt-ra-collapse-btn { order: 5; margin-left: 4px; }\r\n\r\n/* Floating Mini Toggle Button (shown when collapsed / idle) */\r\n#cgpt-ra-floating-toggle {\r\n    box-sizing: border-box;\r\n    position: fixed;\r\n    z-index: 9999;\r\n    width: 42px;\r\n    height: 42px;\r\n    border-radius: 50%;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    background: var(--cgpt-ra-bg);\r\n    color: var(--cgpt-ra-text);\r\n    backdrop-filter: blur(16px);\r\n    -webkit-backdrop-filter: blur(16px);\r\n    box-shadow: 0 2px 8px rgba(0, 0, 0, .14);\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    cursor: pointer;\r\n    padding: 0;\r\n    transition: transform .15s ease, background .15s ease, opacity .15s ease;\r\n}\r\n\r\n#cgpt-ra-floating-toggle:hover {\r\n    transform: scale(1.08);\r\n    border-color: var(--cgpt-ra-accent);\r\n}\r\n\r\n#cgpt-ra-floating-toggle img,\r\n#cgpt-ra-floating-toggle svg {\r\n    width: 24px;\r\n    height: 24px;\r\n    display: block;\r\n}\r\n\r\n#cgpt-ra-floating-toggle.cgpt-ra-hidden {\r\n    display: none !important;\r\n}\r\n\r\n#cgpt-ra-left.cgpt-ra-collapsed,\r\n#cgpt-ra-right.cgpt-ra-collapsed {\r\n    opacity: 0 !important;\r\n    visibility: hidden;\r\n    pointer-events: none !important;\r\n    /* Do not create a containing block for viewport-positioned popovers. */\r\n}\r\n\r\n/* Disabled controls */\r\n#cgpt-ra-left.cgpt-ra-compact {\r\n    min-width: 0;\r\n    box-sizing: border-box;\r\n    border-radius: 24px;\r\n}\r\n#cgpt-ra-right.cgpt-ra-compact {\r\n    min-width: 0;\r\n    box-sizing: border-box;\r\n    height: auto;\r\n    min-height: 48px;\r\n    flex-wrap: wrap;\r\n    justify-content: center;\r\n    border-radius: 24px;\r\n    padding: 5px;\r\n}\r\n#cgpt-ra-status {\r\n    position: fixed;\r\n    z-index: 10001;\r\n    bottom: 16px;\r\n    left: 50%;\r\n    transform: translateX(-50%);\r\n    max-width: min(540px, calc(100vw - 32px));\r\n    padding: 12px 16px;\r\n    border-radius: 10px;\r\n    background: #202938;\r\n    color: #fff;\r\n    box-shadow: 0 2px 12px #0004;\r\n    font: 14px/1.5 system-ui, sans-serif;\r\n}\r\n#cgpt-ra-status[hidden] { display: none; }\r\n\r\n#cgpt-ra-left.cgpt-ra-no-media .cgpt-ra-media-control,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-media-control,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-volume-popover,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-speed-menu {\r\n    pointer-events: none !important;\r\n}\r\n\r\n.cgpt-ra-icon-btn {\r\n    position: relative;\r\n    width: 36px;\r\n    height: 36px;\r\n    flex: 0 0 36px;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: transparent;\r\n    color: inherit;\r\n    cursor: pointer;\r\n    padding: 0;\r\n    font-size: 17px;\r\n    transition: background .12s ease, opacity .12s ease;\r\n}\r\n\r\n.cgpt-ra-icon-btn:hover {\r\n    background: var(--cgpt-ra-bg-surface-hover);\r\n}\r\n\r\n.cgpt-ra-icon-btn:disabled {\r\n    opacity: 0.38;\r\n    cursor: default;\r\n    background: transparent;\r\n}\r\n\r\n.cgpt-ra-lucide {\r\n    display: block;\r\n    width: 19px;\r\n    height: 19px;\r\n    flex: 0 0 19px;\r\n    overflow: visible;\r\n    pointer-events: none;\r\n}\r\n\r\n.cgpt-ra-icon-btn svg {\r\n    stroke: currentColor;\r\n}\r\n\r\n.cgpt-ra-time {\r\n    min-width: 0;\r\n    color: var(--cgpt-ra-muted);\r\n    font-size: 10.5px;\r\n    line-height: 1;\r\n    font-variant-numeric: tabular-nums;\r\n    white-space: nowrap;\r\n    text-align: left;\r\n}\r\n\r\n.cgpt-ra-seek-wrap {\r\n    min-width: 0;\r\n    display: flex;\r\n    align-items: center;\r\n    padding: 0;\r\n}\r\n\r\n/*\r\n * Sleek seeker range track:\r\n * - 2px visual track normally\r\n * - 4px track on hover / focus\r\n */\r\n.cgpt-ra-range {\r\n    -webkit-appearance: none;\r\n    appearance: none;\r\n    width: 100%;\r\n    height: 18px;\r\n    margin: 0;\r\n    padding: 0;\r\n    border: 0;\r\n    outline: 0;\r\n    cursor: pointer;\r\n    color: var(--cgpt-ra-text);\r\n    background: transparent;\r\n}\r\n\r\n.cgpt-ra-range::-webkit-slider-runnable-track {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-border);\r\n    transition: height .12s ease, background .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-webkit-slider-runnable-track,\r\n.cgpt-ra-range:focus-visible::-webkit-slider-runnable-track {\r\n    height: 4px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-webkit-slider-thumb {\r\n    -webkit-appearance: none;\r\n    appearance: none;\r\n    width: 10px;\r\n    height: 10px;\r\n    margin-top: -4px;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: var(--cgpt-ra-text);\r\n    box-shadow: 0 0 0 1px var(--cgpt-ra-bg);\r\n    transition: width .12s ease, height .12s ease, margin-top .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-webkit-slider-thumb,\r\n.cgpt-ra-range:focus-visible::-webkit-slider-thumb {\r\n    width: 11px;\r\n    height: 11px;\r\n    margin-top: -3.5px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-track {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-border);\r\n    transition: height .12s ease, background .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-moz-range-track,\r\n.cgpt-ra-range:focus-visible::-moz-range-track {\r\n    height: 4px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-progress {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-thumb {\r\n    width: 10px;\r\n    height: 10px;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: var(--cgpt-ra-text);\r\n}\r\n\r\n.cgpt-ra-range:disabled {\r\n    opacity: .35;\r\n    cursor: default;\r\n}\r\n\r\n.cgpt-ra-speed-wrap,\r\n.cgpt-ra-volume-wrap,\r\n.cgpt-ra-help-wrap {\r\n    position: relative;\r\n}\r\n\r\n.cgpt-ra-speed-btn {\r\n    width: auto;\r\n    min-width: 48px;\r\n    height: 36px;\r\n    padding: 0 10px;\r\n    border-radius: 18px;\r\n    font-size: 12.5px;\r\n    font-weight: 600;\r\n    font-family: system-ui, sans-serif;\r\n}\r\n\r\n.cgpt-ra-popover {\r\n    position: absolute;\r\n    right: 0;\r\n    bottom: calc(100% + 9px);\r\n    display: none;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    border-radius: 12px;\r\n    background: var(--cgpt-ra-bg-surface);\r\n    color: var(--cgpt-ra-text);\r\n    box-shadow: 0 4px 16px rgba(0, 0, 0, .18);\r\n    overflow: hidden;\r\n    z-index: 10002;\r\n}\r\n\r\n.cgpt-ra-speed-wrap.cgpt-open .cgpt-ra-popover,\r\n.cgpt-ra-help-wrap.cgpt-open .cgpt-ra-popover {\r\n    display: block;\r\n}\r\n\r\n.cgpt-ra-speed-menu {\r\n    min-width: 90px;\r\n    padding: 5px;\r\n}\r\n\r\n.cgpt-ra-speed-option {\r\n    width: 100%;\r\n    height: 30px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border: 0;\r\n    border-radius: 7px;\r\n    background: transparent;\r\n    color: inherit;\r\n    cursor: pointer;\r\n    font-size: 12px;\r\n}\r\n\r\n.cgpt-ra-speed-option:hover,\r\n.cgpt-ra-speed-option.cgpt-selected {\r\n    background: var(--cgpt-ra-bg-surface-hover);\r\n}\r\n\r\n/* Vertical Volume Popover */\r\n.cgpt-ra-volume-popover {\r\n    position: absolute;\r\n    left: 50%;\r\n    bottom: calc(100% + 6px);\r\n    transform: translateX(-50%);\r\n    width: 44px;\r\n    height: 165px;\r\n    display: flex;\r\n    opacity: 0;\r\n    visibility: hidden;\r\n    pointer-events: none;\r\n    flex-direction: column;\r\n    align-items: center;\r\n    justify-content: flex-start;\r\n    gap: 0;\r\n    padding: 6px 5px 6px;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    border-radius: 22px;\r\n    background: var(--cgpt-ra-bg-surface);\r\n    color: var(--cgpt-ra-text);\r\n    box-shadow: 0 4px 16px rgba(0, 0, 0, .18);\r\n    transition: opacity .12s ease, visibility .12s ease;\r\n    z-index: 10002;\r\n}\r\n\r\n.cgpt-ra-volume-wrap.cgpt-open .cgpt-ra-volume-popover {\r\n    opacity: 1;\r\n    visibility: visible;\r\n    pointer-events: auto;\r\n}\r\n\r\n.cgpt-ra-volume-popover input[type=\"range\"] {\r\n    position: absolute;\r\n    top: 56px;\r\n    left: 50%;\r\n    width: 96px;\r\n    height: 18px;\r\n    margin: 0;\r\n    transform: translate(-50%, -50%) rotate(-90deg);\r\n    cursor: pointer;\r\n}\r\n\r\n.cgpt-ra-volume-value {\r\n    position: absolute;\r\n    left: 4px;\r\n    right: 4px;\r\n    bottom: 6px;\r\n    height: 24px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border-top: 1px solid var(--cgpt-ra-border);\r\n    font-size: 9.5px;\r\n    font-weight: 600;\r\n    font-family: system-ui, sans-serif;\r\n    line-height: 1;\r\n    color: inherit;\r\n    opacity: .80;\r\n    text-align: center;\r\n}\r\n\r\n.cgpt-ra-help {\r\n    width: 300px;\r\n    padding: 12px 14px;\r\n    font-family: system-ui, sans-serif;\r\n}\r\n\r\n.cgpt-ra-help-title {\r\n    margin-bottom: 8px;\r\n    font-size: 12px;\r\n    font-weight: 700;\r\n}\r\n\r\n.cgpt-ra-shortcut-row {\r\n    display: flex;\r\n    justify-content: space-between;\r\n    gap: 20px;\r\n    padding: 4px 0;\r\n    font-size: 11px;\r\n}\r\n\r\n.cgpt-ra-shortcut-key {\r\n    color: inherit;\r\n    opacity: .65;\r\n    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\r\n    white-space: nowrap;\r\n}\r\n\r\n.cgpt-ra-download-busy svg {\r\n    animation: cgpt-ra-spin .8s linear infinite;\r\n}\r\n\r\n@keyframes cgpt-ra-spin {\r\n    to { transform: rotate(360deg); }\r\n}\r\n/* Keep Pause available while a retained source is loading. */\r\n.cgpt-ra-buffering { outline: 2px dotted currentColor !important; outline-offset: -3px; }\r\n\r\n\r\n/* Geometry and previews share 48px capsules and 44px interaction targets. */\r\n#cgpt-ra-left, #cgpt-ra-right {\r\n  min-width: 0; max-width: none; min-height: 0; padding: 1px; border-radius: 24px;\r\n  display: flex; gap: 0; align-items: center; box-sizing: border-box;\r\n  backdrop-filter: none; -webkit-backdrop-filter: none;\r\n  box-shadow: 0 1px 5px #0000000d; transition: none;\r\n  font-family: inherit;\r\n}\r\n#cgpt-ra-left .cgpt-ra-progress-row { display: flex; flex: 1; min-width: 0; width: auto; height: 44px; padding: 0 8px 0 0; gap: 8px; }\r\n#cgpt-ra-left .cgpt-ra-time { font-size: 10px; flex-shrink: 0; }\r\n#cgpt-ra-left .cgpt-ra-seek-wrap { flex: 1; min-width: 24px; }\r\n#cgpt-ra-left:not(.cgpt-ra-vertical) .cgpt-ra-seek-slider { height: 44px; }\r\n#cgpt-ra-right .cgpt-ra-transport-row { display: contents; }\r\n#cgpt-ra-right .cgpt-ra-icon-btn, .cgpt-ra-grip {\r\n  width: 44px; height: 44px; min-width: 44px; min-height: 44px; flex: 0 0 44px;\r\n  padding: 10px; box-sizing: border-box; margin: 0;\r\n}\r\n#cgpt-ra-right .cgpt-ra-speed-btn { min-width: 44px; width: 44px; padding: 0; }\r\n#cgpt-ra-right .cgpt-ra-speed-wrap, #cgpt-ra-right .cgpt-ra-volume-wrap, #cgpt-ra-right .cgpt-ra-help-wrap { flex: 0 0 44px; margin: 0; }\r\n#cgpt-ra-right.cgpt-ra-wrap { flex-wrap: wrap; justify-content: center; align-content: center; }\r\n.cgpt-ra-extras { display: contents; }\r\n#cgpt-ra-right .cgpt-ra-more { display: none; }\r\n#cgpt-ra-right.cgpt-ra-compact-dock { flex-wrap: nowrap; }\r\n#cgpt-ra-right.cgpt-ra-compact-dock .cgpt-ra-more { display: grid; place-items: center; }\r\n#cgpt-ra-right.cgpt-ra-compact-dock .cgpt-ra-extras { display: none; position: fixed; width: 192px; padding: 8px; border: 1px solid var(--cgpt-ra-border); border-radius: 16px; background: var(--cgpt-ra-bg); box-shadow: 0 4px 18px #0002; box-sizing: border-box; }\r\n#cgpt-ra-right.cgpt-ra-compact-dock .cgpt-ra-extras.cgpt-open { display: flex; }\r\n#cgpt-ra-left.cgpt-ra-vertical, #cgpt-ra-right.cgpt-ra-vertical { flex-direction: column; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-progress-row { flex-direction: column; height: auto; min-height: 0; width: 44px; padding: 0 0 10px; gap: 6px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-time { font-size: 9px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-seek-wrap { width: 44px; min-height: 0; height: auto; justify-content: center; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-seek-slider { writing-mode: vertical-lr; direction: rtl; height: 100%; width: 44px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range::-webkit-slider-runnable-track { width: 2px; height: 100%; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range::-webkit-slider-thumb { margin-top: 0; margin-left: -4px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range:hover::-webkit-slider-runnable-track { width: 4px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range:hover::-webkit-slider-thumb { margin-left: -3.5px; }\r\n#cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range::-moz-range-track, #cgpt-ra-left.cgpt-ra-vertical .cgpt-ra-range::-moz-range-progress { width: 2px; height: 100%; }\r\n#cgpt-ra-left .cgpt-ra-time, #cgpt-ra-left:not(.cgpt-ra-vertical) .cgpt-ra-seek-slider, .cgpt-ra-shortcut-key { direction: ltr; unicode-bidi: isolate; }\r\n.cgpt-ra-grip { border: 0; background: transparent; color: inherit; border-radius: 50%; cursor: grab; touch-action: none; user-select: none; display: grid; place-items: center; opacity: .45; }\r\n.cgpt-ra-grip svg { width: 16px; height: 16px; }\r\n.cgpt-ra-vertical > .cgpt-ra-grip svg { transform: rotate(90deg); }\r\n.cgpt-ra-grip:hover, .cgpt-ra-grip:focus-visible { opacity: 1; background: var(--cgpt-ra-bg-surface-hover); }\r\n#cgpt-ra-floating-toggle { touch-action: none; cursor: grab; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; backdrop-filter: none; transition: background .15s; box-shadow: 0 1px 5px #0000000d; --cgpt-safe-left: env(safe-area-inset-left, 0px); --cgpt-safe-right: env(safe-area-inset-right, 0px); --cgpt-safe-top: env(safe-area-inset-top, 0px); --cgpt-safe-bottom: env(safe-area-inset-bottom, 0px); }\r\n#cgpt-ra-floating-toggle svg { width: 18px; height: 18px; }\r\n#cgpt-ra-floating-toggle:hover { transform: none; border-color: var(--cgpt-ra-border); background: var(--cgpt-ra-bg-surface-hover); }\r\n#cgpt-ra-left.cgpt-ra-fit-hidden, #cgpt-ra-right.cgpt-ra-fit-hidden { display: none !important; }\r\n#cgpt-ra-right .cgpt-ra-popover, #cgpt-ra-right .cgpt-ra-volume-popover { position: fixed; right: auto; bottom: auto; transform: none; overflow: auto; box-sizing: border-box; }\r\n#cgpt-ra-right .cgpt-ra-help-wrap.cgpt-open .cgpt-ra-popover { display: block; }\r\n#cgpt-ra-right .cgpt-ra-volume-wrap.cgpt-open .cgpt-ra-volume-popover { opacity: 1; visibility: visible; pointer-events: auto; }\r\n#cgpt-ra-right .cgpt-ra-shortcut-row { gap: 8px; flex-wrap: wrap; }\r\n#cgpt-ra-right .cgpt-ra-popover button { min-height: 44px; }\r\n.cgpt-ra-volume-popover input[type=\"range\"] { height: 44px; }\r\n#cgpt-ra-dock { position: fixed; z-index: 9998; pointer-events: none; box-sizing: border-box; border: 1px solid var(--border-light, #8883); border-bottom: 0; border-radius: 28px 28px 0 0; transform-origin: top left; }\r\n#cgpt-ra-dock[hidden] { display: none; }\r\n#cgpt-ra-dock.cgpt-ra-dock-closed { visibility: hidden; }\r\n.cgpt-ra-dock-join { position: fixed; pointer-events: none; transform-origin: top left; }\r\n.cgpt-ra-dock-join[hidden] { display: none; }\r\n.cgpt-ra-dock-join::before, .cgpt-ra-dock-join::after { content: ''; position: absolute; top: 0; background: var(--join-color); }\r\n.cgpt-ra-dock-join::before { left: 0; width: var(--join-left-x); height: var(--join-left-y); mask: radial-gradient(ellipse farthest-side at 100% 100%, transparent 100%, #000 100%); }\r\n.cgpt-ra-dock-join::after { right: 0; width: var(--join-right-x); height: var(--join-right-y); mask: radial-gradient(ellipse farthest-side at 0 100%, transparent 100%, #000 100%); }\r\n.cgpt-ra-dock-join.cgpt-ra-dragging { opacity: .25; will-change: transform; }\r\n.cgpt-ra-drop-target { --cgpt-drop-fill: color-mix(in srgb, var(--main-surface-primary, #212121) 6%, transparent); }\r\n.cgpt-ra-drop-target.cgpt-ra-drop-active { --cgpt-drop-fill: color-mix(in srgb, var(--text-primary, #eee) 12%, transparent); }\r\n#cgpt-ra-left.cgpt-ra-in-dock, #cgpt-ra-right.cgpt-ra-in-dock { background: transparent; border: 0; border-radius: 0; box-shadow: none; }\r\n#cgpt-ra-left.cgpt-ra-in-dock.cgpt-ra-collapsed, #cgpt-ra-right.cgpt-ra-in-dock.cgpt-ra-collapsed { opacity: 1 !important; visibility: hidden; }\r\n#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle { transform-origin: top left; }\r\n#cgpt-ra-left.cgpt-ra-dragging, #cgpt-ra-right.cgpt-ra-dragging, #cgpt-ra-floating-toggle.cgpt-ra-dragging, #cgpt-ra-dock.cgpt-ra-dragging { opacity: .25 !important; will-change: transform; }\r\n#cgpt-ra-drop-targets { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }\r\n.cgpt-ra-drop-shape { position: absolute; box-sizing: border-box; border: 1px dashed var(--text-tertiary, #999); background: color-mix(in srgb, var(--main-surface-primary, #212121) 6%, transparent); opacity: .7; transition: background 120ms, opacity 120ms, border-color 120ms; }\r\n.cgpt-ra-drop-active .cgpt-ra-drop-shape { border: 1px solid var(--text-primary, #eee); opacity: .85; background: color-mix(in srgb, var(--text-primary, #eee) 12%, transparent); }\r\n#cgpt-ra-ready-toast, #cgpt-ra-settings-dialog { color: var(--text-primary, #fff); background: var(--main-surface-primary, #212121); border: 1px solid #888; border-radius: 16px; padding: 14px; font: 14px/1.5 system-ui; box-sizing: border-box; }\r\n#cgpt-ra-ready-toast { position: fixed; top: max(12px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); max-width: calc(100vw - 24px); width: max-content; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; z-index: 2147483645; box-shadow: 0 3px 16px #0005; }\r\n#cgpt-ra-ready-toast button, #cgpt-ra-settings-dialog button, #cgpt-ra-settings-dialog select { min-height: 44px; padding: 8px; border: 1px solid #888; border-radius: 8px; background: transparent; color: inherit; font: inherit; }\r\n#cgpt-ra-settings-dialog { width: min(500px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow: auto; }\r\n#cgpt-ra-settings-dialog label { display: grid; gap: 8px; margin-block: 12px; }\r\n#cgpt-ra-settings-dialog::backdrop { background: #0007; }\r\n\r\n@media (prefers-reduced-motion: reduce) {\r\n  #cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle, .cgpt-ra-drop-shape { transition: none; }\r\n}\r\n\r\n/* One owned stacking context keeps native ChatGPT menus above the player. */\r\n#cgpt-ra-layer { position: fixed; inset: 0; z-index: 10; pointer-events: none; }\r\n#cgpt-ra-layer > :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) { pointer-events: auto; }\r\n#cgpt-ra-floating-toggle.cgpt-ra-logo svg { width: 24px; height: 24px; }\r\n#cgpt-ra-floating-toggle.cgpt-ra-dock-toggle { border: 0; background: transparent; box-shadow: none; border-radius: 0; overflow: visible; }\r\n#cgpt-ra-floating-toggle.cgpt-ra-dock-toggle::before { content: ''; position: absolute; left: 6px; top: var(--toggle-top, 8px); width: 32px; height: 28px; box-sizing: border-box; border: 1px solid transparent; border-radius: 14px; background: transparent; }\r\n#cgpt-ra-floating-toggle.cgpt-ra-dock-toggle svg { position: absolute; width: 18px; height: 18px; left: 13px; top: calc(var(--toggle-top, 8px) + 5px); }\r\n#cgpt-ra-floating-toggle.cgpt-ra-dock-toggle.cgpt-ra-logo::before { border: var(--dock-border-width, 1px) var(--dock-border-style, solid) var(--dock-border, var(--cgpt-ra-border)); border-bottom: 0; box-shadow: var(--dock-shadow, none); clip-path: inset(-8px -8px 0); border-radius: 16px 16px 0 0; background: var(--dock-background, var(--cgpt-ra-bg)); }\r\n#cgpt-ra-floating-toggle.cgpt-ra-dock-toggle:is(:hover, :focus-visible)::before { border-color: var(--dock-border, var(--cgpt-ra-border)); background: var(--cgpt-ra-bg-surface-hover); }\r\n#cgpt-ra-right .cgpt-ra-volume-popover { overflow: hidden; scrollbar-width: none; width: 52px; padding: 6px 3px 32px; }\r\n#cgpt-ra-right .cgpt-ra-volume-popover::-webkit-scrollbar { display: none; }\r\n#cgpt-ra-right .cgpt-ra-volume-popover input[type=range] { position: static; transform: none; writing-mode: vertical-lr; direction: rtl; width: 44px; height: 100%; min-height: 44px; margin: 0; }\r\n.cgpt-ra-volume-popover .cgpt-ra-range::-webkit-slider-runnable-track { width: 2px; height: 100%; }\r\n.cgpt-ra-volume-popover .cgpt-ra-range::-webkit-slider-thumb { margin-top: 0; margin-left: -4px; }\r\n.cgpt-ra-volume-popover .cgpt-ra-range::-moz-range-track { width: 2px; height: 100%; }\r\n#cgpt-ra-ready-toast { padding: 4px 8px 4px 12px; gap: 8px; border-radius: 14px; border-color: #22a06b66; background: #edf9f1; color: #145c36; font-size: 13px; box-shadow: 0 3px 12px #0001; }\r\n#cgpt-ra-ready-toast button { border: 0; font-size: 12px; font-weight: 600; cursor: pointer; }\r\n#cgpt-ra-ready-toast button:hover { background: #16804a12; }\r\n#cgpt-ra-ready-toast button:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }\r\n#cgpt-ra-ready-toast svg { width: 18px; height: 18px; }\r\n#cgpt-ra-ready-toast .cgpt-ra-toast-dismiss { width: 44px; display: grid; place-items: center; }\r\n.cgpt-ra-toast-success { display: flex; }\r\nhtml.dark #cgpt-ra-ready-toast, [data-theme=dark] #cgpt-ra-ready-toast { background: #142d22; color: #b6e8c8; }\r\n\r\n#cgpt-ra-settings-dialog .cgpt-ra-danger { color: #cf3434; border-color: #cf343466; }\r\n#cgpt-ra-settings-dialog .cgpt-ra-danger:hover { background: #cf343412; }\r\n#cgpt-ra-settings-dialog .cgpt-ra-danger:focus-visible { outline: 2px solid #cf3434; outline-offset: 2px; }\r\n\n/* Optional, non-modal support requests. No page or composer styles are changed. */\n#cgpt-ra-support-prompt { position:fixed; z-index:10001; box-sizing:border-box; padding:20px; border:1px solid #db709355; border-radius:16px; background:var(--cgpt-ra-bg); color:var(--cgpt-ra-text); box-shadow:0 8px 28px #0002; font:13px/1.5 system-ui,sans-serif; text-align:start; }\n#cgpt-ra-support-prompt * { box-sizing:border-box; }\n#cgpt-ra-support-prompt h2 { margin:0; padding-inline-end:32px; font-size:16px; line-height:1.4; font-weight:600; color:inherit; }\n#cgpt-ra-support-prompt p { margin:12px 0; color:var(--cgpt-ra-muted); font-size:13px; line-height:1.5; }\n#cgpt-ra-support-prompt .cgpt-ra-support-actions { display:flex; flex-wrap:wrap; gap:8px; }\n#cgpt-ra-support-prompt :is(a,button) { display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:8px 10px; border:1px solid #db709355; border-radius:9px; font:inherit; color:inherit; background:transparent; text-decoration:none; cursor:pointer; overflow-wrap:normal; }\n#cgpt-ra-support-prompt :is(a,button):hover { background:#db709317; }\n#cgpt-ra-support-prompt :is(a,button):focus-visible { outline:2px solid #c84c7a; outline-offset:2px; }\n#cgpt-ra-support-prompt .secondary { margin-block-start:12px; }\n#cgpt-ra-support-prompt .secondary button { border-color:var(--cgpt-ra-border); }\n#cgpt-ra-support-prompt .cgpt-ra-support-close { position:absolute; inset-inline-end:8px; top:8px; width:44px; border:0; }\n#cgpt-ra-support-prompt .cgpt-ra-support-close svg { width:16px; height:16px; }\n.cgpt-ra-support-announcement { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }\r\n#cgpt-ra-settings-dialog .cgpt-ra-standalone-support { padding-block-end:16px; border-block-end:1px solid #8884; }\n#cgpt-ra-settings-dialog .cgpt-ra-standalone-support p { font-size:13px; line-height:1.5; }\n#cgpt-ra-settings-dialog .cgpt-ra-support-links { display:flex; flex-wrap:wrap; gap:8px; }\n#cgpt-ra-settings-dialog .cgpt-ra-support-links a { display:inline-flex; align-items:center; min-height:44px; padding:8px; color:inherit; border:1px solid #db709366; border-radius:8px; text-decoration:none; }\n#cgpt-ra-settings-dialog .cgpt-ra-support-links a:hover { background:#db70931a; }\n#cgpt-ra-settings-dialog .cgpt-ra-support-links a:focus-visible { outline:2px solid #c84c7a; outline-offset:2px; }\r\n";const mount=()=>{if(!style.isConnected)root.append(style);};mount();new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();
