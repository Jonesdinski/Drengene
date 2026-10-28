import 'server-only';
import postgres from 'postgres';
let sql:ReturnType<typeof postgres>|undefined;
export function connection(){if(!process.env.DATABASE_URL)throw new Error('Databasen er ikke konfigureret');return sql??=postgres(process.env.DATABASE_URL,{prepare:false,max:1,idle_timeout:20,connect_timeout:10,ssl:'require'});}
export type Executor={unsafe:(query:string,values?:any[])=>PromiseLike<any>;begin?:(fn:(tx:Executor)=>Promise<any>)=>Promise<any>};
export function parameterize(source:string){source=source.replace(/\b(FROM|INTO|UPDATE|JOIN)\s+(profiles|legacy|entries|actions|aliases|journal|settings|uploads)\b/gi,'$1 lejrbalet.$2');let i=0,quoted=false;let out='';for(let k=0;k<source.length;k++){const c=source[k];if(c==="'"){out+=c;if(quoted&&source[k+1]==="'"){out+=source[++k];continue;}quoted=!quoted;}else out+=c==='?'&&!quoted?'$'+(++i):c;}return out;}
export function makeDatabase(client:()=>Executor){class Statement{values:any[]=[];constructor(readonly source:string){}bind(...values:any[]){const s=new Statement(this.source);s.values=values;return s;}async exec(tx=client()){return await tx.unsafe(parameterize(this.source),this.values);}async all(){return {results:Array.from(await this.exec()) as any[]};}async first(){return (await this.all()).results[0]??null;}async run(){const r=await this.exec();return {meta:{changes:r.count??r.length}};}}
return {prepare:(s:string)=>new Statement(s),async batch(stmts:Statement[]){const db=client();if(!db.begin)throw Error('Transactions required');return db.begin(async tx=>{const results=[];for(const stmt of stmts)results.push(await stmt.exec(tx));return results;});}};}
export const db=makeDatabase(()=>connection() as unknown as Executor);
