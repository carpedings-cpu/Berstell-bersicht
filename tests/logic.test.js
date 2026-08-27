// Tests der Kern-Rechenlogik. WICHTIG: Es wird der ECHTE Code aus
// bestelluebersicht.html extrahiert und getestet – keine Kopien, kein Drift.
// Aufruf: node tests/logic.test.js
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','bestelluebersicht.html'),'utf8');

// ── Extraktion ────────────────────────────────────────────────────────────
// Klammerzaehlung. Grenze: unbalancierte Klammern in String-Literalen wuerden
// die Zaehlung stoeren – die hier extrahierten Funktionen enthalten keine.
function extractFn(name){
  const sig='function '+name+'(';
  const i=src.indexOf(sig);
  if(i<0)throw new Error('Funktion nicht gefunden: '+name);
  let k=src.indexOf('{',i),depth=0;
  for(;k<src.length;k++){
    if(src[k]==='{')depth++;
    else if(src[k]==='}'){depth--;if(depth===0){k++;break;}}
  }
  return src.slice(i,k);
}
function extractConst(name){
  const sig='const '+name+'=';
  const i=src.indexOf(sig);
  if(i<0)throw new Error('Konstante nicht gefunden: '+name);
  let depth=0,k=i;
  for(;k<src.length;k++){
    const c=src[k];
    if(c==='['||c==='{'||c==='(')depth++;
    else if(c===']'||c==='}'||c===')')depth--;
    else if(c===';'&&depth===0){k++;break;}
  }
  return src.slice(i,k);
}
const code=[
  extractConst('deUml'),
  extractConst('WARTUNG_RX'),
  extractConst('ZUB_PREISE'),
  extractFn('istBauseits'),
  extractFn('istDienstleistung'),
  extractFn('istEntfallen'),
  extractFn('istNichtBestellbar'),
  extractFn('istWartungsrelevant'),
  extractFn('istProtokollpflichtig'),
  extractFn('protokolleVollstaendig'),
  extractFn('zubPreis'),
  extractFn('posZeit'),
  extractFn('mergeProjekt'),
  extractFn('isoKW'),
].join('\n');
const api=new Function(code+`
  return {istNichtBestellbar,istWartungsrelevant,istProtokollpflichtig,
    protokolleVollstaendig,zubPreis,posZeit,mergeProjekt,isoKW};`)();

// ── Test-Helfer ──────────────────────────────────────────────────────────
let pass=0,fail=0;
function is(got,want,name){
  const ok=JSON.stringify(got)===JSON.stringify(want);
  if(ok)pass++;
  else{fail++;console.log(`FAIL: ${name}\n  erwartet: ${JSON.stringify(want)}\n  bekommen: ${JSON.stringify(got)}`);}
}

// ── Wartung / Protokolle ─────────────────────────────────────────────────
is(api.istWartungsrelevant({bez:'Kaffeevollautomat',fabrikat:'WMF'}),true,'Kaffeevollautomat wartungsrelevant');
is(api.istWartungsrelevant({bez:'Kühlzelle mit Aggregat'}),true,'Kühlzelle wartungsrelevant');
is(api.istWartungsrelevant({bez:'Spültisch'}),false,'Spültisch NICHT wartungsrelevant');
is(api.istWartungsrelevant({bez:'Haubenspülmaschine bauseits'}),false,'bauseits nie wartungsrelevant');
is(api.istWartungsrelevant({bez:'Arbeitstisch',wartOverride:'ja'}),true,'Override ja');
is(api.istWartungsrelevant({bez:'Spülmaschine',wartOverride:'nein'}),false,'Override nein');
is(api.istProtokollpflichtig({bez:'Waschmaschine',fabrikat:'Miele'}),true,'Miele protokollpflichtig');
is(api.istProtokollpflichtig({bez:'Arbeitstisch'}),false,'Arbeitstisch nicht protokollpflichtig');
is(api.istProtokollpflichtig({bez:'Arbeitstisch',protOverride:'ja'}),true,'protOverride ja');
is(api.istProtokollpflichtig({bez:'Miele Geschirrspüler',protOverride:'nein'}),false,'protOverride nein');
is(api.protokolleVollstaendig({protIbn:true,protEinw:true}),true,'IBN+EW vollständig');
is(api.protokolleVollstaendig({protIbn:true}),false,'EW fehlt');

