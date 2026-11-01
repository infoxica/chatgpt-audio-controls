import audience from './audience-features.json';
import { resolveLanguage } from './core';
// Title, description, suggestion action, review action.
export const supportCatalogs: Record<string, string[]> = {
 en: ['Help shape ChatGPT Audio Controls', 'Have an idea? Share a suggestion or leave an honest review to support the extension.', 'Share a suggestion', 'Write a review'],
 hi: ['ChatGPT Audio Controls को बेहतर बनाएँ', 'कोई सुझाव है? अपना सुझाव साझा करें या समीक्षा लिखकर एक्सटेंशन का समर्थन करें।', 'सुझाव साझा करें', 'समीक्षा लिखें'],
 bn: ['ChatGPT Audio Controls আরও ভালো করুন', 'কোনো ধারণা আছে? পরামর্শ দিন বা সৎ পর্যালোচনা লিখে এক্সটেনশনকে সমর্থন করুন।', 'পরামর্শ দিন', 'পর্যালোচনা লিখুন'],
 mr: ['ChatGPT Audio Controls अधिक चांगले बनवा', 'काही कल्पना आहे? सूचना द्या किंवा प्रामाणिक अभिप्राय लिहून विस्ताराला पाठिंबा द्या.', 'सूचना द्या', 'अभिप्राय लिहा'],
 te: ['ChatGPT Audio Controls మెరుగుదలకు తోడ్పడండి', 'ఏదైనా ఆలోచన ఉందా? సూచన పంచుకోండి లేదా నిజాయితీగా సమీక్ష రాసి ఎక్స్‌టెన్షన్‌కు మద్దతివ్వండి.', 'సూచన పంచుకోండి', 'సమీక్ష రాయండి'],
 ta: ['ChatGPT Audio Controls மேம்பட உதவுங்கள்', 'யோசனை உள்ளதா? ஆலோசனையைப் பகிருங்கள் அல்லது நேர்மையான மதிப்புரையை எழுதி நீட்சியை ஆதரியுங்கள்.', 'ஆலோசனையைப் பகிரவும்', 'மதிப்புரை எழுதவும்'],
 ar: ['ساهم في تحسين ChatGPT Audio Controls', 'لديك فكرة؟ شارك اقتراحًا أو اكتب مراجعة صادقة لدعم الإضافة.', 'شارك اقتراحًا', 'اكتب مراجعة'],
 fa: ['به بهبود ChatGPT Audio Controls کمک کنید', 'ایده‌ای دارید؟ پیشنهاد خود را به اشتراک بگذارید یا با نوشتن یک نقد صادقانه از افزونه حمایت کنید.', 'ارسال پیشنهاد', 'نوشتن نقد'],
 he: ['עזרו לשפר את ChatGPT Audio Controls', 'יש לכם רעיון? שתפו הצעה או כתבו ביקורת כנה כדי לתמוך בתוסף.', 'שיתוף הצעה', 'כתיבת ביקורת'],
 'zh-CN': ['一起改进 ChatGPT Audio Controls', '有想法吗？分享建议或留下真实评价，支持这个扩展。', '分享建议', '撰写评价'],
 'zh-TW': ['一起改進 ChatGPT Audio Controls', '有想法嗎？分享建議或留下真實評價，支持這個擴充功能。', '分享建議', '撰寫評價'],
 vi: ['Cùng cải thiện ChatGPT Audio Controls', 'Bạn có ý tưởng? Gửi đề xuất hoặc viết đánh giá chân thực để ủng hộ tiện ích.', 'Gửi đề xuất', 'Viết đánh giá'],
 th: ['ช่วยพัฒนา ChatGPT Audio Controls', 'มีไอเดียไหม? ส่งข้อเสนอแนะหรือเขียนรีวิวอย่างตรงไปตรงมาเพื่อสนับสนุนส่วนขยาย', 'ส่งข้อเสนอแนะ', 'เขียนรีวิว'],
 es: ['Ayuda a mejorar ChatGPT Audio Controls', '¿Tienes una idea? Comparte una sugerencia o deja una reseña sincera para apoyar la extensión.', 'Comparte una sugerencia', 'Escribe una reseña'],
 'pt-BR': ['Ajude a melhorar o ChatGPT Audio Controls', 'Tem uma ideia? Envie uma sugestão ou deixe uma avaliação sincera para apoiar a extensão.', 'Enviar sugestão', 'Escrever avaliação'],
 'pt-PT': ['Ajude a melhorar o ChatGPT Audio Controls', 'Tem uma ideia? Partilhe uma sugestão ou deixe uma avaliação sincera para apoiar a extensão.', 'Partilhar sugestão', 'Escrever avaliação'],
 ru: ['Помогите улучшить ChatGPT Audio Controls', 'Есть идея? Поделитесь предложением или оставьте честный отзыв в поддержку расширения.', 'Предложить идею', 'Написать отзыв'],
 fr: ['Améliorons ChatGPT Audio Controls', 'Une idée ? Partagez une suggestion ou laissez un avis sincère pour soutenir l’extension.', 'Partager une suggestion', 'Rédiger un avis'],
 de: ['ChatGPT Audio Controls mitgestalten', 'Eine Idee? Teile einen Vorschlag oder unterstütze die Erweiterung mit einer ehrlichen Bewertung.', 'Vorschlag teilen', 'Bewertung schreiben'],
 ja: ['ChatGPT Audio Controls の改善にご協力ください', 'アイデアはありますか？提案や率直なレビューで拡張機能を応援してください。', '提案を送る', 'レビューを書く'],
 ko: ['ChatGPT Audio Controls 개선에 참여하세요', '아이디어가 있나요? 제안을 보내거나 솔직한 리뷰로 확장 프로그램을 응원해 주세요.', '제안 보내기', '리뷰 작성'],
 id: ['Bantu tingkatkan ChatGPT Audio Controls', 'Punya ide? Bagikan saran atau tulis ulasan jujur untuk mendukung ekstensi.', 'Bagikan saran', 'Tulis ulasan'],
 it: ['Aiuta a migliorare ChatGPT Audio Controls', 'Hai un’idea? Condividi un suggerimento o lascia una recensione sincera per sostenere l’estensione.', 'Invia un suggerimento', 'Scrivi una recensione'],
 tr: ['ChatGPT Audio Controls’u geliştirmeye yardımcı olun', 'Bir fikriniz mi var? Önerinizi paylaşın veya uzantıyı desteklemek için dürüst bir değerlendirme yazın.', 'Öneri paylaş', 'Değerlendirme yaz'],
};
Object.assign(supportCatalogs, Object.fromEntries(Object.entries(audience).map(([code, copy]) => [code, copy.support])));
export const supportCopy = (language?: string) => supportCatalogs[resolveLanguage(language)];
