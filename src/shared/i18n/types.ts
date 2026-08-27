export interface TranslationSchema {
  common: {
    extensionName: string;
    extensionSubtitle: string;
    version: string;
    openChatGPT: string;
    dashboard: string;
    seconds: string;
    star: string;
    docs: string;
    issues: string;
  };
  popup: {
    header: {
      switchTheme: string;
      openOptions: string;
    };
    tabs: {
      controls: string;
      shortcuts: string;
      about: string;
    };
    quickControls: {
      playbackSpeed: string;
      defaultVolume: string;
      mute: string;
      unmute: string;
      smartIntegrations: string;
      inlineSpeech: string;
      inlineSpeechDesc: string;
      globalShortcuts: string;
      globalShortcutsDesc: string;
      smoothScrubbing: string;
      smoothScrubbingDesc: string;
    };
    shortcuts: {
      title: string;
      gesturesTitle: string;
      smoothAudioScrub: string;
      instantResponseRead: string;
      directDownload: string;
      holdScrubKey: string;
      clickSpeechKey: string;
      clickDownloadKey: string;
    };
    about: {
      title: string;
      byInfoxica: string;
      description: string;
      privacyTitle: string;
      privacyDesc: string;
      githubRepo: string;
      documentation: string;
      reportIssue: string;
    };
  };
  options: {
    nav: {
      dashboardTitle: string;
      dashboardSubtitle: string;
      preferences: string;
      shortcuts: string;
      faq: string;
      darkMode: string;
      lightMode: string;
      githubRepo: string;
    };
    headers: {
      preferencesTitle: string;
      preferencesDesc: string;
      shortcutsTitle: string;
      shortcutsDesc: string;
      faqTitle: string;
      faqDesc: string;
    };
    general: {
      languageTitle: string;
      languageDesc: string;
      languageAuto: string;
      languageDetected: string;
      speedTitle: string;
      speedDesc: string;
      volumeTitle: string;
      volumeDesc: string;
      seekTitle: string;
      seekDesc: string;
      secondsUnit: string;
    };
    shortcutsGuide: {
      title: string;
      desc: string;
      gesturesTitle: string;
      gesturesDesc: string;
      gestureHold03: string;
      gestureHold15: string;
      gestureHold30: string;
      gestureRelease: string;
    };
    faq: {
      title: string;
      subtitle: string;
      q1: string;
      a1: string;
      q2: string;
      a2: string;
      q3: string;
      a3: string;
      q4: string;
      a4: string;
      q5: string;
      a5: string;
      q6: string;
      a6: string;
    };
  };
  content: {
    tooltips: {
      back: string;
      playPause: string;
      forward: string;
      speed: string;
      volume: string;
      volumeSlider: string;
      download: string;
      shortcuts: string;
      collapse: string;
      expand: string;
      readAloud: string;
      stopReadAloud: string;
    };
    shortcutsPopover: {
      title: string;
      playPause: string;
      back: string;
      forward: string;
      slower: string;
      faster: string;
      volumeScroll: string;
      smoothScrub: string;
      volumeScrollKey: string;
      smoothScrubKey: string;
    };
    alerts: {
      downloadError: string;
    };
  };
  shortcuts: {
    playPause: { action: string; description: string };
    seekBack: { action: string; description: string };
    seekForward: { action: string; description: string };
    speedDecrease: { action: string; description: string };
    speedIncrease: { action: string; description: string };
  };
}
