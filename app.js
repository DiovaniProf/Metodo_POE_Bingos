(function(){
'use strict';
const L=window.BingoLogic;
const $=id=>document.getElementById(id);
const STORAGE_KEY='bingo_inteligente_v1';
const initialRows=L.ART_GROUPS.map(row=>[...row]);
let state={sourceRows:initialRows,mode:'groups',items:L.defaultItems(),draws:[],queue:[],players:[],gridRows:10,gridCols:3,autoLayout:true,cardRows:4,cardCols:5,cardAuto:true};
let saved=false;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let toastTimer;
function notify(message,error=false){const e=$('toast');e.textContent=message;e.className='toast on'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.className='toast',4500)}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));saved=true;$('saveStatus').textContent='Salvo neste navegador'}catch(e){$('saveStatus').textContent='Sem gravação local disponível';saved=false}}
function validateState(input){
 if(!input||!Array.isArray(input.sourceRows)||!Array.isArray(input.draws)||!Array.isArray(input.players))throw new Error('Arquivo de sessão inválido.');
 const mode=input.mode==='individual'?'individual':'groups';
 const rows=L.tidyRows(input.sourceRows);const items=L.groupsToItems(rows,mode);
 const ids=new Set(items.map(i=>i.id));
 const draws=[...new Set(input.draws.filter(id=>ids.has(id)))];
 const queue=(input.queue||[]).filter(id=>ids.has(id)&&!draws.includes(id));
 const players=L.parsePlayers([{name:'Cartelas',rows:[['Participante','Pedra 1'],...input.players.map(p=>[p.name,...p.items])]}]);
 return {sourceRows:rows,mode,items,draws,queue,players,
  gridRows:Math.max(1,Math.min(100,Number(input.gridRows)||10)),gridCols:Math.max(1,Math.min(20,Number(input.gridCols)||3)),autoLayout:input.autoLayout!==false,
  cardRows:Math.max(1,Math.min(100,Number(input.cardRows)||4)),cardCols:Math.max(1,Math.min(20,Number(input.cardCols)||5)),cardAuto:input.cardAuto!==false};
}
function loadStored(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(data){state=validateState(data);$('saveStatus').textContent='Sessão recuperada'}}catch(e){console.warn('Dados locais não recuperados:',e)}}
function setControls(){
 $('drawMode').value=state.mode;$('gridRows').value=state.gridRows;$('gridCols').value=state.gridCols;$('autoLayout').checked=state.autoLayout;
 $('cardRows').value=state.cardRows;$('cardCols').value=state.cardCols;$('cardAuto').checked=state.cardAuto;
}
function adjustLayout(){
 const length=state.items.length,cols=Math.max(1,state.gridCols);
 const required=Math.ceil(length/cols);
 if(state.autoLayout)state.gridRows=required;
 else if(state.gridRows*cols<length){state.gridRows=required;notify('O número de linhas foi ampliado para que nenhuma pedra fique oculta.')}
 $('gridRows').value=state.gridRows;
 $('layoutHint').textContent=`${state.gridRows} linhas × ${state.gridCols} colunas · ${state.gridRows*state.gridCols} posições`;
}
function adjustCardLayout(){
 const maxCount=state.players.length?Math.max(1,...state.players.map(p=>p.items.length)):20;
 const required=Math.ceil(maxCount/Math.max(1,state.cardCols));
 if(state.cardAuto)state.cardRows=required;
 else if(state.cardRows*state.cardCols<maxCount){state.cardRows=required;notify('As linhas das cartelas foram ampliadas para exibir todas as pedras.')}
 $('cardHint').textContent=`${state.cardRows} linhas × ${state.cardCols} colunas · ${state.cardRows*state.cardCols} posições`;
}
function render(){
 adjustLayout();adjustCardLayout();setControls();
 const s=L.computeScores(state.items,state.draws,state.players);
 $('statTotal').textContent=state.items.length;
 $('statDrawn').textContent=state.draws.length;
 $('statPlayers').textContent=state.players.length;
 $('statWinners').textContent=s.filter(p=>p.complete).length;
 const last=state.items.find(it=>it.id===state.draws.at(-1));
 $('statLast').textContent=last?.text||'—';
 $('currentStone').textContent=last?.text||'Aguardando o primeiro sorteio';
 $('btnDraw').disabled=state.draws.length>=state.items.length;
 let next='';
 if(state.draws.length>=state.items.length)next='Todas as pedras foram sorteadas.';
 else if(state.queue.length)next='Próxima pedra vinculada: '+(state.items.find(it=>it.id===state.queue[0])?.text||'');
 else next=state.mode==='groups'?'Próximo sorteio inicia um novo grupo aleatório':'Próxima pedra será escolhida aleatoriamente';
 $('queueMessage').textContent=next;
 renderMatrix();renderHistory();renderPlayers(s);
 save();
}
function renderMatrix(){
 const el=$('matrixGrid'),drawn=new Set(state.draws),last=state.draws.at(-1),slots=state.gridRows*state.gridCols;
 el.style.gridTemplateColumns=`repeat(${state.gridCols}, minmax(0,1fr))`;
 // Usa altura fluida de acordo com o maior texto da linha, mantendo ao menos 67 px.
 el.innerHTML=Array.from({length:slots},(_,i)=>{
  const it=state.items[i];
  if(!it)return '<div class="stone stone-empty" aria-hidden="true"></div>';
  const className=it.id===last?'is-last':drawn.has(it.id)?'is-drawn':'';
  return `<div class="stone ${className}" title="${esc(it.text)}"><span class="stone-index">${String(i+1).padStart(2,'0')}</span><span class="stone-label">${esc(it.text)}</span></div>`;
 }).join('');
 const groups=new Set(state.items.map(x=>x.group));
 $('matrixDetails').textContent=`${state.items.length} pedras • ${state.mode==='groups'?groups.size+' grupos':'sorteios individuais'}`;
 requestAnimationFrame(fitStoneText);
}
function estimateLines(ctx,text,maxWidth){
 // Simula a quebra natural de palavras; palavras muito compridas também quebram.
 const words=text.split(/\s+/).filter(Boolean);let lines=1,line='';
 for(const word of words){
  const trial=line?line+' '+word:word;
  if(ctx.measureText(trial).width<=maxWidth){line=trial;continue}
  if(line){lines++;line=''}
  if(ctx.measureText(word).width<=maxWidth){line=word;continue}
  let frag='';for(const ch of word){const next=frag+ch;if(ctx.measureText(next).width>maxWidth&&frag){lines++;frag=ch}else frag=next}line=frag;
 }
 return lines;
}
const measureCanvas=document.createElement('canvas');const measure=measureCanvas.getContext('2d');
function fitStoneText(){
 if(!measure)return;
 const cells=$('matrixGrid').querySelectorAll('.stone:not(.stone-empty)');
 // A altura de cada linha cresce quando uma palavra ou frase precisa de mais espaço.
 cells.forEach(cell=>{
  const t=cell.querySelector('.stone-label');if(!t)return;
  const width=Math.max(cell.clientWidth-14,15);
  measure.font='800 11px system-ui';
  const minimum=estimateLines(measure,t.textContent,width)*11*1.15+22;
  cell.style.minHeight=Math.max(67,Math.ceil(minimum))+'px';
 });
 cells.forEach(cell=>{
  const t=cell.querySelector('.stone-label');if(!t)return;
  const width=cell.clientWidth-14,height=cell.clientHeight-20;
  let lo=9,hi=Math.min(22,Math.round(width/6)+9);
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);measure.font=`800 ${mid}px system-ui`;
   const lines=estimateLines(measure,t.textContent,Math.max(width,15));
   if(lines*mid*1.12<=height)lo=mid;else hi=mid-1;
  }
  t.style.fontSize=lo+'px';
 });
}
function renderHistory(){
 const map=new Map(state.items.map(x=>[x.id,x]));
 $('historyCount').textContent=state.draws.length;
 $('history').innerHTML=state.draws.length?state.draws.map((id,i)=>({id,i})).reverse().map(({id,i})=>{
  const it=map.get(id);if(!it)return '';
  return `<li class="${i===state.draws.length-1?'latest':''}"><b>${esc(it.text)}</b><small>${String(i+1).padStart(2,'0')}ª pedra</small></li>`;
 }).join(''):'<li class="empty-history">Nenhuma pedra sorteada.</li>';
}
function renderPlayers(scores){
 $('playersCount').textContent=state.players.length+' alunos';
 const search=L.normalize($('playerSearch').value);
 const shown=scores.filter(p=>L.normalize(p.name).includes(search));
 $('playersList').innerHTML=shown.length?shown.map(p=>{
  const label=p.complete?`Cartela completa no ${p.finishedAt}º sorteio`:
   p.unknown.length?`${p.unknown.length} pedra(s) não encontrada(s) na matriz`:'Aguardando os próximos sorteios';
  return `<div class="player ${p.complete?'winner':''}" data-player="${p.index}" tabindex="0" role="button" aria-label="Ver cartela de ${esc(p.name)}">
   <div class="player-top"><div class="player-name"><span class="rank">${p.rank}º</span><strong>${esc(p.name)}</strong></div><span class="progress-count">${p.matched}/${p.total}</span></div>
   <div class="progress-track"><div class="progress-bar" style="width:${p.percent.toFixed(2)}%"></div></div>
   <div class="player-caption"><span>${esc(label)}</span><span>${Math.round(p.percent)}%</span></div>
  </div>`;
 }).join(''):'<div class="empty-state">'+(state.players.length?'Nenhum participante encontrado.':'Importe a planilha para acompanhar cada cartela automaticamente.')+'</div>';
}
function selectMatrixSheet(sheets){return sheets.find(s=>/^(matriz|pedras|movimentos|itens)/i.test(L.normalize(s.name)))||sheets[0]}
function changeMatrix(rows,mode){
 const cleaned=L.tidyRows(rows);
 const data=cleaned.length&&L.inferMatrixMode(cleaned)!=='individual'&&/^pedra|^movimento|^item|^valor|^numero/i.test(L.normalize(cleaned[0][0]))?cleaned.slice(1):cleaned;
 const effective=data.length?data:cleaned;
 const items=L.groupsToItems(effective,mode);
 if(state.draws.length&&!confirm('Carregar outra matriz apaga o histórico de sorteios atual. Deseja continuar?'))return false;
 state.sourceRows=effective;state.mode=mode;state.items=items;state.draws=[];state.queue=[];
 const originalCols=Math.max(1,...effective.map(r=>r.filter(Boolean).length));
 state.gridCols=originalCols===1?Math.min(10,Math.max(3,Math.ceil(Math.sqrt(items.length)))):Math.min(20,originalCols);
 if(items.length<state.gridCols)state.gridCols=items.length;
 state.autoLayout=true;state.gridRows=Math.ceil(items.length/state.gridCols);
 render();
 return true;
}
async function uploadMatrix(file){try{
 const sheets=await L.parseFile(file);const sheet=selectMatrixSheet(sheets);
 const suggestedMode=L.inferMatrixMode(sheet.rows);
 if(changeMatrix(sheet.rows,suggestedMode)){
  $('matrixNote').textContent=`✓ ${file.name} · ${state.items.length} pedras importadas`;
  notify(`Matriz importada: ${state.items.length} pedras. ${suggestedMode==='groups'?'Grupos identificados pelas linhas.':'Sorteio individual.'}`);
 }
}catch(e){notify(e.message,true)}finally{$('matrixFile').value=''}}
async function uploadPlayers(file){try{
 const sheets=await L.parseFile(file),players=L.parsePlayers(sheets);
 if(state.players.length&&!confirm('Substituir a lista atual de participantes pelas cartelas importadas?'))return;
 state.players=players;render();
 const keys=new Set(state.items.map(i=>L.normalize(i.text)));
 const wrong=players.flatMap(p=>p.items.filter(i=>!keys.has(L.normalize(i))));
 $('playersNote').textContent=`✓ ${file.name} · ${players.length} participantes`;
 notify(`Importadas ${players.length} cartelas.${wrong.length?' Atenção: '+wrong.length+' ocorrências de pedras fora da matriz.':''}`,wrong.length>0);
}catch(e){notify(e.message,true)}finally{$('playersFile').value=''}}
function handleDraw(){const next=L.takeDraw(state);if(!next)return notify('Todas as pedras já foram sorteadas.');
 state.draws.push(next.id);state.queue=next.queue;render();
}
function handleRestart(){if(!state.draws.length){notify('Ainda não há pedras sorteadas.');return}
 if(!confirm('Reiniciar todos os sorteios? A matriz e as cartelas dos alunos serão mantidas.'))return;
 state.draws=[];state.queue=[];render();notify('Sorteios reiniciados. Participantes preservados.');}
