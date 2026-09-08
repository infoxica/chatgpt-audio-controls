import { TranslationSchema } from '../types';
export const ko: TranslationSchema = {
  "common": {
    "extensionName": "ChatGPT Audio",
    "extensionSubtitle": "오디오 제어 및 읽어주기",
    "version": "v",
    "openChatGPT": "ChatGPT 열기",
    "dashboard": "대시보드",
    "seconds": "초",
    "star": "★ 별표",
    "docs": "문서",
    "issues": "문제"
  },
  "popup": {
    "header": {
      "switchTheme": "테마 전환",
      "openOptions": "대시보드 및 설정 열기"
    },
    "tabs": {
      "controls": "제어",
      "shortcuts": "키",
      "about": "정보"
    },
    "quickControls": {
      "playbackSpeed": "기본 재생 속도",
      "defaultVolume": "기본 음량",
      "mute": "음소거",
      "unmute": "음소거 해제",
      "smartIntegrations": "편리한 기능",
      "inlineSpeech": "답변 읽어주기 버튼",
      "inlineSpeechDesc": "답변 복사 버튼 옆에 읽어주기를 추가합니다",
      "globalShortcuts": "키보드 단축키",
      "globalShortcutsDesc": "Space/K, Alt+P, Alt+화살표 및 속도 키 사용",
      "smoothScrubbing": "부드러운 탐색",
      "smoothScrubbingDesc": "◀10 또는 10▶를 길게 누르면 탐색 속도가 빨라집니다"
    },
    "shortcuts": {
      "title": "키보드 단축키",
      "gesturesTitle": "마우스 및 터치 동작",
      "smoothAudioScrub": "부드러운 오디오 탐색",
      "instantResponseRead": "답변 바로 읽기",
      "directDownload": "바로 다운로드",
      "holdScrubKey": "◀10 / 10▶ 길게 누르기",
      "clickSpeechKey": "🔈 버튼 클릭",
      "clickDownloadKey": "📥 버튼 클릭"
    },
    "about": {
      "title": "ChatGPT Audio Controls",
      "byInfoxica": "Infoxica의 오픈 소스",
      "description": "ChatGPT 읽어주기를 일시 정지하고, 탐색하고, 속도를 조절하고, 다운로드하세요.",
      "privacyTitle": "개인정보 보호 중심",
      "privacyDesc": "추적 및 원격 측정 없이 브라우저에서 처리합니다.",
      "githubRepo": "GitHub 저장소",
      "documentation": "문서",
      "reportIssue": "문제 신고"
    }
  },
  "options": {
    "nav": {
      "dashboardTitle": "ChatGPT Audio",
      "dashboardSubtitle": "대시보드 및 설정",
      "preferences": "환경설정",
      "shortcuts": "단축키 및 동작",
      "faq": "자주 묻는 질문 및 문제 해결",
      "darkMode": "어두운 모드",
      "lightMode": "밝은 모드",
      "githubRepo": "GitHub 저장소"
    },
    "headers": {
      "preferencesTitle": "오디오 및 재생 설정",
      "preferencesDesc": "언어, 재생 속도, 음량과 기능을 설정합니다.",
      "shortcutsTitle": "키보드 단축키 및 동작",
      "shortcutsDesc": "단축키로 재생을 빠르게 제어하세요.",
      "faqTitle": "자주 묻는 질문 및 문제 해결",
      "faqDesc": "사용법, 개인정보 보호 및 지원 안내입니다."
    },
    "general": {
      "languageTitle": "언어",
      "languageDesc": "표시 언어를 선택하거나 브라우저 언어를 자동으로 감지합니다.",
      "languageAuto": "자동 감지 (브라우저 언어)",
      "languageDetected": "감지된 언어",
      "speedTitle": "재생 속도 설정",
      "speedDesc": "ChatGPT 또는 읽어주기를 시작할 때 사용할 속도를 선택합니다.",
      "volumeTitle": "기본 음량",
      "volumeDesc": "읽어주기 시작 시 적용할 음량입니다.",
      "seekTitle": "건너뛰기 간격",
      "seekDesc": "건너뛰기 버튼 또는 Alt+좌우 화살표로 이동할 초 단위 간격입니다.",
      "secondsUnit": "초"
    },
    "shortcutsGuide": {
      "title": "단축키 안내",
      "desc": "재생 단축키는 입력란 밖에서 작동합니다.",
      "gesturesTitle": "마우스 및 길게 누르기",
      "gesturesDesc": "◀10s 또는 10s▶를 길게 누르면 탐색 속도가 점차 빨라집니다.",
      "gestureHold03": "부드러운 탐색 시작 (4배).",
      "gestureHold15": "탐색 속도가 10배가 됩니다.",
      "gestureHold30": "탐색 속도가 25배가 됩니다.",
      "gestureRelease": "놓으면 선택한 위치에서 멈춥니다."
    },
    "faq": {
      "title": "자주 묻는 질문 및 사용 안내",
      "subtitle": "ChatGPT Audio Controls를 사용하는 방법입니다.",
      "q1": "마우스 휠로 음량을 조절하려면?",
      "a1": "음량 아이콘 위에서 스크롤하면 음량이 5%씩 바뀝니다.",
      "q2": "플레이어는 어디에 표시되나요?",
      "a2": "메시지 입력란 옆에 표시됩니다. 화면이 좁으면 입력란 위에 작은 패널로 표시됩니다.",
      "q3": "읽어주기 오디오를 저장하려면?",
      "a3": "오디오가 로드된 뒤 다운로드를 누르세요. ChatGPT가 제공하는 형식으로 저장하며 형식을 변환하지 않습니다.",
      "q4": "작은 노트북에서도 사용할 수 있나요?",
      "a4": "네. 옆 공간이 부족하면 입력란 위에 작은 제어 패널이 표시됩니다.",
      "q5": "Tampermonkey로 설치하려면?",
      "a5": "저장소에서 독립형 사용자 스크립트를 설치하세요. 스크립트 관리자가 업데이트를 확인합니다.",
      "q6": "대화와 프롬프트는 비공개인가요?",
      "a6": "확장 프로그램은 브라우저에서 실행되며 대화나 오디오를 개발자 서버에 보내지 않습니다."
    }
  },
  "content": {
    "tooltips": {
      "back": "{s}초 뒤로 — 길게 눌러 탐색",
      "playPause": "재생 / 일시 정지 (Space 또는 K, Alt+P도 지원)",
      "forward": "{s}초 앞으로 — 길게 눌러 탐색",
      "speed": "재생 속도",
      "volume": "음량 (스크롤로 조절)",
      "volumeSlider": "음량 슬라이더",
      "download": "오디오 다운로드",
      "shortcuts": "단축키 및 동작",
      "collapse": "플레이어 접기",
      "expand": "ChatGPT Audio Controls 펼치기",
      "readAloud": "읽어주기",
      "stopReadAloud": "읽어주기 중지"
    },
    "shortcutsPopover": {
      "title": "읽어주기 단축키",
      "playPause": "재생 / 일시 정지",
      "back": "{s}초 뒤로",
      "forward": "{s}초 앞으로",
      "slower": "속도 줄이기",
      "faster": "속도 높이기",
      "volumeScroll": "스크롤로 음량 조절",
      "smoothScrub": "부드러운 탐색",
      "volumeScrollKey": "🔈 위에서 스크롤",
      "smoothScrubKey": "◀{s} / {s}▶ 길게 누르기"
    },
    "alerts": {
      "downloadError": "오디오를 다운로드하지 못했습니다. 읽어주기를 시작하고 오디오가 로드된 후 다시 시도하세요."
    }
  },
  "shortcuts": {
    "playPause": {
      "action": "재생 / 일시 정지",
      "description": "재생 상태를 전환합니다 (Alt+P도 지원)."
    },
    "seekBack": {
      "action": "10초 뒤로",
      "description": "10초 뒤로 이동합니다."
    },
    "seekForward": {
      "action": "10초 앞으로",
      "description": "10초 앞으로 이동합니다."
    },
    "speedDecrease": {
      "action": "속도 줄이기",
      "description": "이전 속도 설정으로 바꿉니다."
    },
    "speedIncrease": {
      "action": "속도 높이기",
      "description": "다음 속도 설정으로 바꿉니다."
    }
  }
};
