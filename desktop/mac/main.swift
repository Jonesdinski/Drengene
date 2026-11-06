import AppKit
import Foundation
import Security
import ServiceManagement
import CryptoKit
import Carbon

let hub = "https://lejrbalet-vercel.vercel.app"
struct Settings: Codable { var folder = ""; var autoUpload = true; var uploaded: [String:String] = [:] }
struct Payload: Encodable { let characters: [Character] }
struct Reply: Decodable { let updated: Int; let pending: Int }
final class NoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
enum Keychain {
    static let query: [String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"dk.lejrbalet.sync",kSecAttrAccount as String:"upload"]
    static func read() -> String {
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; guard SecItemCopyMatching(q as CFDictionary,&item) == errSecSuccess, let data = item as? Data else { return "" }
        return String(data:data,encoding:.utf8) ?? ""
    }
    static func save(_ value: String) throws {
        let data = Data(value.utf8)
        let status = SecItemUpdate(query as CFDictionary,[kSecValueData as String:data] as CFDictionary)
        if status == errSecItemNotFound {
            var q = query; q[kSecValueData as String] = data; q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(q as CFDictionary,nil) == errSecSuccess else { throw FlockError.invalid }
        } else if status != errSecSuccess { throw FlockError.invalid }
    }
}
@MainActor
final class App: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!; var tray: NSStatusItem!; var timer: Timer?
    let folder = NSTextField(), key = NSSecureTextField(), status = NSTextField(wrappingLabelWithString:"Forbind din konto og vælg spilmappe for at begynde.")
    let enabled = NSButton(checkboxWithTitle:"Upload automatisk efter reload / logout",target:nil,action:nil)
    let startup = NSButton(checkboxWithTitle:"Start automatisk ved login på Mac",target:nil,action:nil)
    var settings = Settings(), token = "", busy = false, authBlocked = false
    let dataDir = FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("LejrbaletSync",isDirectory:true)
    lazy var session: URLSession = { let c = URLSessionConfiguration.ephemeral; c.timeoutIntervalForRequest = 25; c.timeoutIntervalForResource = 60; return URLSession(configuration:c,delegate:NoRedirect(),delegateQueue:nil) }()
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        if let data = try? Data(contentsOf:dataDir.appendingPathComponent("settings.json")), let s = try? JSONDecoder().decode(Settings.self,from:data) { settings = s }
        if UserDefaults.standard.integer(forKey:"payloadVersion") < 3 { settings.uploaded = [:]; UserDefaults.standard.set(3,forKey:"payloadVersion") }
        token = Keychain.read()
        window = NSWindow(contentRect:NSRect(x:0,y:0,width:640,height:680),styleMask:[.titled,.closable,.miniaturizable],backing:.buffered,defer:false)
        window.title = "Lejrbalet Sync · 0.3.0"; window.delegate = self; window.isReleasedWhenClosed = false; window.center()
        let stack = NSStackView(); stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 14; stack.translatesAutoresizingMaskIntoConstraints = false
        window.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo:window.contentView!.leadingAnchor,constant:26),stack.trailingAnchor.constraint(equalTo:window.contentView!.trailingAnchor,constant:-26),stack.topAnchor.constraint(equalTo:window.contentView!.topAnchor,constant:24)])
        let title = NSTextField(labelWithString:"Dine karakterer. Din hub."); title.font = .boldSystemFont(ofSize:25); title.textColor = .systemOrange; stack.addArrangedSubview(title)
        func label(_ text: String) { let field = NSTextField(wrappingLabelWithString:text); stack.addArrangedSubview(field); field.widthAnchor.constraint(equalToConstant:580).isActive = true }
        func button(_ title: String, _ selector: Selector) -> NSButton { NSButton(title:title,target:self,action:selector) }
        label("1. Åbn guiden og opret din personlige forbindelsesnøgle.")
        stack.addArrangedSubview(button("Åbn opsætningsguiden",#selector(openGuide)))
        label("2. Indsæt forbindelsesnøglen fra hjemmesiden")
        key.stringValue = token; key.placeholderString = "Din personlige uploadnøgle"; stack.addArrangedSubview(key); key.widthAnchor.constraint(equalToConstant:580).isActive = true
        label("3. Vælg WoW Forever-mappen med Interface og WTF")
        folder.stringValue = settings.folder; folder.isEditable = false; stack.addArrangedSubview(folder); folder.widthAnchor.constraint(equalToConstant:580).isActive = true
        stack.addArrangedSubview(button("Vælg WoW-mappe…",#selector(chooseFolder)))
        startup.state = SMAppService.mainApp.status == .enabled || settings.folder.isEmpty ? .on : .off; startup.target = self; startup.action = #selector(changeStartup); stack.addArrangedSubview(startup)
        enabled.state = settings.autoUpload ? .on : .off; enabled.target = self; enabled.action = #selector(changeEnabled); stack.addArrangedSubview(enabled)
        let actions = NSStackView(views:[button("Gem og forbind",#selector(saveAndSync)),button("Synkronisér nu",#selector(forceSync)),button("Tilknyt karakterer",#selector(openImport))]); actions.spacing = 8; stack.addArrangedSubview(actions)
        status.font = .systemFont(ofSize:13); stack.addArrangedSubview(status); status.widthAnchor.constraint(equalToConstant:580).isActive = true
        label("Luk vinduet med den røde knap — appen synkroniserer videre i menulinjen. Vælg Afslut i menulinjen for at stoppe den helt.")
        tray = NSStatusBar.system.statusItem(withLength:NSStatusItem.variableLength); tray.button?.image = NSImage(systemSymbolName:"flame.fill",accessibilityDescription:"Lejrbalet Sync")
        let menu = NSMenu()
        for (title, selector) in [("Åbn Lejrbalet Sync",#selector(reveal)),("Synkronisér nu",#selector(forceSync)),("Tilknyt nye karakterer",#selector(openImport)),("Afslut Lejrbalet Sync",#selector(quit))] { let item = NSMenuItem(title:title,action:selector,keyEquivalent:""); item.target = self; menu.addItem(item) }
        tray.menu = menu
        let mainMenu = NSMenu(); let root = NSMenuItem(); let appMenu = NSMenu(); let quitItem = NSMenuItem(title:"Afslut Lejrbalet Sync",action:#selector(quit),keyEquivalent:"q"); quitItem.target = self; appMenu.addItem(quitItem); root.submenu = appMenu; mainMenu.addItem(root)
        let editRoot = NSMenuItem(); editRoot.title = "Redigér"; let editMenu = NSMenu(title:"Redigér")
        for (title, action, shortcut) in [("Klip",#selector(NSText.cut(_:)),"x"),("Kopiér",#selector(NSText.copy(_:)),"c"),("Indsæt",#selector(NSText.paste(_:)),"v"),("Vælg alt",#selector(NSText.selectAll(_:)),"a")] { editMenu.addItem(NSMenuItem(title:title,action:action,keyEquivalent:shortcut)) }
        editRoot.submenu = editMenu; mainMenu.addItem(editRoot); NSApp.mainMenu = mainMenu
        let loginLaunch = NSAppleEventManager.shared().currentAppleEvent?.paramDescriptor(forKeyword:AEKeyword(keyAEPropData))?.enumCodeValue == OSType(keyAELaunchedAsLogInItem)
        if !CommandLine.arguments.contains("--background") && !loginLaunch { reveal() }
        timer = Timer.scheduledTimer(withTimeInterval:15,repeats:true) { [weak self] _ in Task { @MainActor in await self?.sync(false) } }
        if CommandLine.arguments.contains("--smoke-test") {
            DispatchQueue.main.asyncAfter(deadline:.now()+1) {
                self.window.makeKeyAndOrderFront(nil); self.window.performClose(nil)
                guard !self.window.isVisible, self.timer?.isValid == true, self.tray.menu?.items.count == 4, !self.applicationShouldTerminateAfterLastWindowClosed(NSApp) else { exit(1) }
                print("Background lifecycle checks passed: window hidden, timer active, status menu available.")
                NSApp.terminate(nil)
            }
        } else { Task { await sync(false) } }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func windowShouldClose(_ sender: NSWindow) -> Bool { sender.orderOut(nil); return false }
    func applicationShouldHandleReopen(_ sender: NSApplication,hasVisibleWindows flag: Bool) -> Bool { reveal(); return true }
    @objc func reveal() { window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps:true) }
    @objc func quit() { NSApp.terminate(nil) }
    @objc func openGuide() { NSWorkspace.shared.open(URL(string:hub+"/sync")!) }
    @objc func openImport() { NSWorkspace.shared.open(URL(string:hub+"/import?source=app")!) }
    @objc func chooseFolder() { let p = NSOpenPanel(); p.canChooseFiles = false; p.canChooseDirectories = true; p.allowsMultipleSelection = false; p.message = "Vælg mappen med Interface og WTF"; if p.runModal() == .OK, let url = p.url { folder.stringValue = url.path } }
    func report(_ s: String) { status.stringValue = s; tray?.button?.toolTip = "Lejrbalet Sync · " + s }
    func persist() throws { try FileManager.default.createDirectory(at:dataDir,withIntermediateDirectories:true); try JSONEncoder().encode(settings).write(to:dataDir.appendingPathComponent("settings.json"),options:.atomic) }
    @objc func changeEnabled() { settings.autoUpload = enabled.state == .on; do { try persist(); report(settings.autoUpload ? "Automatisk upload er slået til." : "Automatisk upload er sat på pause.") } catch { report("Indstillingerne kunne ikke gemmes.") } }
    @objc func changeStartup() {
        do {
            if startup.state == .on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            if SMAppService.mainApp.status == .requiresApproval { report("Godkend Lejrbalet Sync under Systemindstillinger → Generelt → Loginemner."); SMAppService.openSystemSettingsLoginItems() }
            else { report(startup.state == .on ? "Appen starter automatisk ved login." : "Automatisk opstart er slået fra.") }
        } catch { startup.state = SMAppService.mainApp.status == .enabled || settings.folder.isEmpty ? .on : .off; report("Flyt appen til Programmer, og prøv igen. Kontrollér Loginemner i Systemindstillinger.") }
    }
    @objc func saveAndSync() {
        guard !busy else { report("Vent, til uploaden er færdig."); return }
        let next = key.stringValue.trimmingCharacters(in:.whitespacesAndNewlines), path = folder.stringValue
        guard next.range(of:"^ljbs1_[a-f0-9]{64}$",options:.regularExpression) != nil else { report("Indsæt en gyldig forbindelsesnøgle fra /sync."); return }
        guard isDirectory(path+"/Interface"), isDirectory(path+"/WTF") else { report("Vælg mappen med både Interface og WTF."); return }
        do { try Keychain.save(next); if next != token || path != settings.folder { settings.uploaded = [:] }; token = next; settings.folder = path; settings.autoUpload = enabled.state == .on; try persist(); authBlocked = false; if startup.state == .on && SMAppService.mainApp.status != .enabled { changeStartup() }; Task { await sync(true) } }
        catch { report("Kunne ikke gemme forbindelsen. Kontrollér adgangen til din nøglering.") }
    }
    func isDirectory(_ path: String) -> Bool { var d: ObjCBool = false; return FileManager.default.fileExists(atPath:path,isDirectory:&d) && d.boolValue }
    @objc func forceSync() { Task { await sync(true) } }
    func sync(_ force: Bool) async {
        guard !busy, !authBlocked, force || settings.autoUpload else { return }
        guard !token.isEmpty, !settings.folder.isEmpty else { if force { report("Tryk Gem og forbind først.") }; return }
        busy = true; defer { busy = false }
        do {
            let root = URL(fileURLWithPath:settings.folder).appendingPathComponent("WTF/Account",isDirectory:true)
            let accounts = try FileManager.default.contentsOfDirectory(at:root,includingPropertiesForKeys:[.isDirectoryKey],options:.skipsHiddenFiles).filter { isDirectory($0.path) }.prefix(20)
            var found = false, sent = false, updated = 0, pending = 0
            for account in accounts {
                let file = account.appendingPathComponent("SavedVariables/FlockSync.lua")
                guard FileManager.default.fileExists(atPath:file.path) else { continue }; found = true
                let attributes = try FileManager.default.attributesOfItem(atPath:file.path)
                guard ((attributes[.size] as? NSNumber)?.intValue ?? Int.max) <= 5*1024*1024 else { report("En FlockSync-fil er større end 5 MB."); continue }
                let data = try Data(contentsOf:file); let digest = SHA256.hash(data:data).map { String(format:"%02x",$0) }.joined()
                if !force && settings.uploaded[file.path] == digest { continue }
                try await Task.sleep(nanoseconds:300_000_000)
                guard data == (try Data(contentsOf:file)) else { report("WoW gemmer stadig. Prøver igen automatisk."); continue }
                let chars = try await Task.detached(priority:.utility) { try FlockReader.read(data) }.value
                if chars.isEmpty { report("Scan dine karakterer i FlockSync, og log ud."); continue }
                for start in stride(from:0,to:chars.count,by:4) {
                    var req = URLRequest(url:URL(string:hub+"/api/sync/upload")!); req.httpMethod = "POST"; req.setValue("Bearer "+token,forHTTPHeaderField:"Authorization"); req.setValue("application/json",forHTTPHeaderField:"Content-Type"); req.httpBody = try JSONEncoder().encode(Payload(characters:Array(chars[start..<min(start+4,chars.count)])))
                    let (reply,response) = try await session.data(for:req)
                    guard let response = response as? HTTPURLResponse else { throw FlockError.invalid }
                    if response.statusCode == 401 { authBlocked = true; report("Forbindelsesnøglen er udløbet eller afbrudt. Opret en ny på /sync."); return }
                    guard response.statusCode == 200 else { report("Hubben kunne ikke gemme dataene. Prøver igen automatisk."); return }
                    let result = try JSONDecoder().decode(Reply.self,from:reply); updated += result.updated; pending += result.pending
                }
                settings.uploaded[file.path] = digest; try persist(); sent = true
            }
            if !found { report("Venter på FlockSync.lua. Scan i WoW, og brug /reload eller log ud.") }
            else if sent { report("Seneste sync: \(DateFormatter.localizedString(from:Date(),dateStyle:.short,timeStyle:.short)). \(updated) opdateret." + (pending > 0 ? " \(pending) afventer tilknytning på hubben." : " Alle kendte karakterer er behandlet.")) }
        } catch let e as FlockError { report(e.localizedDescription) }
        catch { report("Filen eller forbindelsen er utilgængelig. Prøver igen automatisk. Kontrollér WoW-mappen og internet.") }
    }
}
@main
struct Entry {
    @MainActor static func main() {
        let delegate = App()
        NSApplication.shared.delegate = delegate
        withExtendedLifetime(delegate) { NSApplication.shared.run() }
    }
}
