import { DataBlock } from "./RawParser";
import StatefulBufferParser from "./StatefulBufferParser";
type SkinData = {
    unitId: number;
    skinId: number;
    skinName: string;
};
export type ReplayMetadata = {
    gameData: Buffer;
    map: MapMetadata;
    playerCount: number;
    gameType: string;
    localeHash: string;
    playerRecords: PlayerRecord[];
    slotRecords: SlotRecord[];
    reforgedPlayerMetadata: ReforgedPlayerMetadata[];
    randomSeed: number;
    selectMode: string;
    gameName: string;
    startSpotCount: number;
    isPost202ReplayFormat: boolean;
};
type PlayerRecord = {
    playerId: number;
    playerName: string;
};
type SlotRecord = {
    playerId: number;
    downloadProgress: number;
    slotStatus: number;
    computerFlag: number;
    teamId: number;
    color: number;
    raceFlag: number;
    aiStrength: number;
    handicapFlag: number;
};
type ReforgedPlayerMetadata = {
    playerId: number;
    name: string;
    clan: string;
    skins: SkinData[];
};
type MapMetadata = {
    speed: number;
    hideTerrain: boolean;
    mapExplored: boolean;
    alwaysVisible: boolean;
    default: boolean;
    observerMode: number;
    teamsTogether: boolean;
    fixedTeams: boolean;
    fullSharedUnitControl: boolean;
    randomHero: boolean;
    randomRaces: boolean;
    referees: boolean;
    mapChecksum: string;
    mapChecksumSha1: string;
    mapName: string;
    creator: string;
};
export default class MetadataParser extends StatefulBufferParser {
    private mapmetaParser;
    private isPost202ReplayFormat;
    parse(blocks: DataBlock[]): Promise<ReplayMetadata>;
    parseData(data: Buffer): Promise<ReplayMetadata>;
    private parseSlotRecords;
    private parseReforgedPlayerMetadata;
    private parseEncodedMapMetaString;
    private parsePlayerList;
    private parseHostRecord;
    private decodeGameMetaString;
}
export {};
