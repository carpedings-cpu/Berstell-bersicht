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
  extractFn('istEventual'),
  extractFn('istNichtBestellbar'),
  extractFn('nichtBestellbarLabel'),
  extractFn('istZuBestellen'),
  extractFn('rowsToProject'),
  extractFn('istWartungsrelevant'),
  extractFn('istProtokollpflichtig'),
  extractFn('protokolleVollstaendig'),
  extractFn('zubPreis'),
  extractFn('posZeit'),
  extractFn('mergeProjekt'),
  extractFn('isoKW'),
  extractConst('GRUSS_ALLGEMEIN'),
  extractConst('GRUSS_MONTAG'),
  extractConst('GRUSS_FREITAG'),
  extractConst('GRUSS_ADVENT'),
  extractConst('GRUSS_FRUEH'),
  extractConst('GRUSS_ABEND'),
  extractFn('grussVorname'),
  extractFn('grussIndex'),
  extractConst('daysBtw'),
  extractConst('posKey'),
  extractConst('toNum'),
  extractConst('fmtMenge'),
  extractConst('URLAUB'),
  extractConst('URLAUB_COUNTDOWN'),
  extractConst('URLAUB_WEG'),
  extractConst('URLAUB_ZURUECK_WER'),
  extractConst('URLAUB_ZURUECK_WEG'),
  extractFn('urlaubText'),
  extractFn('urlaubsGruss'),
  extractFn('begruessung'),
].join('\n');
const api=new Function('const window={_parseDebug:{}};'+code+`
  return {istEventual,nichtBestellbarLabel,istZuBestellen,rowsToProject,istNichtBestellbar,istWartungsrelevant,istProtokollpflichtig,
    protokolleVollstaendig,zubPreis,posZeit,mergeProjekt,isoKW,
    begruessung,grussVorname,URLAUB,URLAUB_WEG,toNum,fmtMenge,posKey,
    pools:{allgemein:GRUSS_ALLGEMEIN,montag:GRUSS_MONTAG,freitag:GRUSS_FREITAG,
      advent:GRUSS_ADVENT,frueh:GRUSS_FRUEH,abend:GRUSS_ABEND}};`)();

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

// ── Begrüßung (täglich wechselnd, je Person unterschiedlich) ─────────────
// Wochentage der Testdaten via Python datetime verifiziert:
// 2026-08-31 = Montag, 2026-08-28 = Freitag, 2026-09-01 = Dienstag,
// 2026-12-05 = Advent-Samstag, 2026-08-27 = Donnerstag
function ausPool(text,pool,name){
  const vor=String(name||'').trim().split(/\s+/)[0]||'Team';
  return pool.some(t=>t.split('{name}').join(vor)===text);
}
const P=api.pools;

// Platzhalter wird immer ersetzt – über zwei Wochen, beide Namen, mehrere Uhrzeiten
let ohnePlatzhalter=true, alleGefuellt=true;
for(let t=1;t<=14;t++){
  const d='2026-09-'+String(t).padStart(2,'0');
  ['Diana Ziegler','Franziska Lang'].forEach(n=>{
    [6,9,14,19].forEach(h=>{
      const s=api.begruessung(n,d,h);
      if(s.includes('{name}'))ohnePlatzhalter=false;
      if(!s||s.length<10)alleGefuellt=false;
    });
  });
}
is(ohnePlatzhalter,true,'Begrüßung: nie ein offener {name}-Platzhalter');
is(alleGefuellt,true,'Begrüßung: nie leer');

// Vorname statt vollem Namen
{
  const s=api.begruessung('Diana Ziegler','2026-09-01',9);
  is(s.includes('Diana'),true,'Begrüßung nutzt den Vornamen');
  is(s.includes('Ziegler'),false,'Begrüßung ohne Nachnamen');
}
is(api.grussVorname(''),'Team','Leerer Name fällt auf Team zurück');
is(api.begruessung('','2026-09-01',9).includes('Team'),true,'Leerer Name bricht nicht');

// Gleicher Tag + Name = gleicher Spruch (den ganzen Tag stabil)
is(api.begruessung('Diana','2026-09-01',9),api.begruessung('Diana','2026-09-01',9),
   'Begrüßung ist pro Tag stabil');

// Über 14 Tage viele verschiedene Sprüche
{
  const set=new Set();
  for(let t=1;t<=14;t++)set.add(api.begruessung('Diana','2026-09-'+String(t).padStart(2,'0'),9));
  is(set.size>=8,true,'Begrüßung wechselt täglich (>=8 verschiedene in 14 Tagen), war: '+set.size);
}

