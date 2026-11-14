-- Lejrbalet Companion: daily missions, quick sync and WANTED alerts.
-- Hub data arrives in HubData.lua, written by the Lejrbalet Sync desktop app.
-- WoW addons cannot use the internet, so new data appears after login or /reload.
local C = {}
LejrbaletCompanion = C

local ORANGE = '|cffff9c45'
local GREY = '|cffa0a0a0'
local GREEN = '|cff5fe36a'
local severityColor = {red = '|cffff3b3b', orange = '|cffff9c45', yellow = '|cffffd23f'}
local severityText = {red = 'De værste af de værste', orange = 'Slemme', yellow = 'Bare træls'}
local sourceText = {
  target = 'dit target', mouseover = 'musen', nameplate = 'navneplade', group = 'din gruppe',
  chat = 'chatten', combat = 'kamploggen', test = 'test',
}
local ALERT_COOLDOWN = 120

-- Calls an API safely. Returns all values, or nothing if the API is missing or fails.
local function call(fn, ...)
  if type(fn) ~= 'function' then return end
  local result = {pcall(fn, ...)}
  if not result[1] then return end
  return unpack(result, 2)
end

-- Newer clients can hide values ("secret values"). Never compare or show those.
local function plain(value)
  if type(value) ~= 'string' or value == '' then return nil end
  if issecretvalue and issecretvalue(value) then return nil end
  return value
end

local function normalizeRealm(realm)
  realm = plain(realm)
  if not realm then return nil end
  return (realm:lower():gsub("[%s'%-]", ''))
end

local function now() return call(GetServerTime) or time() end

function C.Settings()
  if type(LejrbaletDB) ~= 'table' then return {wantedAlerts = true, sound = true, levelPrompt = true, sightings = {}} end
  local s = LejrbaletDB.companion
  if type(s) ~= 'table' then s = {}; LejrbaletDB.companion = s end
  if s.wantedAlerts == nil then s.wantedAlerts = true end
  if s.sound == nil then s.sound = true end
  if s.levelPrompt == nil then s.levelPrompt = true end
  if type(s.sightings) ~= 'table' then s.sightings = {} end
  return s
end

function C.Hub()
  local hub = LejrbaletHub
  if type(hub) ~= 'table' or hub.version ~= 1 then return nil end
  return hub
end

function C.MissionsCurrent()
  local hub = C.Hub()
  return hub ~= nil and type(hub.validUntil) == 'number' and now() < hub.validUntil
end

---------------------------------------------------------------------------
-- WANTED
---------------------------------------------------------------------------
local wantedIndex, wantedCount, lastAlert = {}, 0, {}

function C.BuildWantedIndex()
  wantedIndex, wantedCount = {}, 0
  local hub = C.Hub()
  if not hub or type(hub.wanted) ~= 'table' then return end
  for _, w in ipairs(hub.wanted) do
    if type(w) == 'table' and type(w.name) == 'string' and w.name ~= '' then
      wantedIndex[w.name] = w
      wantedIndex[w.name:lower()] = wantedIndex[w.name:lower()] or w
      wantedCount = wantedCount + 1
    end
  end
end

function C.WantedCount() return wantedCount end

local function alert(w, source)
  local settings = C.Settings()
  local color = severityColor[w.severity] or severityColor.yellow
  local banner = color .. 'WANTED: ' .. w.name .. '|r ' .. (source == 'chat' and 'er online og skriver i chatten!' or 'er i nærheden!')
  if RaidNotice_AddMessage and RaidWarningFrame then
    call(RaidNotice_AddMessage, RaidWarningFrame, banner, (ChatTypeInfo and ChatTypeInfo.RAID_WARNING) or {r = 1, g = .3, b = .1})
  end
  if settings.sound then
    call(PlaySound, (SOUNDKIT and SOUNDKIT.RAID_WARNING) or 8959, 'Master')
  end
  call(FlashClientIcon)
  local line = ORANGE .. 'Lejrbalet WANTED|r ' .. color .. w.name .. '|r · ' .. (severityText[w.severity] or severityText.yellow)
    .. GREY .. ' (set via ' .. (sourceText[source] or source) .. ')|r'
  print(line)
  if type(w.story) == 'string' and w.story ~= '' then
    print(GREY .. '  ' .. w.story .. (w.addedBy and (' - ' .. w.addedBy) or '') .. '|r')
  end
  local log = settings.sightings
  table.insert(log, 1, {name = w.name, at = now(), zone = plain(call(GetZoneText)), source = source})
  while #log > 20 do table.remove(log) end
  if C.Refresh then C.Refresh() end
