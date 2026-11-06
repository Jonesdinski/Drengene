using LejrbaletSync;
string guid="Player-123-ABC";
string data="FlockSyncDB = { accountCharacters={[\""+guid+"\"]={}}, characters={[\""+guid+"\"]={guid=\""+guid+"\",name=\"Ægir\",realm=\"Realm\",classId=8,level=20,lastSeenAt=1700000000,professions={primary={[1]={name=\"Alchemy\"},[2]={name=\"Cooking\"}}}},[\"Player-123-OTHER\"]={name=\"Guildmate\"}}}";
var c=FlockReader.Read(data).Single();if(c.name!="Ægir"||c.level!=20||c.professions?.Single()!="Alchemy"||c.subProfessions?.Single()!="Cooking")throw new Exception("Wrong parsed data");
foreach(string bad in new[]{data+"; os.execute('bad')",data.Replace("level=20","level=99"),"FlockSyncDB={__proto__={}}",data[..^3],"FlockSyncDB="+string.Concat(Enumerable.Repeat("{x=",50))+"0"+new string('}',50)}){bool rejected=false;try{FlockReader.Read(bad);}catch(FormatException){rejected=true;}if(!rejected)throw new Exception("Unsafe data accepted");}
Console.WriteLine("Parser checks passed: own characters, fields, Unicode, professions, invalid level, truncation, depth and executable Lua rejection.");

string armory=data.Replace("name=\"Alchemy\"","name=\"Alchemy\",level=150,maxLevel=225").Replace("lastSeenAt=1700000000","lastSeenAt=1700000000,gear={updatedAt=1700000000,items={{slotId=16,itemId=19019,itemLink=\"|cffff8000|Hitem:19019:0|h[Thunderfury]|h|r\"}}}");
var equipped=FlockReader.Read(armory).Single();if(equipped.gear?.items.Single().itemId!=19019||equipped.professionSkills?.Single().level!=150)throw new Exception("Gear or rank missing");
foreach(var invalid in new[]{armory.Replace("slotId=16","slotId=20"),armory.Replace("itemId=19019","itemId=123")}){bool rejected=false;try{FlockReader.Read(invalid);}catch(FormatException){rejected=true;}if(!rejected)throw new Exception("Invalid equipment accepted");}
Console.WriteLine("Gear and profession rank checks passed.");

var own=FlockReader.Read(File.ReadAllText("tests/fixtures/lejrbalet.lua")).Single();if(own.goldCopper!=123456||own.xp!=250||own.location?.x!=0.52||own.source!="lejrbalet")throw new Exception("Original addon fields missing");
var zero=FlockReader.Read(File.ReadAllText("tests/fixtures/lejrbalet.lua").Replace("[\"goldCopper\"]=123456","[\"goldCopper\"]=0")).Single();if(zero.goldCopper!=0)throw new Exception("Zero gold lost");
Console.WriteLine("Original addon fixture passed: gold, zero gold, XP, position and source.");
