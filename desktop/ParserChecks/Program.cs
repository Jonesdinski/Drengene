using LejrbaletSync;
string guid="Player-123-ABC";
string data="FlockSyncDB = { accountCharacters={[\""+guid+"\"]={}}, characters={[\""+guid+"\"]={guid=\""+guid+"\",name=\"Ægir\",realm=\"Realm\",classId=8,level=20,lastSeenAt=1700000000,professions={primary={[1]={name=\"Alchemy\"},[2]={name=\"Cooking\"}}}},[\"Player-123-OTHER\"]={name=\"Guildmate\"}}}";
var c=FlockReader.Read(data).Single();if(c.name!="Ægir"||c.level!=20||c.professions?.Single()!="Alchemy"||c.subProfessions?.Single()!="Cooking")throw new Exception("Wrong parsed data");
foreach(string bad in new[]{data+"; os.execute('bad')",data.Replace("level=20","level=99"),"FlockSyncDB={__proto__={}}",data[..^3],"FlockSyncDB="+string.Concat(Enumerable.Repeat("{x=",50))+"0"+new string('}',50)}){bool rejected=false;try{FlockReader.Read(bad);}catch(FormatException){rejected=true;}if(!rejected)throw new Exception("Unsafe data accepted");}
Console.WriteLine("Parser checks passed: own characters, fields, Unicode, professions, invalid level, truncation, depth and executable Lua rejection.");
