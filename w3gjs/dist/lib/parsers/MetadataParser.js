"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RawParser_1 = require("./RawParser");
const StatefulBufferParser_1 = __importDefault(require("./StatefulBufferParser"));
const protobufjs_1 = require("protobufjs");
const protoPlayer = new protobufjs_1.Type("ReforgedPlayerData")
    .add(new protobufjs_1.Field("playerId", 1, "uint32"))
    .add(new protobufjs_1.Field("battleTag", 2, "string"))
    .add(new protobufjs_1.Field("clan", 3, "string"))
    .add(new protobufjs_1.Field("portrait", 4, "string"))
    .add(new protobufjs_1.Field("team", 5, "uint32"))
    .add(new protobufjs_1.Field("unknown", 6, "string"));
const protoSkinData = new protobufjs_1.Type("SkinData")
    .add(new protobufjs_1.Field("unitId", 1, "uint32"))
    .add(new protobufjs_1.Field("skinId", 2, "uint32"))
    .add(new protobufjs_1.Field("skinName", 3, "string"));
const protoSkin = new protobufjs_1.Type("ReforgedSkinData")
    .add(protoSkinData)
    .add(new protobufjs_1.Field("playerId", 1, "uint32"))
    .add(new protobufjs_1.Field("skins", 2, "SkinData", "repeated"));
