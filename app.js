'use strict';
const $=id=>document.getElementById(id);let latest=null;
function parseIP(raw){const p=raw.trim().split('.');if(p.length!==4||p.some(x=>!/^(0|[1-9]\d{0,2})$/.test(x)||Number(x)>255))return null;return p.map(Number)}
function ipNum(p){return (((p[0]*16777216)+(p[1]<<16)+(p[2]<<8)+p[3])>>>0)}
function dotted(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.')}
function setPrefix(n){$('prefix').value=n;$('slider').value=n;calculate()}
function calculate(){const p=parseIP($('ip').value),raw=$('prefix').value.trim(),n=Number(raw);$('error').textContent='';if(!p){$('error').textContent='IPv4アドレスを正しく入力してください（例：192.168.1.18）。';hide();return}if(raw===''||!/^(0|[1-9]\d{0,2})$/.test(raw)||!Number.isInteger(n)||n<0||n>32){$('error').textContent='CIDRは0〜32の整数を入力してください。';hide();return}$('slider').value=n;$('prefixText').textContent='/'+n;const ip=ipNum(p),mask=n===0?0:(0xffffffff<<(32-n))>>>0,wildcard=(~mask)>>>0,network=(ip&mask)>>>0,broadcast=(network|wildcard)>>>0,total=2**(32-n),hosts=n===32?1:n===31?2:Math.max(0,total-2),first=n>=31?network:network+1,last=n>=31?broadcast:broadcast-1;const r={ip:dotted(ip),prefix:n,network:dotted(network),mask:dotted(mask),wildcard:dotted(wildcard),broadcast:dotted(broadcast),hosts,total,range:n===32?dotted(network):`${dotted(first)} 〜 ${dotted(last)}`,hostbits:32-n};latest=r;for(const key of ['network','mask','wildcard','broadcast','hosts','total','range','hostbits'])$(key).textContent=typeof r[key]==='number'?r[key].toLocaleString('ja-JP'):r[key];$('special').textContent=n===31?'※ /31はポイントツーポイントリンク向け。2アドレスを利用可能として表示（RFC 3021）。':n===32?'※ /32は単一アドレスを示します。通常のLAN用サブネットとは異なります。':'';const bits=Array.from({length:32},(_,i)=>({bit:((ip>>>(31-i))&1),type:i<n?'net':'host'}));$('bitgrid').innerHTML=Array.from({length:4},(_,oct)=>`<div class="octet"><div class="bits">${bits.slice(oct*8,oct*8+8).map(b=>`<span class="bit ${b.type}">${b.bit}</span>`).join('')}</div><div class="octlabel">第${oct+1}オクテット</div></div>`).join('');$('explain').textContent=`/ ${n} は先頭 ${n} ビットがネットワーク部、残り ${32-n} ビットがホスト部です。サブネットマスクは ${r.mask} です。`; $('resultCard').classList.remove('hidden');$('bitsCard').classList.remove('hidden')}
function hide(){latest=null;$('resultCard').classList.add('hidden');$('bitsCard').classList.add('hidden')}
$('ip').addEventListener('input',calculate);$('prefix').addEventListener('input',calculate);$('slider').addEventListener('input',e=>setPrefix(Number(e.target.value)));document.querySelectorAll('[data-prefix]').forEach(b=>b.addEventListener('click',()=>setPrefix(Number(b.dataset.prefix))));$('copy').addEventListener('click',async()=>{if(!latest)return;const r=latest;const s=`IPv4: ${r.ip}/${r.prefix}\nネットワーク: ${r.network}\nマスク: ${r.mask}\nワイルドカード: ${r.wildcard}\nブロードキャスト: ${r.broadcast}\n使用可能ホスト: ${r.hosts}\n使用可能範囲: ${r.range}\n総アドレス: ${r.total}`;try{await navigator.clipboard.writeText(s);$('copy').textContent='コピーしました ✓';setTimeout(()=>$('copy').textContent='計算結果をコピー',1800)}catch(e){$('copy').textContent='コピーできませんでした';setTimeout(()=>$('copy').textContent='計算結果をコピー',1800)}});calculate();if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

// v1.1: /24 subnet splitting visualizer; all operations run locally.
function renderSplit(){
  const parsed=parseIP($('ip').value),summary=$('splitSummary'),visual=$('splitVisual'),list=$('splitList');
  if(!parsed){summary.textContent='正しいIPv4アドレスを入力すると分割結果を表示します。';visual.replaceChildren();list.replaceChildren();return;}
  const prefix=Number($('splitPrefix').value);
  const base=(ipNum(parsed)&0xffffff00)>>>0;
  const count=2**(prefix-24),size=2**(32-prefix),usable=size-2;
  summary.textContent=`${dotted(base)}/24 → /${prefix}：${count}個のサブネット、各${size}アドレス（使用可能ホスト${usable}）`;
  const visualFrag=document.createDocumentFragment(),listFrag=document.createDocumentFragment();
  for(let i=0;i<count;i++){
    const start=(base+i*size)>>>0,end=(start+size-1)>>>0;
    const bar=document.createElement('span');bar.className='split-segment';bar.title=`${dotted(start)}/${prefix}`;visualFrag.append(bar);
    const card=document.createElement('div');card.className='split-item';
    const heading=document.createElement('strong');heading.textContent=`#${i+1}  ${dotted(start)}/${prefix}`;
    const detail=document.createElement('div');detail.textContent=`範囲：${dotted(start)} ～ ${dotted(end)}`;
    const hosts=document.createElement('small');hosts.textContent=`ホスト：${dotted(start+1)} ～ ${dotted(end-1)}`;
    card.append(heading,detail,hosts);listFrag.append(card);
  }
  visual.replaceChildren(visualFrag);visual.setAttribute('aria-label',`${count}個に分割`);list.replaceChildren(listFrag);
}
$('splitPrefix').addEventListener('change',renderSplit);
$('ip').addEventListener('input',renderSplit);
renderSplit();
