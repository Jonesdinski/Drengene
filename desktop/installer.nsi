Unicode True
!include "MUI2.nsh"
Name "Lejrbalet Sync"
OutFile "LejrbaletSync-Setup.exe"
InstallDir "$LOCALAPPDATA\LejrbaletSync"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\LejrbaletSync.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Åbn Lejrbalet Sync og forbind din konto"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Danish"
Section "Lejrbalet Sync"
 SetShellVarContext current
 SetOutPath "$INSTDIR"
 File "publish\LejrbaletSync.exe"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 CreateDirectory "$SMPROGRAMS\Lejrbalet Sync"
 CreateShortcut "$SMPROGRAMS\Lejrbalet Sync\Lejrbalet Sync.lnk" "$INSTDIR\LejrbaletSync.exe"
 CreateShortcut "$SMPROGRAMS\Lejrbalet Sync\Afinstaller.lnk" "$INSTDIR\Uninstall.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "LejrbaletSync" '$"$INSTDIR\LejrbaletSync.exe$" --background'
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync" "DisplayName" "Lejrbalet Sync"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync" "UninstallString" '$"$INSTDIR\Uninstall.exe$"'
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync" "DisplayVersion" "0.1.0"
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync" "NoModify" 1
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync" "NoRepair" 1
SectionEnd
Function .onInit
 System::Call 'kernel32::OpenMutexW(i 0x100000, i 0, w "Local\LejrbaletSync") p .r0'
 IntCmp $0 0 done
 System::Call 'kernel32::CloseHandle(p r0)'
 MessageBox MB_OK "Afslut Lejrbalet Sync via ikonet i systembakken, før du installerer eller opdaterer."
 Abort
 done:
FunctionEnd
Function un.onInit
 System::Call 'kernel32::OpenMutexW(i 0x100000, i 0, w "Local\LejrbaletSync") p .r0'
 IntCmp $0 0 done
 System::Call 'kernel32::CloseHandle(p r0)'
 MessageBox MB_OK "Afslut Lejrbalet Sync via ikonet i systembakken før afinstallation."
 Abort
 done:
FunctionEnd
Section "Uninstall"
 SetShellVarContext current
 DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "LejrbaletSync"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LejrbaletSync"
 Delete "$INSTDIR\LejrbaletSync.exe"
 Delete "$INSTDIR\Uninstall.exe"
 RMDir "$INSTDIR"
 RMDir /r "$SMPROGRAMS\Lejrbalet Sync"
 RMDir /r "$LOCALAPPDATA\LejrbaletSyncData"
SectionEnd
