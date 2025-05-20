"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUncompressedData = getUncompressedData;
const StatefulBufferParser_1 = __importDefault(require("./StatefulBufferParser"));
const node_zlib_1 = require("node:zlib");
const inflatePromise = (buffer, options = {}) => new Promise((resolve, reject) => {
    (0, node_zlib_1.inflate)(buffer, options, (err, result) => {
        if (err !== null) {
            reject(err);
        }
        resolve(result);
    });
});
async function getUncompressedData(blocks) {
    const buffs = [];
    for (const block of blocks) {
        const block2 = await inflatePromise(block.blockContent, {
            finishFlush: node_zlib_1.constants.Z_SYNC_FLUSH,
        });
        if (block2.byteLength > 0 && block.blockContent.byteLength > 0) {
            buffs.push(block2);
        }
    }
    return Buffer.concat(buffs);
}
class CustomReplayParser extends StatefulBufferParser_1.default {
    header;
    subheader;
    constructor() {
        super();
    }
    async parse(input) {
        this.initialize(input);
        this.header = this.parseHeader();
        this.subheader = this.parseSubheader();
        return {
            header: this.header,
            subheader: this.subheader,
            blocks: this.parseBlocks(),
        };
    }
    parseBlocks() {
        const blocks = [];
        while (this.getOffset() < this.buffer.length) {
            const block = this.parseBlock();
            if (block.blockDecompressedSize === 8192) {
                blocks.push(block);
            }
        }
        return blocks;
    }
    parseBlock() {
        const isReforged = this.subheader.buildNo < 6089 ? false : true;
        const blockSize = this.readUInt16LE();
        this.skip(isReforged ? 2 : 0);
        const blockDecompressedSize = this.readUInt16LE();
        this.skip(isReforged ? 6 : 4);
        const blockContent = this.buffer.subarray(this.getOffset(), this.getOffset() + blockSize);
        this.skip(blockSize);
        return {
            blockSize,
            blockDecompressedSize,
            blockContent,
        };
    }
    parseSubheader() {
        const gameIdentifier = this.readStringOfLength(4, "utf-8");
        const version = this.readUInt32LE();
        const buildNo = this.readUInt16LE();
        this.skip(2);
        const replayLengthMS = this.readUInt32LE();
        this.skip(4);
        return {
            gameIdentifier,
            version,
            buildNo,
            replayLengthMS,
        };
    }
    findParseStartOffset() {
        return this.buffer.indexOf("Warcraft III recorded game");
    }
    parseHeader() {
        const offset = this.findParseStartOffset();
        this.setOffset(offset);
        this.readZeroTermString("ascii");
        this.skip(4);
        const compressedSize = this.readUInt32LE();
        const headerVersion = this.readStringOfLength(4, "hex");
        const decompressedSize = this.readUInt32LE();
        const compressedDataBlockCount = this.readUInt32LE();
        return {
            decompressedSize,
            headerVersion,
            compressedDataBlockCount,
            compressedSize,
        };
    }
}
exports.default = CustomReplayParser;
//# sourceMappingURL=RawParser.js.map