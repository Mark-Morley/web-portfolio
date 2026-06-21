import { useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import "./App.css";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [level, setLevel] = useState("beginner");
  const [score, setScore] = useState(0);

  return (
    <>
      {screen === "home" && <HomeScreen setScreen={setScreen} setLevel={setLevel} />}
      {screen === "game" && <GameScreen level={level} score={score} setScore={setScore} setScreen={setScreen} />}
      {screen === "result" && <ResultScreen score={score} setScore={setScore} setScreen={setScreen} />}
    </>
  );
}
