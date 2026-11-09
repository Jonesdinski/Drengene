export const dailyChallengeCatalog=[
 {key:'snapshot',title:'Et øjeblik i Azeroth',description:'Tag et nyt screenshot fra spillet i dag. Du vælger selv motivet.',points:10,icon:'inv_misc_spyglass_03'},
 {key:'alliance',title:'For Horden!',description:'Tag et screenshot efter at have nedlagt en Alliance-spiller. Billedet skal vise din karakter og den besejrede modstander.',points:30,icon:'ability_rogue_ambush'},
 {key:'dungeon',title:'Ned i mørket',description:'Tag et screenshot af din karakter inde i en dungeon sammen med dit party.',points:30,icon:'inv_misc_map_01'},
 {key:'landscape',title:'På opdagelse',description:'Find en flot udsigt, og tag et screenshot med din karakter i billedet.',points:20,icon:'inv_misc_map_01'},
 {key:'fishing',title:'Ro ved vandet',description:'Tag et screenshot af din karakter, mens du fisker.',points:20,icon:'trade_fishing'},
 {key:'cooking',title:'Mad til eventyret',description:'Lav noget mad, og tag et screenshot med din karakter og cooking-vinduet eller resultatet i chatten.',points:20,icon:'inv_misc_food_15'},
 {key:'profession',title:'Flittige hænder',description:'Brug en profession: saml en ressource, craft eller enchant. Tag et screenshot, der viser handlingen eller resultatet.',points:20,icon:'trade_blacksmithing'},
 {key:'friends',title:'Bedst sammen',description:'Tag et screenshot sammen med mindst én anden spiller. Et vink, en sejr eller bare en pause ved bålet.',points:20,icon:'inv_bannerpvp_01'},
 {key:'quest',title:'Endnu en tjeneste',description:'Tag et screenshot, mens du afleverer en quest. Vis quest-belønningen eller afleveringsvinduet.',points:20,icon:'inv_misc_note_01'},
 {key:'campfire',title:'Ved lejrbålet',description:'Find eller lav et lejrbål, og tag et screenshot med din karakter ved bålet.',points:20,icon:'inv_drink_03'},
 {key:'city',title:'En tur til byen',description:'Tag et screenshot af din karakter ved et vartegn i en Horde-hovedstad.',points:20,icon:'inv_bannerpvp_01'},
 {key:'creature',title:'Et møde i vildmarken',description:'Tag et screenshot med din karakter og et vildt dyr eller et monster. Du behøver ikke slå det ihjel.',points:20,icon:'inv_misc_spyglass_03'},
];
export function challengeDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
