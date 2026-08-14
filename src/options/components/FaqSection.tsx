import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq-item">
      <div className="faq-header" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && <div className="faq-body">{answer}</div>}
    </div>
  );
};

export const FaqSection: React.FC = () => {
  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <HelpCircle size={16} color="var(--accent)" />
          <span>Frequently Asked Questions & User Guide</span>
        </div>
        <p className="card-desc">
          Quick answers to help you get the most out of ChatGPT Audio Controls.
        </p>

        <div style={{ marginTop: 8 }}>
          <FaqItem
            question="How do I adjust the volume by scrolling with my mouse?"
            answer={
              <p>
                Simply hover your mouse pointer over the volume speaker icon on the player rail and scroll your mouse wheel up or down. The volume will smoothly adjust in 5% increments without having to open the slider popover!
              </p>
            }
          />

          <FaqItem
            question="Where does the player appear on ChatGPT?"
            answer={
              <p>
                The player is anchored conveniently directly beside your message composer prompt. When no audio is playing, a small floating logo button stays neatly docked on the right side. Clicking this button or starting Read Aloud expands the full player capsules.
              </p>
            }
          />

          <FaqItem
            question="How do I download the synthesized speech audio?"
            answer={
              <p>
                Whenever ChatGPT reads aloud a response, click the download button (📥) on the right rail. The audio stream is instantly saved as a high-quality audio file (<code>.mp3</code>, <code>.m4a</code>, or <code>.wav</code>) onto your computer.
              </p>
            }
          />

          <FaqItem
            question="Does this work on small laptop screens?"
            answer={
              <p>
                Yes! The player automatically detects your available screen width and dynamically scales its seekbar to fit your laptop screen comfortably. If space is extremely tight, the floating button stays accessible so you can expand and collapse the player whenever you need it.
              </p>
            }
          />

          <FaqItem
            question="How do I install this via Tampermonkey with auto-updates?"
            answer={
              <p>
                If you use Tampermonkey, Violentmonkey, or Greasemonkey, you can install the standalone script directly from our repository. Tampermonkey will automatically check GitHub for updates and notify you whenever a new version is released.
              </p>
            }
          />

          <FaqItem
            question="Are my conversations or prompts private?"
            answer={
              <p>
                <strong>100% Private.</strong> The extension runs entirely on your local device. No prompts, answers, audio streams, or personal telemetry are ever sent to any external server.
              </p>
            }
          />
        </div>
      </div>
    </div>
  );
};
