import React, { useState, useRef, useCallback, useEffect } from "react";

const PADS = [
  { id: 0, shape: "●", color: "#4DEFE0", glow: "rgba(77,239,224,0.55)" },
  { id: 1, shape: "▲", color: "#FF4DC4", glow: "rgba(255,77,196,0.55)" },
  { id: 2, shape: "■", color: "#FFE74D", glow: "rgba(255,231,77,0.55)" },
  { id: 3, shape: "◆", color: "#8C6DFF", glow: "rgba(140,109,255,0.55)" },
];

const LEVELS = {
  beginner: { label: "Beginner", startLen: 3, distractorChance: 0, reverseChance: 0, desc: "Forward sequences only" },
  intermediate: { label: "Intermediate", startLen: 4, distractorChance: 0.25, reverseChance: 0, desc: "Adds distractor flashes to ignore" },
  advanced: { label: "Advanced", startLen: 5, distractorChance: 0.35, reverseChance: 0.4, desc: "Distractors + reverse recall rounds" },
};

const SPEEDS = { relaxed: 750, steady: 550, brisk: 380 };

function useInterval() {
  const ref = useRef(null);
  const clear = () => ref.current && clearTimeout(ref.current);
  const set = (fn, ms) => { clear(); ref.current = setTimeout(fn, ms); };
  return { set, clear };
}

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [level, setLevel] = useState("beginner");
  const [speed, setSpeed] = useState("steady");

  const [sequence, setSequence] = useState([]);
  const [isReverseRound, setIsReverseRound] = useState(false);
  const [distractorIndex, setDistractorIndex] = useState(-1);
  const [playerInput, setPlayerInput] = useState([]);
  const [round, setRound] = useState(1);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [litPad, setLitPad] = useState(-1);
  const [litIsDistractor, setLitIsDistractor] = useState(false);
  const [activePad, setActivePad] = useState(-1);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ correctRounds: 0, totalRounds: 0, reverseRounds: 0 });
  const [shake, setShake] = useState(false);

  const timer = useInterval();
  const clickFeedbackRef = useRef(null);

  const cfg = LEVELS[level];

  const buildRound = useCallback((roundNum) => {
    const len = cfg.startLen + Math.floor((roundNum - 1) / 2);
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * PADS.length));
    const reverse = Math.random() < cfg.reverseChance;
    const hasDistractor = Math.random() < cfg.distractorChance;
    const dIndex = hasDistractor ? Math.floor(Math.random() * len) : -1;
    return { seq, reverse, dIndex };
  }, [cfg]);

  const startGame = () => {
    setRound(1);
    setStats({ correctRounds: 0, totalRounds: 0, reverseRounds: 0 });
    setScreen("playing");
    runRound(1);
  };

  const runRound = (roundNum) => {
    const { seq, reverse, dIndex } = buildRound(roundNum);
    setSequence(seq);
    setIsReverseRound(reverse);
    setDistractorIndex(dIndex);
    setPlayerInput([]);
    setPhase("showing");
    setMessage(reverse ? "Watch, then repeat it backwards" : "Watch the sequence");
    playback(seq, dIndex);
  };

  const isRoundReverseRef = useRef(false);
  useEffect(() => { isRoundReverseRef.current = isReverseRound; }, [isReverseRound]);

  const playback = (seq, dIndex) => {
    const delay = SPEEDS[speed];
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        setLitPad(-1);
        setLitIsDistractor(false);
        setPhase("input");
        setMessage(isRoundReverseRef.current ? "Your turn — reverse order" : "Your turn — repeat it");
        return;
      }
      setLitPad(seq[i]);
      setLitIsDistractor(i === dIndex);
      timer.set(() => {
        setLitPad(-1);
        setLitIsDistractor(false);
        timer.set(() => { i++; step(); }, 120);
      }, delay);
    };
    step();
  };

  const handlePadClick = (padId) => {
    if (phase !== "input") return;
    setActivePad(padId);
    clearTimeout(clickFeedbackRef.current);
    clickFeedbackRef.current = setTimeout(() => setActivePad(-1), 180);

    const expected = isReverseRound
      ? [...sequence].reverse().filter((_, idx) => sequence.length - 1 - idx !== distractorIndex)
      : sequence.filter((_, idx) => idx !== distractorIndex);

    const nextInput = [...playerInput, padId];
    const expectedSoFar = expected.slice(0, nextInput.length);
    const isCorrectSoFar = nextInput.every((p, idx) => p === expectedSoFar[idx]);

    if (!isCorrectSoFar) {
      setShake(true);
      setPhase("wrong");
      setMessage("Not quite — sequence broken");
      setStats((s) => ({ ...s, totalRounds: s.totalRounds + 1 }));
      timer.set(() => {
        setBest((b) => Math.max(b, round - 1));
        setScreen("end");
      }, 900);
      return;
    }

    setPlayerInput(nextInput);

    if (nextInput.length === expected.length) {
      setPhase("correct");
      setMessage("Nice — sequence matched");
      setStats((s) => ({
        correctRounds: s.correctRounds + 1,
        totalRounds: s.totalRounds + 1,
        reverseRounds: s.reverseRounds + (isReverseRound ? 1 : 0),
      }));
      timer.set(() => {
        const next = round + 1;
        setRound(next);
        runRound(next);
      }, 700);
    }
  };

  const resetToSetup = () => {
    timer.clear();
    clearTimeout(clickFeedbackRef.current);
    setScreen("setup");
    setPhase("idle");
    setPlayerInput([]);
    setSequence([]);
  };

  const playAgain = () => {
    setScreen("playing");
    setRound(1);
    setStats({ correctRounds: 0, totalRounds: 0, reverseRounds: 0 });
    timer.set(() => runRound(1), 50);
  };

  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [shake]);

  const accuracy = stats.totalRounds > 0 ? Math.round((stats.correctRounds / stats.totalRounds) * 100) : 0;
  const expectedProgressLen = sequence.length - (distractorIndex >= 0 ? 1 : 0);

  return (
    <div style={styles.page}>
      <div style={{ ...styles.phoneShell, animation: shake ? "shakeAnim 0.4s" : "none" }}>
        <style>{globalCss}</style>

        {screen === "setup" && (
          <SetupScreen level={level} setLevel={setLevel} speed={speed} setSpeed={setSpeed} onStart={startGame} />
        )}

        {screen === "playing" && (
          <PlayScreen
            round={round} best={best} sequence={sequence} litPad={litPad}
            litIsDistractor={litIsDistractor} activePad={activePad} phase={phase}
            message={message} playerInput={playerInput} expectedLen={expectedProgressLen}
            isReverseRound={isReverseRound} distractorIndex={distractorIndex}
            onPadClick={handlePadClick}
          />
        )}

        {screen === "end" && (
          <EndScreen
            round={round - 1} accuracy={accuracy} reverseRounds={stats.reverseRounds}
            best={Math.max(best, round - 1)} onPlayAgain={playAgain} onChangeSetup={resetToSetup}
          />
        )}
      </div>
    </div>
  );
}

