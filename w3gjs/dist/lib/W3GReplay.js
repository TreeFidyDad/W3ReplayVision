"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObserverMode = void 0;
const Player_1 = __importDefault(require("./Player"));
const convert_1 = __importDefault(require("./convert"));
const formatters_1 = require("./parsers/formatters");
const sort_1 = require("./sort");
const node_events_1 = require("node:events");
const node_console_1 = __importDefault(require("node:console"));
const node_crypto_1 = require("node:crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const ReplayParser_1 = __importDefault(require("./parsers/ReplayParser"));
const readFilePromise = (0, node_util_1.promisify)(node_fs_1.readFile);
var ChatMessageMode;
(function (ChatMessageMode) {
    ChatMessageMode["All"] = "All";
    ChatMessageMode["Private"] = "Private";
    ChatMessageMode["Team"] = "Team";
    ChatMessageMode["Observers"] = "Obervers";
})(ChatMessageMode || (ChatMessageMode = {}));
var ObserverMode;
(function (ObserverMode) {
    ObserverMode["ON_DEFEAT"] = "ON_DEFEAT";
    ObserverMode["FULL"] = "FULL";
    ObserverMode["REFEREES"] = "REFEREES";
    ObserverMode["NONE"] = "NONE";
})(ObserverMode || (exports.ObserverMode = ObserverMode = {}));
class W3GReplay extends node_events_1.EventEmitter {
    info;
    players;
    observers;
    chatlog;
    id = "";
    leaveEvents;
    w3mmd;
    slots;
    teams;
    meta;
    playerList;
    totalTimeTracker = 0;
    timeSegmentTracker = 0;
    playerActionTrackInterval = 60000;
    gametype = "";
    matchup = "";
    parseStartTime;
    parser;
    filename;
    buffer;
    msElapsed = 0;
    slotToPlayerId = new Map();
    knownPlayerIds;
    winningTeamId = -1;
    constructor() {
        super();
        this.parser = new ReplayParser_1.default();
        this.parser.on("basic_replay_information", (information) => {
            this.handleBasicReplayInformation(information);
            this.emit("basic_replay_information", information);
        });
        this.parser.on("gamedatablock", (block) => {
            this.emit("gamedatablock", block);
            this.processGameDataBlock(block);
        });
    }
    async parse($buffer) {
        this.msElapsed = 0;
        this.parseStartTime = node_perf_hooks_1.performance.now();
        this.buffer = Buffer.from("");
        this.filename = "";
        this.id = "";
        this.chatlog = [];
        this.leaveEvents = [];
        this.w3mmd = [];
        this.players = {};
        this.slotToPlayerId = new Map();
        this.totalTimeTracker = 0;
        this.timeSegmentTracker = 0;
        this.slots = [];
        this.playerList = [];
        this.playerActionTrackInterval = 60000;
        if (typeof $buffer === "string") {
            $buffer = await readFilePromise($buffer);
        }
        await this.parser.parse($buffer);
        this.generateID();
        this.determineMatchup();
        this.determineWinningTeam();
        this.cleanup();
        return this.finalize();
    }
    determineWinningTeam() {
        if (this.gametype === "1on1") {
            let winningTeamId = -1;
            this.leaveEvents.forEach((event, index) => {
                if (this.isObserver(this.players[event.playerId]) === true ||
                    winningTeamId !== -1) {
                    return;
                }
                if (event.result === "09000000") {
                    winningTeamId = this.players[event.playerId].teamid;
                    return;
                }
                if (event.reason === "0c000000") {
                    winningTeamId = this.players[event.playerId].teamid;
                }
                if (index === this.leaveEvents.length - 1) {
                    winningTeamId = this.players[event.playerId].teamid;
                }
            });
            this.winningTeamId = winningTeamId;
        }
    }
    handleBasicReplayInformation(info) {
        this.info = info;
        this.slots = info.metadata.slotRecords;
        this.playerList = info.metadata.playerRecords;
        this.meta = info.metadata;
        const tempPlayers = {};
        this.teams = [];
        this.players = {};
        this.playerList.forEach((player) => {
            tempPlayers[player.playerId] = player;
        });
        if (info.metadata.reforgedPlayerMetadata.length > 0) {
            const extraPlayerList = info.metadata.reforgedPlayerMetadata;
            extraPlayerList.forEach((extraPlayer) => {
                if (tempPlayers[extraPlayer.playerId]) {
                    tempPlayers[extraPlayer.playerId].playerName = extraPlayer.name;
                }
            });
        }
        this.slots.forEach((slot, index) => {
            if (slot.slotStatus > 1) {
                this.slotToPlayerId.set(index, slot.playerId);
                this.teams[slot.teamId] = this.teams[slot.teamId] || [];
                this.teams[slot.teamId].push(slot.playerId);
                this.players[slot.playerId] = new Player_1.default(slot.playerId, tempPlayers[slot.playerId]
                    ? tempPlayers[slot.playerId].playerName
                    : "Computer", slot.teamId, slot.color, (0, formatters_1.raceFlagFormatter)(slot.raceFlag));
            }
        });
        this.knownPlayerIds = new Set(Object.keys(this.players));
    }
    processGameDataBlock(block) {
        switch (block.id) {
            case 31:
            case 30:
                this.totalTimeTracker += block.timeIncrement;
                this.timeSegmentTracker += block.timeIncrement;
                if (this.timeSegmentTracker > this.playerActionTrackInterval) {
                    Object.values(this.players).forEach((p) => p.newActionTrackingSegment());
                    this.timeSegmentTracker = 0;
                }
                this.handleTimeSlot(block);
                break;
            case 0x20:
                this.handleChatMessage(block, this.totalTimeTracker);
                break;
            case 23:
                this.leaveEvents.push(block);
                break;
        }
    }
    getPlayerBySlotId(slotId) {
        return this.slotToPlayerId.get(slotId);
    }
    numericalChatModeToChatMessageMode(number) {
        switch (number) {
            case 0x00:
                return ChatMessageMode.All;
            case 0x01:
                return ChatMessageMode.Team;
            case 0x02:
                return ChatMessageMode.Observers;
            default:
                return ChatMessageMode.Private;
        }
    }
    handleChatMessage(block, timeMS) {
        const message = {
            playerName: this.players[block.playerId].name,
            playerId: block.playerId,
            message: block.message,
            mode: this.numericalChatModeToChatMessageMode(block.mode),
            timeMS,
        };
        this.chatlog.push(message);
    }
    handleTimeSlot(block) {
        this.msElapsed += block.timeIncrement;
        block.commandBlocks.forEach((commandBlock) => {
            this.processCommandDataBlock(commandBlock);
        });
    }
    processCommandDataBlock(block) {
        if (this.knownPlayerIds.has(String(block.playerId)) === false) {
            node_console_1.default.error(`detected unknown playerId in CommandBlock: ${block.playerId} - time elapsed: ${this.totalTimeTracker}`);
            return;
        }
        const currentPlayer = this.players[block.playerId];
        currentPlayer.currentTimePlayed = this.totalTimeTracker;
        currentPlayer._lastActionWasDeselect = false;
        block.actions.forEach((action) => {
            this.handleActionBlock(action, currentPlayer);
        });
    }
    handleActionBlock(action, currentPlayer) {
        switch (action.id) {
            case 0x10:
                if ((0, formatters_1.objectIdFormatter)(action.orderId).value === "tert" ||
                    (0, formatters_1.objectIdFormatter)(action.orderId).value === "tret") {
                    currentPlayer.handleRetraining(this.totalTimeTracker);
                }
                currentPlayer.handle0x10((0, formatters_1.objectIdFormatter)(action.orderId), this.totalTimeTracker);
                break;
            case 0x11:
                currentPlayer.handle0x11((0, formatters_1.objectIdFormatter)(action.orderId), this.totalTimeTracker);
                break;
            case 0x12:
                currentPlayer.handle0x12((0, formatters_1.objectIdFormatter)(action.orderId), this.totalTimeTracker);
                break;
            case 0x13:
                currentPlayer.handle0x13();
                break;
            case 0x14:
                currentPlayer.handle0x14((0, formatters_1.objectIdFormatter)(action.orderId1));
                break;
            case 0x16:
                if (action.selectMode === 0x02) {
                    currentPlayer._lastActionWasDeselect = true;
                    currentPlayer.handle0x16(action.selectMode, true);
                }
                else {
                    if (currentPlayer._lastActionWasDeselect === false) {
                        currentPlayer.handle0x16(action.selectMode, true);
                    }
                    currentPlayer._lastActionWasDeselect = false;
                }
                break;
            case 0x17:
            case 0x18:
            case 0x1c:
            case 0x1d:
            case 0x1e:
            case 0x61:
            case 0x65:
            case 0x66:
            case 0x67:
                currentPlayer.handleOther(action);
                break;
            case 0x51: {
                const playerId = this.getPlayerBySlotId(action.slot);
                if (playerId) {
                    const { id, ...actionWithoutId } = action;
                    currentPlayer.handle0x51({
                        ...actionWithoutId,
                        playerId,
                        playerName: this.players[playerId].name,
                    });
                }
                break;
            }
            case 0x6b:
                this.w3mmd.push(action);
                break;
        }
    }
    isObserver(player) {
        return ((player.teamid === 24 && this.info.subheader.version >= 29) ||
            (player.teamid === 12 && this.info.subheader.version < 29));
    }
    determineMatchup() {
        const teamRaces = {};
        Object.values(this.players).forEach((p) => {
            if (!this.isObserver(p)) {
                teamRaces[p.teamid] = teamRaces[p.teamid] || [];
                teamRaces[p.teamid].push(p.raceDetected || p.race);
            }
        });
        this.gametype = Object.values(teamRaces)
            .map((e) => e.length)
            .sort()
            .join("on");
        this.matchup = Object.values(teamRaces)
            .map((e) => e.sort().join(""))
            .sort()
            .join("v");
    }
    generateID() {
        const players = Object.values(this.players)
            .filter((p) => this.isObserver(p) === false)
            .sort((player1, player2) => {
            if (player1.id < player2.id) {
                return -1;
            }
            return 1;
        })
            .reduce((accumulator, player) => {
            accumulator += player.name;
            return accumulator;
        }, "");
        const idBase = this.info.metadata.randomSeed + players + this.meta.gameName;
        this.id = (0, node_crypto_1.createHash)("sha256").update(idBase).digest("hex");
    }
    cleanup() {
        this.observers = [];
        Object.values(this.players).forEach((p) => {
            p.newActionTrackingSegment(this.playerActionTrackInterval);
            p.cleanup();
            if (this.isObserver(p)) {
                this.observers.push(p.name);
                delete this.players[p.id];
            }
        });
        if (this.info.subheader.version >= 2 &&
            Object.prototype.hasOwnProperty.call(this.teams, "24")) {
            delete this.teams[24];
        }
        else if (Object.prototype.hasOwnProperty.call(this.teams, "12")) {
            delete this.teams[12];
        }
    }
    getObserverMode(refereeFlag, observerMode) {
        if ((observerMode === 3 || observerMode === 0) && refereeFlag === true) {
            return ObserverMode.REFEREES;
        }
        else if (observerMode === 2) {
            return ObserverMode.ON_DEFEAT;
        }
        else if (observerMode === 3) {
            return ObserverMode.FULL;
        }
        return ObserverMode.NONE;
    }
    finalize() {
        const settings = {
            referees: this.meta.map.referees,
            observerMode: this.getObserverMode(this.meta.map.referees, this.meta.map.observerMode),
            fixedTeams: this.meta.map.fixedTeams,
            fullSharedUnitControl: this.meta.map.fullSharedUnitControl,
            alwaysVisible: this.meta.map.alwaysVisible,
            hideTerrain: this.meta.map.hideTerrain,
            mapExplored: this.meta.map.mapExplored,
            teamsTogether: this.meta.map.teamsTogether,
            randomHero: this.meta.map.randomHero,
            randomRaces: this.meta.map.randomRaces,
            speed: this.meta.map.speed,
        };
        const root = {
            id: this.id,
            gamename: this.meta.gameName,
            randomseed: this.meta.randomSeed,
            startSpots: this.meta.startSpotCount,
            observers: this.observers,
            players: Object.values(this.players).sort(sort_1.sortPlayers),
            matchup: this.matchup,
            creator: this.meta.map.creator,
            type: this.gametype,
            chat: this.chatlog,
            apm: {
                trackingInterval: this.playerActionTrackInterval,
            },
            map: {
                path: this.meta.map.mapName,
                file: convert_1.default.mapFilename(this.meta.map.mapName),
                checksum: this.meta.map.mapChecksum,
                checksumSha1: this.meta.map.mapChecksumSha1,
            },
            version: convert_1.default.gameVersion(this.info.subheader.version),
            buildNumber: this.info.subheader.buildNo,
            duration: this.info.subheader.replayLengthMS,
            expansion: this.info.subheader.gameIdentifier === "PX3W",
            settings,
            parseTime: Math.round(node_perf_hooks_1.performance.now() - this.parseStartTime),
            winningTeamId: this.winningTeamId,
        };
        return root;
    }
}
exports.default = W3GReplay;
//# sourceMappingURL=W3GReplay.js.map