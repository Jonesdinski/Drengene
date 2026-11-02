// Independent, data-only reader. Never evaluates Lua or loads addon code.
export function readSavedVariables(source:string):any{
 if(source.length>5*1024*1024)throw Error('Filen er for stor (maks. 5 MB).');
 let i=0,nodes=0;const fail=()=>{throw Error('Filen er ikke et understøttet FlockSync SavedVariables-format.');};
 function ws(){while(i<source.length){if(/\s|\uFEFF/.test(source[i])){i++;continue;}if(source.slice(i,i+2)==='--'){const end=source.indexOf('\n',i);i=end<0?source.length:end+1;continue;}break;}}
 function quoted(){const quote=source[i++];let out='';while(i<source.length){let c=source[i++];if(c===quote)return out;if(c==='\\'){c=source[i++];const escapes:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v',a:'\x07','\\':'\\','"':'"',"'":"'"};if(/[0-9]/.test(c)){let digits=c;while(digits.length<3&&/[0-9]/.test(source[i]||''))digits+=source[i++];const byte=Number(digits);if(byte>255)fail();out+=String.fromCharCode(byte);}else if(c in escapes)out+=escapes[c];else fail();}else out+=c;if(out.length>1000000)fail();}return fail();}
 function value(depth=0):any{ws();if(depth>40||++nodes>200000)fail();const c=source[i];if(c==='"'||c==="'")return quoted();if(c==='{'){i++;const obj=Object.create(null);let index=1;while(true){ws();if(source[i]==='}'){i++;return obj;}let key:string|number,entry:any;if(source[i]==='['){i++;key=value(depth+1);if(!['string','number'].includes(typeof key))fail();ws();if(source[i++]!==']')fail();ws();if(source[i++]!=='=')fail();entry=value(depth+1);}else{const start=i;const id=/^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));if(id){i+=id[0].length;ws();}if(id&&source[i]==='='){key=id[0];i++;entry=value(depth+1);}else{i=start;key=index++;entry=value(depth+1);}}if(['__proto__','constructor','prototype'].includes(String(key)))fail();obj[key!]=entry;ws();if(source[i]===','||source[i]===';')i++;else if(source[i]!=='}')fail();} }
 const token=/^(true|false|nil)(?![A-Za-z0-9_])/.exec(source.slice(i));if(token){i+=token[0].length;return token[0]==='nil'?null:token[0]==='true';}const num=/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));if(num){i+=num[0].length;const n=Number(num[0]);if(!Number.isFinite(n))fail();return n;}return fail();}
 ws();if(source.slice(i,i+11)!=='FlockSyncDB')fail();i+=11;ws();if(source[i++]!=='=')fail();const db=value();ws();if(source[i]===';'){i++;ws();}if(i!==source.length)fail();return db;
}
export type FlockCharacter={guid:string;realm:string;name:string;class:string;level:number;capturedAt:number;professions?:string[];subProfessions?:string[]};
const classes:Record<number,string>={1:'Warrior',2:'Paladin',3:'Hunter',4:'Rogue',5:'Priest',7:'Shaman',8:'Mage',9:'Warlock',11:'Druid'};
const primary=new Set(['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring']);
const secondary=new Set(['Cooking','Fishing','First Aid']);
export function parseFlockFile(source:string):FlockCharacter[]{
 const db=readSavedVariables(source);if(!db?.characters||typeof db.characters!=='object'||!db.accountCharacters||typeof db.accountCharacters!=='object')throw Error('Vælg FlockSync.lua fra SavedVariables — ikke addonets programfiler eller AppHelper-filen.');
 const result:FlockCharacter[]=[];
 for(const [guid,raw] of Object.entries<any>(db.characters)){
  if(!Object.hasOwn(db.accountCharacters,guid))continue;
  if(raw?.isActive===false)continue;
  if(raw.guid!==guid||!/^Player-[A-Za-z0-9-]{3,100}$/.test(guid)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>120||typeof raw.realm!=='string'||!raw.realm.trim()||raw.realm.length>100||!classes[raw.classId]||!Number.isInteger(raw.level)||raw.level<1||raw.level>60||!Number.isInteger(raw.lastSeenAt)||raw.lastSeenAt<=0||raw.lastSeenAt>Date.now()/1000+300)throw Error('En af dine karakterer har ufuldstændige eller ugyldige data. Lav en frisk scanning i spillet.');
  const c:FlockCharacter={guid,realm:raw.realm.trim(),name:raw.name.trim(),class:classes[raw.classId],level:raw.level,capturedAt:raw.lastSeenAt};
  const names=Array.isArray(raw.professions?.primary)?raw.professions.primary:Object.values(raw.professions?.primary||{});
  const ps=Array.from(new Set<string>(names.map((p:any)=>p?.name).filter((n:any)=>typeof n==='string')));
  const p=ps.filter(n=>primary.has(n)),s=ps.filter(n=>secondary.has(n));if(p.length>2)throw Error('Mere end to primære professions i eksporten. Kontrollér scanningen.');if(p.length)c.professions=p;if(s.length)c.subProfessions=s;
  result.push(c);if(result.length>250)throw Error('Filen indeholder for mange karakterer.');
 }
 if(!result.length)throw Error('Ingen af dine egne aktive karakterer blev fundet. Log ind med FlockSync, gennemfør introduktionen, scan og log ud. Guildkammeraters karakterer importeres ikke fra din fil.');
 return result.sort((a,b)=>a.name.localeCompare(b.name,'da'));
}
