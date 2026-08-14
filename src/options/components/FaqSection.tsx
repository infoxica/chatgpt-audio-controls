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
          <span>Frequently Asked Questions & Technical Details</span>
        </div>
        <p className="card-desc">
          Everything you need to know about installation, privacy, and how the audio capture engine works.
        </p>

        <div style={{ marginTop: 8 }}>
          <FaqItem
            question="How does ChatGPT Audio Controls intercept speech audio?"
            answer={
              <p>
                The extension hooks into ChatGPT's page context at <code>document_start</code>. It transparently observes <code>HTMLMediaElement.prototype.play</code> and network pipelines (<code>fetch</code>, <code>XMLHttpRequest</code>, and <code>URL.createObjectURL</code>). When ChatGPT synthesizes Read Aloud voice streams, the extension captures the audio stream in memory, connects the visual seekbar, and enables instant downloads.
              </p>
            }
          />

          <FaqItem
            question="Does the extension collect or transmit any data?"
            answer={
              <p>
                <strong>Zero data collection.</strong> The extension operates 100% on-device in your browser. No telemetry, analytics, cookies, speech recordings, or prompts are ever uploaded to any external server.
              </p>
            }
          />

          <FaqItem
            question="Can I also use this as a Tampermonkey script?"
            answer={
              <p>
                Yes! We maintain an identical standalone userscript in <code>userscript/chatgpt-audio-controls.user.js</code> that you can install in Tampermonkey, Violentmonkey, or Greasemonkey for Firefox, Safari, or Chrome.
              </p>
            }
          />

          <FaqItem
            question="Why don't the controls show on small laptop screens?"
            answer={
              <p>
                The controls require at least ~440px of free horizontal space on the left and right sides of ChatGPT's prompt composer. If the browser window is too narrow, the controls automatically hide to avoid overlapping your chat input. Maximizing the window or zooming out will restore them.
              </p>
            }
          />

          <FaqItem
            question="How can I report a bug or contribute?"
            answer={
              <p>
                Visit our GitHub repository at <a href="https://github.com/infoxica/chatgpt-audio-controls" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>github.com/infoxica/chatgpt-audio-controls</a> to file an issue, submit a pull request, or suggest new features!
              </p>
            }
          />
        </div>
      </div>
    </div>
  );
};
