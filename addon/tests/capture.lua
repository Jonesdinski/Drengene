-- Runs the original addon against a simulated client, not a live WoW session.
local callback,queued
function CreateFrame() return {RegisterEvent=function()end,SetScript=function(_,kind,fn) if kind=='OnEvent' then callback=fn end end} end
SlashCmdList={};C_Timer={After=function(_,fn)queued=fn end}
local money,missing=123456,false
function UnitGUID()return 'Player-123-ABC'end
function UnitName()return 'Ægir'end
function GetRealmName()return 'Realm'end
function UnitClass()return 'Mage','MAGE',8 end
function UnitLevel()return 20 end
function GetServerTime()return 1700000000 end
function GetMoney()if not missing then return money end end
function UnitXP()return 250 end
function UnitXPMax()return 1000 end
function GetZoneText()return 'Durotar'end
function GetSubZoneText()return 'Razor Hill'end
C_Map={GetBestMapForUnit=function()return 1 end,GetPlayerMapPosition=function()return {GetXY=function()return .52,.43 end}end}
function GetInventoryItemID(_,slot)if not missing and slot==16 then return 19019 end end
function GetInventoryItemLink(_,slot)if not missing and slot==16 then return '|cffff8000|Hitem:19019:0|h[Thunderfury]|h|r' end end
C_SkillInfo={GetSkillLineInfoByID=function(id)if id==171 then return {skillID=171,name='Alchemie',rank=150,maxRank=225}end end,GetNumSkillLines=function()return 0 end}
function issecretvalue()return false end
assert(loadfile('addon/LejrbaletSync/Main.lua'))()
callback(nil,'ADDON_LOADED','LejrbaletSync');callback(nil,'PLAYER_ENTERING_WORLD');queued()
local c=LejrbaletDB.characters['Player-123-ABC']
assert(c.goldCopper==123456 and c.xp==250 and c.xpMax==1000)
assert(c.location.zone=='Durotar' and c.location.x==.52)
assert(c.professions.primary[1].name=='Alchemy' and c.professions.primary[1].level==150)
assert(c.gear.items[1].itemId==19019)
missing=true;callback(nil,'PLAYER_LOGOUT')
c=LejrbaletDB.characters['Player-123-ABC'];assert(c.goldCopper==123456 and #c.gear.items==1,'logout must not erase unavailable values')
missing=false;money=0;callback(nil,'PLAYER_MONEY');queued();assert(LejrbaletDB.characters['Player-123-ABC'].goldCopper==0,'zero gold must be preserved')
callback(nil,'PLAYER_EQUIPMENT_CHANGED',16,false);assert(#LejrbaletDB.characters['Player-123-ABC'].gear.items==0)
C_Map.GetPlayerMapPosition=function()return nil end
callback(nil,'ZONE_CHANGED');queued();assert(LejrbaletDB.characters['Player-123-ABC'].location.x==nil,'unknown position must not fabricate coordinates')
print('Addon capture checks passed: gold, XP, coordinates, localized professions, gear, logout preservation and explicit unequip.')

-- A level-up event can arrive while UnitLevel still reports the old value.
callback(nil,'PLAYER_LEVEL_UP',21)
assert(LejrbaletDB.characters['Player-123-ABC'].level==21,'level event must be captured immediately')
callback(nil,'PLAYER_LOGOUT')
assert(LejrbaletDB.characters['Player-123-ABC'].level==21,'logout must not regress a confirmed level')
UnitLevel=function() return 0 end
callback(nil,'PLAYER_LOGOUT')
assert(LejrbaletDB.characters['Player-123-ABC'].level==21,'unavailable UnitLevel must preserve last level')
print('Level-up race and logout level preservation checks passed.')
