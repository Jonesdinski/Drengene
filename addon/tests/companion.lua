-- Runs the Companion module against a simulated client, not a live WoW session.
local registered, prints, banners, sounds, popups, reloads, shots, scanned = {}, {}, {}, 0, {}, 0, 0, nil
local clock, server, combat = 100, 1763125200, false
local units = {}
local log = {}

local function mock()
  local o = {shown = false, scripts = {}}
  return setmetatable(o, {__index = function(_, k)
    if k == 'SetScript' then return function(self, kind, fn) self.scripts[kind] = fn end end
    if k == 'IsShown' then return function(self) return self.shown end end
    if k == 'Show' then return function(self) self.shown = true; if self.scripts.OnShow then self.scripts.OnShow(self) end end end
    if k == 'Hide' then return function(self) self.shown = false end end
    if k == 'SetShown' then return function(self, v) self.shown = v end end
    if k == 'GetStringHeight' then return function() return 14 end end
    if k == 'GetChecked' then return function() return false end end
    if k == 'CreateFontString' or k == 'CreateTexture' then return function() return mock() end end
    if k == 'SetText' then return function(self, v) self.value = v end end
    if k == 'RegisterEvent' then return function(self, e) registered[e] = true end end
    return function() end
  end})
end
local frames = {}
function CreateFrame() local f = mock(); frames[#frames + 1] = f; return f end
UIParent, UISpecialFrames, StaticPopupDialogs = mock(), {}, {}
SlashCmdList = {LEJRBALETSYNC = function(m) scanned = m end}
C_Timer = {After = function(_, fn) fn() end}
function GetServerTime() return server end
function GetTime() return clock end
function GetRealmName() return 'Firemaw' end
function GetZoneText() return 'Stranglethorn Vale' end
function UnitExists(u) return units[u] ~= nil end
function UnitIsPlayer(u) return units[u] ~= nil end
function UnitIsUnit(u) return u == 'player' end
function UnitName(u) local x = units[u]; if x then return x[1], x[2] end end
function IsInRaid() return false end
function GetNumGroupMembers() return 2 end
function InCombatLockdown() return combat end
function StaticPopup_Show(name, arg) popups[#popups + 1] = name .. ':' .. arg end
function ReloadUI() reloads = reloads + 1 end
function Screenshot() shots = shots + 1 end
function PlaySound() sounds = sounds + 1 end
function RaidNotice_AddMessage(_, msg) banners[#banners + 1] = msg end
RaidWarningFrame = {}
function CombatLogGetCurrentEventInfo() return unpack(log) end
bit = {band = function(a, b) return (math.floor(a / b) % 2 == 1) and b or 0 end}
local secret = {}
function issecretvalue(v) return v == secret end
local realPrint = print
print = function(msg) prints[#prints + 1] = msg end

LejrbaletDB = {characters = {}, accountCharacters = {}}
LejrbaletHub = {version = 1, generatedAt = server - 120, day = '2025-11-14', validUntil = server + 3600, player = 'Jonas', points = 45, rank = 2,
  missions = {{title = 'Et øjeblik', description = 'Tag et screenshot.', points = 10, done = true}, {title = 'Ragefire', description = 'Ryd den.', points = 35, done = false, minLevel = 13, maxLevel = 18, zone = 'Orgrimmar'}, {title = 'Fisk', description = 'Fang en.', points = 20, done = false}},
  leaderboard = {{name = 'Ven', points = 60}, {name = 'Jonas', points = 45}},
  wanted = {{name = 'Gankern', realm = 'Firemaw', severity = 'red', story = 'Corpse-campede os.', addedBy = 'Ven'}, {name = 'Ægir', severity = 'yellow', story = ''}}}

assert(loadfile('addon/LejrbaletSync/Companion.lua'))()
local C = LejrbaletCompanion
local events
for _, f in ipairs(frames) do if f.scripts.OnEvent then events = f end end
local function fire(...) events.scripts.OnEvent(events, ...) end

fire('ADDON_LOADED', 'SomethingElse'); assert(C.WantedCount() == 0, 'other addons must not trigger loading')
fire('ADDON_LOADED', 'LejrbaletSync')
assert(C.WantedCount() == 2 and registered.NAME_PLATE_UNIT_ADDED and registered.COMBAT_LOG_EVENT_UNFILTERED, 'detection events registered when list has names')
assert(LejrbaletDB.companion.wantedAlerts == true and LejrbaletDB.companion.levelPrompt == true)

fire('PLAYER_ENTERING_WORLD', true, false)
assert(prints[#prints]:find('3 missioner i dag %(1 fuldført%)'), 'login summary shows missions')

-- Target on same realm (UnitName returns no realm) matches a realm-specific entry.
units.target = {'Gankern', nil}; fire('PLAYER_TARGET_CHANGED')
assert(#banners == 1 and banners[1]:find('WANTED: Gankern'), 'target alert')
assert(sounds == 1 and LejrbaletDB.companion.sightings[1].zone == 'Stranglethorn Vale')
-- Cooldown: no repeat spam for the same person.
units.mouseover = {'Gankern', nil}; fire('UPDATE_MOUSEOVER_UNIT'); assert(#banners == 1, 'cooldown prevents spam')
clock = clock + 121; fire('UPDATE_MOUSEOVER_UNIT'); assert(#banners == 2, 'alerts again after cooldown')
-- Same name, other realm: no alert.
clock = clock + 500; units.target = {'Gankern', 'Golemagg'}; fire('PLAYER_TARGET_CHANGED'); assert(#banners == 2, 'other realm ignored')
-- Chat sender "Name-Realm" and non-ASCII names without realm.
fire('CHAT_MSG_SAY', 'hej', 'Ægir-Golemagg'); assert(#banners == 3 and banners[3]:find('Ægir'), 'chat sender alert')
-- Nameplates and secret values.
clock = clock + 500; units.nameplate1 = {secret, nil}; fire('NAME_PLATE_UNIT_ADDED', 'nameplate1'); assert(#banners == 3, 'secret names are ignored')
units.nameplate2 = {'Gankern', nil}; fire('NAME_PLATE_UNIT_ADDED', 'nameplate2'); assert(#banners == 4, 'nameplate alert')
-- Combat log only considers players.
clock = clock + 500
log = {0, 'SWING_DAMAGE', false, 'x', 'Gankern', 0x0548, 0, 'y', 'Ulv', 0xa48}
fire('COMBAT_LOG_EVENT_UNFILTERED'); assert(#banners == 5, 'combat log player source')
clock = clock + 500; log = {0, 'SWING_DAMAGE', false, 'x', 'Gankern', 0x0a48, 0, 'y', 'Ulv', 0xa48}
fire('COMBAT_LOG_EVENT_UNFILTERED'); assert(#banners == 5, 'NPC with same name ignored')
-- Turning alerts off stops them.
LejrbaletDB.companion.wantedAlerts = false; clock = clock + 500; fire('PLAYER_TARGET_CHANGED'); units.target = {'Gankern', nil}; fire('PLAYER_TARGET_CHANGED'); assert(#banners == 5, 'alerts can be disabled')
LejrbaletDB.companion.wantedAlerts = true
LejrbaletDB.companion.sound = false; C.TestAlert(); assert(#banners == 6 and sounds == 5, 'sound can be disabled')

-- Level up: offer sync, but wait until combat ends.
combat = true; fire('PLAYER_LEVEL_UP', 23); assert(#popups == 0, 'no popup in combat')
combat = false; fire('PLAYER_REGEN_ENABLED'); assert(popups[1] == 'LEJRBALET_LEVELUP:23', 'popup after combat')
StaticPopupDialogs.LEJRBALET_LEVELUP.OnAccept(); assert(reloads == 1, 'accept reloads UI to save')
LejrbaletDB.companion.levelPrompt = false; fire('PLAYER_LEVEL_UP', 24); assert(#popups == 1, 'prompt can be disabled')

-- Window opens on every page without errors; slash commands route correctly.
SlashCmdList.LEJRBALETSYNC(''); SlashCmdList.LEJRBALETSYNC('wanted'); SlashCmdList.LEJRBALETSYNC('sync')
SlashCmdList.LEJRBALETSYNC(' SCAN '); assert(scanned == 'scan', 'scan still reaches the capture module')
assert(C.MissionsCurrent(), 'missions valid before Danish midnight')
server = server + 7200; assert(not C.MissionsCurrent(), 'missions expire at Danish midnight')
C.Toggle('missions')

-- No hub data yet: everything still works quietly.
LejrbaletHub = nil; C.BuildWantedIndex(); assert(C.WantedCount() == 0 and C.Hub() == nil)
units.target = {'Gankern', nil}; clock = clock + 500; fire('PLAYER_TARGET_CHANGED'); assert(#banners == 6)
C.Toggle('missions'); C.Toggle('wanted'); C.Toggle('sync')
LejrbaletHub = {version = 99}; assert(C.Hub() == nil, 'unknown data versions are ignored')

print = realPrint
print('Companion checks passed: missions, expiry, WANTED via target/mouseover/nameplate/chat/combat log, realms, cooldown, secret values, settings, level prompt and empty data.')
