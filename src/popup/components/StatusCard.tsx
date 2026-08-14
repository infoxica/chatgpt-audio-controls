import React, { useEffect, useState } from "react";
import { Radio, CheckCircle2, AlertCircle, Play, Pause } from "lucide-react";
import { PlaybackState } from "../../shared/types";

export const StatusCard: React.FC = () => {
  const [isOnChatGPT, setIsOnChatGPT] = useState<boolean>(false);
  const [playbackState] = useState<PlaybackState>({
    hasMedia: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    volume: 1,
    isMuted: false,
    formattedCurrent: "0:00",
    formattedDuration: "0:00",
  });

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.url && activeTab.url.includes("chatgpt.com")) {
          setIsOnChatGPT(true);
        } else {
          setIsOnChatGPT(false);
        }
      });
    }
  }, []);

  return (
    <div className="popup-body">
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Radio size={13} /> Active Tab Connection
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: isOnChatGPT ? "var(--success)" : "var(--warning)",
            }}
          >
            {isOnChatGPT ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {isOnChatGPT ? "ChatGPT Connected" : "ChatGPT Not Focused"}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
          {isOnChatGPT
            ? "The audio controls engine is active and ready to hook read-aloud playback."
            : "Navigate to chatgpt.com to see the integrated controls beside the composer."}
        </p>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Live Audio Status</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {playbackState.hasMedia ? "Audio Detected" : "Idle"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: playbackState.isPlaying ? "var(--accent)" : "var(--bg-card-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              {playbackState.isPlaying ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {playbackState.isPlaying ? "Reading Aloud..." : "No Active Speech"}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {playbackState.formattedCurrent} / {playbackState.formattedDuration}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
