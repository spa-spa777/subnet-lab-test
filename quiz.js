'use strict';
(() => {
  const el = id => document.getElementById(id);
  const STORE = 'subnet-lab-quiz-v1.2-stats';
  const TYPES = ['network','broadcast','hosts','mask'];
  const LABELS = {network:'ネットワークアドレス',broadcast:'ブロードキャストアドレス',hosts:'使用可能ホスト数',mask:'サブネットマスク'};
  let stats = {answered:0,correct:0,byType:{}};
  try {const s=JSON.parse(localStorage.getItem(STORE));if(s && Number.isSafeInteger(s.answered) && Number.isSafeInteger(s.correct) && s.answered>=s.correct && s.correct>=0 && typeof s.byType==='object' && s.byType) stats=s;}catch(e){}
  let round=0,score=0,current=null,locked=false,active=false;
  const dotted = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  const maskFor = p => (0xffffffff << (32-p))>>>0;
  const rand = max => {if(globalThis.crypto && crypto.getRandomValues){const a=new Uint32Array(1);const limit=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;}return Math.floor(Math.random()*max);};
  const choose = a => a[rand(a.length)];
  function makeQuestion(){
    const prefix=choose([16,18,20,22,24,25,26,27,28,29,30]);
    const ip=((choose([10,172,192])*16777216) + (rand(256)<<16) + (rand(256)<<8) + rand(256))>>>0;
    const mask=maskFor(prefix),network=(ip&mask)>>>0,broadcast=(network|(~mask>>>0))>>>0;
    const type=choose(TYPES),hosts=2**(32-prefix)-2;
    const answer={network:dotted(network),broadcast:dotted(broadcast),hosts:String(hosts),mask:dotted(mask)}[type];
    const hostbits=32-prefix,block=2**hostbits;
    const explanations={
      network:`/${prefix} のマスクは ${dotted(mask)}。IPアドレスとマスクのAND演算でネットワークアドレス ${dotted(network)} が求まります。`,
      broadcast:`ネットワークアドレス ${dotted(network)} のホスト部 ${hostbits} ビットをすべて1にすると ${dotted(broadcast)} です。`,
      hosts:`ホスト部は ${hostbits} ビットなので総数は 2^${hostbits} = ${String(block)}。通常はネットワークとブロードキャストの2つを引き、${String(hosts)} 台です。`,
      mask:`/${prefix} は左から ${prefix} ビットが1、残り ${hostbits} ビットが0のマスクです。10進数に直すと ${dotted(mask)} です。`
    };
    return {ip:dotted(ip),prefix,type,answer,explain:explanations[type]};
  }
  function renderStats(){el('quizLifetime').textContent=`累計 ${stats.answered}問 / 正解 ${stats.correct}問 / 正答率 ${stats.answered?Math.round(stats.correct/stats.answered*100):0}%`;}
  function showQuestion(){current=makeQuestion();locked=false;round++;el('quizProgress').textContent=`第 ${round} / 10 問　今回の正解 ${score} 問`;el('quizPrompt').textContent=`${current.ip}/${current.prefix} の ${LABELS[current.type]} は？`;el('quizAnswer').value='';el('quizAnswer').placeholder=current.type==='hosts'?'例：62（数字のみ）':'例：192.168.1.0';el('quizAnswer').inputMode=current.type==='hosts'?'numeric':'decimal';el('quizFeedback').textContent='';el('quizFeedback').className='quiz-feedback';el('quizCheck').disabled=false;el('quizNext').hidden=true;el('quizAnswer').disabled=false;}
  function normalize(value,type){const v=value.trim();if(type==='hosts'){if(!/^\d{1,10}$/.test(v))return null;return String(Number(v));}const parts=v.split('.');if(parts.length!==4||parts.some(x=>!/^(0|[1-9]\d{0,2})$/.test(x)||Number(x)>255))return null;return parts.map(Number).join('.');}
  function saveStats(){try{localStorage.setItem(STORE,JSON.stringify(stats));}catch(e){el('quizStorageNote').textContent='学習履歴を保存できませんでした。ブラウザの保存設定をご確認ください。';}}
  function check(){if(!active||locked)return;const value=normalize(el('quizAnswer').value,current.type);if(value===null){el('quizFeedback').textContent=current.type==='hosts'?'数字のみで入力してください。':'IPv4形式（例：192.168.1.0）で入力してください。';el('quizFeedback').className='quiz-feedback';return;}locked=true;const ok=value===current.answer;if(ok)score++;stats.answered++;if(ok)stats.correct++;if(!stats.byType[current.type])stats.byType[current.type]={answered:0,correct:0};stats.byType[current.type].answered++;if(ok)stats.byType[current.type].correct++;saveStats();renderStats();el('quizFeedback').textContent=`${ok?'正解！':'不正解'} 正解：${current.answer}\n${current.explain}`;el('quizFeedback').className='quiz-feedback '+(ok?'quiz-correct':'quiz-incorrect');el('quizCheck').disabled=true;el('quizAnswer').disabled=true;el('quizNext').hidden=false;el('quizNext').textContent=round===10?'結果を見る':'次の問題';}
  function finish(){active=false;current=null;el('quizQuestionArea').hidden=true;el('quizSummary').hidden=false;el('quizFinal').textContent=`10問中 ${score}問正解（${score*10}%）`;const rows=TYPES.map(type=>{const s=stats.byType[type]||{answered:0,correct:0};return `${LABELS[type]}：${s.answered?Math.round(s.correct/s.answered*100)+'%':'未回答'}（${s.correct}/${s.answered}）`;});el('quizWeakness').textContent='累計・分野別の正答率\n'+rows.join('\n');}
  function start(){active=true;round=0;score=0;el('quizIntro').hidden=true;el('quizSummary').hidden=true;el('quizQuestionArea').hidden=false;showQuestion();}
  el('quizStart').addEventListener('click',start);el('quizRestart').addEventListener('click',start);el('quizCheck').addEventListener('click',check);el('quizNext').addEventListener('click',()=>{if(!locked)return;if(round>=10)finish();else showQuestion();});el('quizAnswer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!locked)check();else if(round>=10)finish();else showQuestion();}});renderStats();
})();
