import { EventEmitter } from "node:events";
import { Action } from "./ActionParser";
export type LeaveGameBlock = {
    id: 0x17;
    playerId: number;
    reason: string;
    result: string;
};
export type TimeslotBlock = {
    id: 0x1f | 0x1e;
    timeIncrement: number;
    commandBlocks: CommandBlock[];
};
export type CommandBlock = {
    playerId: number;
    actions: Action[];
};
export type PlayerChatMessageBlock = {
    id: 0x20;
    playerId: number;
    mode: number;
    message: string;
};
export type GameDataBlock = LeaveGameBlock | TimeslotBlock | PlayerChatMessageBlock;
export default class GameDataParser extends EventEmitter {
    private actionParser;
    private parser;
    private isPost202ReplayFormat;
    constructor();
    parse(data: Buffer, isPost202ReplayFormat?: boolean): Promise<void>;
    private parseBlock;
    private parseUnknown0x22;
    private parseChatMessage;
    private parseLeaveGameBlock;
    private parseTimeslotBlock;
}
