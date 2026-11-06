-- Original Lejrbalet implementation. No FlockSync source is included.
local frame=CreateFrame('Frame')
local function safe(fn,...)
 if type(fn)~='function' then return nil end
 local ok,value=pcall(fn,...)
 if not ok or (issecretvalue and issecretvalue(value)) then return nil end
 return value
end
local professions={[171]='Alchemy',[164]='Blacksmithing',[333]='Enchanting',[202]='Engineering',[182]='Herbalism',[165]='Leatherworking',[186]='Mining',[393]='Skinning',[197]='Tailoring',[185]='Cooking',[356]='Fishing',[129]='First Aid'}
local function number(v) if type(v)=='number' and not (issecretvalue and issecretvalue(v)) and v==v and v>=0 and v<math.huge then return v end end
local function scan(preserveGear)
 if not LejrbaletDB then return end
 local guid=safe(UnitGUID,'player')
 if not guid then return end
 local _,_,classId=UnitClass('player')
 local playerName=safe(UnitName,'player');local realm=safe(GetRealmName);local level=number(safe(UnitLevel,'player'))
 if not playerName or not realm or not classId or not level or level<1 then return end
 local now=GetServerTime()
 local old=LejrbaletDB.characters[guid] or {}
 local c={guid=guid,name=playerName,realm=realm,classId=classId,level=level,lastSeenAt=now,isActive=true,professions=old.professions}
 c.goldCopper=number(safe(GetMoney)) or old.goldCopper
 c.xp=number(safe(UnitXP,'player')) or old.xp; c.xpMax=number(safe(UnitXPMax,'player')) or old.xpMax
 local map=C_Map and safe(C_Map.GetBestMapForUnit,'player')
 local point=map and safe(C_Map.GetPlayerMapPosition,map,'player')
 local zone=safe(GetZoneText)
 c.location=old.location
 if type(zone)=='string' and zone~='' then
  c.location={zone=zone,subZone=safe(GetSubZoneText),mapId=map,updatedAt=now}
  if point then local ok,x,y=pcall(point.GetXY,point);if ok and number(x) and number(y) and x<=1 and y<=1 then c.location.x=x;c.location.y=y end end
 end
 local items={};local complete=true
 for slot=1,19 do
  local id=safe(GetInventoryItemID,'player',slot)
  local link=safe(GetInventoryItemLink,'player',slot)
  if id and link then items[#items+1]={slotId=slot,itemId=id,itemLink=link}
  elseif id or link then complete=false end
 end
 c.gear=old.gear
 if not preserveGear and complete and (#items>0 or not old.gear or #old.gear.items==0) then c.gear={updatedAt=now,items=items} end
 local skills={};local seen={}
 local function add(row)
  if type(row)~='table' or row.isHeader then return end
  local canonical=professions[row.skillID]
  local rank,max=number(row.rank),number(row.maxRank)
  if canonical and rank and max and max>0 and max<=1000 and rank<=max and not seen[canonical] then skills[#skills+1]={name=canonical,level=rank,maxLevel=max};seen[canonical]=true end
 end
 if C_SkillInfo then
  if C_SkillInfo.GetSkillLineInfoByID then for id in pairs(professions) do add(safe(C_SkillInfo.GetSkillLineInfoByID,id)) end end
  local count=number(safe(C_SkillInfo.GetNumSkillLines)) or 0
  for i=1,math.min(count,500) do add(safe(C_SkillInfo.GetSkillLineInfo,i)) end
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
 local icon=panel:CreateTexture(nil,'ARTWORK');icon:SetSize(42,42);icon:SetPoint('TOPLEFT',20,-20);icon:SetTexture('Interface/AddOns/LejrbaletSync/Icon')
 local title=panel:CreateFontString(nil,'OVERLAY','GameFontNormalLarge');title:SetPoint('TOPLEFT',74,-27);title:SetText('|cffff9c45Lejrbalet Sync|r')
 local text=panel:CreateFontString(nil,'OVERLAY','GameFontHighlight');text:SetPoint('TOPLEFT',24,-85);text:SetWidth(370);text:SetJustifyH('LEFT');text:SetText('Dine karakterer. Din hub.\n\nLevel, XP, guld, sted, gear og professions gemmes lokalt.\n\nBrug /reload eller log ud efter scanning. Lejrbalet-appen sender filen til hubben.')
 local button=CreateFrame('Button',nil,panel,'UIPanelButtonTemplate');button:SetSize(180,30);button:SetPoint('BOTTOM',0,24);button:SetText('Scan min karakter');button:SetScript('OnClick',function() scan();print('|cffff9c45Lejrbalet:|r Scannet. Brug /reload eller log ud for at gemme.') end)
 CreateFrame('Button',nil,panel,'UIPanelCloseButton'):SetPoint('TOPRIGHT',-3,-3)
end
SLASH_LEJRBALETSYNC1='/lejrbalet';SlashCmdList.LEJRBALETSYNC=function(msg) if msg=='scan' then scan();print('|cffff9c45Lejrbalet:|r Scannet. Brug /reload eller log ud.') else show() end end
frame:RegisterEvent('ADDON_LOADED');frame:RegisterEvent('PLAYER_ENTERING_WORLD');frame:RegisterEvent('PLAYER_LOGOUT');frame:RegisterEvent('PLAYER_LEVEL_UP');frame:RegisterEvent('PLAYER_EQUIPMENT_CHANGED');frame:RegisterEvent('PLAYER_MONEY');frame:RegisterEvent('ZONE_CHANGED_NEW_AREA');frame:RegisterEvent('TRADE_SKILL_SHOW')
local pending=false
frame:RegisterEvent('PLAYER_XP_UPDATE');frame:RegisterEvent('ZONE_CHANGED');frame:RegisterEvent('SKILL_LINES_CHANGED')
frame:SetScript('OnEvent',function(_,event,name,hasItem)
 if event=='ADDON_LOADED' then
  if name~='LejrbaletSync' then return end
  LejrbaletDB=LejrbaletDB or {characters={},accountCharacters={}}
  LejrbaletDB.schemaVersion=1
  LejrbaletDB.characters=LejrbaletDB.characters or {};LejrbaletDB.accountCharacters=LejrbaletDB.accountCharacters or {}
 elseif event=='PLAYER_LOGOUT' then scan(true)
 else
  if event=='PLAYER_EQUIPMENT_CHANGED' and type(name)=='number' and name>=1 and name<=19 then
   local guid=safe(UnitGUID,'player');local c=LejrbaletDB and LejrbaletDB.characters[guid]
   local id=safe(GetInventoryItemID,'player',name);local link=safe(GetInventoryItemLink,'player',name)
   if c and c.gear and (hasItem==false or (id and link)) then
    local keep={};for _,item in ipairs(c.gear.items) do if item.slotId~=name then keep[#keep+1]=item end end
    if hasItem~=false then keep[#keep+1]={slotId=name,itemId=id,itemLink=link} end
    c.gear={updatedAt=GetServerTime(),items=keep}
   end
  end
  if not pending then pending=true;C_Timer.After(1,function() pending=false;scan() end) end
 end
end)
