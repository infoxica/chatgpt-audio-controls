import { TranslationSchema } from '../types';
export const ja: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "操作と読み上げ",
    "version": "v",
    "openChatGPT": "ChatGPTを開く",
    "dashboard": "ダッシュボード",
    "seconds": "秒",
    "star": "★ スター",
    "docs": "ドキュメント",
    "issues": "問題"
  },
  "popup": {
    "header": {
      "switchTheme": "テーマを切り替え",
      "openOptions": "ダッシュボードと設定を開く"
    },
    "tabs": {
      "controls": "操作",
      "shortcuts": "キー",
      "about": "概要"
    },
    "quickControls": {
      "playbackSpeed": "既定の再生速度",
      "defaultVolume": "既定の音量",
      "mute": "ミュート",
      "unmute": "ミュート解除",
      "smartIntegrations": "便利な機能",
      "inlineSpeech": "回答の読み上げボタン",
      "inlineSpeechDesc": "回答のコピーボタン横に読み上げを追加",
      "globalShortcuts": "キーボードショートカット",
      "globalShortcutsDesc": "Space/K、Alt+P、Alt+矢印、速度キーを有効にする",
      "smoothScrubbing": "スムーズなシーク",
      "smoothScrubbingDesc": "◀10 または 10▶を長押しすると移動速度が上がります"
    },
    "shortcuts": {
      "title": "キーボードショートカット",
      "gesturesTitle": "マウスとタッチ操作",
      "smoothAudioScrub": "スムーズな音声シーク",
      "instantResponseRead": "回答をすぐ読み上げる",
      "directDownload": "直接ダウンロード",
      "holdScrubKey": "◀10 / 10▶を長押し",
      "clickSpeechKey": "🔈ボタンをクリック",
      "clickDownloadKey": "📥ボタンをクリック"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Infoxicaのオープンソース",
      "description": "ChatGPTの読み上げを一時停止、シーク、速度調整、ダウンロードで快適に操作できます。",
      "privacyTitle": "プライバシーを重視",
      "privacyDesc": "追跡やテレメトリーなし。処理はブラウザー内で行われます。",
      "githubRepo": "GitHubリポジトリ",
      "documentation": "ドキュメント",
      "reportIssue": "問題を報告"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "ダッシュボードと設定",
      "preferences": "設定",
      "shortcuts": "ショートカットと操作",
      "faq": "よくある質問と対処法",
      "darkMode": "ダークモード",
      "lightMode": "ライトモード",
      "githubRepo": "GitHubリポジトリ"
    },
    "headers": {
      "preferencesTitle": "音声と再生の設定",
      "preferencesDesc": "言語、再生速度、音量、機能を設定します。",
      "shortcutsTitle": "キーボードショートカットと操作",
      "shortcutsDesc": "キーで再生をすばやく操作します。",
      "faqTitle": "よくある質問と対処法",
      "faqDesc": "使い方、プライバシー、サポートの案内です。"
    },
    "general": {
      "languageTitle": "言語",
      "languageDesc": "表示言語を選ぶか、ブラウザーの言語を自動検出します。",
      "languageAuto": "自動検出（ブラウザーの言語）",
      "languageDetected": "検出された言語",
      "speedTitle": "再生速度の設定",
      "speedDesc": "ChatGPTや読み上げを開始するときの再生速度を選びます。",
      "volumeTitle": "既定の音量",
      "volumeDesc": "読み上げの開始時の音量です。",
      "seekTitle": "スキップ間隔",
      "seekDesc": "スキップボタンまたはAlt+左右矢印で移動する秒数です。",
      "secondsUnit": "秒"
    },
    "shortcutsGuide": {
      "title": "ショートカット一覧",
      "desc": "再生キーは入力欄の外で使えます。",
      "gesturesTitle": "マウスと長押し操作",
      "gesturesDesc": "◀10s または 10s▶を長押しすると、シークが段階的に加速します。",
      "gestureHold03": "スムーズなシークを開始（4倍）。",
      "gestureHold15": "シーク速度が10倍になります。",
      "gestureHold30": "シーク速度が25倍になります。",
      "gestureRelease": "離すと選んだ位置で止まります。"
    },
    "faq": {
      "title": "よくある質問と使い方",
      "subtitle": "ChatGPT Audio Controlsの使い方を確認できます。",
      "q1": "マウスホイールで音量を変えるには？",
      "a1": "音量アイコンにマウスを合わせてスクロールすると、音量を5%ずつ変更できます。",
      "q2": "プレーヤーはどこに表示されますか？",
      "a2": "メッセージ入力欄の横に表示されます。狭い画面では入力欄の上にコンパクト表示されます。",
      "q3": "読み上げ音声を保存するには？",
      "a3": "音声の読み込み後にダウンロードボタンを押します。ChatGPTが提供する形式で保存され、形式変換は行いません。",
      "q4": "小さいノートパソコンでも使えますか？",
      "a4": "はい。横に十分な空間がないときは、入力欄の上にコンパクトな操作パネルを表示します。",
      "q5": "Tampermonkeyで導入するには？",
      "a5": "リポジトリから独立したユーザースクリプトを導入できます。更新はスクリプト管理ツールが確認します。",
      "q6": "会話やプロンプトは非公開ですか？",
      "a6": "拡張機能はブラウザー内で動作し、会話や音声を開発者のサーバーに送信しません。"
    }
  },
  "content": {
    "tooltips": {
      "back": "{s}秒戻る — 長押しでシーク",
      "playPause": "再生 / 一時停止（SpaceまたはK、Alt+Pも対応）",
      "forward": "{s}秒進む — 長押しでシーク",
      "speed": "再生速度",
      "volume": "音量（スクロールで調整）",
      "volumeSlider": "音量スライダー",
      "download": "音声をダウンロード",
      "shortcuts": "ショートカットと操作",
      "collapse": "プレーヤーを折りたたむ",
      "expand": "ChatGPT Audio Controlsを展開",
      "readAloud": "読み上げ",
      "stopReadAloud": "読み上げを停止"
    },
    "shortcutsPopover": {
      "title": "読み上げのショートカット",
      "playPause": "再生 / 一時停止",
      "back": "{s}秒戻る",
      "forward": "{s}秒進む",
      "slower": "速度を下げる",
      "faster": "速度を上げる",
      "volumeScroll": "スクロールで音量調整",
      "smoothScrub": "スムーズなシーク",
      "volumeScrollKey": "🔈の上でスクロール",
      "smoothScrubKey": "◀{s} / {s}▶を長押し"
    },
    "alerts": {
      "downloadError": "音声をダウンロードできませんでした。読み上げを開始し、音声の読み込み後に再試行してください。"
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "再生 / 一時停止",
      "description": "再生を切り替えます（Alt+Pも対応）。"
    },
    "seekBack": {
      "action": "10秒戻る",
      "description": "10秒前へ移動します。"
    },
    "seekForward": {
      "action": "10秒進む",
      "description": "10秒先へ移動します。"
    },
    "speedDecrease": {
      "action": "速度を下げる",
      "description": "前の速度プリセットに切り替えます。"
    },
    "speedIncrease": {
      "action": "速度を上げる",
      "description": "次の速度プリセットに切り替えます。"
    }
  }
};
