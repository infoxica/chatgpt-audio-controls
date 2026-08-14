import React, { useEffect, useState } from "react";
import { Radio, CheckCircle2, AlertCircle, Play, Pause, Volume2 } from "lucide-react";
import { PlaybackState } from "../../shared/types";

export const StatusCard: React.FC = () => {
  const [isOnChatGPT, setIsOnChatGPT] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
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

  const checkStatus = () => {
    if (typeof chrome !== "undefined" && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const isCgpt = Boolean(activeTab?.url && activeTab.url.includes("chatgpt.com"));
        setIsOnChatGPT(isCgpt);

        if (isCgpt && activeTab.id) {
          // 1. Try chrome.storage.local first
          if (chrome.storage?.local) {
            chrome.storage.local.get("cgpt-ra-live-state", (res) => {
              const live = res?.["cgpt-ra-live-state"];
              if (live && Date.now() - (live.updatedAt || 0) < 60000) {
                setPlaybackState(live);
              }
            });
          }

          // 2. Query tab directly via scripting if available for instantaneous state
          if (chrome.scripting?.executeScript) {
            chrome.scripting
              .executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                  try {
                    const raw = localStorage.getItem("cgpt-ra-live-state");
                    return raw ? JSON.parse(raw) : null;
                  } catch (_) {
                    return null;
                  }
                },
              })
              .then((results) => {
                const live = results?.[0]?.result;
                if (live && Date.now() - (live.updatedAt || 0) < 60000) {
                  setPlaybackState(live);
                }
              })
              .catch(() => {});
          }
        }
      });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 600);
    return () => clearInterval(interval);
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
            ? "The audio controls engine is active and intercepting ChatGPT speech."
            : "Navigate to chatgpt.com to see the integrated controls beside the composer."}
        </p>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span>Live Audio Status</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: playbackState.isPlaying ? "var(--success)" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {playbackState.isPlaying && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--success)",
                  display: "inline-block",
                  animation: "pulse 1.2s infinite",
                }}
              />
            )}
            {playbackState.isPlaying
              ? "Reading Aloud (Active)"
              : playbackState.hasMedia
              ? "Audio Paused"
              : "Idle / No Speech"}
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
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: playbackState.isPlaying ? "var(--accent)" : "var(--bg-card-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: playbackState.isPlaying ? "0 2px 8px var(--accent-glow)" : "none",
              }}
            >
              {playbackState.isPlaying ? (
                <Play size={15} fill="currentColor" />
              ) : (
                <Pause size={15} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {playbackState.isPlaying
                  ? "Speech Playing"
                  : playbackState.hasMedia
                  ? "Speech Ready (Paused)"
                  : "No Speech Detected"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 1,
                }}
              >
                {playbackState.formattedCurrent} / {playbackState.formattedDuration}
              </div>
            </div>
          </div>

          {playbackState.hasMedia && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              <span>{playbackState.speed}×</span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <Volume2 size={12} /> {Math.round(playbackState.volume * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
