// Prueft alle <script>-Bloecke der App-HTML auf JS-Syntaxfehler.
// Aufruf: node tests/synchk.js
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','bestelluebersicht.html'),'utf8');
const re=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let m,n=0,bad=0;
while((m=re.exec(src))){
  const code=m[1];
  if(!code.trim())continue;
  if(/src=/.test(m[0].slice(0,m[0].indexOf('>'))))continue; // externe Scripte ueberspringen
  n++;
  try{new Function(code);}catch(e){
    bad++;
    const line=src.slice(0,m.index).split('\n').length;
    console.log(`FEHLER in Script-Block ab HTML-Zeile ${line}: ${e.message}`);
  }
}
console.log(`${n} Script-Bloecke geprueft, ${bad} mit Fehler`);
process.exit(bad?1:0);