function SetupScreen({ level, setLevel, speed, setSpeed, onStart }) {
  return (
    <div style={styles.setupWrap}>
      <div style={styles.setupGlow} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={styles.eyebrow}>ECHOLOOP</div>
        <h1 style={styles.h1}>Set your <span style={{ color: "#FF4DC4" }}>rhythm</span></h1>
        <p style={styles.subtext}>Watch the pattern. Repeat it back. Stay sharp as it grows.</p>

        <div style={styles.fieldLabel}>Level</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(LEVELS).map(([key, c]) => (
            <button key={key} onClick={() => setLevel(key)} style={{
              ...styles.levelCard,
              borderColor: level === key ? "#4DEFE0" : "rgba(122,130,168,0.25)",
              background: level === key ? "rgba(77,239,224,0.08)" : "rgba(255,255,255,0.02)",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={styles.levelName}>{c.label}</div>
                <div style={styles.levelDesc}>{c.desc}</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${level === key ? "#4DEFE0" : "rgba(122,130,168,0.4)"}`,
                background: level === key ? "#4DEFE0" : "transparent",
                boxShadow: level === key ? "inset 0 0 0 3px #0B0D17" : "none",
                flexShrink: 0,
              }} />
            </button>
          ))}
        </div>

        <div style={styles.fieldLabel}>Playback speed</div>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(SPEEDS).map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              ...styles.speedPill,
              borderColor: speed === s ? "#8C6DFF" : "rgba(122,130,168,0.25)",
              background: speed === s ? "#8C6DFF" : "transparent",
              color: speed === s ? "#0B0D17" : "#A6ADCC",
            }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>

        <div style={styles.fieldLabel}>Pad set (shape + color, both encode identity)</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          {PADS.map((p) => (
            <div key={p.id} style={{
              flex: 1, aspectRatio: "1", borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: p.color,
              background: `${p.color}1A`, border: `1.5px solid ${p.color}55`,
            }}>{p.shape}</div>
          ))}
        </div>

        <button style={styles.ctaBtn} onClick={onStart}>▶ Start sequence</button>
      </div>
    </div>
  );
}

function PlayScreen({ round, best, sequence, litPad, litIsDistractor, activePad, phase, message, playerInput, expectedLen, isReverseRound, onPadClick }) {
  return (
    <div style={styles.playWrap}>
      <div style={styles.setupGlow} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={styles.statRow}>
          <Stat label="ROUND" value={round} />
          <Stat label="MODE" value={isReverseRound ? "REVERSE" : "FORWARD"} color={isReverseRound ? "#FF4DC4" : "#4DEFE0"} center />
          <Stat label="BEST" value={best} right />
        </div>

        <div style={{
          ...styles.messageBar,
          borderColor: phase === "wrong" ? "rgba(255,77,196,0.5)" : phase === "correct" ? "rgba(77,239,224,0.5)" : "rgba(140,109,255,0.3)",
          color: phase === "wrong" ? "#FF4DC4" : phase === "correct" ? "#4DEFE0" : "#B7AEFF",
        }}>
          {isReverseRound && phase === "input" && "⟲ "}{message}
        </div>

        <div style={styles.padGrid}>
          {PADS.map((p) => {
            const isLit = litPad === p.id;
            const isActive = activePad === p.id;
            const showSkipBadge = isLit && litIsDistractor;
            return (
              <button key={p.id} onClick={() => onPadClick(p.id)} disabled={phase !== "input"} style={{
                ...styles.pad,
                borderColor: `${p.color}66`,
                background: (isLit || isActive) ? p.color : `${p.color}1A`,
                boxShadow: (isLit || isActive) ? `0 0 36px ${p.glow}` : "none",
                transform: (isLit || isActive) ? "scale(1.035)" : "scale(1)",
                cursor: phase === "input" ? "pointer" : "default",
              }}>
                <span style={{ fontSize: 38, color: (isLit || isActive) ? "#0B0D17" : p.color }}>{p.shape}</span>
                {showSkipBadge && <span style={styles.skipBadge}>SKIP</span>}
              </button>
            );
          })}
        </div>

        <div style={styles.progressDots}>
          {Array.from({ length: expectedLen }).map((_, i) => (
            <div key={i} style={{
              ...styles.dot,
              background: i < playerInput.length ? (phase === "wrong" ? "#FF4DC4" : "#4DEFE0") : "rgba(122,130,168,0.3)",
              boxShadow: i < playerInput.length ? `0 0 8px ${phase === "wrong" ? "#FF4DC4" : "#4DEFE0"}` : "none",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, right, center }) {
  return (
    <div style={{ textAlign: center ? "center" : right ? "right" : "left" }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: color || "#F2F4FF" }}>{value}</div>
    </div>
  );
}

function EndScreen({ round, accuracy, reverseRounds, best, onPlayAgain, onChangeSetup }) {
  return (
    <div style={styles.endWrap}>
      <div style={styles.setupGlow} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
        <div style={styles.endIcon}>⚡</div>
        <div style={styles.endTitle}>Sequence broken!</div>
        <div style={styles.endSub}>YOU REACHED ROUND {round}</div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreBig}>{round}</div>
          <div style={styles.scoreLabel}>Rounds completed</div>
          <div style={styles.scoreGrid}>
            <div><div style={styles.scoreMiniVal}>{accuracy}%</div><div style={styles.scoreMiniLabel}>Accuracy</div></div>
            <div><div style={styles.scoreMiniVal}>{reverseRounds}</div><div style={styles.scoreMiniLabel}>Reversed</div></div>
            <div><div style={styles.scoreMiniVal}>{best}</div><div style={styles.scoreMiniLabel}>Best run</div></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <button style={styles.btnSecondary} onClick={onChangeSetup}>Change setup</button>
          <button style={{ ...styles.ctaBtn, marginTop: 0, flex: 1 }} onClick={onPlayAgain}>Play again</button>
        </div>
      </div>
    </div>
  );
}

const globalCss = `
  @keyframes shakeAnim {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
`;

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05060B", padding: 24, fontFamily: "sans-serif" },
  phoneShell: { width: 380, height: 760, background: "#0B0D17", borderRadius: 32, overflow: "hidden", position: "relative", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(122,130,168,0.15)" },
  setupGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 260, background: "radial-gradient(ellipse at top, rgba(140,109,255,0.22), transparent 70%)", pointerEvents: "none" },
  setupWrap: { padding: "32px 24px 28px", height: "100%", overflowY: "auto", position: "relative" },
  playWrap: { padding: "28px 24px", height: "100%", position: "relative" },
  endWrap: { padding: "28px 24px", height: "100%", position: "relative" },
  eyebrow: { fontSize: 11, letterSpacing: "0.15em", color: "#4DEFE0", textTransform: "uppercase", marginBottom: 8 },
  h1: { fontSize: 30, fontWeight: 700, color: "#F2F4FF", letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.1 },
  subtext: { fontSize: 13, color: "#7A82A8", marginBottom: 8, lineHeight: 1.5 },
  fieldLabel: { fontSize: 11, letterSpacing: "0.1em", color: "#7A82A8", textTransform: "uppercase", margin: "20px 0 10px" },
  levelCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, border: "1.5px solid", cursor: "pointer", width: "100%", textAlign: "left" },
  levelName: { fontSize: 14, fontWeight: 600, color: "#F2F4FF" },
  levelDesc: { fontSize: 11.5, color: "#7A82A8", marginTop: 2 },
  speedPill: { flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  ctaBtn: { marginTop: 28, width: "100%", padding: "17px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #FF4DC4, #8C6DFF)", color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "0.01em", cursor: "pointer", boxShadow: "0 8px 24px rgba(255,77,196,0.3)" },
  btnSecondary: { flex: 1, padding: "17px 0", borderRadius: 16, border: "1.5px solid rgba(122,130,168,0.3)", background: "transparent", color: "#A6ADCC", fontWeight: 500, fontSize: 14, cursor: "pointer" },
  statRow: { display: "flex", justifyContent: "space-between", marginBottom: 18 },
  statLabel: { fontSize: 10.5, color: "#7A82A8", letterSpacing: "0.05em" },
  statValue: { fontSize: 17, fontWeight: 500, marginTop: 2 },
  messageBar: { fontSize: 12.5, textAlign: "center", border: "1px solid", borderRadius: 30, padding: "10px 16px", marginBottom: 28, background: "rgba(140,109,255,0.06)", transition: "all 0.2s" },
  padGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 280, margin: "0 auto", flex: 1 },
  pad: { borderRadius: 22, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", minHeight: 120, position: "relative" },
  skipBadge: { position: "absolute", top: -8, right: -8, background: "#FFE74D", color: "#0B0D17", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.05em" },
  progressDots: { display: "flex", gap: 8, justifyContent: "center", marginTop: 24 },
  dot: { width: 9, height: 9, borderRadius: "50%", transition: "all 0.2s" },
  endIcon: { width: 96, height: 96, borderRadius: "50%", background: "radial-gradient(circle, #FF4DC4, #8C6DFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, marginBottom: 22, boxShadow: "0 0 60px rgba(255,77,196,0.45)" },
  endTitle: { fontSize: 26, fontWeight: 700, color: "#F2F4FF", marginBottom: 6 },
  endSub: { color: "#7A82A8", fontSize: 12, marginBottom: 28, letterSpacing: "0.05em" },
  scoreCard: { width: "100%", background: "#14182B", borderRadius: 18, padding: 22, border: "1px solid rgba(122,130,168,0.2)", marginBottom: 24 },
  scoreBig: { fontSize: 44, fontWeight: 700, color: "#4DEFE0", letterSpacing: "-0.02em" },
  scoreLabel: { fontSize: 10.5, color: "#7A82A8", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 },
  scoreGrid: { display: "flex", justifyContent: "space-around", marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(122,130,168,0.15)" },
  scoreMiniVal: { fontSize: 19, fontWeight: 600, color: "#F2F4FF" },
  scoreMiniLabel: { fontSize: 9.5, color: "#7A82A8", textTransform: "uppercase", marginTop: 2 },
};