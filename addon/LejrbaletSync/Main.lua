-- Original Lejrbalet implementation. No FlockSync source is included.
local frame=CreateFrame('Frame')
local function safe(fn,...)
 if type(fn)~='function' then return nil end
 local ok,value=pcall(fn,...)
 if not ok or (issecretvalue and issecretvalue(value)) then return nil end
 return value
end
local function scan()
 if not LejrbaletDB then return end
 local guid=safe(UnitGUID,'player')
 if not guid then return end
 local _,_,classId=UnitClass('player')
 local now=GetServerTime()
 local old=LejrbaletDB.characters[guid] or {}
 local c={guid=guid,name=UnitName('player'),realm=GetRealmName(),classId=classId,level=UnitLevel('player'),lastSeenAt=now,isActive=true,professions=old.professions}
 c.goldCopper=safe(GetMoney)
 c.xp=safe(UnitXP,'player'); c.xpMax=safe(UnitXPMax,'player')
 local map=C_Map and safe(C_Map.GetBestMapForUnit,'player')
 local point=map and safe(C_Map.GetPlayerMapPosition,map,'player')
 c.location={zone=safe(GetZoneText),subZone=safe(GetSubZoneText),mapId=map,updatedAt=now}
 if point then local x,y=point:GetXY(); c.location.x=x;c.location.y=y end
 local items={};local complete=true
 for slot=1,19 do
  local id=safe(GetInventoryItemID,'player',slot)
  local link=safe(GetInventoryItemLink,'player',slot)
  if id and link then items[#items+1]={slotId=slot,itemId=id,itemLink=link}
  elseif id or link then complete=false end
 end
 c.gear=complete and {updatedAt=now,items=items} or old.gear
 local skills={}
 if C_SkillInfo and C_SkillInfo.GetNumSkillLines then
  for i=1,C_SkillInfo.GetNumSkillLines() do
   local row=safe(C_SkillInfo.GetSkillLineInfo,i)
   if row and not row.isHeader then skills[#skills+1]={name=row.name,level=row.rank,maxLevel=row.maxRank} end
  end
 end
 if #skills>0 then c.professions={primary=skills,updatedAt=now} end
 LejrbaletDB.characters[guid]=c
 LejrbaletDB.accountCharacters[guid]={guid=guid,name=c.name,realm=c.realm}
end
local panel
local function show()
 if panel then panel:SetShown(not panel:IsShown());return end
 panel=CreateFrame('Frame','LejrbaletSyncWindow',UIParent,'BackdropTemplate')
 panel:SetSize(420,260);panel:SetPoint('CENTER');panel:SetMovable(true);panel:EnableMouse(true);panel:RegisterForDrag('LeftButton');panel:SetScript('OnDragStart',panel.StartMoving);panel:SetScript('OnDragStop',panel.StopMovingOrSizing)
 panel:SetBackdrop({bgFile='Interface/Tooltips/UI-Tooltip-Background',edgeFile='Interface/Tooltips/UI-Tooltip-Border',tile=true,tileSize=16,edgeSize=16,insets={left=5,right=5,top=5,bottom=5}})
 panel:SetBackdropColor(.09,.06,.04,.98);panel:SetBackdropBorderColor(1,.48,.12)
 local icon=panel:CreateTexture(nil,'ARTWORK');icon:SetSize(42,42);icon:SetPoint('TOPLEFT',20,-20);icon:SetTexture('Interface/Icons/Spell_Fire_Fire')
 local title=panel:CreateFontString(nil,'OVERLAY','GameFontNormalLarge');title:SetPoint('TOPLEFT',74,-27);title:SetText('|cffff9c45Lejrbalet Sync|r')
 local text=panel:CreateFontString(nil,'OVERLAY','GameFontHighlight');text:SetPoint('TOPLEFT',24,-85);text:SetWidth(370);text:SetJustifyH('LEFT');text:SetText('Dine karakterer. Din hub.\n\nLevel, XP, guld, sted, gear og professions gemmes lokalt.\n\nBrug /reload eller log ud efter scanning. Lejrbalet-appen sender filen til hubben.')
 local button=CreateFrame('Button',nil,panel,'UIPanelButtonTemplate');button:SetSize(180,30);button:SetPoint('BOTTOM',0,24);button:SetText('Scan min karakter');button:SetScript('OnClick',function() scan();print('|cffff9c45Lejrbalet:|r Scannet. Brug /reload eller log ud for at gemme.') end)
 CreateFrame('Button',nil,panel,'UIPanelCloseButton'):SetPoint('TOPRIGHT',-3,-3)
end
SLASH_LEJRBALETSYNC1='/lejrbalet';SlashCmdList.LEJRBALETSYNC=show
frame:RegisterEvent('ADDON_LOADED');frame:RegisterEvent('PLAYER_ENTERING_WORLD');frame:RegisterEvent('PLAYER_LOGOUT');frame:RegisterEvent('PLAYER_LEVEL_UP');frame:RegisterEvent('PLAYER_EQUIPMENT_CHANGED');frame:RegisterEvent('PLAYER_MONEY');frame:RegisterEvent('ZONE_CHANGED_NEW_AREA');frame:RegisterEvent('TRADE_SKILL_SHOW')
frame:SetScript('OnEvent',function(_,event,name)
 if event=='ADDON_LOADED' then
  if name~='LejrbaletSync' then return end
  LejrbaletDB=LejrbaletDB or {characters={},accountCharacters={}}
  LejrbaletDB.characters=LejrbaletDB.characters or {};LejrbaletDB.accountCharacters=LejrbaletDB.accountCharacters or {}
 elseif event=='PLAYER_LOGOUT' then scan()
 else C_Timer.After(1,scan) end
end)
