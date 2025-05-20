import Player from "./Player";
import { ParserOutput } from "./types";
import { EventEmitter } from "node:events";
import ReplayParser, { ParserOutput as ReplayParserOutput, BasicReplayInformation } from "./parsers/ReplayParser";
import { GameDataBlock, PlayerChatMessageBlock, TimeslotBlock, CommandBlock, LeaveGameBlock } from "./parsers/GameDataParser";
import { Action, W3MMDAction, TransferResourcesAction } from "./parsers/ActionParser";
export type TransferResourcesActionWithPlayer = {
    playerName: string;
    playerId: number;
} & Omit<TransferResourcesAction, "id">;
declare enum ChatMessageMode {
    All = "All",
    Private = "Private",
    Team = "Team",
    Observers = "Obervers"
}
export declare enum ObserverMode {
    ON_DEFEAT = "ON_DEFEAT",
    FULL = "FULL",
    REFEREES = "REFEREES",
    NONE = "NONE"
}
export type ChatMessage = {
    playerName: string;
    playerId: number;
    mode: ChatMessageMode;
    timeMS: number;
    message: string;
};
type Team = {
    [key: number]: number[];
};
export default interface W3GReplayEvents {
    on(event: "gamedatablock", listener: (block: GameDataBlock) => void): this;
    on(event: "basic_replay_information", listener: (data: BasicReplayInformation) => void): this;
}
export default class W3GReplay extends EventEmitter implements W3GReplayEvents {
    info: BasicReplayInformation;
    players: {
        [key: string]: Player;
    };
    observers: string[];
    chatlog: ChatMessage[];
    id: string;
    leaveEvents: LeaveGameBlock[];
    w3mmd: W3MMDAction[];
    slots: ReplayParserOutput["metadata"]["slotRecords"];
    teams: Team;
    meta: ReplayParserOutput["metadata"];
    playerList: ReplayParserOutput["metadata"]["playerRecords"];
    totalTimeTracker: number;
    timeSegmentTracker: number;
    playerActionTrackInterval: number;
    gametype: string;
    matchup: string;
    parseStartTime: number;
    parser: ReplayParser;
    filename: string;
    buffer: Buffer;
    msElapsed: number;
    slotToPlayerId: Map<number, number>;
    knownPlayerIds: Set<string>;
    winningTeamId: number;
    constructor();
    parse($buffer: string | Buffer): Promise<ParserOutput>;
    private determineWinningTeam;
    handleBasicReplayInformation(info: BasicReplayInformation): void;
    processGameDataBlock(block: GameDataBlock): void;
    private getPlayerBySlotId;
    private numericalChatModeToChatMessageMode;
    handleChatMessage(block: PlayerChatMessageBlock, timeMS: number): void;
    handleTimeSlot(block: TimeslotBlock): void;
    processCommandDataBlock(block: CommandBlock): void;
    handleActionBlock(action: Action, currentPlayer: Player): void;
    isObserver(player: Player): boolean;
    determineMatchup(): void;
    generateID(): void;
    cleanup(): void;
    private getObserverMode;
    finalize(): ParserOutput;
}
export {};
