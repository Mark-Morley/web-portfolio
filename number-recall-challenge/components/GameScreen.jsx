import { useEffect, useState } from 'react';

export default function GameScreen({ level, score, setScore, setScreen }) {

  const [seq, setSeq] = useState('');
  const [show, setShow] = useState(true);
  const [answer, setAnswer] = useState('');

  const map = { beginner:3, intermediate:5, advanced:7, expert:10 };

  useEffect(() => {
    generate();
  }, []);

  function generate(){
    let len = map[level];
    let s = '';
    for(let i=0;i<len;i++){
      s += Math.floor(Math.random()*10);
    }
    setSeq(s);
    setShow(true);
    setTimeout(()=>setShow(false), 2500);
  }

  function check(){
    if(answer === seq){
      setScore(score+10);
      generate();
      setAnswer('');
    } else {
      setScreen('result');
    }
  }

  return (
    <div className="container">
      <h2>Score: {score}</h2>

      {show ? (
        <div className="sequence">{seq}</div>
      ) : (
        <>
          <input value={answer} onChange={(e)=>setAnswer(e.target.value)} />
          <button onClick={check}>Submit</button>
        </>
      )}
    </div>
  );
}
