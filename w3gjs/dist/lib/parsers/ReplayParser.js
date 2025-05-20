"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RawParser_1 = __importDefault(require("./RawParser"));
const MetadataParser_1 = __importDefault(require("./MetadataParser"));
const GameDataParser_1 = __importDefault(require("./GameDataParser"));
const node_events_1 = require("node:events");
class ReplayParser extends node_events_1.EventEmitter {
    rawParser = new RawParser_1.default();
    metadataParser = new MetadataParser_1.default();
    gameDataParser = new GameDataParser_1.default();
    constructor() {
        super();
        this.gameDataParser.on("gamedatablock", (block) => this.emit("gamedatablock", block));
    }
    async parse(input) {
        const rawParserResult = await this.rawParser.parse(input);
        const metadataParserResult = await this.metadataParser.parse(rawParserResult.blocks);
        const result = {
            header: rawParserResult.header,
            subheader: rawParserResult.subheader,
            metadata: metadataParserResult,
        };
        this.emit("basic_replay_information", {
            header: rawParserResult.header,
            subheader: rawParserResult.subheader,
            metadata: metadataParserResult,
        });
        await this.gameDataParser.parse(metadataParserResult.gameData, metadataParserResult.isPost202ReplayFormat);
        return result;
    }
}
exports.default = ReplayParser;
//# sourceMappingURL=ReplayParser.js.map