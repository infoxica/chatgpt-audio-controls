import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { TranslationSchema } from "../../shared/i18n";

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq-item">
      <button
        type="button"
        className="faq-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="faq-body">{answer}</div>}
    </div>
  );
};

interface FaqSectionProps {
  t: TranslationSchema;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ t }) => {
  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <HelpCircle size={16} color="var(--accent)" />
          <span>{t.options.faq.title}</span>
        </div>
        <p className="card-desc">
          {t.options.faq.subtitle}
        </p>

        <div style={{ marginTop: 8 }}>
          <FaqItem
            question={t.options.faq.q1}
            answer={<p>{t.options.faq.a1}</p>}
          />

          <FaqItem
            question={t.options.faq.q2}
            answer={<p>{t.options.faq.a2}</p>}
          />

          <FaqItem
            question={t.options.faq.q3}
            answer={<p>{t.options.faq.a3}</p>}
          />

          <FaqItem
            question={t.options.faq.q4}
            answer={<p>{t.options.faq.a4}</p>}
          />

          <FaqItem
            question={t.options.faq.q5}
            answer={<p>{t.options.faq.a5}</p>}
          />

          <FaqItem
            question={t.options.faq.q6}
            answer={<p>{t.options.faq.a6}</p>}
          />
        </div>
      </div>
    </div>
  );
};
