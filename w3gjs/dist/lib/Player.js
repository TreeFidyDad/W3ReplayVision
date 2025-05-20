"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = __importDefault(require("./convert"));
const mappings_1 = require("./mappings");
const inferHeroAbilityLevelsFromAbilityOrder_1 = require("./inferHeroAbilityLevelsFromAbilityOrder");
const detectRetraining_1 = require("./detectRetraining");
const isRightclickAction = (input) => input[0] === 0x03 && input[1] === 0;
const isBasicAction = (input) => input[0] <= 0x19 && input[1] === 0;
class Player {
    id;
    name;
    teamid;
    color;
    race;
    raceDetected;
    units;
    upgrades;
    items;
    buildings;
    heroes;
    heroCollector;
    heroCount;
    actions;
    groupHotkeys;
    resourceTransfers = [];
    _currentlyTrackedAPM;
    _retrainingMetadata;
    _lastRetrainingTime;
    _lastActionWasDeselect;
    currentTimePlayed;
    apm;
    constructor(id, name, teamid, color, race) {
        this.id = id;
        this.name = name;
        this.teamid = teamid;
        this.color = convert_1.default.playerColor(color);
        this.race = race;
        this.raceDetected = "";
        this.units = { summary: {}, order: [] };
        this.upgrades = { summary: {}, order: [] };
        this.items = { summary: {}, order: [] };
        this.buildings = { summary: {}, order: [] };
        this.heroes = [];
        this.heroCollector = {};
        this.resourceTransfers = [];
        this.heroCount = 0;
        this.actions = {
            timed: [],
            assigngroup: 0,
            rightclick: 0,
            basic: 0,
            buildtrain: 0,
            ability: 0,
            item: 0,
            select: 0,
            removeunit: 0,
            subgroup: 0,
            selecthotkey: 0,
            esc: 0,
        };
        this.groupHotkeys = {
            1: { assigned: 0, used: 0 },
            2: { assigned: 0, used: 0 },
            3: { assigned: 0, used: 0 },
            4: { assigned: 0, used: 0 },
            5: { assigned: 0, used: 0 },
            6: { assigned: 0, used: 0 },
            7: { assigned: 0, used: 0 },
            8: { assigned: 0, used: 0 },
            9: { assigned: 0, used: 0 },
            0: { assigned: 0, used: 0 },
        };
        this._currentlyTrackedAPM = 0;
        this._lastActionWasDeselect = false;
        this._retrainingMetadata = {};
        this._lastRetrainingTime = 0;
        this.currentTimePlayed = 0;
        this.apm = 0;
    }
    newActionTrackingSegment(timeTrackingInterval = 60000) {
        this.actions.timed.push(Math.floor(this._currentlyTrackedAPM * (60000.0 / timeTrackingInterval)));
        this._currentlyTrackedAPM = 0;
    }
    detectRaceByActionId(actionId) {
        switch (actionId[0]) {
            case "e":
                this.raceDetected = "N";
                break;
            case "o":
                this.raceDetected = "O";
                break;
            case "h":
                this.raceDetected = "H";
                break;
            case "u":
                this.raceDetected = "U";
                break;
        }
    }
    handleStringencodedItemID(actionId, gametime) {
        if (mappings_1.units[actionId]) {
            this.units.summary[actionId] = this.units.summary[actionId] + 1 || 1;
            this.units.order.push({ id: actionId, ms: gametime });
        }
        else if (mappings_1.items[actionId]) {
            this.items.summary[actionId] = this.items.summary[actionId] + 1 || 1;
            this.items.order.push({ id: actionId, ms: gametime });
        }
        else if (mappings_1.buildings[actionId]) {
            this.buildings.summary[actionId] =
                this.buildings.summary[actionId] + 1 || 1;
            this.buildings.order.push({ id: actionId, ms: gametime });
        }
        else if (mappings_1.upgrades[actionId]) {
            this.upgrades.summary[actionId] =
                this.upgrades.summary[actionId] + 1 || 1;
            this.upgrades.order.push({ id: actionId, ms: gametime });
        }
    }
    handleHeroSkill(actionId, gametime) {
        const heroId = mappings_1.abilityToHero[actionId];
        if (this.heroCollector[heroId] === undefined) {
            this.heroCount += 1;
            this.heroCollector[heroId] = {
                level: 0,
                abilities: {},
                order: this.heroCount,
                id: heroId,
                abilityOrder: [],
                retrainingHistory: [],
            };
        }
        this.heroCollector[heroId].abilityOrder.push({
            type: "ability",
            time: gametime,
            value: actionId,
        });
        if (this._lastRetrainingTime > 0) {
            const retrainingIndex = (0, detectRetraining_1.getRetrainingIndex)(this.heroCollector[heroId].abilityOrder, this._lastRetrainingTime);
            if (retrainingIndex >= 0) {
                this.heroCollector[heroId].abilityOrder.splice(retrainingIndex, 0, {
                    type: "retraining",
                    time: this._lastRetrainingTime,
                });
                this._lastRetrainingTime = 0;
            }
        }
    }
    handleRetraining(gametime) {
        this._lastRetrainingTime = gametime;
    }
    handle0x10(itemid, gametime) {
        switch (itemid.value[0]) {
            case "A":
                this.handleHeroSkill(itemid.value, gametime);
                break;
            case "R":
                this.handleStringencodedItemID(itemid.value, gametime);
                break;
            case "u":
            case "e":
            case "h":
            case "o":
                if (!this.raceDetected) {
                    this.detectRaceByActionId(itemid.value);
                }
                this.handleStringencodedItemID(itemid.value, gametime);
                break;
            default:
                this.handleStringencodedItemID(itemid.value, gametime);
        }
        if (itemid.value[0] !== "0") {
            this.actions.buildtrain++;
        }
        else {
            this.actions.ability++;
        }
        this._currentlyTrackedAPM++;
    }
    handle0x11(itemid, gametime) {
        this._currentlyTrackedAPM++;
        if (itemid.type === "alphanumeric") {
            if (itemid.value[0] <= 0x19 && itemid.value[1] === 0) {
                this.actions.basic++;
            }
            else {
                this.actions.ability++;
            }
        }
        else {
            this.handleStringencodedItemID(itemid.value, gametime);
        }
    }
    handle0x12(itemid, gametime) {
        if (isRightclickAction(itemid.value)) {
            this.actions.rightclick++;
        }
        else if (isBasicAction(itemid.value)) {
            this.actions.basic++;
        }
        else {
            this.actions.ability++;
        }
        if (itemid.type === "stringencoded") {
            this.handleStringencodedItemID(itemid.value, gametime);
        }
        this._currentlyTrackedAPM++;
    }
    handle0x13() {
        this.actions.item++;
        this._currentlyTrackedAPM++;
    }
    handle0x14(itemid) {
        if (isRightclickAction(itemid.value)) {
            this.actions.rightclick++;
        }
        else if (isBasicAction(itemid.value)) {
            this.actions.basic++;
        }
        else {
            this.actions.ability++;
        }
        this._currentlyTrackedAPM++;
    }
    handle0x16(selectMode, isAPM) {
        if (isAPM) {
            this.actions.select++;
            this._currentlyTrackedAPM++;
        }
    }
    handle0x51(action) {
        this.resourceTransfers.push({
            ...action,
            msElapsed: this.currentTimePlayed,
        });
    }
    handleOther(action) {
        switch (action.id) {
            case 0x17:
                this.actions.assigngroup++;
                this._currentlyTrackedAPM++;
                this.groupHotkeys[(action.groupNumber + 1) % 10].assigned++;
                break;
            case 0x18:
                this.actions.selecthotkey++;
                this._currentlyTrackedAPM++;
                this.groupHotkeys[(action.groupNumber + 1) % 10].used++;
                break;
            case 0x1c:
            case 0x1d:
            case 0x66:
            case 0x67:
                this._currentlyTrackedAPM++;
                break;
            case 0x1e:
                this.actions.removeunit++;
                this._currentlyTrackedAPM++;
                break;
            case 0x61:
                this.actions.esc++;
                this._currentlyTrackedAPM++;
                break;
        }
    }
    determineHeroLevelsAndHandleRetrainings() {
        const heroInfo = [];
        for (const { order, ...hero } of Object.values(this.heroCollector).sort((h1, h2) => h1.order - h2.order)) {
            const inferredAbilityInfo = (0, inferHeroAbilityLevelsFromAbilityOrder_1.inferHeroAbilityLevelsFromAbilityOrder)(hero.abilityOrder);
            hero.abilities = inferredAbilityInfo.finalHeroAbilities;
            hero.retrainingHistory = inferredAbilityInfo.retrainingHistory;
            hero.level = Object.values(hero.abilities).reduce((prev, curr) => prev + curr, 0);
            heroInfo.push(hero);
        }
        this.heroes = heroInfo;
    }
    cleanup() {
        const apmSum = this.actions.timed.reduce((a, b) => a + b);
        if (this.currentTimePlayed === 0) {
            this.apm = 0;
        }
        else {
            this.apm = Math.round(apmSum / (this.currentTimePlayed / 1000 / 60));
        }
        this.determineHeroLevelsAndHandleRetrainings();
    }
    toJSON() {
        return {
            actions: this.actions,
            groupHotkeys: this.groupHotkeys,
            buildings: this.buildings,
            items: this.items,
            units: this.units,
            upgrades: this.upgrades,
            color: this.color,
            heroes: this.heroes,
            name: this.name,
            race: this.race,
            raceDetected: this.raceDetected,
            teamid: this.teamid,
            apm: this.apm,
            id: this.id,
            resourceTransfers: this.resourceTransfers,
        };
    }
}
exports.default = Player;
//# sourceMappingURL=Player.js.map