// Beide Bearbeiterinnen bekommen am selben Tag verschiedene Sprüche
{
  let verschieden=0;
  for(let t=1;t<=14;t++){
    const d='2026-09-'+String(t).padStart(2,'0');
    if(api.begruessung('Diana',d,9)!==api.begruessung('Franziska',d,9))verschieden++;
  }
  is(verschieden>=12,true,'Zwei Namen: fast immer verschiedene Sprüche, war: '+verschieden+'/14');
}

// Sonder-Pools greifen
is(ausPool(api.begruessung('Diana','2026-08-31',9),P.montag,'Diana'),true,'Montag → Montags-Spruch');
is(ausPool(api.begruessung('Diana','2026-08-28',9),P.freitag,'Diana'),true,'Freitag → Freitags-Spruch');
is(ausPool(api.begruessung('Diana','2026-12-05',9),P.advent,'Diana'),true,'Advent → Advents-Spruch');
is(ausPool(api.begruessung('Diana','2026-09-01',6),P.frueh,'Diana'),true,'Vor 7 Uhr → Früh-Spruch');
is(ausPool(api.begruessung('Diana','2026-09-01',19),P.abend,'Diana'),true,'Ab 18 Uhr → Abend-Spruch');
is(ausPool(api.begruessung('Diana','2026-09-01',9),P.allgemein,'Diana'),true,'Dienstag tagsüber → allgemeiner Spruch');
// Advent schlägt Wochentag und Uhrzeit
is(ausPool(api.begruessung('Diana','2026-12-07',19),P.advent,'Diana'),true,'Advent hat Vorrang vor Abend');
// Nach dem 24.12. wieder normal
is(ausPool(api.begruessung('Diana','2026-12-28',9),P.montag,'Diana'),true,'28.12. ist Montag → kein Advent mehr');

// ── Urlaubs-Countdown für die Vertretung ────────────────────────────────
// Urlaub: Mo 31.08.2026 bis So 13.09.2026, zurück am Mo 14.09.2026
const WER=api.URLAUB.wer, WEG=api.URLAUB.weg;

// Erster Urlaubstag: 14 Tage bis zur Rückkehr
{
  const s=api.begruessung(WER,'2026-08-31',9);
  is(s.includes('14 Tagen'),true,'Urlaub Tag 1: nennt 14 Tage');
  is(s.includes('Felicia'),true,'Urlaub: spricht Felicia mit Vornamen an');
  is(s.includes('Diana'),true,'Urlaub: nennt Diana als Rückkehrerin');
}
// Halbzeit und letzter Tag
is(api.begruessung(WER,'2026-09-07',9).includes('Halbzeit'),true,'Urlaub: Halbzeit nach 7 Tagen');
is(api.begruessung(WER,'2026-09-13',9).includes('Letzter Tag'),true,'Urlaub: letzter Tag erkannt');
// Rückkehrtag: Dank statt Countdown
{
  const s=api.begruessung(WER,'2026-09-14',9);
  is(s.includes('zurück'),true,'Rückkehrtag: Diana ist zurück');
  is(s.includes('Danke'),true,'Rückkehrtag: Dank an die Vertretung');
}
// Alle 14 Tage verschieden und mit korrekt absteigender Zahl
{
  const set=new Set(); let zahlenOk=true;
  for(let i=0;i<14;i++){
    const d=new Date(Date.UTC(2026,7,31)+i*864e5).toISOString().slice(0,10);
    const s=api.begruessung(WER,d,9);
    set.add(s);
    const rest=14-i;
    if(rest>1&&!s.includes(String(rest)))zahlenOk=false;
  }
  is(set.size,14,'Urlaub: 14 verschiedene Sprüche an 14 Tagen');
  is(zahlenOk,true,'Urlaub: Countdown-Zahl stimmt an jedem Tag');
}
// Vor und nach dem Urlaub wieder normale Sprüche
is(api.begruessung(WER,'2026-08-30',9).includes('Tage'),false,'Vor dem Urlaub kein Countdown');
is(ausPool(api.begruessung(WER,'2026-09-15',9),P.allgemein,WER),true,'Nach dem Urlaub wieder normal');
// Die Urlauberin selbst bekommt einen Strand-Spruch
is(api.URLAUB_WEG.some(t=>t.split('{name}').join('Diana')===api.begruessung(WEG,'2026-09-02',9)),
   true,'Urlauberin bekommt Urlaubs-Spruch');
