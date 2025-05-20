import StatefulBufferParser from "./StatefulBufferParser";
type NetTag = [number, number];
type Vec2 = [number, number];
type UnitBuildingAbilityActionNoParams = {
    id: 0x10;
    abilityFlags: number;
    orderId: number[];
};
type UnitBuildingAbilityActionTargetPosition = {
    id: 0x11;
    abilityFlags: number;
    orderId: number[];
    target: Vec2;
};
type UnitBuildingAbilityActionTargetPositionTargetObjectId = {
    id: 0x12;
    abilityFlags: number;
    orderId: number[];
    target: Vec2;
    object: NetTag;
};
type GiveItemToUnitAciton = {
    id: 0x13;
    abilityFlags: number;
    orderId: number[];
    target: Vec2;
    unit: NetTag;
    item: NetTag;
};
type UnitBuildingAbilityActionTwoTargetPositions = {
    id: 0x14;
    abilityFlags: number;
    orderId1: number[];
    targetA: Vec2;
    orderId2: number[];
    flags: number;
    category: number;
    owner: number;
    targetB: Vec2;
};
type UnitBuildingAbilityActionTargetPositionTargetObjectIdItemObjectId = {
    id: 0x15;
    abilityFlags: number;
    orderId1: number[];
    targetA: Vec2;
    orderId2: number[];
    flags: number;
    category: number;
    owner: number;
    targetB: Vec2;
    object: NetTag;
};
type ChangeSelectionAction = {
    id: 0x16;
    selectMode: number;
    numberUnits: number;
    units: NetTag[];
};
type AssignGroupHotkeyAction = {
    id: 0x17;
    groupNumber: number;
    numberUnits: number;
    units: NetTag[];
};
type SelectGroupHotkeyAction = {
    id: 0x18;
    groupNumber: number;
};
type SelectSubgroupAction = {
    id: 0x19;
    itemId: number[];
    object: NetTag;
};
type PreSubselectionAction = {
    id: 0x1a;
};
type SelectUnitAction = {
    id: 0x1b;
    object: NetTag;
};
type SelectGroundItemAction = {
    id: 0x1c;
    item: NetTag;
};
type CancelHeroRevival = {
    id: 0x1d;
    hero: NetTag;
};
type RemoveUnitFromBuildingQueue = {
    id: 0x1e | 0x1f;
    slotNumber: number;
    itemId: number[];
};
export type TransferResourcesAction = {
    id: 0x51;
    slot: number;
    gold: number;
    lumber: number;
};
type ESCPressedAction = {
    id: 0x61;
};
type ChooseHeroSkillSubmenu = {
    id: 0x66;
};
type EnterBuildingSubmenu = {
    id: 0x67;
};
type Cache = {
    filename: string;
    missionKey: string;
    key: string;
};
type BlzCacheStoreIntAction = {
    id: 0x6b;
    cache: Cache;
    value: number;
};
export type W3MMDAction = BlzCacheStoreIntAction;
type BlzCacheStoreRealAction = {
    id: 0x6c;
    cache: Cache;
    value: number;
};
type BlzCacheStoreBooleanAction = {
    id: 0x6d;
    cache: Cache;
    value: number;
};
export type Item = {
    itemId: number[];
    charges: number;
    flags: number;
};
export type Ability = {
    id: number[];
    level: number;
};
type HeroData = {
    xp: number;
    level: number;
    skillPoints: number;
    properNameId: number;
    str: number;
    strBonus: number;
    agi: number;
    speedMod: number;
    cooldownMod: number;
    agiBonus: number;
    intel: number;
    intBonus: number;
    heroAbils: Ability[];
    maxLife: number;
    maxMana: number;
    sight: number;
    damage: number[];
    defense: number;
    controlGroups: number;
};
export type Unit = {
    unitId: number[];
    items: Item[];
    heroData: HeroData;
};
type BlzCacheStoreUnitAction = {
    id: 0x6e;
    cache: Cache;
    value: Unit;
};
type BlzCacheClearIntAction = {
    id: 0x70;
    cache: Cache;
};
type BlzCacheClearRealAction = {
    id: 0x71;
    cache: Cache;
};
type BlzCacheClearBooleanAction = {
    id: 0x72;
    cache: Cache;
};
type BlzCacheClearUnitAction = {
    id: 0x73;
    cache: Cache;
};
type ArrowKeyAction = {
    id: 0x75;
    arrowKey: number;
};
type BlzSyncAction = {
    id: 0x78;
    identifier: string;
    value: string;
};
type CommandFrameAction = {
    id: 0x79;
    eventId: number;
    val: number;
    text: string;
};
type MouseAction = {
    id: 0x76;
    eventId: number;
    pos: Vec2;
    button: number;
};
type W3APIAction = {
    id: 0x77;
    commandId: number;
    data: number;
    buffer: string;
};
type SetGameSpeedAction = {
    id: 0x3;
    gameSpeed: number;
};
type TrackableHitAction = {
    id: 0x64;
    object: NetTag;
};
type TrackableTrackAction = {
    id: 0x65;
    object: NetTag;
};
type AllyPingAction = {
    id: 0x68;
    pos: Vec2;
    duration: number;
};
export type Action = UnitBuildingAbilityActionNoParams | UnitBuildingAbilityActionTargetPositionTargetObjectId | GiveItemToUnitAciton | UnitBuildingAbilityActionTwoTargetPositions | PreSubselectionAction | ChangeSelectionAction | AssignGroupHotkeyAction | SelectGroupHotkeyAction | SelectSubgroupAction | SelectGroundItemAction | CancelHeroRevival | RemoveUnitFromBuildingQueue | BlzCacheStoreIntAction | BlzCacheStoreRealAction | BlzCacheStoreBooleanAction | BlzCacheStoreUnitAction | BlzCacheClearIntAction | BlzCacheClearRealAction | BlzCacheClearBooleanAction | BlzCacheClearUnitAction | ESCPressedAction | ChooseHeroSkillSubmenu | EnterBuildingSubmenu | TransferResourcesAction | UnitBuildingAbilityActionTargetPosition | BlzSyncAction | CommandFrameAction | MouseAction | W3APIAction | SetGameSpeedAction | UnitBuildingAbilityActionTargetPositionTargetObjectIdItemObjectId | SelectUnitAction | TrackableHitAction | TrackableTrackAction | AllyPingAction | ArrowKeyAction;
export default class ActionParser extends StatefulBufferParser {
    parse(input: Buffer, post_202?: boolean): Action[];
    private oldActionId;
    private parseAction;
    private readSelectionUnits;
    private readFourCC;
    private readCacheDesc;
    private readCacheItem;
    private readAbility;
    private readCacheHeroData;
    private readCacheUnit;
    private readNetTag;
    private readVec2;
}
export {};
