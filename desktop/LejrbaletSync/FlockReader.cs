using System.Text;
using System.Text.RegularExpressions;
namespace LejrbaletSync;
public record Character(string guid,string realm,string name,string @class,int level,long capturedAt,string[]? professions=null,string[]? subProfessions=null);
// Independent data parser: no Lua runtime, evaluation, scripts or addon code.
public sealed class FlockReader {
 readonly string s;int i,nodes;
 FlockReader(string source){s=source;}
 static readonly Dictionary<int,string> Classes=new(){{1,"Warrior"},{2,"Paladin"},{3,"Hunter"},{4,"Rogue"},{5,"Priest"},{7,"Shaman"},{8,"Mage"},{9,"Warlock"},{11,"Druid"}};
 static readonly HashSet<string> Primary=new(["Alchemy","Blacksmithing","Enchanting","Engineering","Herbalism","Leatherworking","Mining","Skinning","Tailoring"]);
 static readonly HashSet<string> Secondary=new(["Cooking","Fishing","First Aid"]);
 static Dictionary<string,object?> Map(object? o)=>o as Dictionary<string,object?>??new();
 static string Text(Dictionary<string,object?> d,string k)=>d.GetValueOrDefault(k) as string??"";
 static long Number(Dictionary<string,object?> d,string k)=>d.GetValueOrDefault(k) is double n&&n==Math.Truncate(n)&&n>=0&&n<long.MaxValue?(long)n:0;
 static Exception Bad()=>new FormatException("Ugyldig eller ufuldstændig FlockSync-fil. Lav en frisk scanning og log ud.");
 void Space(){while(i<s.Length){if(char.IsWhiteSpace(s[i])||s[i]=='\uFEFF'){i++;continue;}if(s.AsSpan(i).StartsWith("--")){var end=s.IndexOf('\n',i);i=end<0?s.Length:end+1;continue;}break;}}
 void Expect(char c){Space();if(i>=s.Length||s[i++]!=c)throw Bad();}
 string Quoted(){char q=s[i++];var b=new StringBuilder();while(i<s.Length){char c=s[i++];if(c==q)return b.ToString();if(c=='\\'){if(i>=s.Length)throw Bad();c=s[i++];if(char.IsAsciiDigit(c)){var bytes=new List<byte>();while(true){string digits=c.ToString();while(digits.Length<3&&i<s.Length&&char.IsAsciiDigit(s[i]))digits+=s[i++];if(!byte.TryParse(digits,out byte n))throw Bad();bytes.Add(n);if(i+1<s.Length&&s[i]=='\\'&&char.IsAsciiDigit(s[i+1])){i++;c=s[i++];continue;}break;}b.Append(Encoding.UTF8.GetString(bytes.ToArray()));}else b.Append(c switch{'n'=>'\n','r'=>'\r','t'=>'\t','b'=>'\b','f'=>'\f','v'=>'\v','a'=>'\a','\\'=>'\\','"'=>'"','\''=>'\'',_=>throw Bad()});}else b.Append(c);if(b.Length>1_000_000)throw Bad();}throw Bad();}
 object? Value(int depth=0){Space();if(depth>40||++nodes>200_000||i>=s.Length)throw Bad();char c=s[i];if(c=='"'||c=='\'')return Quoted();if(c=='{'){i++;var d=new Dictionary<string,object?>();int index=1;while(true){Space();if(i>=s.Length)throw Bad();if(s[i]=='}'){i++;return d;}string key;object? v;if(s[i]=='['){i++;var k=Value(depth+1);if(k is not string&&k is not double)throw Bad();key=Convert.ToString(k,System.Globalization.CultureInfo.InvariantCulture)!;Expect(']');Expect('=');v=Value(depth+1);}else{int start=i;var id=Regex.Match(s[i..],"^[A-Za-z_][A-Za-z0-9_]*");if(id.Success){i+=id.Length;Space();}if(id.Success&&i<s.Length&&s[i]=='='){key=id.Value;i++;v=Value(depth+1);}else{i=start;key=(index++).ToString();v=Value(depth+1);}}if(key is "__proto__" or "constructor" or "prototype")throw Bad();d[key]=v;Space();if(i<s.Length&&(s[i]==','||s[i]==';'))i++;else if(i>=s.Length||s[i]!='}')throw Bad();}}
 var literal=Regex.Match(s[i..],"^(true|false|nil)(?![A-Za-z0-9_])");if(literal.Success){i+=literal.Length;return literal.Value=="nil"?null:literal.Value=="true";}
 var number=Regex.Match(s[i..],"^-?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?");if(number.Success){i+=number.Length;if(double.TryParse(number.Value,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out var n)&&double.IsFinite(n))return n;}throw Bad();}
 public static List<Character> Read(string source){if(source.Length>5*1024*1024)throw new FormatException("FlockSync.lua er større end 5 MB.");var p=new FlockReader(source);p.Space();if(!p.s.AsSpan(p.i).StartsWith("FlockSyncDB"))throw Bad();p.i+=11;p.Expect('=');var db=Map(p.Value());p.Space();if(p.i<p.s.Length&&p.s[p.i]==';'){p.i++;p.Space();}if(p.i!=p.s.Length)throw Bad();var own=Map(db.GetValueOrDefault("accountCharacters"));var chars=Map(db.GetValueOrDefault("characters"));if(!db.ContainsKey("accountCharacters")||!db.ContainsKey("characters"))throw Bad();var result=new List<Character>();
 foreach(var (guid,obj) in chars){if(!own.ContainsKey(guid))continue;var r=Map(obj);if(r.GetValueOrDefault("isActive") is false)continue;string name=Text(r,"name").Trim(),realm=Text(r,"realm").Trim();int level=(int)Number(r,"level");long captured=Number(r,"lastSeenAt");if(Text(r,"guid")!=guid||!Regex.IsMatch(guid,"^Player-[A-Za-z0-9-]{3,100}$")||name.Length is <1 or >120||realm.Length is <1 or >100||!Classes.TryGetValue((int)Number(r,"classId"),out var cls)||level is <1 or >60||captured<=0||captured>DateTimeOffset.UtcNow.ToUnixTimeSeconds()+300)throw Bad();
 var prof=Map(Map(r.GetValueOrDefault("professions")).GetValueOrDefault("primary")).Values.Select(x=>Text(Map(x),"name")).Distinct().ToArray();var prim=prof.Where(Primary.Contains).ToArray();var sub=prof.Where(Secondary.Contains).ToArray();if(prim.Length>2)throw Bad();result.Add(new(guid,realm,name,cls,level,captured,prim.Length>0?prim:null,sub.Length>0?sub:null));if(result.Count>250)throw Bad();}
 return result;
 }
}
