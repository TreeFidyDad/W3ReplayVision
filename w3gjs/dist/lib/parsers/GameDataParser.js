"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const StatefulBufferParser_1 = __importDefault(require("./StatefulBufferParser"));
const ActionParser_1 = __importDefault(require("./ActionParser"));
const setImmediatePromise = () => new Promise((resolve) => setImmediate(resolve));
class GameDataParser extends node_events_1.EventEmitter {
    actionParser;
    parser;
    isPost202ReplayFormat = false;
    constructor() {
        super();
        this.actionParser = new ActionParser_1.default();
        this.parser = new StatefulBufferParser_1.default();
    }
    async parse(data, isPost202ReplayFormat = false) {
        this.isPost202ReplayFormat = isPost202ReplayFormat;
        this.parser.initialize(data);
        while (this.parser.offset < data.length) {
            const block = this.parseBlock();
            if (block !== null) {
                this.emit("gamedatablock", block);
            }
            await setImmediatePromise();
        }
    }
    parseBlock() {
        const id = this.parser.readUInt8();
        switch (id) {
            case 0x17:
                return this.parseLeaveGameBlock();
            case 0x1a:
                this.parser.skip(4);
                break;
            case 0x1b:
                this.parser.skip(4);
                break;
            case 0x1c:
                this.parser.skip(4);
                break;
            case 0x1f:
                return this.parseTimeslotBlock();
            case 0x1e:
                return this.parseTimeslotBlock();
            case 0x20:
                return this.parseChatMessage();
            case 0x22:
                this.parseUnknown0x22();
                break;
            case 0x23:
                this.parser.skip(10);
                break;
            case 0x2f:
                this.parser.skip(8);
                break;
        }
        return null;
    }
    parseUnknown0x22() {
        const length = this.parser.readUInt8();
        this.parser.skip(length);
    }
    parseChatMessage() {
        const playerId = this.parser.readUInt8();
        this.parser.readUInt16LE(); // byteCount
        const flags = this.parser.readUInt8();
        let mode = 0;
        if (flags === 0x20) {
            mode = this.parser.readUInt32LE();
        }
        const message = this.parser.readZeroTermString("utf-8");
        return {
            id: 0x20,
            playerId,
            mode,
            message,
        };
    }
    parseLeaveGameBlock() {
        const reason = this.parser.readStringOfLength(4, "hex");
        const playerId = this.parser.readUInt8();
        const result = this.parser.readStringOfLength(4, "hex");
        this.parser.skip(4);
        return {
            id: 0x17,
            reason,
            playerId,
            result,
        };
    }
    parseTimeslotBlock() {
        const byteCount = this.parser.readUInt16LE();
        const timeIncrement = this.parser.readUInt16LE();
        const actionBlockLastOffset = this.parser.offset + byteCount - 2;
        const commandBlocks = [];
        while (this.parser.offset < actionBlockLastOffset) {
            const commandBlock = {};
            commandBlock.playerId = this.parser.readUInt8();
            const actionBlockLength = this.parser.readUInt16LE();
            const actions = this.parser.buffer.subarray(this.parser.offset, this.parser.offset + actionBlockLength);
            commandBlock.actions = this.actionParser.parse(actions, this.isPost202ReplayFormat);
            this.parser.skip(actionBlockLength);
            commandBlocks.push(commandBlock);
        }
        return { id: 0x1f, timeIncrement, commandBlocks };
    }
}
exports.default = GameDataParser;
//# sourceMappingURL=GameDataParser.js.map