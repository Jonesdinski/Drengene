import Foundation
@main struct Checks {
 static func main() throws {
    let guid = "Player-123-ABC"
    let data = """
    FlockSyncDB = {accountCharacters={["\(guid)"]={}},characters={["\(guid)"]={guid="\(guid)",name="Ægir",realm="Realm",classId=8,level=20,lastSeenAt=1700000000,professions={primary={{name="Alchemy"},{name="Cooking"}}}},["Player-123-OTHER"]={name="Guildmate"}}}
    """
    let chars = try FlockReader.read(Data(data.utf8))
    precondition(chars.count == 1 && chars[0].name == "Ægir" && chars[0].level == 20 && chars[0].professions == ["Alchemy"] && chars[0].subProfessions == ["Cooking"])
    let escaped = data.replacingOccurrences(of:"Ægir",with:"\\195\\134gir")
    let escapedChars = try FlockReader.read(Data(escaped.utf8)); precondition(escapedChars[0].name == "Ægir")
    for bad in [data+"; os.execute('bad')",data.replacingOccurrences(of:"level=20",with:"level=99"),String(data.dropLast(3)),"FlockSyncDB={__proto__={}}","FlockSyncDB="+String(repeating:"{x=",count:50)+"0"+String(repeating:"}",count:50)] {
        var rejected = false; do { _ = try FlockReader.read(Data(bad.utf8)) } catch { rejected = true }; precondition(rejected,"Unsafe data accepted")
    }
    let armory = data.replacingOccurrences(of:"name=\"Alchemy\"",with:"name=\"Alchemy\",level=150,maxLevel=225").replacingOccurrences(of:"lastSeenAt=1700000000",with:"lastSeenAt=1700000000,gear={updatedAt=1700000000,items={{slotId=16,itemId=19019,itemLink=\"|cffff8000|Hitem:19019:0|h[Thunderfury]|h|r\"}}}")
    let equipment = try FlockReader.read(Data(armory.utf8))[0]
    precondition(equipment.gear?.items.first?.itemId == 19019 && equipment.professionSkills?.first?.level == 150)
    for bad in [armory.replacingOccurrences(of:"slotId=16",with:"slotId=20"),armory.replacingOccurrences(of:"itemId=19019",with:"itemId=123")] {
        var rejected = false; do { _ = try FlockReader.read(Data(bad.utf8)) } catch { rejected = true }; precondition(rejected)
    }
    print("Gear and profession rank checks passed.")
    print("Parser checks passed: own characters, Unicode, professions, executable Lua, truncation, level and depth rejection.")
 }
}