end

-- name may be "Name" or "Name-Realm". realm may be nil (same realm as you).
function C.Check(name, realm, source)
  if wantedCount == 0 or not C.Settings().wantedAlerts then return false end
  name, realm = plain(name), plain(realm)
  if not name then return false end
  local n, r = name:match('^([^%-]+)%-(.+)$')
  if n then name, realm = n, r end
  local w = wantedIndex[name] or wantedIndex[name:lower()]
  if not w then return false end
  if w.realm then
    local theirs = normalizeRealm(realm) or normalizeRealm(call(GetRealmName))
    if theirs and theirs ~= normalizeRealm(w.realm) then return false end
  end
  local t = call(GetTime) or now()
  if lastAlert[w.name] and t - lastAlert[w.name] < ALERT_COOLDOWN then return false end
  lastAlert[w.name] = t
  alert(w, source)
  return true
end

function C.CheckUnit(unit, source)
  if wantedCount == 0 then return false end
  if not call(UnitExists, unit) or not call(UnitIsPlayer, unit) then return false end
  if call(UnitIsUnit, unit, 'player') then return false end
  local name, realm = call(UnitName, unit)
  return C.Check(name, realm, source)
end

local COMBATLOG_PLAYER = COMBATLOG_OBJECT_TYPE_PLAYER or 0x00000400
local function isPlayerFlag(flags)
  if type(flags) ~= 'number' or (issecretvalue and issecretvalue(flags)) then return false end
  return bit and bit.band(flags, COMBATLOG_PLAYER) > 0
end

function C.CheckCombatLog()
  if wantedCount == 0 then return end
  local _, _, _, _, sourceName, sourceFlags, _, _, destName, destFlags = call(CombatLogGetCurrentEventInfo)
  if isPlayerFlag(sourceFlags) then C.Check(sourceName, nil, 'combat') end
  if isPlayerFlag(destFlags) then C.Check(destName, nil, 'combat') end
end

function C.CheckGroup()
  if wantedCount == 0 then return end
  local raid = call(IsInRaid)
  local count = call(GetNumGroupMembers) or 0
  for i = 1, math.min(count, 40) do
    C.CheckUnit((raid and 'raid' or 'party') .. i, 'group')
  end
end

function C.TestAlert()
  alert({name = 'Testgnom', severity = 'red', story = 'Sådan ser en WANTED-advarsel ud.'}, 'test')
end

---------------------------------------------------------------------------
-- Window
---------------------------------------------------------------------------
local window, pages, tabs, missionLines, wantedLines = nil, {}, {}, {}, {}
local function text(parent, font, x, y, width)
  local fs = parent:CreateFontString(nil, 'OVERLAY', font or 'GameFontHighlight')
  fs:SetPoint('TOPLEFT', x, y)
  if width then fs:SetWidth(width) end
  fs:SetJustifyH('LEFT')
  return fs
end

local function button(parent, label, width, onClick)
  local b = CreateFrame('Button', nil, parent, 'UIPanelButtonTemplate')
  b:SetSize(width, 26); b:SetText(label); b:SetScript('OnClick', onClick)
  return b
end

