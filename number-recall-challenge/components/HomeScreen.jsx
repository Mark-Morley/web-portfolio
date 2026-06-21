export default function HomeScreen({ setScreen, setLevel }) {
  return (
    <div className="container">
      <h1>Number Recall Game</h1>

      <select onChange={(e)=>setLevel(e.target.value)}>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
        <option value="expert">Expert</option>
      </select>

      <button onClick={()=>setScreen('game')}>Start</button>
    </div>
  );
}
