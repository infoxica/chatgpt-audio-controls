import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, Download, CircleHelp, Minimize2 } from "lucide-react";
import { SPEED_PRESETS } from "../../shared/constants";

export const InteractivePlayerDemo: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(14.2);
  const [duration] = useState<number>(45.0);
  const [speed, setSpeed] = useState<number>(1.25);
  const [volume, setVolume] = useState<number>(0.85);
  const [speedMenuOpen, setSpeedMenuOpen] = useState<boolean>(false);
  const [volumeOpen, setVolumeOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

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

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setVolume((v) => Math.max(0, Math.min(1, parseFloat((v + delta).toFixed(2)))));
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <Play size={16} color="var(--accent)" />
          <span>Interactive Player Simulator</span>
        </div>
        <p className="card-desc">
          Live interactive simulation matching the exact 48px dual-capsule controls beside ChatGPT's composer prompt.
        </p>

        {/* Live Audio Visualizer & Player Sandbox */}
        <div className="demo-player-box">
          <div className="demo-visualizer">
            {Array.from({ length: 28 }).map((_, i) => {
              const h = isPlaying
                ? Math.sin((currentTime * 4 + i) * 0.6) * 18 + 22
                : 5;
              return (
                <div
                  key={i}
                  className="sound-bar"
                  style={{
                    height: `${h}px`,
                    opacity: isPlaying ? 0.95 : 0.25,
                    backgroundColor: i % 2 === 0 ? "var(--accent)" : "#38bdf8",
                  }}
                />
              );
            })}
          </div>

          {/* Floating Dual-Capsule Layout (1-to-1 replica of ChatGPT integration) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90, width: "100%" }}>
            
            {!isExpanded ? (
              /* Floating Mini Trigger Button */
              <button
                onClick={() => setIsExpanded(true)}
                title="Expand ChatGPT Audio Controls"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--bg-primary, #212121)",
                  border: "1px solid var(--border-default, rgba(255, 255, 255, 0.15))",
                  color: "var(--text-primary, #ececec)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                  transition: "transform 0.15s ease",
                }}
              >
                <Play size={20} fill="var(--accent)" color="var(--accent)" />
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                
                {/* Fused Left Capsule (Height 48px, Radius 24px) */}
                <div
                  style={{
                    position: "relative",
                    width: 380,
                    height: 48,
                    background: "var(--bg-primary, #212121)",
                    border: "1px solid var(--border-default, rgba(255, 255, 255, 0.12))",
                    borderRadius: 24,
                    padding: "0 14px",
                    display: "block",
                    boxShadow: "0 4px 18px rgba(0,0,0,0.32)",
                  }}
                >
                  {/* Transport Pill rising above: top -46px, border-radius 24px */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -46,
                      transform: "translateX(-50%)",
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "4px 8px",
                      background: "var(--bg-primary, #212121)",
                      border: "1px solid var(--border-default, rgba(255, 255, 255, 0.12))",
                      borderRadius: 24,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}
                  >
                    <button
                      className="icon-button"
                      style={{ width: 36, height: 36, borderRadius: "50%" }}
                      onClick={() => setCurrentTime((t) => Math.max(0, t - 10))}
                      title="Back 10 seconds"
                    >
                      <RotateCcw size={18} />
                    </button>

                    <button
                      className="icon-button"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                        color: "var(--theme-submit-btn-text, #fff)",
                        boxShadow: "0 2px 10px rgba(57, 104, 200, 0.4)",
                      }}
                      onClick={() => setIsPlaying(!isPlaying)}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <button
                      className="icon-button"
                      style={{ width: 36, height: 36, borderRadius: "50%" }}
                      onClick={() => setCurrentTime((t) => Math.min(duration, t + 10))}
                      title="Forward 10 seconds"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>

                  {/* Progress & Seeker Row */}
                  <div style={{ height: 46, display: "grid", gridTemplateColumns: "70px minmax(0, 1fr)", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--text-muted, rgba(255,255,255,0.65))" }}>
                      {formatTime(currentTime)}/{formatTime(duration)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={currentTime}
                      onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                      className="custom-range"
                    />
                  </div>
                </div>

                {/* Right Action Rail (Height 48px, Radius 24px) */}
                <div
                  style={{
                    height: 48,
                    background: "var(--bg-primary, #212121)",
                    border: "1px solid var(--border-default, rgba(255, 255, 255, 0.12))",
                    borderRadius: 24,
                    padding: "5px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.32)",
                    position: "relative",
                  }}
                >
                  {/* 1. Speed */}
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn-outline"
                      style={{
                        height: 36,
                        padding: "0 10px",
                        borderRadius: 18,
                        fontSize: 12.5,
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        fontWeight: 600,
                      }}
                      onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                    >
                      {speed}×
                    </button>

                    {speedMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 8px)",
                          left: 0,
                          background: "var(--bg-secondary, #303030)",
                          border: "1px solid var(--border-default, rgba(255,255,255,0.12))",
                          borderRadius: 12,
                          padding: 4,
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 3,
                          zIndex: 100,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
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
                              background: speed === s ? "var(--interactive-bg-secondary-hover, rgba(255,255,255,0.12))" : "transparent",
                              border: "none",
                              color: "var(--text-primary, #fff)",
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
                  </div>

                  {/* 2. Volume with Hover-Scroll */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => setVolumeOpen(true)}
                    onMouseLeave={() => setVolumeOpen(false)}
                    onWheel={handleVolumeWheel}
                  >
                    <button
                      className="icon-button"
                      style={{ width: 36, height: 36 }}
                      title="Volume (Scroll on icon to adjust)"
                      onClick={() => setVolume((v) => (v > 0 ? 0 : 0.8))}
                    >
                      {volume <= 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                    </button>

                    {volumeOpen && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 6px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 44,
                          height: 165,
                          background: "var(--bg-secondary, #303030)",
                          border: "1px solid var(--border-default, rgba(255,255,255,0.12))",
                          borderRadius: 22,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          padding: "6px 5px",
                          zIndex: 100,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="custom-range"
                          style={{
                            position: "absolute",
                            top: 56,
                            left: "50%",
                            width: 96,
                            height: 18,
                            transform: "translate(-50%, -50%) rotate(-90deg)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            left: 4,
                            right: 4,
                            bottom: 6,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderTop: "1px solid var(--border-default, rgba(255,255,255,0.12))",
                            fontSize: 9.5,
                            fontWeight: 600,
                            opacity: 0.8,
                          }}
                        >
                          {Math.round(volume * 100)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Download Button */}
                  <button
                    className="icon-button"
                    style={{ width: 36, height: 36 }}
                    title="Download Audio"
                    onClick={() => alert("Simulation: In ChatGPT, this instantly downloads the captured speech response file!")}
                  >
                    <Download size={18} />
                  </button>

                  {/* 4. Help Icon */}
                  <div style={{ position: "relative" }}>
                    <button
                      className="icon-button"
                      style={{ width: 36, height: 36 }}
                      title="Keyboard shortcuts & gestures"
                      onClick={() => setHelpOpen(!helpOpen)}
                    >
                      <CircleHelp size={18} />
                    </button>

                    {helpOpen && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 8px)",
                          right: 0,
                          width: 260,
                          background: "var(--bg-secondary, #303030)",
                          border: "1px solid var(--border-default, rgba(255,255,255,0.12))",
                          borderRadius: 12,
                          padding: "10px 12px",
                          zIndex: 100,
                          fontSize: 11,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Hotkeys & Gestures</div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span>Play / Pause</span>
                          <span className="kbd">Alt + P</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span>Skip 10s</span>
                          <span className="kbd">Alt + ← / →</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span>Volume Scroll</span>
                          <span className="kbd">Scroll on 🔈</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Collapse Button */}
                  <button
                    className="icon-button"
                    style={{ width: 36, height: 36, marginLeft: 2 }}
                    title="Collapse Player"
                    onClick={() => setIsExpanded(false)}
                  >
                    <Minimize2 size={16} />
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