local function checkbox(parent, label, x, y, get, set)
  local cb = CreateFrame('CheckButton', nil, parent, 'UICheckButtonTemplate')
  cb:SetPoint('TOPLEFT', x, y); cb:SetSize(24, 24)
  local fs = text(parent, 'GameFontHighlightSmall', x + 28, y - 6)
  fs:SetText(label)
  cb:SetScript('OnShow', function(self) self:SetChecked(get()) end)
  cb:SetScript('OnClick', function(self) set(self:GetChecked() and true or false) end)
  return cb
end

local function minutesAgo(stamp)
  if type(stamp) ~= 'number' then return '?' end
  local m = math.floor((now() - stamp) / 60)
  if m < 1 then return 'lige nu' end
  if m < 60 then return m .. ' min siden' end
  if m < 1440 then return math.floor(m / 60) .. ' t siden' end
  return math.floor(m / 1440) .. ' d siden'
end

local function showPage(name)
  if window then window.lastPage = name end
  for key, page in pairs(pages) do page:SetShown(key == name) end
  for key, tab in pairs(tabs) do if key == name then tab:LockHighlight() else tab:UnlockHighlight() end end
  if C.Refresh then C.Refresh() end
end

local function buildMissions(page)
  page.header = text(page, 'GameFontNormal', 0, 0, 410)
  page.status = text(page, 'GameFontHighlightSmall', 0, -20, 410)
  for i = 1, 3 do
    local line = {}
    line.title = text(page, 'GameFontNormal', 0, 0, 410)
    line.body = text(page, 'GameFontHighlightSmall', 12, 0, 398)
    missionLines[i] = line
  end
  page.board = text(page, 'GameFontHighlightSmall', 0, 0, 410)
  local shot = button(page, 'Tag screenshot', 150, function()
    if window then window:Hide() end
    call(Screenshot)
    print(ORANGE .. 'Lejrbalet:|r Screenshot gemt i din Screenshots-mappe. Upload det på hubben under Dagens udfordringer.')
  end)
  shot:SetPoint('BOTTOMLEFT', page, 'BOTTOMLEFT', 0, 0)
  local reload = button(page, 'Hent nye missioner', 150, function() call(ReloadUI) end)
  reload:SetPoint('BOTTOMRIGHT', page, 'BOTTOMRIGHT', 0, 0)
end