is(api.begruessung(WEG,'2026-09-14',9).includes('Willkommen zurück'),true,'Urlauberin: Rückkehr-Gruß');
is(ausPool(api.begruessung(WEG,'2026-09-15',9),P.allgemein,WEG),true,'Urlauberin danach wieder normal');
// Alle anderen bleiben unberührt
is(ausPool(api.begruessung('Max Mustermann','2026-09-02',9),P.allgemein,'Max'),true,
   'Dritte Person vom Urlaubsmodus unberührt');

// ── Mengen mit Komma (Regression: toI machte aus 2,5 eine 25) ───────────
[['2,5',2.5],['0,5',0.5],['10,25',10.25],['1,75',1.75],
 ['1.234,5',1234.5],['2.5',2.5],['3',3],[3,3],[2.5,2.5],
 ['3 Stk',3],['',0],[null,0],[undefined,0],
].forEach(([roh,want])=>is(api.toNum(roh),want,'Menge lesen: '+JSON.stringify(roh)));

// Die konkreten Fehlwerte aus dem Bug-Bericht dürfen NICHT mehr entstehen
is(api.toNum('2,5')===25,false,'2,5 wird nicht mehr zu 25');
is(api.toNum('0,5')===5,false,'0,5 wird nicht mehr zu 5');
is(api.toNum('10,25')===1025,false,'10,25 wird nicht mehr zu 1025');

// Anzeige bleibt deutsch mit Komma, ganze Zahlen ohne Nachkommastellen
[['2,5','2,5'],[2.5,'2,5'],['3','3'],[3,'3'],[1234.5,'1234,5'],['0,5','0,5'],
].forEach(([roh,want])=>is(api.fmtMenge(roh),want,'Menge anzeigen: '+JSON.stringify(roh)));

// Hin und zurück verändert die Menge nicht
['2,5','0,5','10,25','3','12'].forEach(m=>
  is(api.fmtMenge(api.toNum(m)),m,'Menge unverändert nach Speichern: '+m));

// Rechnen stimmt: 2,5 Stück à 100 € sind 250 €, nicht 2500 €
is(api.toNum('2,5')*100,250,'Summe mit Komma-Menge korrekt');

// ── Eventualpositionen ──────────────────────────────────────────────────
is(api.istEventual({eventual:true}),true,'Eventual erkannt');
is(api.istEventual({bez:'Spültisch'}),false,'Normale Position ist nicht eventual');
is(api.nichtBestellbarLabel({eventual:true}),'Eventualposition','Label Eventualposition');
// Wirkung: raus aus Zu bestellen und aus den Preisvergleichen
is(api.istNichtBestellbar({bez:'Kühlzelle',eventual:true}),true,'Eventual zählt als nicht bestellbar');
is(api.istZuBestellen({bez:'Kühlzelle',eventual:true,quelle:''}),false,'Eventual nicht in Zu bestellen');
is(api.istZuBestellen({bez:'Kühlzelle',quelle:''}),true,'Ohne Kennzeichen normal in Zu bestellen');
// Kennzeichen entfernt: Position läuft wieder überall mit
is(api.istNichtBestellbar({bez:'Kühlzelle'}),false,'Nach Aufheben wieder bestellbar');
is(api.istZuBestellen({bez:'Kühlzelle',quelle:''}),true,'Nach Aufheben wieder in Zu bestellen');

