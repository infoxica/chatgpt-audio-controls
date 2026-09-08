import { TranslationSchema } from '../types';
export const tr: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "Denetimler ve sesli okuma",
    "version": "v",
    "openChatGPT": "ChatGPT’yi aç",
    "dashboard": "Panel",
    "seconds": "saniye",
    "star": "★ Yıldız",
    "docs": "Belgeler",
    "issues": "Sorunlar"
  },
  "popup": {
    "header": {
      "switchTheme": "Temayı değiştir",
      "openOptions": "Paneli ve ayarları aç"
    },
    "tabs": {
      "controls": "Denetimler",
      "shortcuts": "Tuşlar",
      "about": "Hakkında"
    },
    "quickControls": {
      "playbackSpeed": "Varsayılan oynatma hızı",
      "defaultVolume": "Varsayılan ses düzeyi",
      "mute": "Sesi kapat",
      "unmute": "Sesi aç",
      "smartIntegrations": "Pratik özellikler",
      "inlineSpeech": "Yanıtları sesli okuma düğmeleri",
      "inlineSpeechDesc": "Kopyala düğmesinin yanına sesli okuma ekler",
      "globalShortcuts": "Klavye kısayolları",
      "globalShortcutsDesc": "Boşluk/K, Alt+P, Alt+oklar ve hız tuşlarını etkinleştir",
      "smoothScrubbing": "Akıcı ileri geri sarma",
      "smoothScrubbingDesc": "Daha hızlı sarmak için ◀10 veya 10▶ düğmesini basılı tutun"
    },
    "shortcuts": {
      "title": "Klavye kısayolları",
      "gesturesTitle": "Fare ve dokunma hareketleri",
      "smoothAudioScrub": "Akıcı ses sarma",
      "instantResponseRead": "Yanıtı hemen oku",
      "directDownload": "Doğrudan indir",
      "holdScrubKey": "◀10 / 10▶ düğmesini basılı tutun",
      "clickSpeechKey": "🔈 düğmesine tıklayın",
      "clickDownloadKey": "📥 düğmesine tıklayın"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Infoxica’nın açık kaynak projesi",
      "description": "ChatGPT’nin sesli okumasını duraklatın, sarın, hızını değiştirin ve indirin.",
      "privacyTitle": "Gizlilik odaklı",
      "privacyDesc": "İzleyici veya telemetri yok. İşlemler tarayıcınızda gerçekleşir.",
      "githubRepo": "GitHub deposu",
      "documentation": "Belgeler",
      "reportIssue": "Sorun bildir"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "Panel ve kurulum",
      "preferences": "Tercihler",
      "shortcuts": "Kısayollar ve hareketler",
      "faq": "Sorular ve sorun giderme",
      "darkMode": "Koyu mod",
      "lightMode": "Açık mod",
      "githubRepo": "GitHub deposu"
    },
    "headers": {
      "preferencesTitle": "Ses ve oynatma tercihleri",
      "preferencesDesc": "Dil, hız, ses düzeyi ve özellikleri ayarlayın.",
      "shortcutsTitle": "Klavye kısayolları ve hareketler",
      "shortcutsDesc": "Oynatmayı klavyeyle hızlıca denetleyin.",
      "faqTitle": "Sorular ve sorun giderme",
      "faqDesc": "Kullanım, gizlilik ve destek bilgileri."
    },
    "general": {
      "languageTitle": "Dil",
      "languageDesc": "Arayüz dilini seçin veya tarayıcı dilini otomatik algılayın.",
      "languageAuto": "Otomatik algıla (tarayıcı dili)",
      "languageDetected": "Algılanan dil",
      "speedTitle": "Hız tercihleri",
      "speedDesc": "ChatGPT veya sesli okuma başlatıldığında kullanılacak hızı seçin.",
      "volumeTitle": "Varsayılan ses düzeyi",
      "volumeDesc": "Sesli okumanın başlangıç ses düzeyi.",
      "seekTitle": "Atlama aralığı",
      "seekDesc": "Atlama düğmeleri veya Alt+sol/sağ ok ile kaç saniye atlanacağını belirler.",
      "secondsUnit": "saniye"
    },
    "shortcutsGuide": {
      "title": "Kısayol rehberi",
      "desc": "Oynatma tuşları metin alanlarının dışında çalışır.",
      "gesturesTitle": "Fare ve basılı tutma",
      "gesturesDesc": "Sesi giderek daha hızlı sarmak için ◀10s veya 10s▶ düğmesini basılı tutun.",
      "gestureHold03": "4× hızında akıcı sarma başlar.",
      "gestureHold15": "Sarma hızı 10× olur.",
      "gestureHold30": "Sarma hızı 25× olur.",
      "gestureRelease": "Seçtiğiniz konumda durmak için bırakın."
    },
    "faq": {
      "title": "Sık sorulan sorular ve rehber",
      "subtitle": "ChatGPT Audio Controls kullanımı için kısa yanıtlar.",
      "q1": "Fare tekerleğiyle sesi nasıl ayarlarım?",
      "a1": "İşaretçiyi ses simgesinin üzerine getirin ve kaydırın. Ses düzeyi %5’lik adımlarla değişir.",
      "q2": "Oynatıcı nerede görünür?",
      "a2": "Mesaj kutusunun yanında, dar ekranlarda ise kutunun üstündeki küçük bir panelde görünür.",
      "q3": "Sesli okuma dosyasını nasıl kaydederim?",
      "a3": "Ses yüklendikten sonra İndir’e tıklayın. Dosya ChatGPT’nin sağladığı biçimde kaydedilir; biçim dönüştürülmez.",
      "q4": "Küçük dizüstü bilgisayarlarda çalışır mı?",
      "a4": "Evet. Yanlarda yer yoksa denetimler mesaj kutusunun üstündeki küçük bir panelde görünür.",
      "q5": "Tampermonkey ile nasıl kurarım?",
      "a5": "Depodan ayrı kullanıcı betiğini yükleyin. Betik yöneticisi güncellemeleri denetler.",
      "q6": "Konuşmalarım gizli kalır mı?",
      "a6": "Uzantı tarayıcıda çalışır; konuşmaları veya sesi geliştiricinin sunucularına göndermez."
    }
  },
  "content": {
    "tooltips": {
      "back": "{s} saniye geri — sarmak için basılı tutun",
      "playPause": "Oynat / Duraklat (Boşluk veya K; Alt+P de desteklenir)",
      "forward": "{s} saniye ileri — sarmak için basılı tutun",
      "speed": "Oynatma hızı",
      "volume": "Ses düzeyi (ayarlamak için kaydırın)",
      "volumeSlider": "Ses düzeyi kaydırıcısı",
      "download": "Sesi indir",
      "shortcuts": "Kısayollar ve hareketler",
      "collapse": "Oynatıcıyı daralt",
      "expand": "ChatGPT Audio Controls’ü genişlet",
      "readAloud": "Sesli oku",
      "stopReadAloud": "Sesli okumayı durdur"
    },
    "shortcutsPopover": {
      "title": "Sesli okuma kısayolları",
      "playPause": "Oynat / Duraklat",
      "back": "{s} sn geri",
      "forward": "{s} sn ileri",
      "slower": "Daha yavaş",
      "faster": "Daha hızlı",
      "volumeScroll": "Kaydırarak ses ayarı",
      "smoothScrub": "Akıcı sarma",
      "volumeScrollKey": "🔈 üzerinde kaydırın",
      "smoothScrubKey": "◀{s} / {s}▶ düğmesini basılı tutun"
    },
    "alerts": {
      "downloadError": "Ses indirilemedi. Sesli okumayı başlatın, sesin yüklenmesini bekleyin ve tekrar deneyin."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "Oynat / Duraklat",
      "description": "Oynatmayı değiştirir (Alt+P de desteklenir)."
    },
    "seekBack": {
      "action": "10 saniye geri",
      "description": "Seste 10 saniye geri gider."
    },
    "seekForward": {
      "action": "10 saniye ileri",
      "description": "Seste 10 saniye ileri gider."
    },
    "speedDecrease": {
      "action": "Hızı azalt",
      "description": "Önceki hız ayarına geçer."
    },
    "speedIncrease": {
      "action": "Hızı artır",
      "description": "Sonraki hız ayarına geçer."
    }
  }
};
