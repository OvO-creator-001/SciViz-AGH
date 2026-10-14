using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Drawing;
using System.Windows.Forms;

namespace SciVizInstaller {
 public static class Diagnostics {
  static void Check(bool v,string message){if(!v)throw new Exception(message);}
  static byte[] BadZip(string entry){using(var m=new MemoryStream()){using(var z=new ZipArchive(m,ZipArchiveMode.Create,true)){using(var w=new StreamWriter(z.CreateEntry(entry).Open()))w.Write("test");}return m.ToArray();}}
  static void Exercise(string environment,string root,List<string> report){
   var first=Engine.Install(environment,root);Check(!first.Reused,"First extraction should be new");
   var second=Engine.Install(environment,root);Check(second.Reused&&first.Path==second.Path,"Identical install must reuse");
   var original=Path.Combine(first.Path,"README.md");File.AppendAllText(original,"\nUSER CHANGE\n");
   var third=Engine.Install(environment,root);Check(third.Path!=first.Path&&!third.Reused,"Modified directory must be preserved");Check(File.ReadAllText(original).Contains("USER CHANGE"),"Existing data changed");
   Check(File.Exists(Path.Combine(third.Path,"src/agh/index.mjs")),"Missing runtime entrypoint");
   report.Add("PASS "+environment+": extract, checksum, identical reuse, modified version preservation, new source path");report.Add("Fixture: "+root);
  }
  public static int Run(string[] args){
   if(args.Length<2)throw new Exception("Usage: --scan REPORT | --self-test REPORT [WSL_DISTRO] | --install REPORT ENV ROOT | --ui-smoke IMAGE");
   var report=new List<string>{"SciViz installer 1.0.0; payload 0.4.2; "+DateTimeOffset.Now.ToString("o")};
   if(args[0]=="--scan"){
    List<string> d;try{d=Engine.Distros();}catch(Exception e){report.Add(e.Message);d=new List<string>();}
    foreach(var c in Engine.Discover(d,s=>report.Add(s)))report.Add(c.ToString());
   }else if(args[0]=="--install"){
    if(args.Length!=4)throw new Exception("--install requires ENV ROOT");var installed=Engine.Install(args[2],args[3]);report.Add("Path: "+installed.Path);report.Add("Source: "+installed.Source);report.Add("Reused: "+installed.Reused);
   }else if(args[0]=="--self-test"){
    var root=Path.Combine(Path.GetTempPath(),"SciViz 测试 O'Brien "+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(root);
    Exercise("Windows",root,report);
    foreach(var entry in new[]{"sciviz-agh-0.4.2/../escaped.txt","sciviz-agh-0.4.2/C:/escaped.txt","outside.txt"}){bool failed=false;try{Engine.Extract(BadZip(entry),Path.Combine(root,"invalid"));}catch(IOException){failed=true;}Check(failed,"Unsafe ZIP accepted");}report.Add("PASS rejects ZIP traversal, absolute/drive path and foreign root");
    bool rejected=false;try{Engine.LinuxUnc("Ubuntu","/home/../etc");}catch(IOException){rejected=true;}Check(rejected,"Linux traversal accepted");
    Check(Engine.LinuxUnc("Ubuntu-26.04","/home/某人/a b")==@"\\wsl.localhost\Ubuntu-26.04\home\某人\a b","WSL mapping failed");report.Add("PASS WSL path validation and Unicode/space mapping");
    var tampered=Engine.Payload();using(var m=new MemoryStream()){m.Write(tampered,0,tampered.Length);m.Position=0;using(var z=new ZipArchive(m,ZipArchiveMode.Update,true)){var e=z.GetEntry(Engine.Package+"/README.md");e.Delete();using(var w=new StreamWriter(z.CreateEntry(Engine.Package+"/README.md").Open()))w.Write("tampered");}tampered=m.ToArray();}
    bool corruptRejected=false;try{Engine.Extract(tampered,Path.Combine(root,"corrupt"));}catch(IOException){corruptRejected=true;}Check(corruptRejected,"Tampered archive accepted");report.Add("PASS rejects file content inconsistent with CHECKSUMS");
    if(args.Length>2){var linux=Engine.Run("wsl.exe",new[]{"-d",args[2],"--exec","bash","-s"},"set -eu\np=$(mktemp -d /tmp/sciviz-installer-test.XXXXXXXX)\nmkdir \"$p/空间 O'Brien\"\nprintf \"%s\" \"$p/空间 O'Brien\"\n",12000,Encoding.UTF8);Exercise(args[2],linux,report);
     var mounted=Path.Combine(Path.GetTempPath(),"SciViz mounted 空格 "+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(mounted);var mountPath=Engine.Run("wsl.exe",new[]{"-d",args[2],"--exec","wslpath","-u",mounted},null,12000,Encoding.UTF8).Trim();Exercise(args[2],mountPath,report);report.Add("PASS WSL-mounted Windows directory mapping");}
   }else if(args[0]=="--ui-smoke"){
    Application.EnableVisualStyles();using(var f=new InstallerForm(false)){f.StartPosition=FormStartPosition.Manual;f.Location=new Point(-20000,-20000);f.ShowInTaskbar=false;f.Show();Application.DoEvents();using(var b=new Bitmap(f.Width,f.Height)){f.DrawToBitmap(b,new Rectangle(0,0,f.Width,f.Height));b.Save(args[1],System.Drawing.Imaging.ImageFormat.Png);}f.Close();}return 0;
   }else throw new Exception("Unknown operation");
   File.WriteAllLines(args[1],report,Encoding.UTF8);return 0;
  }
 }
}