class MetadataParser extends StatefulBufferParser_1.default {
    mapmetaParser = new StatefulBufferParser_1.default();
    isPost202ReplayFormat = false;
    async parse(blocks) {
        return this.parseData(await (0, RawParser_1.getUncompressedData)(blocks));
    }
    async parseData(data) {
        this.initialize(data);
        this.skip(5);
        const playerRecords = [];
        playerRecords.push(this.parseHostRecord());
        const gameName = this.readZeroTermString("utf-8");
        this.readZeroTermString("utf-8"); // privateString
        const encodedString = this.readZeroTermString("hex");
        const mapMetadata = this.parseEncodedMapMetaString(this.decodeGameMetaString(encodedString));
        const playerCount = this.readUInt32LE();
        const gameType = this.readStringOfLength(4, "hex");
        const localeHash = this.readStringOfLength(4, "hex");
        const playerListFinal = playerRecords.concat(playerRecords, this.parsePlayerList());
        let reforgedPlayerMetadata = [];
        if (this.peekUInt8() !== 25) {
            reforgedPlayerMetadata = this.parseReforgedPlayerMetadata();
        }
        if (this.readUInt8() !== 25) {
            console.error("Unknown chunk detected!", this.buffer.subarray(this.getOffset() - 1));
        }
        const remainingBytes = this.readUInt16LE();
        const slotRecordCount = this.readUInt8();
        // remaining bytes are: slotRecordCount(1), slots(9*count), seed(4), mode(1), spots(1)
        if (remainingBytes !== 1 + slotRecordCount * 9 + 6) {
            console.error(`Remaining bytes (${remainingBytes}) do not match expected bytes (${1 + slotRecordCount * 9 + 6})`);
        }
        const slotRecords = this.parseSlotRecords(slotRecordCount);
        const randomSeed = this.readUInt32LE();
        const selectMode = this.readStringOfLength(1, "hex");
        const startSpotCount = this.readUInt8();
        return {
            gameData: this.buffer.subarray(this.getOffset()),
            map: mapMetadata,
            playerCount,
            gameType,
            localeHash,
            playerRecords: playerListFinal,
            slotRecords,
            reforgedPlayerMetadata,
            randomSeed,
            selectMode,
            gameName,
            startSpotCount,
            isPost202ReplayFormat: this.isPost202ReplayFormat,
        };
    }
    parseSlotRecords(count) {
        const slots = [];
        for (let i = 0; i < count; i++) {
            const record = {};
            record.playerId = this.readUInt8();
            record.downloadProgress = this.readUInt8();
            record.slotStatus = this.readUInt8();
            record.computerFlag = this.readUInt8();
            record.teamId = this.readUInt8();
            record.color = this.readUInt8();
            record.raceFlag = this.readUInt8();
            record.aiStrength = this.readUInt8();
            record.handicapFlag = this.readUInt8();
            slots.push(record);
        }
        return slots;
    }
    parseReforgedPlayerMetadata() {
        const result = [];
        const skinSet = new Map();
        while (this.peekUInt8() === 0x38 || this.peekUInt8() === 0x39) {
            if (this.readUInt8() === 0x38) {
                this.isPost202ReplayFormat = true;
            }
            const subtype = this.readUInt8();
            const followingBytes = this.readUInt32LE();
            const data = this.buffer.subarray(this.offset, this.offset + followingBytes);
            if (subtype === 0x3) {
                const decoded = protoPlayer.decode(data);
                if (decoded.clan === undefined) {
                    decoded.clan = "";
                }
                result.push({
                    playerId: decoded.playerId,
                    name: decoded.battleTag,
                    clan: decoded.clan,
                    skins: [],
                });
            }
            else if (subtype === 0x4) {
                const decoded = protoSkin.decode(data);
                if (decoded.skins !== undefined) {
                    skinSet.set(decoded.playerId, decoded.skins);
                }
            }
            this.skip(followingBytes);
        }
        for (const player of result) {
            if (skinSet.has(player.playerId)) {
                player.skins = skinSet.get(player.playerId);
            }
        }
        return result;
    }
    parseEncodedMapMetaString(buffer) {
        const parser = this.mapmetaParser;
        parser.initialize(buffer);
        const speed = parser.readUInt8();
        const secondByte = parser.readUInt8();
        const thirdByte = parser.readUInt8();
        const fourthByte = parser.readUInt8();
        parser.skip(5);
        const checksum = parser.readStringOfLength(4, "hex");
        parser.skip(0);
        const mapName = parser.readZeroTermString("utf-8");
        const creator = parser.readZeroTermString("utf-8");
        parser.skip(1);
        const checksumSha1 = parser.readStringOfLength(20, "hex");
        return {
            speed,
            hideTerrain: !!(secondByte & 0b00000001),
            mapExplored: !!(secondByte & 0b00000010),
            alwaysVisible: !!(secondByte & 0b00000100),
            default: !!(secondByte & 0b00001000),
            observerMode: (secondByte & 0b00110000) >>> 4,
            teamsTogether: !!(secondByte & 0b01000000),
            fixedTeams: !!(thirdByte & 0b00000110),
            fullSharedUnitControl: !!(fourthByte & 0b00000001),
            randomHero: !!(fourthByte & 0b00000010),
            randomRaces: !!(fourthByte & 0b00000100),
            referees: !!(fourthByte & 0b01000000),
            mapName: mapName,
            creator: creator,
            mapChecksum: checksum,
            mapChecksumSha1: checksumSha1,
        };
    }
    parsePlayerList() {
        const list = [];
        while (this.readUInt8() === 22) {
            list.push(this.parseHostRecord());
            this.skip(4);
        }
        this.skip(-1);
        return list;
    }
    parseHostRecord() {
        const playerId = this.readUInt8();
        const playerName = this.readZeroTermString("utf-8");
        const addData = this.readUInt8();
        this.skip(addData);
        return { playerId, playerName };
    }
    decodeGameMetaString(str) {
        const hexRepresentation = Buffer.from(str, "hex");
        const decoded = Buffer.alloc(hexRepresentation.length);
        let mask = 0;
        let dpos = 0;
        for (let i = 0; i < hexRepresentation.length; i++) {
            if (i % 8 === 0) {
                mask = hexRepresentation[i];
            }
            else {
                if ((mask & (0x1 << i % 8)) === 0) {
                    decoded.writeUInt8(hexRepresentation[i] - 1, dpos++);
                }
                else {
                    decoded.writeUInt8(hexRepresentation[i], dpos++);
                }
            }
        }
        return decoded;
    }
}
exports.default = MetadataParser;
//# sourceMappingURL=MetadataParser.js.map