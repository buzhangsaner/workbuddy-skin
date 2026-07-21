#ifndef AppVersion
  #define AppVersion "0.6.1"
#endif

[Setup]
AppId={{8E3DF36C-D775-4BAF-BF45-7F8A1F4C61A8}
AppName=WorkBuddy Dream Skin
AppVersion={#AppVersion}
AppPublisher=buzhangsaner
AppPublisherURL=https://github.com/buzhangsaner/workbuddy-skin/
AppSupportURL=https://github.com/buzhangsaner/workbuddy-skin/issues
DefaultDirName={localappdata}\WorkBuddyDreamSkin\app
DefaultGroupName=WorkBuddy Dream Skin
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\dist
OutputBaseFilename=WorkBuddy-Dream-Skin-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
UninstallDisplayName=WorkBuddy Dream Skin

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："; Flags: checkedonce

[Files]
Source: "..\..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\themes\*"; DestDir: "{app}\themes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\editor\*"; DestDir: "{app}\editor"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "..\..\runtime\LICENSE.node.txt"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "..\..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\启动 WorkBuddy Dream Skin"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\start-workbuddy-dream-skin.ps1"" -RestartExisting"; WorkingDir: "{app}"
Name: "{group}\恢复 WorkBuddy 原版"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\restore-workbuddy-dream-skin.ps1"""; WorkingDir: "{app}"
Name: "{group}\Dream Skin 编辑器"; Filename: "{app}\editor\workbuddy-dream-skin-editor.html"; WorkingDir: "{app}"
Name: "{autodesktop}\WorkBuddy Dream Skin"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\start-workbuddy-dream-skin.ps1"" -RestartExisting"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\start-workbuddy-dream-skin.ps1"" -RestartExisting"; Description: "立即启动 WorkBuddy Dream Skin"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\restore-workbuddy-dream-skin.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "RestoreWorkBuddySkin"