function download(name,text,mime){
 const blob=new Blob([text],{type:mime||'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function matrixCSV(){return L.makeCSV(state.sourceRows)}
function sampleCSV(){
 const items=state.items.map(i=>i.text);
 const limit=Math.min(20,items.length);
 const rows=[['Participante',...Array.from({length:limit},(_,i)=>`Pedra ${i+1}`)]];
 for(let p=1;p<=10;p++){
  // distribuição rotativa, garantindo valores distintos por participante
  const sequence=[...items];const rotate=(p*3)%sequence.length;
  rows.push([`Aluno ${String(p).padStart(2,'0')}`,...sequence.slice(rotate).concat(sequence.slice(0,rotate)).slice(0,limit)]);
 }
 return L.makeCSV(rows);
}
function reportCSV(){
 const scores=L.computeScores(state.items,state.draws,state.players);
 return L.makeCSV([['Classificação','Participante','Acertos','Total','Percentual','Completa','Sorteio da conclusão','Itens não reconhecidos'],
  ...scores.map(p=>[p.rank+'º',p.name,p.matched,p.total,Math.round(p.percent)+'%',p.complete?'Sim':'Não',p.finishedAt||'',p.unknown.join(' | ')])]);
}
function showPlayer(index){
 const p=state.players[index];if(!p)return;
 const ids=new Map(state.items.map(it=>[L.normalize(it.text),it.id]));
 const drawn=new Set(state.draws),last=state.draws.at(-1);
 const score=L.computeScores(state.items,state.draws,[p])[0];
 $('dialogTitle').textContent=p.name;
 const stones=p.items.map(value=>{
  const id=ids.get(L.normalize(value));const match=drawn.has(id),unknown=!id;
  return `<div class="detail-item ${unknown?'unknown':id===last?'last':match?'matched':''}" title="${esc(value)}">${esc(value)}</div>`;
 });
 const slots=Math.max(state.cardRows*state.cardCols,p.items.length);
 while(stones.length<slots)stones.push('<div class="detail-item detail-empty" aria-hidden="true"></div>');
 $('dialogBody').innerHTML=`<div class="modal-body"><div class="detail-stats"><span>Acertos: <strong>${score.matched}/${score.total}</strong></span><span>Progresso: <strong>${Math.round(score.percent)}%</strong></span><span>Concluída: <strong>${score.complete?'SIM':'NÃO'}</strong></span></div><div class="detail-grid" style="grid-template-columns:repeat(${state.cardCols},minmax(0,1fr))">${stones.join('')}</div><p class="detail-note">Azul: ainda não sorteada · Verde: sorteada · Amarelo: última pedra · Vermelho: pedra não encontrada na matriz. As correspondências ignoram maiúsculas, acentos e espaços extras.</p></div>`;
 $('playerDialog').showModal();
 requestAnimationFrame(fitDetailText);
}
function fitDetailText(){
 const labels=$('dialogBody').querySelectorAll('.detail-item:not(.detail-empty)');
 labels.forEach(el=>{
  const width=Math.max(20,el.clientWidth-14);
  measure.font='750 10px system-ui';
  el.style.minHeight=Math.max(58,Math.ceil(estimateLines(measure,el.textContent,width)*11+18))+'px';
  const height=el.clientHeight-17;
  let lo=9,hi=15;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);measure.font=`750 ${mid}px system-ui`;
   if(estimateLines(measure,el.textContent,width)*mid*1.15<=height)lo=mid;else hi=mid-1;
  }
  el.style.fontSize=lo+'px';
 });
}
function bind(){
 $('btnDraw').addEventListener('click',handleDraw);
 $('btnRestart').addEventListener('click',handleRestart);
 $('matrixFile').addEventListener('change',e=>{if(e.target.files?.[0])uploadMatrix(e.target.files[0])});
 $('playersFile').addEventListener('change',e=>{if(e.target.files?.[0])uploadPlayers(e.target.files[0])});
 $('drawMode').addEventListener('change',e=>{
  if(state.draws.length&&!confirm('Alterar a regra reinicia os sorteios. Deseja continuar?')){e.target.value=state.mode;return}
  state.mode=e.target.value;state.items=L.groupsToItems(state.sourceRows,state.mode);state.draws=[];state.queue=[];render();
 });
 for(const [id,key,min,max] of [['gridRows','gridRows',1,100],['gridCols','gridCols',1,20]]){
  $(''+id).addEventListener('change',e=>{
   state[key]=Math.min(max,Math.max(min,Number(e.target.value)||min));
   if(key==='gridRows')state.autoLayout=false;render();
  });
 }
 $('autoLayout').addEventListener('change',e=>{state.autoLayout=e.target.checked;render()});
 for(const [id,key,min,max] of [['cardRows','cardRows',1,100],['cardCols','cardCols',1,20]]){
  $(id).addEventListener('change',e=>{
   state[key]=Math.min(max,Math.max(min,Number(e.target.value)||min));
   if(key==='cardRows')state.cardAuto=false;adjustCardLayout();setControls();save();
  });
 }
 $('cardAuto').addEventListener('change',e=>{state.cardAuto=e.target.checked;adjustCardLayout();setControls();save()});
 $('btnManual').addEventListener('click',()=>{$('manualBox').hidden=!$('manualBox').hidden});
 $('btnApplyManual').addEventListener('click',()=>{
  const rows=$('manualText').value.split(/\r?\n/).map(s=>s.split(/[;\t]/).map(t=>t.trim())).filter(r=>r.some(Boolean));
  if(!rows.length)return notify('Digite pelo menos uma pedra.',true);
  try{const mode=L.inferMatrixMode(rows);if(changeMatrix(rows,mode)){notify('Matriz manual aplicada.');$('manualBox').hidden=true}}catch(e){notify(e.message,true)}
 });
 $('playerSearch').addEventListener('input',()=>renderPlayers(L.computeScores(state.items,state.draws,state.players)));
 $('playersList').addEventListener('click',e=>{const card=e.target.closest('[data-player]');if(card)showPlayer(Number(card.dataset.player))});
 $('playersList').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const card=e.target.closest('[data-player]');if(card){e.preventDefault();showPlayer(Number(card.dataset.player))}}});
 $('btnCloseDialog').addEventListener('click',()=>$('playerDialog').close());
 $('playerDialog').addEventListener('click',e=>{if(e.target===$('playerDialog'))$('playerDialog').close()});
 $('btnFullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){notify('Tela cheia não está disponível neste navegador.',true)}
 });
 $('btnDownloadMatrix').addEventListener('click',()=>download('matriz_bingo.csv',matrixCSV()));
 $('btnSample').addEventListener('click',()=>download('modelo_cartelas_alunos.csv',sampleCSV()));
 $('btnReport').addEventListener('click',()=>{if(!state.players.length)return notify('Importe as cartelas antes de gerar o relatório.',true);download('resultado_bingo.csv',reportCSV())});
 $('btnExport').addEventListener('click',()=>download('sessao_bingo.json',JSON.stringify({version:1,...state},null,2),'application/json'));
 $('fileSession').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const imported=validateState(JSON.parse(await f.text()));
   if((state.draws.length||state.players.length)&&!confirm('Importar esta sessão substitui matriz, histórico e participantes. Continuar?'))return;
   state=imported;render();notify('Sessão restaurada com sucesso.');
  }catch(err){notify('Não foi possível abrir a sessão: '+err.message,true)}finally{e.target.value=''}
 });
 let resizeRaf;
 new ResizeObserver(()=>{cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(fitStoneText)}).observe($('matrixScroll'));
}
loadStored();bind();render();
})();
