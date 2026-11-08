/* Motor de bingo, independente da interface. Nao requer servidor. */
(function(root){
'use strict';
const ART_GROUPS = [
 ['Renascimento','Da Vinci','Michelangelo'],
 ['Barroco','Caravaggio','Rembrandt'],
 ['Rococó','Fragonard','Boucher'],
 ['Neoclassicismo','David','Canova'],
 ['Romantismo','Delacroix','Géricault'],
 ['Realismo','Courbet','Millet'],
 ['Impressionismo','Monet','Renoir'],
 ['Pós-Impressionismo','Van Gogh','Cézanne'],
 ['Cubismo','Picasso','Braque'],
 ['Surrealismo','Dalí','Magritte']
];
const ALIASES={
 'leonardo da vinci':'da vinci','vincent van gogh':'van gogh','salvador dali':'dali',
 'pablo picasso':'picasso','claude monet':'monet','auguste renoir':'renoir',
 'pierre auguste renoir':'renoir','michelangelo buonarroti':'michelangelo'
};
function normalize(value){
 const s=String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 return ALIASES[s]||s;
}
function label(value){return String(value??'').trim().replace(/\s+/g,' ').slice(0,240)}
function isBlank(v){return label(v)===''}
function tidyRows(rows){
 return (rows||[]).map(row=>Array.isArray(row)?row.map(label):[label(row)])
  .filter(row=>row.some(v=>v!==''));
}
function isMatrixHeader(row){
 const vals=row.map(normalize); const first=vals[0]||'';
 if(/^(pedra|pedras|item|itens|numero|numeros|valor|valores|movimento|movimento artistico|tema|assunto|grupo)$/.test(first)) return true;
 if(vals.some(x=>/^(representante|representante 1|representante 2|artista|artista 1|artista 2)$/.test(x))) return true;
 return false;
}
function groupsToItems(rows,mode='groups'){
 const cleaned=tidyRows(rows);
 if(!cleaned.length) throw new Error('A planilha está vazia.');
 const data=isMatrixHeader(cleaned[0])?cleaned.slice(1):cleaned;
 if(!data.length) throw new Error('Não foram encontradas pedras depois do cabeçalho.');
 const items=[]; const seen=new Set();
 data.forEach((row,r)=>{
  row.forEach((value,c)=>{
   if(!value) return;
   const key=normalize(value);
   if(!key) return;
   if(seen.has(key)) throw new Error(`Pedra repetida na matriz: “${value}”. Cada pedra precisa ser única.`);
   seen.add(key);
   items.push({id:`p${items.length+1}`,text:value,group:mode==='groups'?`g${r+1}`:`p${items.length+1}`,sourceRow:r,sourceCol:c});
  });
 });
 if(items.length>1000) throw new Error('Limite de 1.000 pedras por matriz.');
 if(!items.length) throw new Error('Nenhuma pedra válida encontrada.');
 return items;
}
function inferMatrixMode(rows){
 const data=tidyRows(rows); if(!data.length) return 'individual';
 const header=data[0].map(normalize);
 if(header.some(v=>/representante|artista/.test(v)))return 'groups';
 const content=isMatrixHeader(data[0])?data.slice(1):data;
 const values=content.flat().filter(Boolean);
 // Matriz numérica (inclusive 5×5): sorteios independentes, nunca por linha.
 if(values.length && values.every(v=>/^-?\d+(?:[.,]\d+)?$/.test(v)))return 'individual';
 return content.some(row=>row.filter(v=>v).length>=2)?'groups':'individual';
}
function defaultItems(){return groupsToItems(ART_GROUPS,'groups')}
function parseCSV(input){
 const raw=String(input||'').replace(/^\uFEFF/,'');
 const lines=raw.split(/\r\n|\r|\n/).filter(s=>s.trim());
 if(!lines.length) return [];
 const candidates=[';',',','\t'];
 function columns(line,sep){let inQ=false,n=0;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(inQ&&line[i+1]==='"')i++;else inQ=!inQ}else if(line[i]===sep&&!inQ)n++}return n}
 const sample=lines.slice(0,Math.min(lines.length,6)).join('\n');
 const score=candidates.map(sep=>[sep,sample.split('\n').reduce((a,s)=>a+columns(s,sep),0)]).sort((a,b)=>b[1]-a[1]);
 const sep=score[0][0];
 const out=[];let row=[],field='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(ch===sep&&!quoted){row.push(field);field=''}
  else if((ch==='\r'||ch==='\n')&&!quoted){
   if(ch==='\r'&&raw[i+1]==='\n')i++;
   row.push(field);if(row.some(v=>v.trim()))out.push(row);row=[];field='';
  }else field+=ch;
 }
 row.push(field);if(row.some(v=>v.trim()))out.push(row);
 return tidyRows(out);
}
function excelColumn(col){let n=0;for(const c of col)n=n*26+c.charCodeAt(0)-64;return n-1}
function xmlNodes(parent,localName){return [...parent.getElementsByTagName('*')].filter(x=>x.localName===localName)}
function excelPath(rootPath,relative){
 const absolute=relative.replace(/^\//,'');
 const path=relative.startsWith('/')?absolute:(rootPath+'/'+relative);
 const parts=[];for(const s of path.split('/')){if(s==='..')parts.pop();else if(s&&s!=='.')parts.push(s)}
 return parts.join('/');
}
async function parseXLSX(arrayBuffer){
 if(typeof JSZip==='undefined')throw new Error('Biblioteca Excel não encontrada. Verifique a pasta vendor.');
 const zip=await JSZip.loadAsync(arrayBuffer);
 async function getXML(path,required=false){
  const f=zip.file(path);
  if(!f){if(required)throw new Error('Planilha Excel inválida: arquivo interno '+path+' não encontrado.');return null}
  const doc=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('Falha ao ler o XML da planilha: '+path);
  return doc;
 }
 const workbook=await getXML('xl/workbook.xml',true),rels=await getXML('xl/_rels/workbook.xml.rels',true);
 const relMap=new Map(xmlNodes(rels,'Relationship').map(n=>[n.getAttribute('Id'),n.getAttribute('Target')]));
 const stringsDoc=await getXML('xl/sharedStrings.xml');
 const shared=stringsDoc?xmlNodes(stringsDoc,'si').map(si=>xmlNodes(si,'t').map(t=>t.textContent||'').join('')):[];
 const names=xmlNodes(workbook,'sheet').map(n=>({name:n.getAttribute('name')||'Planilha',rid:n.getAttribute('r:id')||n.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')}));
 const sheets=[];
 for(const info of names){
  const target=relMap.get(info.rid);
  if(!target)continue;
  const doc=await getXML(excelPath('xl',target));if(!doc)continue;
  const rows=[];
  for(const node of xmlNodes(doc,'sheetData').flatMap(n=>[...n.children].filter(c=>c.localName==='row'))){
   const out=[];
   for(const cell of [...node.children].filter(c=>c.localName==='c')){
    const ref=cell.getAttribute('r')||'A1';const m=ref.match(/^[A-Z]+/i);
    if(!m)continue;
    const col=excelColumn(m[0].toUpperCase());if(col>1000)continue;
    const type=cell.getAttribute('t');
    const v=xmlNodes(cell,'v')[0]?.textContent??'';
    let value='';
    if(type==='s')value=shared[Number(v)]??'';
    else if(type==='inlineStr')value=xmlNodes(cell,'t').map(t=>t.textContent).join('');
    else if(type==='b')value=v==='1'?'SIM':'NÃO';
    else value=v;
    out[col]=label(value);
   }
   if(out.some(v=>v))rows.push(Array.from({length:out.length},(_,i)=>out[i]||''));
  }
  sheets.push({name:info.name,rows:tidyRows(rows)});
 }
 if(!sheets.length)throw new Error('Nenhuma aba com valores foi encontrada na planilha Excel.');
 return sheets;
}
async function parseFile(file){
 if(!file)throw new Error('Selecione um arquivo.');
 if(file.size>12*1024*1024)throw new Error('O arquivo deve ter até 12 MB.');
 if(/\.csv$/i.test(file.name))return [{name:file.name.replace(/\.csv$/i,''),rows:parseCSV(await file.text())}];
 if(/\.xlsx$/i.test(file.name))return parseXLSX(await file.arrayBuffer());
 throw new Error('Formato não suportado. Utilize .xlsx ou .csv.');
}
function playerSheetHeader(row){
 const cells=row.map(normalize);
 const nameCol=cells.findIndex(v=>['participante','participantes','aluno','aluna','nome','estudante','jogador','jogadora'].includes(v));
 const stoneCol=cells.findIndex((v,i)=>i!==nameCol&&['pedra','item','valor','numero','palavra','termo'].includes(v));
 return {nameCol,stoneCol};
}
function participantRows(rows){
 const data=tidyRows(rows);if(!data.length)return [];
 const {nameCol,stoneCol}=playerSheetHeader(data[0]);
 if(nameCol<0)return [];
 const longFormat=stoneCol>=0 && data[0].filter(v=>v).length<=3;
 const players=[]; const grouped=new Map();
 for(const row of data.slice(1)){
  const name=label(row[nameCol]);if(!name)continue;
  const raw=longFormat?[row[stoneCol]]:row.filter((_,i)=>i!==nameCol);
  const values=raw.map(label).filter(Boolean);
  if(!grouped.has(normalize(name))){grouped.set(normalize(name),{name,items:[]});players.push(grouped.get(normalize(name)))}
  const target=grouped.get(normalize(name));target.items.push(...values);
 }
 return players;
}
function parsePlayers(sheets){
 if(!sheets.length)throw new Error('Arquivo sem conteúdo.');
 let players=[];
 for(const sheet of sheets){const parsed=participantRows(sheet.rows);if(parsed.length){players=parsed;break}}
 if(!players.length){
  // Modo por aba: uma aba por estudante, com as pedras em qualquer célula.
  const candidates=sheets.filter(s=>!/^(instrucoes|instrucoes de uso|modelo|matriz|legenda)$/i.test(normalize(s.name)));
  if(candidates.length<2)throw new Error('Modelo não identificado. Use “Participante; Pedra 1; Pedra 2...” ou “Participante; Pedra” (uma linha por pedra), ou uma aba por aluno.');
  players=candidates.map(s=>({name:s.name,items:s.rows.flat().map(label).filter(Boolean)}));
 }
 const normalized=[]; const names=new Set();
 for(const p of players){
  const name=label(p.name);if(!name)continue;
  if(names.has(normalize(name)))throw new Error(`Nome de participante duplicado: ${name}`);
  names.add(normalize(name));
  const items=[...new Map(p.items.map(x=>[normalize(x),label(x)]).filter(x=>x[0])).values()];
  if(!items.length)continue;
  if(items.length>1000)throw new Error('Uma cartela não pode conter mais de 1.000 pedras.');
  normalized.push({name,items});
 }
 if(normalized.length>3000)throw new Error('Limite de 3.000 participantes.');
 if(!normalized.length)throw new Error('Nenhuma cartela com pedras foi encontrada.');
 return normalized;
}
function takeDraw(state,random=Math.random){
 const drawn=new Set(state.draws||[]);
 if(drawn.size>=state.items.length)return null;
 const mode=state.mode==='groups'?'groups':'individual';
 let queue=(state.queue||[]).filter(id=>!drawn.has(id));
 let selected;
 if(queue.length){selected=queue.shift()}
 else if(mode==='individual'){
  const available=state.items.filter(x=>!drawn.has(x.id));selected=available[Math.floor(random()*available.length)].id;
 }else{
  const groups=new Map();for(const it of state.items){if(!groups.has(it.group))groups.set(it.group,[]);groups.get(it.group).push(it)}
  const unstarted=[...groups.values()].filter(arr=>arr.some(it=>!drawn.has(it.id)));
  const chosen=unstarted[Math.floor(random()*unstarted.length)];
  const eligible=chosen.filter(it=>!drawn.has(it.id));
  selected=eligible[0].id;queue=eligible.slice(1).map(it=>it.id);
 }
 return {id:selected,queue};
}
function computeScores(items,draws,players){
 const byId=new Map(items.map(it=>[it.id,it]));
 const keys=new Map(items.map(it=>[normalize(it.text),it.id]));
 const chronology=new Map(draws.map((id,i)=>[id,i+1]));
 const result=players.map((p,index)=>{
  const card=[...new Set(p.items.map(normalize).filter(Boolean))];
  const recognized=card.filter(k=>keys.has(k));
  const unknown=card.filter(k=>!keys.has(k));
  const matched=recognized.filter(k=>chronology.has(keys.get(k)));
  const complete=card.length>0 && matched.length===card.length;
  const finishedAt=complete?Math.max(...matched.map(k=>chronology.get(keys.get(k)))):null;
  return { ...p,index,total:card.length,matched:matched.length,unknown,complete,finishedAt,percent:card.length?matched.length/card.length*100:0 };
 });
 result.sort((a,b)=>{
  if(a.complete!==b.complete)return a.complete?-1:1;
  if(a.complete&&b.complete)return a.finishedAt-b.finishedAt||a.index-b.index;
  return b.matched-a.matched||a.index-b.index;
 });
 result.forEach((p,i)=>{
  const previous=result[i-1];
  if(!previous)p.rank=1;
  else if(p.complete&&previous.complete&&p.finishedAt===previous.finishedAt)p.rank=previous.rank;
  else if(!p.complete&&!previous.complete&&p.matched===previous.matched)p.rank=previous.rank;
  else p.rank=i+1;
 });
 return result;
}
function csvEscape(v){const s=String(v??'');return /[;\r\n"]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function makeCSV(rows){return '\uFEFF'+rows.map(row=>row.map(csvEscape).join(';')).join('\r\n')+'\r\n'}
root.BingoLogic={ART_GROUPS,normalize,label,tidyRows,groupsToItems,inferMatrixMode,defaultItems,parseCSV,parseXLSX,parseFile,parsePlayers,takeDraw,computeScores,makeCSV};
})(typeof window==='undefined'?globalThis:window);
