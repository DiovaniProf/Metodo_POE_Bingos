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
 if(first==='estado' && vals[1]==='capital') return true;
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
/**
 * Organiza apenas a APRESENTAÇÃO das pedras; IDs, grupos, fila e ordem do
 * sorteio permanecem intocados. null representa uma célula espaçadora.
 *
 * together: todos os integrantes de cada grupo consecutivos, sem quebrar a
 *   sequência entre linhas quando a largura permitir;
 * two: nos trios, 1º e 2º integrantes próximos, com o 3º em outra região;
 * shuffled: embaralha todas as posições de forma estável por semente.
 */
function visualSlots(items,columns,style='together',seed=1,groupAware=true){
 const width=Math.max(1,Math.min(20,Math.floor(Number(columns)||1)));
 const mode=['together','two','shuffled'].includes(style)?style:'together';
 const list=items||[];
 if(mode==='shuffled'){
  const shuffled=list.map(i=>i.id);
  // PRNG determinístico: alterar apenas a semente reembaralha a cartela.
  let st=(Number(seed)>>>0)||1;
  const random=()=>{st=(Math.imul(st,1664525)+1013904223)>>>0;return st/4294967296};
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  return shuffled;
 }
 const grouped=[];
 if(groupAware){
  const byGroup=new Map();
  for(const it of list){
   const g=it.sourceRow??it.group;
   if(!byGroup.has(g)){const arr=[];byGroup.set(g,arr);grouped.push(arr)}
   byGroup.get(g).push(it.id);
  }
 }else list.forEach(it=>grouped.push([it.id]));
 const positions=[];
 const padEnd=()=>{while(positions.length%width)positions.push(null)};
 const addTogether=group=>{
  if(!group.length)return;
  // Se o grupo cabe numa linha, nunca será dividido entre duas linhas.
  if(group.length<=width && positions.length%width && width-positions.length%width<group.length)padEnd();
  positions.push(...group);
 };
 if(mode==='two' && groupAware){
  const separate=[];
  for(const g of grouped){
   if(g.length>=3){addTogether(g.slice(0,2));separate.push(...g.slice(2))}
   else addTogether(g);
  }
  // Terceiras palavras permanecem visíveis, mas ficam longe das duplas.
  if(separate.length){padEnd();positions.push(...separate)}
 }else grouped.forEach(addTogether);
 return positions;
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
async function parseXLSX(arrayBuffer,filename=''){
 if(typeof JSZip==='undefined')throw new Error('Biblioteca Excel não encontrada. Verifique a pasta vendor.');
 const bytes=new Uint8Array(arrayBuffer);
 if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4B)
  throw new Error('Arquivo Excel inválido: não é uma pasta de trabalho XLSX/XLSM (formato ZIP/OOXML).');
 let zip;
 try{zip=await JSZip.loadAsync(arrayBuffer)}
 catch(e){throw new Error('Não foi possível abrir o Excel: arquivo danificado ou não é XLSX/XLSM.')} 
 async function getXML(path,required=false){
  const f=zip.file(path);
  if(!f){if(required)throw new Error('Planilha Excel inválida: arquivo interno '+path+' não encontrado.');return null}
  const doc=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('Falha ao ler o XML da planilha: '+path);
  return doc;
 }
 // XLSX e XLSM usam a mesma estrutura OOXML para planilhas e células.
 // O VBA de arquivos .xlsm NUNCA é executado, extraído nem avaliado pelo bingo.
 const types=await getXML('[Content_Types].xml',true);
 const workbookPart=xmlNodes(types,'Override').find(n=>n.getAttribute('PartName')==='/xl/workbook.xml');
 // Alguns exportadores declaram o tipo do workbook como padrão para .xml,
 // em vez de criar um Override específico. Ambos são formatos OOXML válidos.
 const defaultXml=xmlNodes(types,'Default').find(n=>(n.getAttribute('Extension')||'').toLowerCase()==='xml');
 const workbookType=workbookPart?.getAttribute('ContentType')||defaultXml?.getAttribute('ContentType')||'';
 const isXlsx=workbookType==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
 const isXlsm=workbookType==='application/vnd.ms-excel.sheet.macroEnabled.main+xml';
 if(!isXlsx&&!isXlsm)throw new Error('Tipo de pasta de trabalho não reconhecido. Use um XLSX ou XLSM válido (não XLS/XLSB).');
 if(/\.xlsx$/i.test(filename)&&!isXlsx)throw new Error('A extensão .xlsx não corresponde ao conteúdo do arquivo. Salve novamente como Excel (.xlsx).');
 if(/\.xlsm$/i.test(filename)&&!isXlsm)throw new Error('A extensão .xlsm não corresponde ao conteúdo do arquivo. Salve novamente como pasta de trabalho habilitada para macro (.xlsm).');
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
 if(file.size>25*1024*1024)throw new Error('O arquivo deve ter até 25 MB.');
 if(/\.csv$/i.test(file.name))return [{name:file.name.replace(/\.csv$/i,''),rows:parseCSV(await file.text())}];
 if(/\.(xlsx|xlsm)$/i.test(file.name))return parseXLSX(await file.arrayBuffer(),file.name);
 if(/\.xls$/i.test(file.name))throw new Error('O formato antigo .xls não é suportado. Exporte como .xlsx ou .xlsm.');
 throw new Error('Formato não suportado. Utilize .xlsx, .xlsm ou .csv.');
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
// V5: dicionário flexível: 1, 2 ou 3 pedras por código; vazio = bingo numérico.
function codeString(value,strict=true){
 const raw=label(value);
 if(!/^\d+$/.test(raw) || Number(raw)<1)throw new Error(`Código inválido “${raw}”. Informe 01 a 09 para os primeiros nove códigos.`);
 const canonical=String(Number(raw)).padStart(2,'0');
 if(strict&&raw!==canonical)throw new Error(`Código “${raw}”: digite ${canonical} (formato exato, com zero inicial para 01 a 09). Formate as células como TEXTO.`);
 return canonical;
}
function dictionaryFromSheets(sheets){
 const possibles=sheets.map(sheet=>{
  const rows=tidyRows(sheet.rows);if(!rows.length)return null;
  const headers=rows[0].map(normalize);
  const codeCol=headers.findIndex(h=>h==='codigo'||h==='cod');
  if(codeCol<0)return null;
  const termCols=headers.map((h,i)=>(/^((pedra|termo|palavra|informacao)\s*\d+)$/.test(h))?i:-1).filter(i=>i>=0).slice(0,3);
  const oldCols=['estado','capital'].map(h=>headers.indexOf(h));
  const genericCols=termCols.length?termCols:oldCols.every(i=>i>=0)?oldCols:[];
  if(!genericCols.length)return null;
  return {sheet,rows,codeCol,termCols:genericCols,strict:termCols.length>0};
 }).filter(Boolean);
 const chosen=possibles.find(x=>normalize(x.sheet.name)==='dicionario')||possibles[0];
 if(!chosen)return null;
 const {rows,codeCol,termCols,strict}=chosen;
 const map=new Map(),groups=[],knownStones=new Set();
 for(const row of rows.slice(1)){
  const raw=label(row[codeCol]);if(!raw)continue;
  const code=codeString(raw,strict);
  if(map.has(code))throw new Error(`Dicionário: código ${code} repetido.`);
  const written=termCols.map(i=>label(row[i])).filter(Boolean);
  // Sem texto: o próprio código é a pedra, como no bingo tradicional.
  const stones=written.length?written:[code];
  for(const stone of stones){
   const key=normalize(stone);
   if(knownStones.has(key))throw new Error(`Dicionário: pedra repetida “${stone}”. Cada pedra deve ser única.`);
   knownStones.add(key);
  }
  map.set(code,stones);groups.push(stones);
 }
 if(!groups.length)throw new Error('Dicionário vazio: informe ao menos um código.');
 if(groups.reduce((a,b)=>a+b.length,0)>1000)throw new Error('Limite de 1.000 pedras.');
 return {map,groups,mode:groups.some(g=>g.length>1)?'groups':'individual',strict};
}
function locateCodedSheet(sheets){
 return sheets.find(s=>{
  const rows=tidyRows(s.rows);if(!rows.length)return false;
  const cells=rows[0].map(normalize);
  return cells.some(c=>['participante','aluno','aluna','nome','estudante'].includes(c))&&
   cells.some(c=>/^codigo\s*(?:0?1)$/.test(c));
 })||null;
}
function hasCodedCards(sheets){return Boolean(locateCodedSheet(sheets));}
function parseCodedPlayers(sheets,matrixItems=null){
 const sheet=locateCodedSheet(sheets);if(!sheet)return null;
 const dict=dictionaryFromSheets(sheets);
 if(!dict)throw new Error('Falta a aba Dicionário. Use Código, Pedra 1, Pedra 2 e Pedra 3, ou o formato anterior Código, Estado, Capital.');
 const header=sheet.rows[0].map(normalize);
 const nameIndex=header.findIndex(x=>['participante','aluno','aluna','nome','estudante'].includes(x));
 const codeColumns=header.map((x,i)=>/^codigo\s*\d+$/.test(x)?i:-1).filter(i=>i>=0);
 if(!codeColumns.length)throw new Error('A aba Digitação precisa de colunas Código 1, Código 2...');
 const names=new Set(),players=[];
 const current=matrixItems?new Map(matrixItems.map(it=>[normalize(it.text),it])):null;
 for(const row of sheet.rows.slice(1)){
  const name=label(row[nameIndex]);if(!name)continue;
  const codes=codeColumns.map(i=>label(row[i])).filter(Boolean);
  if(!codes.length)continue;
  if(codes.length!==codeColumns.length)throw new Error(`Cartela de ${name}: ${codes.length}/${codeColumns.length} códigos preenchidos. Complete a linha.`);
  const used=new Set(),stones=[];
  for(const raw of codes){
   let code;
   try{code=codeString(raw,dict.strict)}catch(e){throw new Error(`Cartela de ${name}: ${e.message}`)}
   if(!dict.map.has(code))throw new Error(`Cartela de ${name}: código ${code} não consta no Dicionário / matriz.`);
   if(used.has(code))throw new Error(`Cartela de ${name}: código ${code} repetido.`);
   used.add(code);
   const terms=dict.map.get(code);
   if(current){
    const found=terms.map(t=>current.get(normalize(t)));
    if(found.some(x=>!x))throw new Error(`Cartela de ${name}: código ${code} não corresponde às pedras da matriz carregada.`);
    if(terms.length>1&&new Set(found.map(x=>x.group)).size>1&&found.some(x=>x.group.startsWith('g')))
     throw new Error(`Cartela de ${name}: as pedras do código ${code} não estão agrupadas na matriz.`);
   }
   stones.push(...terms);
  }
  const key=normalize(name);
  if(names.has(key))throw new Error(`Participante duplicado: ${name}.`);
  names.add(key);players.push({name,items:stones});
 }
 if(players.length>3000)throw new Error('Limite de 3.000 participantes.');
 return players;
}
function readFlexibleWorkbook(sheets){
 const dict=dictionaryFromSheets(sheets);if(!dict)return null;
 const sourceRows=dict.groups;
 const items=groupsToItems(sourceRows,dict.mode);
 const players=hasCodedCards(sheets)?parseCodedPlayers(sheets,items):[];
 return {sourceRows,items,mode:dict.mode,players,codeCount:dict.map.size};
}
function parsePlayers(sheets,matrixItems=null){
 const coded=parseCodedPlayers(sheets,matrixItems);if(coded!==null)return coded;
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
root.BingoLogic={ART_GROUPS,normalize,label,tidyRows,groupsToItems,inferMatrixMode,defaultItems,parseCSV,parseXLSX,parseFile,parsePlayers,hasCodedCards,parseCodedPlayers,readFlexibleWorkbook,dictionaryFromSheets,codeString,visualSlots,takeDraw,computeScores,makeCSV};
})(typeof window==='undefined'?globalThis:window);
