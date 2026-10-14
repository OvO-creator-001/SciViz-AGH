using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Management;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SciVizInstaller {
 public sealed class Candidate {
  public string Environment, Root, Evidence;
  public override string ToString() { return Environment+" | "+Root+" | "+Evidence; }
 }
 public sealed class Installed { public string Path, Source; public bool Reused; }
 public static class Engine {
  public const string Package="sciviz-agh-0.4.2";
  public static string Resource(string name) { using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream(name)) using(var r=new StreamReader(s)) return r.ReadToEnd(); }
  public static byte[] Payload() { using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip")) using(var m=new MemoryStream()) { s.CopyTo(m);return m.ToArray(); } }
  public static string Hash(byte[] b) { using(var s=SHA256.Create()) return BitConverter.ToString(s.ComputeHash(b)).Replace("-","").ToLowerInvariant(); }
  public static string Quote(string s) {
   if(Regex.IsMatch(s,@"^[A-Za-z0-9_.:/=\-]+$"))return s;
   var b=new StringBuilder("\"");int slashes=0;
   foreach(var c in s){if(c=='\\'){slashes++;continue;}if(c=='"'){b.Append('\\',slashes*2+1);b.Append(c);}else{b.Append('\\',slashes);b.Append(c);}slashes=0;}b.Append('\\',slashes*2);b.Append('"');return b.ToString();
  }
  public static string Run(string exe, string[] args, string input, int timeout, Encoding encoding) {
   var p=new Process { StartInfo=new ProcessStartInfo(exe,string.Join(" ",args.Select(Quote))) { UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,RedirectStandardInput=true,StandardOutputEncoding=encoding,StandardErrorEncoding=encoding } };
   using(p) { p.Start();var stdout=p.StandardOutput.ReadToEndAsync();var stderr=p.StandardError.ReadToEndAsync();
    if(input!=null){var raw=new UTF8Encoding(false).GetBytes(input);p.StandardInput.BaseStream.Write(raw,0,raw.Length);p.StandardInput.BaseStream.Flush();}p.StandardInput.Close();
    if(!p.WaitForExit(timeout)){try{p.Kill();}catch{}throw new IOException("搜索超时，请手动选择目录或重新扫描。");}
    Task.WaitAll(stdout,stderr);if(p.ExitCode!=0)throw new IOException(exe+" 返回 "+p.ExitCode+"："+stderr.Result.Trim());return stdout.Result;
   }
  }
  public static List<string> Distros() { return Run("wsl.exe",new[]{"--list","--quiet"},null,12000,Encoding.Unicode).Replace("\0","").Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).Select(x=>x.Trim()).Where(x=>x.Length>0&&!x.StartsWith("docker-desktop",StringComparison.OrdinalIgnoreCase)).ToList(); }
  public static string LinuxUnc(string distro,string root) {
   if(!Regex.IsMatch(distro,@"^[\p{L}\p{N}_. -]+$")||!root.StartsWith("/")||root.Contains('\\')||root.Split('/').Any(x=>x==".."||x==".")||root.IndexOfAny(new[]{'\r','\n','\0'})>=0)throw new IOException("请输入发行版中的绝对 Linux 路径，例如 /home/用户名/agh。");
   return @"\\wsl.localhost\"+distro+root.Replace('/','\\');
  }
  static bool IsAgh(string p) { try { var f=Path.Combine(p,"package.json");return File.Exists(f)&&new FileInfo(f).Length<65536&&Regex.IsMatch(File.ReadAllText(f),"\"name\"\\s*:\\s*\"(?:@agnes/[^\"]+|agnes-harness|agh)\""); }catch{return false;} }
  static string AghParent(string p) { for(int i=0;i<6&&!String.IsNullOrEmpty(p);i++){if(IsAgh(p))return p;p=Path.GetDirectoryName(p);}return null; }
  public static List<Candidate> Discover(List<string> distros,Action<string> log) {
   var found=new List<Candidate>();var seeds=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
   foreach(var p in new[]{AppDomain.CurrentDomain.BaseDirectory,Environment.CurrentDirectory,Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),Environment.GetEnvironmentVariable("AGH_WORKSPACE_ROOT"),Environment.GetEnvironmentVariable("AGH_HOME")})if(!String.IsNullOrWhiteSpace(p)&&Directory.Exists(p))seeds.Add(p);
   foreach(var d in DriveInfo.GetDrives().Where(x=>x.DriveType==DriveType.Fixed&&x.IsReady))foreach(var n in new[]{"Apps","Projects","Dev","agh","agnes-harness"}){var p=Path.Combine(d.RootDirectory.FullName,n);if(Directory.Exists(p))seeds.Add(p);}
   try { using(var search=new ManagementObjectSearcher("SELECT CommandLine FROM Win32_Process WHERE Name='node.exe' OR Name='bun.exe' OR Name='agh.exe' OR Name='agnes.exe'")) foreach(ManagementObject o in search.Get()) {
    var command=(string)o["CommandLine"]??"";foreach(Match m in Regex.Matches(command,@"(?:""([^""]+)""|(\S+))")){var token=m.Groups[1].Success?m.Groups[1].Value:m.Groups[2].Value;if(token.EndsWith(".mjs")||token.EndsWith(".js")){var p=AghParent(Path.GetDirectoryName(token));if(p!=null)seeds.Add(p);}}
   }}catch {log("Windows 进程信息不可读，继续查找常见目录。");}
   var queue=new Queue<Tuple<string,int>>();foreach(var p in seeds)queue.Enqueue(Tuple.Create(p,0));var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);int count=0;
   while(queue.Count>0&&count++<2200){var item=queue.Dequeue();if(!seen.Add(item.Item1))continue;
    if(IsAgh(item.Item1)) {found.Add(new Candidate{Environment="Windows",Root=item.Item1,Evidence="AGH 程序目录候选；确认是否为后台启动目录"});continue;}
    if(item.Item2>=3)continue;
    try{foreach(var sub in Directory.EnumerateDirectories(item.Item1)){var name=Path.GetFileName(sub);if(name.StartsWith(".")||new[]{"node_modules","Windows","ProgramData","AppData"}.Contains(name)||(File.GetAttributes(sub)&FileAttributes.ReparsePoint)!=0)continue;queue.Enqueue(Tuple.Create(sub,item.Item2+1));}}catch{}
   }
   foreach(var d in distros){log("查找 WSL / "+d+" …");try {var data=Run("wsl.exe",new[]{"-d",d,"--exec","bash","-s"},Resource("discover.sh").Replace("\r\n","\n"),20000,Encoding.UTF8);
    foreach(var line in data.Split('\n')){var fields=line.TrimEnd('\r').Split('\t');if(fields.Length!=2)continue;var p=Encoding.UTF8.GetString(Convert.FromBase64String(fields[1]));found.Add(new Candidate{Environment=d,Root=p,Evidence=fields[0]=="running"?"正在运行的 AGH 后台工作目录":"AGH 程序目录候选；需确认启动目录"});}
   }catch(Exception e){log(d+"："+e.Message);}}
   return found.GroupBy(x=>x.Environment+"\n"+x.Root).Select(x=>x.OrderByDescending(v=>v.Evidence.StartsWith("正在")).First()).OrderByDescending(x=>x.Evidence.StartsWith("正在")).ToList();
  }
  static void NoReparse(string p) { for(var d=new DirectoryInfo(p);d!=null;d=d.Parent)if(d.Exists&&(d.Attributes&FileAttributes.ReparsePoint)!=0)throw new IOException("目标包含目录链接，请选择实际目录："+d.FullName); }
  public static void Extract(byte[] payload,string target) {
   var prefix=Path.GetFullPath(target).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
   using(var mem=new MemoryStream(payload))using(var zip=new ZipArchive(mem,ZipArchiveMode.Read)) {
    if(zip.Entries.Count>256||zip.Entries.Sum(x=>x.Length)>20*1024*1024)throw new IOException("插件包规模异常。");
    var entries=new List<Tuple<ZipArchiveEntry,string>>();var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    foreach(var e in zip.Entries){var n=e.FullName.Replace('\\','/');if(!n.StartsWith(Package+"/",StringComparison.Ordinal)||n.Contains(":")||n.Split('/').Any(x=>x==".."||x==".")||((e.ExternalAttributes>>16)&0xF000)==0xA000)throw new IOException("插件包包含非法路径。");
     var relative=n.Substring(Package.Length+1);if(relative.Length==0||n.EndsWith("/"))continue;var dest=Path.GetFullPath(Path.Combine(target,relative.Replace('/',Path.DirectorySeparatorChar)));
     if(!dest.StartsWith(prefix,StringComparison.OrdinalIgnoreCase)||!seen.Add(dest))throw new IOException("插件包路径重复或越界。");entries.Add(Tuple.Create(e,dest));
    }
    foreach(var e in entries){Directory.CreateDirectory(Path.GetDirectoryName(e.Item2));using(var src=e.Item1.Open())using(var dst=new FileStream(e.Item2,FileMode.CreateNew,FileAccess.Write))src.CopyTo(dst);}
   }
   var checks=Path.Combine(target,"CHECKSUMS.sha256");if(!File.Exists(checks))throw new IOException("插件包缺少校验清单。");
   foreach(var line in File.ReadAllLines(checks)){if(String.IsNullOrWhiteSpace(line))continue;var m=Regex.Match(line,@"^([a-f0-9]{64})\s+(.+)$");if(!m.Success)throw new IOException("校验清单格式错误。");var f=Path.GetFullPath(Path.Combine(target,m.Groups[2].Value.Replace('/',Path.DirectorySeparatorChar)));if(!f.StartsWith(prefix,StringComparison.OrdinalIgnoreCase)||!File.Exists(f)||Hash(File.ReadAllBytes(f))!=m.Groups[1].Value)throw new IOException("插件完整性校验失败。");}
   var package=File.ReadAllText(Path.Combine(target,"package.json"));if(!Regex.IsMatch(package,"\"name\"\\s*:\\s*\"sciviz-agh\"")||!Regex.IsMatch(package,"\"version\"\\s*:\\s*\"0\\.4\\.2\""))throw new IOException("插件名称或版本不符。");
  }
  static bool Same(string a,string b){try{var x=Directory.GetFiles(a,"*",SearchOption.AllDirectories);var y=Directory.GetFiles(b,"*",SearchOption.AllDirectories);return x.Length==y.Length&&x.All(f=>{var g=Path.Combine(b,f.Substring(a.Length+1));return File.Exists(g)&&Hash(File.ReadAllBytes(f))==Hash(File.ReadAllBytes(g));});}catch{return false;}}
  public static Installed Install(string environment,string root) {
   var bytes=Payload();if(Hash(bytes)!=Resource("payload.sha256").Trim())throw new IOException("内置 ZIP 校验失败。");
   root=root.Trim().TrimEnd('/','\\');if(String.IsNullOrWhiteSpace(root)||root.IndexOfAny(new[]{'\r','\n','\0'})>=0)throw new IOException("请选择后台工作目录。");
   var basePath=environment=="Windows"?Path.GetFullPath(root):LinuxUnc(environment,root);
   if(environment!="Windows"){
    // wslpath respects custom automount roots and maps /mnt/<drive> to native Windows paths.
    try{var mapped=Run("wsl.exe",new[]{"-d",environment,"--exec","wslpath","-w",root},null,12000,Encoding.UTF8).Trim();if(Path.IsPathRooted(mapped))basePath=mapped;}catch(IOException){}
   }
   if(environment!="Windows"&&!Directory.Exists(basePath))basePath=basePath.Replace(@"\\wsl.localhost\",@"\\wsl$\");
   if(environment=="Windows"&&!Path.IsPathRooted(root))throw new IOException("请选择绝对路径。");
   if(!Directory.Exists(basePath))throw new IOException("目录不存在或不可访问："+basePath);
   if(environment=="Windows")NoReparse(basePath);
   var plugins=Path.Combine(basePath,"plugins");if(Directory.Exists(plugins))NoReparse(plugins);Directory.CreateDirectory(plugins);
   var stage=Path.Combine(plugins,".sciviz-stage-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
   // Never recursively delete a user directory. Failed staging stays available for inspection.
   Extract(bytes,stage);var final=Path.Combine(plugins,Package);bool reuse=false;
   if(Directory.Exists(final)){NoReparse(final);if(Same(stage,final)){reuse=true;foreach(var f in Directory.GetFiles(stage,"*",SearchOption.AllDirectories))File.Delete(f);foreach(var d in Directory.GetDirectories(stage,"*",SearchOption.AllDirectories).OrderByDescending(x=>x.Length))Directory.Delete(d);Directory.Delete(stage);}else final+="-"+DateTime.Now.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6);}
   if(!reuse)Directory.Move(stage,final);
   return new Installed {Path=final,Source="file:./plugins/"+Path.GetFileName(final),Reused=reuse};
  }
 }
 public sealed class InstallerForm:Form {
  readonly ComboBox environment=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Width=230};
  readonly TextBox root=new TextBox{Width=620};readonly ListBox candidates=new ListBox{Width=850,Height=145,HorizontalScrollbar=true};
  readonly TextBox log=new TextBox{Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical,Width=850,Height=135};
  readonly TextBox result=new TextBox{ReadOnly=true,Width=640};readonly Button scan=new Button{Text="自动查找",Width=100},install=new Button{Text="解压插件到此目录",Width=180};
  List<string> distros=new List<string>();
  void Log(string s){if(InvokeRequired){BeginInvoke(new Action<string>(Log),s);return;}log.AppendText(s+Environment.NewLine);}
  public InstallerForm(bool autoScan=true){Text="SciViz-AGH 0.4.2 安装助手";ClientSize=new Size(900,740);MinimumSize=Size;Font=new Font("Microsoft YaHei UI",10);AutoScaleMode=AutoScaleMode.Dpi;
   var flow=new FlowLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(20),FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoScroll=true};Controls.Add(flow);
   flow.Controls.Add(new Label{Text="查找 AGH 后台工作目录，再解压插件",AutoSize=true,Font=new Font(Font,FontStyle.Bold)});
   flow.Controls.Add(new Label{Text="可从 PowerShell 启动，也支持 Windows 上的 WSL / Ubuntu。插件包已内置。",AutoSize=true});
   flow.Controls.Add(scan);flow.Controls.Add(candidates);
   flow.Controls.Add(new Label{Text="运行环境及后台工作目录（程序目录候选需与你的启动位置核对）",AutoSize=true});
   environment.Items.Add("Windows");environment.SelectedIndex=0;flow.Controls.Add(environment);
   var row=new FlowLayoutPanel{Width=850,Height=40};row.Controls.Add(root);var browse=new Button{Text="选择文件夹",Width=130};row.Controls.Add(browse);flow.Controls.Add(row);flow.Controls.Add(install);
   flow.Controls.Add(log);flow.Controls.Add(new Label{Text="解压后：AGH → 设置 → 插件管理，粘贴来源并安装、信任、启用",AutoSize=true});
   var last=new FlowLayoutPanel{Width=850,Height=40};last.Controls.Add(result);var copy=new Button{Text="复制来源",Width=130};last.Controls.Add(copy);flow.Controls.Add(last);
   candidates.SelectedIndexChanged+=(s,e)=>{var c=candidates.SelectedItem as Candidate;if(c!=null){environment.SelectedItem=c.Environment;root.Text=c.Root;}};
   browse.Click+=(s,e)=>{using(var d=new FolderBrowserDialog{Description="选择 AGH 后台实际启动的目录"})if(d.ShowDialog()==DialogResult.OK){if((string)environment.SelectedItem!="Windows"){var prefix=@"\\wsl.localhost\"+environment.SelectedItem+"\\";var old=@"\\wsl$\"+environment.SelectedItem+"\\";if(d.SelectedPath.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))root.Text="/"+d.SelectedPath.Substring(prefix.Length).Replace('\\','/');else if(d.SelectedPath.StartsWith(old,StringComparison.OrdinalIgnoreCase))root.Text="/"+d.SelectedPath.Substring(old.Length).Replace('\\','/');else MessageBox.Show("WSL 环境请填写 Linux 绝对路径，或选择该发行版的网络目录。");}else root.Text=d.SelectedPath;}};
   copy.Click+=(s,e)=>{if(result.Text.Length>0)Clipboard.SetText(result.Text);};
   scan.Click+=async(s,e)=>{scan.Enabled=install.Enabled=false;candidates.Items.Clear();Log("正在查找，通常需要几秒；WSL 尚未运行时会启动发行版。");try{distros=await Task.Run(()=>{try{return Engine.Distros();}catch{return new List<string>();}});environment.Items.Clear();environment.Items.Add("Windows");foreach(var d in distros)environment.Items.Add(d);environment.SelectedIndex=0;var items=await Task.Run(()=>Engine.Discover(distros,Log));foreach(var c in items)candidates.Items.Add(c);if(items.Count>0)candidates.SelectedIndex=0;Log(items.Count==0?"未找到候选。请选择运行环境并手动填写后台工作目录。":"请选择正确候选；确认后点击解压。");}catch(Exception x){Log(x.Message);}finally{scan.Enabled=install.Enabled=true;}};
   install.Click+=async(s,e)=>{var env=(string)environment.SelectedItem;var dir=root.Text;scan.Enabled=install.Enabled=false;result.Clear();try{Log("正在校验并解压到："+env+" / "+dir);var r=await Task.Run(()=>Engine.Install(env,dir));result.Text=r.Source;Log((r.Reused?"已存在相同文件，直接使用：":"解压完成：")+r.Path);Log("复制下面的来源到 AGH 插件管理，完成安装、信任和启用。");}catch(Exception x){Log("未完成："+x.Message);}finally{scan.Enabled=install.Enabled=true;}};
   if(autoScan)Shown+=(s,e)=>scan.PerformClick();
  }
 }
 public static class Program {
  [STAThread] public static int Main(string[] args){try{
   if(args.Length>0)return Diagnostics.Run(args);
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new InstallerForm());return 0;
  }catch(Exception e){if(args.Length>1)File.WriteAllText(args[1],"FAILED: "+e,Encoding.UTF8);else MessageBox.Show(e.Message,"SciViz 安装助手");return 1;}}
 }
}
