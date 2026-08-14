import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, Download, CircleHelp } from "lucide-react";
import { SPEED_PRESETS } from "../../shared/constants";

export const InteractivePlayerDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(14.2);
  const [duration] = useState<number>(45.0);
  const [speed, setSpeed] = useState<number>(1.25);
  const [volume, setVolume] = useState<number>(0.85);
  const [speedMenuOpen, setSpeedMenuOpen] = useState<boolean>(false);
  const [volumeOpen, setVolumeOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(duration, prev + 0.1 * speed);
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, duration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <Play size={16} color="var(--accent)" />
          <span>Interactive Player Simulator</span>
        </div>
        <p className="card-desc">
          Test out the exact floating capsule UI, seekbar ergonomics, and responsive controls as they appear beside ChatGPT's composer.
        </p>

        {/* Live Audio Visualizer */}
        <div className="demo-player-box">
          <div className="demo-visualizer">
            {Array.from({ length: 24 }).map((_, i) => {
              const h = isPlaying
                ? Math.sin((currentTime * 4 + i) * 0.7) * 18 + 22
                : 6;
              return (
                <div
                  key={i}
                  className="sound-bar"
                  style={{
                    height: `${h}px`,
                    opacity: isPlaying ? 0.9 : 0.25,
                    backgroundColor: i % 2 === 0 ? "var(--accent)" : "#38bdf8",
                  }}
                />
              );
            })}
          </div>

          {/* ChatGPT-style Floating Controls Mockup */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Left Fused Player */}
            <div
              style={{
                width: 400,
                background: "rgba(32, 32, 32, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 24,
                padding: "8px 14px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {/* Transport Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button
                  className="icon-button"
                  onClick={() => setCurrentTime((t) => Math.max(0, t - 10))}
                  title="Back 10s"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  className="icon-button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                  }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button
                  className="icon-button"
                  onClick={() => setCurrentTime((t) => Math.min(duration, t + 10))}
                  title="Forward 10s"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {/* Seeker Row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.6)" }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="custom-range"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Right Action Rail */}
            <div
              style={{
                background: "rgba(32, 32, 32, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 24,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                position: "relative",
              }}
            >
              {/* Speed Button */}
              <button
                className="btn-outline"
                style={{
                  height: 30,
                  padding: "0 8px",
                  borderRadius: 15,
                  fontSize: 12,
                  border: "none",
                  background: "transparent",
                  color: "#fff",
                }}
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              >
                {speed}×
              </button>

              {/* Speed Popover */}
              {speedMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: 0,
                    background: "rgba(40,40,40,0.98)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: 4,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 3,
                    zIndex: 100,
                  }}
                >
                  {SPEED_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSpeed(s);
                        setSpeedMenuOpen(false);
                      }}
                      style={{
                        padding: "4px 8px",
                        background: speed === s ? "rgba(255,255,255,0.15)" : "transparent",
                        border: "none",
                        color: "#fff",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              )}

              {/* Volume Button */}
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setVolumeOpen(true)}
                onMouseLeave={() => setVolumeOpen(false)}
              >
                <button className="icon-button" style={{ color: "#fff" }}>
                  {volume <= 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                </button>
                {volumeOpen && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 4px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 38,
                      height: 120,
                      background: "rgba(40,40,40,0.98)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 18,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 6,
                      zIndex: 100,
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      style={{
                        transform: "rotate(-90deg)",
                        width: 80,
                        accentColor: "var(--accent)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Shortcuts Help */}
              <button className="icon-button" style={{ color: "#fff" }} title="Shortcuts">
                <CircleHelp size={16} />
              </button>

              {/* Download Button */}
              <button
                className="icon-button"
                style={{ color: "#fff" }}
                title="Download Audio"
                onClick={() => alert("Simulation: In ChatGPT, this instantly downloads the captured .mp3 / .wav / .m4a audio stream!")}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
