export default function ResultScreen({ score, setScore, setScreen }) {

  function restart(){
    setScore(0);
    setScreen('home');
  }

  return (
    <div className="container">
      <h1>Game Over</h1>
      <h2>Score: {score}</h2>
      <button onClick={restart}>Play Again</button>
    </div>
  );
}