// Excel-Erkennung: 'a' in eigener Spalte JA, 'a' am Ende der Pos.-Nr NEIN
{
  const rows=[
    ['Pos.','LV','Stück','Einh.','Bezeichnung','Fabrikat','Typ'],
    ['01.',null,null,null,'Küche',null,null],
    ['01.01.0010.',null,'1','St','Spültisch','Duelks','X1'],
    ['01.01.0020.','a','2','St','Kühlvitrine','Nordcap','X2'],
    ['01.01.0030.a',null,'1','St','Türanschlag links','',''],
    ['01.01.0040.','A','1','St','Wärmeplatte','',''],
  ];
  const items=api.rowsToProject(rows).cats.flatMap(c=>c.subsections.flatMap(s=>s.items));
  const byPos=Object.fromEntries(items.map(i=>[i.pos,i]));
  is(items.length,4,'Vier Positionen erkannt');
  is(!!byPos['01.01.0010.'].eventual,false,'Normale Position nicht markiert');
  is(!!byPos['01.01.0020.'].eventual,true,'a in eigener Spalte → Eventualposition');
  is(!!byPos['01.01.0030.a'].eventual,false,'a am Ende der Pos.-Nr ist KEINE Eventualposition');
  is(!!byPos['01.01.0040.'].eventual,true,'Großes A zählt ebenfalls');
}
// Echter Aufbau der KPC-Auftragsstücklisten (an 'Oberursel GAZ April 2026' verifiziert):
// Pos.|LV|Stück|Einh.|Bezeichnung|Spec no.|Fabrikat|Fabrikat intern|Typ|Typ intern|…|EK…|VK…
// Das Kennzeichen steht in der LV-Spalte; EK/VK liegen weit rechts und dürfen die
// Erkennung nicht stören.
{
  const h=['Pos.','LV','Stück','Einh.','Bezeichnung','Spec no.','Fabrikat','Fabrikat intern','Typ','Typ intern'];
  while(h.length<22)h.push(null);
  h[21]='EK à';
  const zeile=(pos,lv,bez,ek)=>{const r=[pos,lv,'1','Stk',bez,null,'kpc',null,'Typ',null];while(r.length<22)r.push(null);r[21]=ek;return r;};
  const rows=[
    [null],[null],h,
    [' 6.62.',null,null,null,'Küchentechnik'],
    zeile(' 6.62.10. 1.  10',null,'Arbeitsplatte aus CNS',1200),
    zeile(' 6.62.10. 4. 210','a','Combidämpfer 10 x 1/1 GN',9800),
    zeile(' 6.62.10. 4. 220','a','Chromnickelstahl-Untergestell',450),
    zeile(' 6.62.10. 6.  10',null,'Spülmaschine',3400),
  ];
  const items=api.rowsToProject(rows).cats.flatMap(c=>c.subsections.flatMap(s=>s.items));
  is(items.length,4,'Echter Aufbau: alle Positionen erkannt');
  is(items.filter(i=>i.eventual).length,2,'Echter Aufbau: genau die LV-"a" markiert');
  is(items.filter(i=>i.eventual).map(i=>i.bez),
     ['Combidämpfer 10 x 1/1 GN','Chromnickelstahl-Untergestell'],
     'Echter Aufbau: die richtigen Positionen markiert');
  is(!!items[0].eventual,false,'Echter Aufbau: Position ohne LV-Kennzeichen bleibt normal');
  is(items[1].ek,9800,'Echter Aufbau: EK-Spalte weit rechts wird trotzdem gelesen');
}

// Spalte mit eigener Überschrift
{
  const rows=[
    ['Pos.','Eventual','Stück','Einh.','Bezeichnung','Fabrikat','Typ'],
    ['01.',null,null,null,'Küche',null,null],
    ['01.01.0010.',null,'1','St','Spültisch','',''],
    ['01.01.0020.','x','1','St','Kühlvitrine','',''],
  ];
  const items=api.rowsToProject(rows).cats.flatMap(c=>c.subsections.flatMap(s=>s.items));
  is(!!items[0].eventual,false,'Überschriften-Spalte: leer = normal');
  is(!!items[1].eventual,true,'Überschriften-Spalte: gefüllt = Eventualposition');
}

// ── Nachträgliches Markieren: Abgleich Liste ↔ laufendes Projekt ────────
// Pos.-Nummern stehen in Excel mit Leerzeichen, im Projekt teils ohne.
[[' 6.62.10. 4. 210.','6.62.10.4.210.'],
 ['6.62.10.4.210.','6.62.10.4.210.'],
 ['  6.62.10. 6.  10. ','6.62.10.6.10.'],
 ['01.01.0010.A','01.01.0010.a'],
 [null,''],[undefined,''],
].forEach(([roh,want])=>is(api.posKey(roh),want,'Pos.-Schlüssel: '+JSON.stringify(roh)));
is(api.posKey(' 6.62.10. 4. 210.'),api.posKey('6.62.10.4.210.'),'Schreibweise egal beim Abgleich');

// Der Abgleich markiert nur exakt passende Positionen – Unterpositionen bleiben aussen vor
// (an 'Oberursel GAZ-OB April 2026' gegen das laufende Projekt verifiziert: 6 von 7 getroffen,
//  1 Position gar nicht im Projekt, 0 Unterpositionen versehentlich markiert)
{
  const ausListe=[' 6.62.10. 4. 310.',' 6.62.10. 6.  10.'].map(api.posKey);
  const imProjekt=['6.62.10.4.310.','6.62.10.4.310.a','6.62.10.4.320.'];
  const evKeys=new Set(ausListe);
  const getroffen=imProjekt.filter(k=>evKeys.has(api.posKey(k)));
  is(getroffen,['6.62.10.4.310.'],'Abgleich trifft nur die Hauptposition, nicht die .a-Unterposition');
  is(ausListe.filter(k=>!imProjekt.includes(k)).length,1,'Nicht gefundene Position wird gezählt');
}

console.log(`${pass}/${pass+fail} Tests ok, ${fail} fehlgeschlagen`);





process.exit(fail?1:0);