local function refreshMissions(page)
  local hub = C.Hub()
  if not hub then
    page.header:SetText(ORANGE .. 'Ingen data fra hubben endnu|r')
    page.status:SetText('Installér Lejrbalet Sync 0.5 på din computer og forbind den. Missionerne dukker op efter /reload.')
    for _, line in ipairs(missionLines) do line.title:SetText(''); line.body:SetText('') end
    page.board:SetText('')
    return
  end
  page.header:SetText(ORANGE .. 'Dagens missioner|r · ' .. (hub.player or '') .. ' · ' .. (hub.points or 0) .. ' point' .. (hub.rank and (' · #' .. hub.rank) or ''))
  if C.MissionsCurrent() then
    page.status:SetText(GREY .. 'Hentet ' .. minutesAgo(hub.generatedAt) .. '. Aflever med screenshot på hubben.|r')
  else
    page.status:SetText('|cffff5555Missionerne er fra ' .. (hub.day or '?') .. '.|r Lad Lejrbalet Sync-appen køre, og tryk "Hent nye missioner".')
  end
  local y = -48
  for i, line in ipairs(missionLines) do
    local m = type(hub.missions) == 'table' and hub.missions[i]
    if m then
      local mark = m.done and ('|TInterface\\RaidFrame\\ReadyCheck-Ready:14|t' .. GREEN) or (ORANGE .. '- ')
      line.title:SetText(mark .. (m.title or '') .. '|r ' .. GREY .. '(' .. (m.points or 0) .. ' point)|r')
      local extra = ''
      if m.minLevel or m.maxLevel then extra = '\nLevel ' .. (m.minLevel or 1) .. '-' .. (m.maxLevel or 60) end
      if m.zone then extra = extra .. (extra == '' and '\n' or ' · ') .. m.zone end
      line.body:SetText((m.done and 'Fuldført. ' or '') .. (m.description or '') .. extra)
    else
      line.title:SetText(''); line.body:SetText('')
    end
    line.title:ClearAllPoints(); line.title:SetPoint('TOPLEFT', 0, y)
    y = y - math.max(16, line.title:GetStringHeight() or 16) - 2
    line.body:ClearAllPoints(); line.body:SetPoint('TOPLEFT', 12, y)
    y = y - math.max(14, line.body:GetStringHeight() or 14) - 12
  end
  local board = {}
  if type(hub.leaderboard) == 'table' then
    for i, p in ipairs(hub.leaderboard) do board[#board + 1] = i .. '. ' .. (p.name or '?') .. ' · ' .. (p.points or 0) end
  end
  page.board:ClearAllPoints(); page.board:SetPoint('TOPLEFT', 0, y - 4)
  page.board:SetText(#board > 0 and (ORANGE .. 'Pointtavle|r\n' .. table.concat(board, '\n')) or '')
end

local function buildWanted(page)
  page.header = text(page, 'GameFontNormal', 0, 0, 410)
  checkbox(page, 'Advar mig, når nogen fra listen ses', 0, -22,
    function() return C.Settings().wantedAlerts end, function(v) C.Settings().wantedAlerts = v end)
  checkbox(page, 'Afspil lyd', 250, -22,
    function() return C.Settings().sound end, function(v) C.Settings().sound = v end)
  page.list = text(page, 'GameFontHighlightSmall', 0, -54, 410)
  page.seen = text(page, 'GameFontHighlightSmall', 0, -250, 410)
  local test = button(page, 'Test advarslen', 150, function() C.TestAlert() end)
  test:SetPoint('BOTTOMLEFT', page, 'BOTTOMLEFT', 0, 0)
end

local function refreshWanted(page)
  local hub = C.Hub()
  local rows = {}
  if hub and type(hub.wanted) == 'table' then
    for i, w in ipairs(hub.wanted) do
      if i > 12 then rows[#rows + 1] = GREY .. '+ ' .. (#hub.wanted - 12) .. ' flere på hubben|r'; break end
      rows[#rows + 1] = (severityColor[w.severity] or severityColor.yellow) .. w.name .. '|r'
        .. (w.realm and (GREY .. '-' .. w.realm .. '|r') or '') .. (w.server and (GREY .. ' · ' .. w.server .. '|r') or '')
    end
  end
  page.header:SetText(ORANGE .. 'WANTED · Bingobogen|r · ' .. wantedCount .. ' navne')
  page.list:SetText(#rows > 0 and table.concat(rows, '\n') or 'Listen er tom, eller appen har ikke hentet den endnu.')
  local seen = {}
  for i, s in ipairs(C.Settings().sightings) do
    if i > 5 then break end
    seen[#seen + 1] = s.name .. ' · ' .. (s.zone or '?') .. ' · ' .. minutesAgo(s.at)
  end
  page.seen:SetText(#seen > 0 and (ORANGE .. 'Seneste observationer|r\n' .. table.concat(seen, '\n')) or '')
end

local function buildSync(page)
  local intro = text(page, 'GameFontHighlight', 0, 0, 410)
  intro:SetText('Addonet gemmer level, XP, guld, sted, gear og professions.\n\nWoW skriver først filen ved /reload eller log ud. Lejrbalet Sync-appen sender den til hubben få sekunder efter og henter samtidig nye missioner og WANTED-listen.')
  page.status = text(page, 'GameFontHighlightSmall', 0, -110, 410)
  checkbox(page, 'Spørg om at sende til hubben, når jeg stiger i level', 0, -160,
    function() return C.Settings().levelPrompt end, function(v) C.Settings().levelPrompt = v end)
  local scan = button(page, 'Scan min karakter', 150, function()
    SlashCmdList.LEJRBALETSYNC('scan')
  end)
  scan:SetPoint('BOTTOMLEFT', page, 'BOTTOMLEFT', 0, 0)
  local send = button(page, 'Send til hubben nu', 170, function() call(ReloadUI) end)
  send:SetPoint('BOTTOMRIGHT', page, 'BOTTOMRIGHT', 0, 0)
end

local function refreshSync(page)
  local hub = C.Hub()
  page.status:SetText(hub and (GREY .. 'Seneste data fra hubben: ' .. minutesAgo(hub.generatedAt) .. '|r')
    or (GREY .. 'Ingen data fra hubben endnu. Kør Lejrbalet Sync 0.5 eller nyere.|r'))
end

function C.Refresh()
  if not window or not window:IsShown() then return end
  if pages.missions:IsShown() then refreshMissions(pages.missions) end
  if pages.wanted:IsShown() then refreshWanted(pages.wanted) end
  if pages.sync:IsShown() then refreshSync(pages.sync) end
end

function C.Toggle(page)
  if not window then
    window = CreateFrame('Frame', 'LejrbaletCompanionWindow', UIParent, 'BackdropTemplate')
    window:SetSize(460, 470); window:SetPoint('CENTER'); window:SetFrameStrata('DIALOG')
    window:SetMovable(true); window:EnableMouse(true); window:RegisterForDrag('LeftButton')
    window:SetScript('OnDragStart', window.StartMoving); window:SetScript('OnDragStop', window.StopMovingOrSizing)
    window:SetBackdrop({bgFile = 'Interface/Tooltips/UI-Tooltip-Background', edgeFile = 'Interface/Tooltips/UI-Tooltip-Border', tile = true, tileSize = 16, edgeSize = 16, insets = {left = 5, right = 5, top = 5, bottom = 5}})
    window:SetBackdropColor(.09, .06, .04, .98); window:SetBackdropBorderColor(1, .48, .12)
    if UISpecialFrames then table.insert(UISpecialFrames, 'LejrbaletCompanionWindow') end
    local icon = window:CreateTexture(nil, 'ARTWORK'); icon:SetSize(36, 36); icon:SetPoint('TOPLEFT', 18, -16)
    icon:SetTexture('Interface/AddOns/LejrbaletSync/Icon')
    local title = text(window, 'GameFontNormalLarge', 62, -26); title:SetText(ORANGE .. 'Lejrbalet Companion|r')
    CreateFrame('Button', nil, window, 'UIPanelCloseButton'):SetPoint('TOPRIGHT', -3, -3)
    local labels = {{'missions', 'Missioner'}, {'wanted', 'WANTED'}, {'sync', 'Sync'}}
    for i, pair in ipairs(labels) do
      local key = pair[1]
      local tab = button(window, pair[2], 120, function() showPage(key) end)
      tab:SetPoint('TOPLEFT', 20 + (i - 1) * 140, -62)
      tabs[key] = tab
      local p = CreateFrame('Frame', nil, window)
      p:SetPoint('TOPLEFT', 24, -100); p:SetPoint('BOTTOMRIGHT', -24, 20)
      pages[key] = p
    end
    buildMissions(pages.missions); buildWanted(pages.wanted); buildSync(pages.sync)
    window:SetScript('OnShow', function() C.Refresh() end)
    window:Hide()
  end
  if page then window:Show(); showPage(page); return end
  if window:IsShown() then window:Hide() else window:Show(); showPage(window.lastPage or 'missions') end
end

---------------------------------------------------------------------------
-- Level up: offer to send the new level right away
---------------------------------------------------------------------------
local pendingLevel
if StaticPopupDialogs then
  StaticPopupDialogs.LEJRBALET_LEVELUP = {
    text = 'Level %s! Send dit nye level til Lejrbalet nu?\n\n(Genindlæser brugerfladen)',
    button1 = 'Send nu', button2 = 'Senere',
    OnAccept = function() call(ReloadUI) end,
    timeout = 0, whileDead = true, hideOnEscape = true, preferredIndex = 3,
  }
end

function C.OfferLevelSync(level)
  if not C.Settings().levelPrompt then return false end
  if call(InCombatLockdown) then pendingLevel = level; return false end
  pendingLevel = nil
  call(StaticPopup_Show, 'LEJRBALET_LEVELUP', tostring(level))
  return true
end

---------------------------------------------------------------------------
-- Events and slash command
---------------------------------------------------------------------------
local events = CreateFrame('Frame')
local detectionEvents = {
  'PLAYER_TARGET_CHANGED', 'UPDATE_MOUSEOVER_UNIT', 'NAME_PLATE_UNIT_ADDED', 'GROUP_ROSTER_UPDATE',
  'CHAT_MSG_SAY', 'CHAT_MSG_YELL', 'CHAT_MSG_WHISPER', 'CHAT_MSG_CHANNEL', 'CHAT_MSG_EMOTE',
  'COMBAT_LOG_EVENT_UNFILTERED',
}
local chatEvents = {CHAT_MSG_SAY = true, CHAT_MSG_YELL = true, CHAT_MSG_WHISPER = true, CHAT_MSG_CHANNEL = true, CHAT_MSG_EMOTE = true}

local function register(event)
  -- Some events do not exist on every client version; skip those quietly.
  call(events.RegisterEvent, events, event)
end

register('ADDON_LOADED'); register('PLAYER_ENTERING_WORLD'); register('PLAYER_LEVEL_UP'); register('PLAYER_REGEN_ENABLED')

events:SetScript('OnEvent', function(_, event, a1, a2)
  if event == 'ADDON_LOADED' then
    if a1 ~= 'LejrbaletSync' then return end
    C.Settings()
    C.BuildWantedIndex()
    if wantedCount > 0 then for _, e in ipairs(detectionEvents) do register(e) end end
  elseif event == 'PLAYER_ENTERING_WORLD' then
    if a1 or a2 then
      local hub = C.Hub()
      if hub and C.MissionsCurrent() and type(hub.missions) == 'table' then
        local done = 0
        for _, m in ipairs(hub.missions) do if m.done then done = done + 1 end end
        print(ORANGE .. 'Lejrbalet:|r ' .. #hub.missions .. ' missioner i dag (' .. done .. ' fuldført) · ' .. wantedCount .. ' på WANTED. Skriv /lejrbalet.')
      end
    end
    C.CheckGroup()
  elseif event == 'PLAYER_LEVEL_UP' then
    local level = a1
    if C_Timer and C_Timer.After then C_Timer.After(2, function() C.OfferLevelSync(level) end) else C.OfferLevelSync(level) end
  elseif event == 'PLAYER_REGEN_ENABLED' then
    if pendingLevel then C.OfferLevelSync(pendingLevel) end
  elseif event == 'PLAYER_TARGET_CHANGED' then C.CheckUnit('target', 'target')
  elseif event == 'UPDATE_MOUSEOVER_UNIT' then C.CheckUnit('mouseover', 'mouseover')
  elseif event == 'NAME_PLATE_UNIT_ADDED' then C.CheckUnit(a1, 'nameplate')
  elseif event == 'GROUP_ROSTER_UPDATE' then C.CheckGroup()
  elseif event == 'COMBAT_LOG_EVENT_UNFILTERED' then C.CheckCombatLog()
  elseif chatEvents[event] then C.Check(a2, nil, 'chat')
  end
end)

local scanCommand = SlashCmdList.LEJRBALETSYNC
SlashCmdList.LEJRBALETSYNC = function(msg)
  msg = (msg or ''):lower():gsub('^%s+', ''):gsub('%s+$', '')
  if msg == 'scan' then scanCommand('scan')
  elseif msg == 'wanted' then C.Toggle('wanted')
  elseif msg == 'sync' then C.Toggle('sync')
  elseif msg == 'test' then C.TestAlert()
  else C.Toggle() end
end