// ── Zubehör-Preise ───────────────────────────────────────────────────────
[['KWC Sensor Netz 12.696.071.000',303.00],
 ['KWC Sensor Batterie 12.696.061.000',293.70],
 ['KWC Isla 10.371.023.000FL (35mm)',137.58],
 ['KWC Luna-E 10.441.013.000FL (35mm)',171.74],
 ['KWC Standsäule 24.501.054.000 (42mm)',350.00],
 ['Armag Wandmischbatterie 1/2" WP165',178.20],
 ['KWC Geschirrbrause K24.42.64.000C71',410.00],
 ['Gastronobel Seifenspender Aufputz',26.40],
 ['KWC Seifenspender Einbau Z.538.409.000 (26mm)',65.00],
 ['Wagner Ewar Einbauhandtuchspender WP 165',152.60],
 ['Gastronobel Handtuchspender Aufputz',32.00],
 ['Contacto GN 1/1-100 (7011/100)',17.00],
 ['Contacto GN 1/1-150 (7011/150)',27.75],
 ['Contacto GN 1/1-200 (7011/200)',32.50],
 ['Contacto GN 1/2-100 (7012/100)',0],
 ['Tassenkorb',0],
].forEach(([typ,want])=>is(api.zubPreis(typ),want,'Preis: '+typ));

// ── Sync-Merge (Konfliktschutz) ──────────────────────────────────────────
const T1='2026-08-01T10:00:00.000Z', T2='2026-08-02T10:00:00.000Z';
function posMit(pos,extra,at){return {pos,bez:'Test',audit:at?[{at,user:'x',action:'y'}]:[],...extra};}

is(api.posZeit(posMit('1',{},T2)),Date.parse(T2),'posZeit aus Audit');
is(api.posZeit({pos:'1',checkMeta:{a:{at:T2}}}),Date.parse(T2),'posZeit aus checkMeta');
is(api.posZeit({pos:'1'}),0,'posZeit leer = 0');

// Konflikt: dieselbe Position auf beiden Seiten geändert → jüngere gewinnt
{
  const mine={id:'p',lastEdit:{at:T1},positionen:[posMit('1',{status:'alt'},T1)]};
  const theirs={id:'p',lastEdit:{at:T2},positionen:[posMit('1',{status:'neu'},T2)]};
  const m=api.mergeProjekt(mine,theirs);
  is(m.positionen[0].status,'neu','Merge: jüngere Position gewinnt (theirs)');
}
{
  const mine={id:'p',lastEdit:{at:T2},positionen:[posMit('1',{status:'meins'},T2)]};
  const theirs={id:'p',lastEdit:{at:T1},positionen:[posMit('1',{status:'deren'},T1)]};
  const m=api.mergeProjekt(mine,theirs);
  is(m.positionen[0].status,'meins','Merge: jüngere Position gewinnt (mine)');
}
// Positionen, die nur auf einer Seite existieren, bleiben beide erhalten
{
  const mine={id:'p',positionen:[posMit('1',{},T1),posMit('2',{},T1)]};
  const theirs={id:'p',positionen:[posMit('1',{},T1),posMit('3',{},T1)]};
  const m=api.mergeProjekt(mine,theirs);
  is(m.positionen.map(p=>p.pos).sort(),['1','2','3'],'Merge: einseitige Positionen bleiben');
}
// Kopf-Felder (z.B. Liefertermin) kommen von der Seite mit jüngerem lastEdit
{
  const mine={id:'p',liefertermin:'2026-09-01',lastEdit:{at:T1},positionen:[]};
  const theirs={id:'p',liefertermin:'2026-09-15',lastEdit:{at:T2},positionen:[]};
  is(api.mergeProjekt(mine,theirs).liefertermin,'2026-09-15','Merge: Kopf von jüngerer Seite');
  is(api.mergeProjekt(theirs,mine).liefertermin,'2026-09-15','Merge: Kopf symmetrisch');
}
// checkMeta-Zeitstempel schlägt älteren Audit-Eintrag
{
  const mine={id:'p',positionen:[{pos:'1',status:'haken',audit:[{at:T1}],checkMeta:{x:{at:T2}}}]};
  const theirs={id:'p',positionen:[{pos:'1',status:'alt',audit:[{at:T1}]}]};
  is(api.mergeProjekt(mine,theirs).positionen[0].status,'haken','Merge: checkMeta zählt als Bearbeitung');
}

// ── ISO-Kalenderwoche (Referenzwerte via Python datetime.isocalendar) ────
[['2026-01-01',1],['2025-12-28',52],['2026-08-27',35],
 ['2026-12-31',53],['2027-01-04',1],['2024-12-30',1],
].forEach(([d,want])=>is(api.isoKW(d),want,'KW: '+d));

console.log(`${pass}/${pass+fail} Tests ok, ${fail} fehlgeschlagen`);
process.exit(fail?1:0);
