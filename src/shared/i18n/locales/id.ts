import { TranslationSchema } from '../types';
export const id: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "Kontrol dan baca nyaring",
    "version": "v",
    "openChatGPT": "Buka ChatGPT",
    "dashboard": "Dasbor",
    "seconds": "detik",
    "star": "★ Bintang",
    "docs": "Dokumentasi",
    "issues": "Masalah"
  },
  "popup": {
    "header": {
      "switchTheme": "Ganti tema",
      "openOptions": "Buka dasbor dan pengaturan"
    },
    "tabs": {
      "controls": "Kontrol",
      "shortcuts": "Tombol",
      "about": "Tentang"
    },
    "quickControls": {
      "playbackSpeed": "Kecepatan pemutaran bawaan",
      "defaultVolume": "Volume bawaan",
      "mute": "Bisukan",
      "unmute": "Aktifkan suara",
      "smartIntegrations": "Fitur praktis",
      "inlineSpeech": "Tombol baca jawaban",
      "inlineSpeechDesc": "Tambahkan baca nyaring di samping tombol Salin",
      "globalShortcuts": "Pintasan keyboard",
      "globalShortcutsDesc": "Aktifkan Spasi/K, Alt+P, Alt+panah, dan tombol kecepatan",
      "smoothScrubbing": "Pencarian posisi mulus",
      "smoothScrubbingDesc": "Tahan ◀10 atau 10▶ untuk mempercepat perpindahan"
    },
    "shortcuts": {
      "title": "Pintasan keyboard",
      "gesturesTitle": "Gestur mouse dan sentuh",
      "smoothAudioScrub": "Pencarian posisi audio mulus",
      "instantResponseRead": "Langsung baca jawaban",
      "directDownload": "Unduh langsung",
      "holdScrubKey": "Tahan ◀10 / 10▶",
      "clickSpeechKey": "Klik tombol 🔈",
      "clickDownloadKey": "Klik tombol 📥"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Sumber terbuka oleh Infoxica",
      "description": "Jeda, cari posisi, atur kecepatan, dan unduh audio baca nyaring ChatGPT.",
      "privacyTitle": "Mengutamakan privasi",
      "privacyDesc": "Tanpa pelacak atau telemetri. Pemrosesan dilakukan di browser.",
      "githubRepo": "Repositori GitHub",
      "documentation": "Dokumentasi",
      "reportIssue": "Laporkan masalah"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "Dasbor dan penyiapan",
      "preferences": "Preferensi",
      "shortcuts": "Pintasan dan gestur",
      "faq": "Pertanyaan dan pemecahan masalah",
      "darkMode": "Mode gelap",
      "lightMode": "Mode terang",
      "githubRepo": "Repositori GitHub"
    },
    "headers": {
      "preferencesTitle": "Preferensi audio dan pemutaran",
      "preferencesDesc": "Atur bahasa, kecepatan, volume, dan fitur.",
      "shortcutsTitle": "Pintasan keyboard dan gestur",
      "shortcutsDesc": "Kendalikan pemutaran dengan cepat menggunakan keyboard.",
      "faqTitle": "Pertanyaan dan pemecahan masalah",
      "faqDesc": "Panduan penggunaan, privasi, dan bantuan."
    },
    "general": {
      "languageTitle": "Bahasa",
      "languageDesc": "Pilih bahasa antarmuka atau deteksi bahasa browser secara otomatis.",
      "languageAuto": "Deteksi otomatis (bahasa browser)",
      "languageDetected": "Bahasa terdeteksi",
      "speedTitle": "Preferensi kecepatan",
      "speedDesc": "Pilih kecepatan awal saat membuka ChatGPT atau memulai baca nyaring.",
      "volumeTitle": "Volume bawaan",
      "volumeDesc": "Volume awal baca nyaring.",
      "seekTitle": "Interval lompatan",
      "seekDesc": "Jumlah detik untuk tombol lompat atau Alt+panah kiri/kanan.",
      "secondsUnit": "detik"
    },
    "shortcutsGuide": {
      "title": "Panduan pintasan",
      "desc": "Tombol pemutaran berfungsi di luar kolom teks.",
      "gesturesTitle": "Mouse dan tekan lama",
      "gesturesDesc": "Tahan ◀10s atau 10s▶ untuk menelusuri audio dengan semakin cepat.",
      "gestureHold03": "Mulai pencarian posisi mulus pada 4×.",
      "gestureHold15": "Percepat pencarian posisi ke 10×.",
      "gestureHold30": "Percepat pencarian posisi ke 25×.",
      "gestureRelease": "Lepaskan untuk berhenti di posisi pilihan."
    },
    "faq": {
      "title": "Pertanyaan umum dan panduan",
      "subtitle": "Jawaban singkat untuk menggunakan ChatGPT Audio Controls.",
      "q1": "Bagaimana mengatur volume dengan roda mouse?",
      "a1": "Arahkan penunjuk ke ikon volume dan gulir untuk mengubah volume sebesar 5% setiap langkah.",
      "q2": "Di mana pemutar muncul?",
      "a2": "Di samping kotak pesan, atau dalam panel ringkas di atasnya jika layar sempit.",
      "q3": "Bagaimana menyimpan audio baca nyaring?",
      "a3": "Setelah audio dimuat, klik Unduh. Audio disimpan dalam format dari ChatGPT tanpa konversi.",
      "q4": "Apakah bisa dipakai di laptop kecil?",
      "a4": "Ya. Saat ruang samping tidak cukup, kontrol tampil dalam panel ringkas di atas kotak pesan.",
      "q5": "Bagaimana memasang lewat Tampermonkey?",
      "a5": "Pasang userscript terpisah dari repositori. Pengelola skrip akan memeriksa pembaruan.",
      "q6": "Apakah percakapan saya tetap pribadi?",
      "a6": "Ekstensi berjalan di browser dan tidak mengirim percakapan atau audio ke server pengembang."
    }
  },
  "content": {
    "tooltips": {
      "back": "Mundur {s} detik — tahan untuk mencari posisi",
      "playPause": "Putar / Jeda (Spasi atau K; Alt+P juga didukung)",
      "forward": "Maju {s} detik — tahan untuk mencari posisi",
      "speed": "Kecepatan pemutaran",
      "volume": "Volume (gulir untuk mengatur)",
      "volumeSlider": "Penggeser volume",
      "download": "Unduh audio",
      "shortcuts": "Pintasan dan gestur",
      "collapse": "Ciutkan pemutar",
      "expand": "Perluas ChatGPT Audio Controls",
      "readAloud": "Baca nyaring",
      "stopReadAloud": "Hentikan baca nyaring"
    },
    "shortcutsPopover": {
      "title": "Pintasan baca nyaring",
      "playPause": "Putar / Jeda",
      "back": "Mundur {s} dtk",
      "forward": "Maju {s} dtk",
      "slower": "Lebih lambat",
      "faster": "Lebih cepat",
      "volumeScroll": "Volume dengan guliran",
      "smoothScrub": "Pencarian posisi mulus",
      "volumeScrollKey": "Gulir pada 🔈",
      "smoothScrubKey": "Tahan ◀{s} / {s}▶"
    },
    "alerts": {
      "downloadError": "Audio tidak dapat diunduh. Mulai baca nyaring, tunggu audio dimuat, lalu coba lagi."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "Putar / Jeda",
      "description": "Alihkan pemutaran (Alt+P juga didukung)."
    },
    "seekBack": {
      "action": "Mundur 10 detik",
      "description": "Mundur 10 detik dalam audio."
    },
    "seekForward": {
      "action": "Maju 10 detik",
      "description": "Maju 10 detik dalam audio."
    },
    "speedDecrease": {
      "action": "Kurangi kecepatan",
      "description": "Beralih ke prasetel kecepatan sebelumnya."
    },
    "speedIncrease": {
      "action": "Tambah kecepatan",
      "description": "Beralih ke prasetel kecepatan berikutnya."
    }
  }
};
