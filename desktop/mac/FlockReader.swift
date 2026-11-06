import Foundation

struct ProfessionSkill: Codable { let name: String; let level: Int; let maxLevel: Int }
struct GearItem: Codable { let slotId: Int; let itemId: Int; let itemLink: String }
struct GearSnapshot: Codable { let updatedAt: Int64; let items: [GearItem] }
struct Character: Codable {
    let guid: String, realm: String, name: String, `class`: String
    let level: Int, capturedAt: Int64
    let professions: [String]?, subProfessions: [String]?
    let professionSkills: [ProfessionSkill]?, gear: GearSnapshot?
}
enum FlockError: Error, LocalizedError {
    case invalid
    var errorDescription: String? { "Ugyldig eller ufuldstændig FlockSync-fil. Scan i WoW og log ud igen." }
}
// Data only: no Lua execution, scripts or third-party addon code.
final class FlockReader {
    indirect enum Value { case text(String), number(Double), bool(Bool), null, table([String: Value]) }
    let bytes: [UInt8]; var i = 0, nodes = 0
    init(_ data: Data) throws { guard data.count <= 5 * 1024 * 1024 else { throw FlockError.invalid }; bytes = Array(data); if bytes.starts(with: [239,187,191]) { i = 3 } }
    func space() {
        while i < bytes.count {
            if [9,10,13,32].contains(bytes[i]) { i += 1 }
            else if i + 1 < bytes.count && bytes[i] == 45 && bytes[i+1] == 45 { while i < bytes.count && bytes[i] != 10 { i += 1 } }
            else { break }
        }
    }
    func expect(_ c: UInt8) throws { space(); guard i < bytes.count && bytes[i] == c else { throw FlockError.invalid }; i += 1 }
    func identifier() -> String {
        let start = i
        guard i < bytes.count, (65...90).contains(bytes[i]) || (97...122).contains(bytes[i]) || bytes[i] == 95 else { return "" }
        i += 1
        while i < bytes.count && ((65...90).contains(bytes[i]) || (97...122).contains(bytes[i]) || (48...57).contains(bytes[i]) || bytes[i] == 95) { i += 1 }
        return String(decoding: bytes[start..<i], as: UTF8.self)
    }
    func quoted() throws -> String {
        let q = bytes[i]; i += 1; var out: [UInt8] = []
        while i < bytes.count {
            var c = bytes[i]; i += 1
            if c == q { guard let s = String(bytes: out, encoding: .utf8) else { throw FlockError.invalid }; return s }
            if c == 92 {
                guard i < bytes.count else { throw FlockError.invalid }; c = bytes[i]; i += 1
                if (48...57).contains(c) {
                    var n = Int(c - 48), count = 1
                    while count < 3 && i < bytes.count && (48...57).contains(bytes[i]) { n = n * 10 + Int(bytes[i] - 48); i += 1; count += 1 }
                    guard n <= 255 else { throw FlockError.invalid }; out.append(UInt8(n))
                } else {
                    let escaped: [UInt8: UInt8] = [110:10,114:13,116:9,98:8,102:12,118:11,97:7,92:92,34:34,39:39]
                    guard let v = escaped[c] else { throw FlockError.invalid }; out.append(v)
                }
            } else { out.append(c) }
            guard out.count <= 1_000_000 else { throw FlockError.invalid }
        }
        throw FlockError.invalid
    }
    func value(_ depth: Int = 0) throws -> Value {
        space(); nodes += 1
        guard depth <= 40 && nodes <= 200_000 && i < bytes.count else { throw FlockError.invalid }
        if bytes[i] == 34 || bytes[i] == 39 { return .text(try quoted()) }
        if bytes[i] == 123 {
            i += 1; var table: [String: Value] = [:]; var index = 1
            while true {
                space(); guard i < bytes.count else { throw FlockError.invalid }
                if bytes[i] == 125 { i += 1; return .table(table) }
                let key: String, item: Value
                if bytes[i] == 91 {
                    i += 1
                    switch try value(depth+1) {
                    case .text(let s): key = s
                    case .number(let n): key = String(n)
                    default: throw FlockError.invalid
                    }
                    try expect(93); try expect(61); item = try value(depth+1)
                } else {
                    let start = i; let id = identifier(); space()
                    if !id.isEmpty && i < bytes.count && bytes[i] == 61 { key = id; i += 1; item = try value(depth+1) }
                    else { i = start; key = String(index); index += 1; item = try value(depth+1) }
                }
                guard !["__proto__","constructor","prototype"].contains(key) else { throw FlockError.invalid }
                table[key] = item; space()
                if i < bytes.count && (bytes[i] == 44 || bytes[i] == 59) { i += 1 }
                else if i >= bytes.count || bytes[i] != 125 { throw FlockError.invalid }
            }
        }
        let start = i; let id = identifier()
        if !id.isEmpty {
            switch id { case "true": return .bool(true); case "false": return .bool(false); case "nil": return .null; default: throw FlockError.invalid }
        }
        while i < bytes.count && (Array("-+0123456789.eE".utf8).contains(bytes[i])) { i += 1 }
        guard i > start, let n = Double(String(decoding: bytes[start..<i], as: UTF8.self)), n.isFinite else { throw FlockError.invalid }
        return .number(n)
    }
    static func map(_ v: Value?) -> [String: Value] { if case .table(let d) = v { return d }; return [:] }
    static func text(_ d: [String: Value], _ k: String) -> String { if case .text(let s) = d[k] { return s }; return "" }
    static func number(_ d: [String: Value], _ k: String) -> Int64 { if case .number(let n) = d[k], n >= 0, n < Double(Int64.max), n.rounded() == n { return Int64(n) }; return 0 }
    static func read(_ data: Data) throws -> [Character] {
        let p = try FlockReader(data); p.space(); guard p.identifier() == "FlockSyncDB" else { throw FlockError.invalid }
        try p.expect(61); let db = map(try p.value()); p.space()
        if p.i < p.bytes.count && p.bytes[p.i] == 59 { p.i += 1; p.space() }
        guard p.i == p.bytes.count, db["accountCharacters"] != nil, db["characters"] != nil else { throw FlockError.invalid }
        let own = map(db["accountCharacters"]), chars = map(db["characters"])
        let classes = [1:"Warrior",2:"Paladin",3:"Hunter",4:"Rogue",5:"Priest",7:"Shaman",8:"Mage",9:"Warlock",11:"Druid"]
        let primary: Set<String> = ["Alchemy","Blacksmithing","Enchanting","Engineering","Herbalism","Leatherworking","Mining","Skinning","Tailoring"]
        let secondary: Set<String> = ["Cooking","Fishing","First Aid"]
        var result: [Character] = []
        for (guid, v) in chars where own[guid] != nil {
            let r = map(v); if case .bool(false) = r["isActive"] { continue }
            let name = text(r,"name").trimmingCharacters(in: .whitespacesAndNewlines), realm = text(r,"realm").trimmingCharacters(in: .whitespacesAndNewlines)
            let level = number(r,"level"), captured = number(r,"lastSeenAt")
            guard text(r,"guid") == guid, guid.range(of: "^Player-[A-Za-z0-9-]{3,100}$", options: .regularExpression) != nil,
                  (1...120).contains(name.count), (1...100).contains(realm.count), (1...60).contains(level), captured > 0,
                  captured <= Int64(Date().timeIntervalSince1970)+300, let cls = classes[Int(number(r,"classId"))] else { throw FlockError.invalid }
            let names = Set(map(map(r["professions"])["primary"]).values.map { text(map($0),"name") })
            let prim = names.intersection(primary).sorted(), sub = names.intersection(secondary).sorted()
            guard prim.count <= 2, result.count < 250 else { throw FlockError.invalid }
            let skillRows = map(map(r["professions"])["primary"]).values.map { map($0) }
            var skills: [ProfessionSkill] = []
            for row in skillRows {
                let n = text(row,"name"), maximum = number(row,"maxLevel")
                guard primary.contains(n) || secondary.contains(n) else { continue }
                guard case .number(let current) = row["level"], current >= 0, current.rounded() == current, maximum > 0, maximum <= 1000, current <= Double(maximum) else { continue }
                guard !skills.contains(where: { $0.name == n }), skills.count < 5 else { throw FlockError.invalid }
                skills.append(ProfessionSkill(name:n,level:Int(current),maxLevel:Int(maximum)))
            }
            var gear: GearSnapshot? = nil
            if r["gear"] != nil, case .table(let g) = r["gear"] {
                let updated = number(g,"updatedAt"), rows = map(g["items"])
                if updated == 0 && rows.isEmpty {} else {
                    guard updated > 0, updated <= Int64(Date().timeIntervalSince1970)+300, rows.count <= 19, case .table = g["items"] else { throw FlockError.invalid }
                    var equipment: [GearItem] = []
                    for v in rows.values {
                        let row = map(v), link = text(map(v),"itemLink")
                        let slot = number(row,"slotId"), id = number(row,"itemId")
                        guard (1...19).contains(slot), (1...100000000).contains(id), !link.isEmpty, link.utf16.count <= 512, !equipment.contains(where: { $0.slotId == Int(slot) }) else { throw FlockError.invalid }
                        let regex = try NSRegularExpression(pattern:"(?:\\|H|^)item:([0-9]+)")
                        let ns = link as NSString
                        guard let match = regex.firstMatch(in:link,range:NSRange(location:0,length:ns.length)), Int64(ns.substring(with:match.range(at:1))) == id else { throw FlockError.invalid }
                        equipment.append(GearItem(slotId:Int(slot),itemId:Int(id),itemLink:link))
                    }
                    gear = GearSnapshot(updatedAt:updated,items:equipment)
                }
            }
            result.append(Character(guid:guid,realm:realm,name:name,class:cls,level:Int(level),capturedAt:captured,professions:prim.isEmpty ? nil : prim,subProfessions:sub.isEmpty ? nil : sub,professionSkills:skills.isEmpty ? nil : skills,gear:gear))
        }
        return result
    }
}
