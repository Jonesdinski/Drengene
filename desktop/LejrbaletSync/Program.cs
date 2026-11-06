using Microsoft.Win32;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace LejrbaletSync;
internal static class Program {
 [STAThread] static void Main(string[] args){ApplicationConfiguration.Initialize();using var mutex=new Mutex(true,"Local\\LejrbaletSync",out bool first);if(!first){try{EventWaitHandle.OpenExisting("Local\\LejrbaletSyncShow").Set();}catch{}return;}using var show=new EventWaitHandle(false,EventResetMode.AutoReset,"Local\\LejrbaletSyncShow");using var form=new SyncForm(args.Contains("--background"));ThreadPool.RegisterWaitForSingleObject(show,(_,_)=>{if(!form.IsDisposed&&form.IsHandleCreated)form.BeginInvoke(()=>form.Reveal());},null,Timeout.Infinite,false);Application.Run(form);}
}
public sealed class Settings {
 public int DataVersion{get;set;}=0;public string Folder{get;set;}="";public string Secret{get;set;}="";public bool AutoUpload{get;set;}=true;
 public Dictionary<string,string> Uploaded{get;set;}=new();
}
public sealed class SyncForm:Form {
 const string Hub="https://lejrbalet-vercel.vercel.app";
 static readonly string DataDir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"LejrbaletSyncData");
 static readonly string ConfigPath=Path.Combine(DataDir,"settings.json");
 static readonly JsonSerializerOptions Json=new(){DefaultIgnoreCondition=JsonIgnoreCondition.WhenWritingNull};
 readonly TextBox folder=new(){Width=440},key=new(){Width=540,UseSystemPasswordChar=true};
 readonly Label status=new(){AutoSize=false,Width=590,Height=100,ForeColor=Color.Gainsboro};
 readonly CheckBox startup=new(){Text="Start automatisk med Windows",AutoSize=true},enabled=new(){Text="Upload automatisk efter reload / logout",AutoSize=true};
 readonly NotifyIcon tray;readonly System.Windows.Forms.Timer timer=new(){Interval=15000};
 readonly HttpClient http=new(new HttpClientHandler{AllowAutoRedirect=false}){Timeout=TimeSpan.FromSeconds(25)};
 Settings settings=new();bool loading=true,busy,quit,background,authBlocked;string token="";
 public SyncForm(bool hidden){background=hidden;Text="Lejrbalet Sync · 0.4.0";ClientSize=new Size(660,690);MinimumSize=new Size(660,600);BackColor=Color.FromArgb(24,17,11);ForeColor=Color.Gainsboro;Font=new Font("Segoe UI",10);StartPosition=FormStartPosition.CenterScreen;if(hidden){WindowState=FormWindowState.Minimized;ShowInTaskbar=false;}
 using(var iconStream=typeof(SyncForm).Assembly.GetManifestResourceStream("Lejrbalet.Icon.ico")){if(iconStream is not null)Icon=new Icon(iconStream);}
 var body=new FlowLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(25),FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoScroll=true};Controls.Add(body);
 using(var imageStream=typeof(SyncForm).Assembly.GetManifestResourceStream("Lejrbalet.Icon.png")){if(imageStream is not null)body.Controls.Add(new PictureBox{Image=new Bitmap(Image.FromStream(imageStream)),SizeMode=PictureBoxSizeMode.Zoom,Width=64,Height=64});}
 body.Controls.Add(new Label{Text="Dine karakterer. Din hub.",Font=new Font("Segoe UI",20,FontStyle.Bold),AutoSize=true,ForeColor=Color.FromArgb(255,157,77)});
 body.Controls.Add(new Label{Text="1. Åbn /sync, log ind med Discord og opret din egen uploadnøgle.",AutoSize=true,Margin=new Padding(0,15,0,5)});
 body.Controls.Add(Button("Åbn forbindelsessiden",()=>Open(Hub+"/sync")));
 body.Controls.Add(new Label{Text="2. Indsæt din uploadnøgle (vises kun én gang på hjemmesiden)",AutoSize=true,Margin=new Padding(0,12,0,5)});key.BackColor=Color.FromArgb(45,33,22);key.ForeColor=Color.Wheat;folder.BackColor=Color.FromArgb(45,33,22);folder.ForeColor=Color.Wheat;body.Controls.Add(key);
 body.Controls.Add(new Label{Text="3. Vælg Forever-klientmappen med Interface og WTF",AutoSize=true,Margin=new Padding(0,12,0,5)});var row=new FlowLayoutPanel{Width=590,Height=43};row.Controls.Add(folder);row.Controls.Add(Button("Vælg mappe",()=>{using var d=new FolderBrowserDialog{Description="Vælg WoW Forever-mappen med Interface og WTF",UseDescriptionForTitle=true};if(d.ShowDialog()==DialogResult.OK)folder.Text=d.SelectedPath;}));body.Controls.Add(row);
 body.Controls.Add(startup);body.Controls.Add(enabled);var actions=new FlowLayoutPanel{Width=590,Height=48};actions.Controls.Add(Button("Gem og forbind",()=>SaveAndSync()));actions.Controls.Add(Button("Synkronisér nu",()=>Tick(true)));actions.Controls.Add(Button("Godkend nye karakterer",()=>Open(Hub+"/import?source=app")));body.Controls.Add(actions);body.Controls.Add(status);body.Controls.Add(new Label{Text="Luk vinduet med X — appen fortsætter ved Windows-uret.\nHøjreklik på ikonet og vælg Afslut for at stoppe helt.",AutoSize=true,ForeColor=Color.Silver});
 body.Controls.Add(new Label{Text="Appen læser kun LejrbaletSync.lua / FlockSync.lua. Kun dine lokale karakterers basale felter\nsendes. Guld, XP, sidste sted, gear og professionsniveauer medtages. Ingen chat eller adgangskoder.",AutoSize=true,ForeColor=Color.Silver});
 tray=new NotifyIcon{Icon=Icon??SystemIcons.Application,Text="Lejrbalet Sync",Visible=true};var menu=new ContextMenuStrip();menu.Items.Add("Åbn Lejrbalet Sync",null,(_,_)=>Reveal());menu.Items.Add("Synkronisér nu",null,(_,_)=>Tick(true));menu.Items.Add("Godkend nye karakterer",null,(_,_)=>Open(Hub+"/import?source=app"));menu.Items.Add("Afslut",null,(_,_)=>{quit=true;Close();});tray.ContextMenuStrip=menu;tray.DoubleClick+=(_,_)=>Reveal();
 LoadSettings();if(settings.DataVersion<4){settings.Uploaded.Clear();settings.DataVersion=4;}startup.Checked=Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run","LejrbaletSync",null)!=null;enabled.Checked=settings.AutoUpload;folder.Text=settings.Folder;key.Text=token;loading=false;
 startup.CheckedChanged+=(_,_)=>{if(loading)return;try{SetStartup(startup.Checked);}catch{Report("Kunne ikke ændre Windows-opstart. Prøv fra appens installerede placering.");}};
 enabled.CheckedChanged+=(_,_)=>{if(loading)return;settings.AutoUpload=enabled.Checked;Persist();Report(enabled.Checked?"Automatisk upload er slået til.":"Automatisk upload er sat på pause.");};
 timer.Tick+=(_,_)=>Tick(false);timer.Start();Shown+=(_,_)=>{if(background){Hide();ShowInTaskbar=false;}else if(string.IsNullOrEmpty(token))Report("Forbind din konto og vælg spilmappe for at begynde.");Tick(false);};
 FormClosing+=(_,e)=>{if(!quit&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();ShowInTaskbar=false;}else{timer.Stop();tray.Visible=false;tray.Dispose();http.Dispose();}};
 }
 static Button Button(string title,Action action){var b=new Button{Text=title,AutoSize=true,BackColor=Color.FromArgb(245,139,58),ForeColor=Color.Black,FlatStyle=FlatStyle.Flat,Padding=new Padding(6,3,6,3)};b.Click+=(_,_)=>action();return b;}
 static void Open(string url){Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}
 public void Reveal(){ShowInTaskbar=true;Show();WindowState=FormWindowState.Normal;Activate();}
 void Report(string message){if(IsDisposed)return;status.Text=message;tray.Text=("Lejrbalet Sync · "+message)[..Math.Min(63,("Lejrbalet Sync · "+message).Length)];}
 static void SetStartup(bool on){using var k=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");if(on)k.SetValue("LejrbaletSync","\""+Environment.ProcessPath+"\" --background");else k.DeleteValue("LejrbaletSync",false);}
 void LoadSettings(){try{if(File.Exists(ConfigPath)){settings=JsonSerializer.Deserialize<Settings>(File.ReadAllText(ConfigPath))??new();if(settings.Secret.Length>0)token=Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(settings.Secret),null,DataProtectionScope.CurrentUser));}}catch{Report("Indstillinger kunne ikke læses. Forbind kontoen igen.");}}
 void Persist(){try{Directory.CreateDirectory(DataDir);settings.Secret=token.Length>0?Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(token),null,DataProtectionScope.CurrentUser)):"";string temp=ConfigPath+".tmp";File.WriteAllText(temp,JsonSerializer.Serialize(settings));File.Move(temp,ConfigPath,true);}catch{Report("Indstillinger kunne ikke gemmes på computeren.");}}
 void SaveAndSync(){if(busy){Report("Vent, til den igangværende upload er færdig.");return;}string next=key.Text.Trim();if(!System.Text.RegularExpressions.Regex.IsMatch(next,"^ljbs1_[a-f0-9]{64}$")){Report("Indsæt en gyldig uploadnøgle fra /sync.");return;}string root=folder.Text.Trim();if(!Directory.Exists(Path.Combine(root,"Interface"))||!Directory.Exists(Path.Combine(root,"WTF"))){Report("Vælg klientmappen, som indeholder både Interface og WTF.");return;}if(next!=token||root!=settings.Folder)settings.Uploaded.Clear();token=next;authBlocked=false;settings.Folder=root;settings.AutoUpload=enabled.Checked;Persist();Tick(true);}
 async void Tick(bool force){if(busy||authBlocked||(!force&&!settings.AutoUpload))return;if(string.IsNullOrEmpty(token)||string.IsNullOrEmpty(settings.Folder)){if(force)Report("Tryk Gem og forbind, før du starter sync.");return;}busy=true;try{
 string accounts=Path.Combine(settings.Folder,"WTF","Account");if(!Directory.Exists(accounts)){Report("WoW-mappen er utilgængelig. Appen prøver igen automatisk.");return;}
 var files=Directory.GetDirectories(accounts).Select(a=>{var own=Path.Combine(a,"SavedVariables","LejrbaletSync.lua");return File.Exists(own)?own:Path.Combine(a,"SavedVariables","FlockSync.lua");}).Where(File.Exists).Take(20).ToArray();if(files.Length==0){Report("Venter på LejrbaletSync.lua / FlockSync.lua. Scan en karakter i WoW og log ud.");return;}
 bool uploaded=false;int totalUpdated=0,totalPending=0;
 foreach(string file in files){var info=new FileInfo(file);if(info.Length>5*1024*1024){Report("En sync-fil er større end 5 MB og blev sprunget over.");continue;}string content=await File.ReadAllTextAsync(file);string digest=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content)));if(!force&&settings.Uploaded.GetValueOrDefault(file)==digest)continue;
 await Task.Delay(300);if(!File.Exists(file)||!string.Equals(content,await File.ReadAllTextAsync(file),StringComparison.Ordinal)){Report("WoW gemmer stadig. Appen prøver igen.");continue;}
 var chars=await Task.Run(()=>FlockReader.Read(content));if(chars.Count==0){Report("Ingen lokale karakterer scannet endnu. Åbn /lejrbalet og scan karakteren og log ud.");continue;}
 foreach(var batch in chars.Chunk(4)){using var request=new HttpRequestMessage(HttpMethod.Post,Hub+"/api/sync/upload");request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",token);request.Content=new StringContent(JsonSerializer.Serialize(new{characters=batch},Json),Encoding.UTF8,"application/json");using var response=await http.SendAsync(request);
 if(response.StatusCode==HttpStatusCode.Unauthorized){authBlocked=true;Report("Uploadnøglen er afbrudt eller udløbet. Opret en ny på /sync.");return;}if(!response.IsSuccessStatusCode)throw new HttpRequestException("Serveren kunne ikke gemme uploaden. Appen prøver igen.");
 using var result=JsonDocument.Parse(await response.Content.ReadAsStringAsync());totalUpdated+=result.RootElement.GetProperty("updated").GetInt32();totalPending+=result.RootElement.GetProperty("pending").GetInt32();}
 settings.Uploaded[file]=digest;uploaded=true;Persist();
 }
 if(uploaded)Report($"Seneste kontakt: {DateTime.Now:g}. {totalUpdated} opdateret. "+(totalPending>0?$"{totalPending} afventer godkendelse på /import.":"Alle kendte karakterer er behandlet."));
 }catch(FormatException e){Report(e.Message);}catch(IOException){Report("Filen er låst eller ændres. Appen prøver igen efter næste gemning.");}catch(UnauthorizedAccessException){Report("Ingen læseadgang til den valgte mappe.");}catch{Report("Ingen forbindelse til hubben. Appen prøver igen automatisk.");}finally{busy=false;}}
}
