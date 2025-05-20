import { Race, ItemID } from "./types";
import { TransferResourcesActionWithPlayer } from "./W3GReplay";
import { Action } from "./parsers/ActionParser";
type TransferResourcesActionWithPlayerAndTimestamp = {
    msElapsed: number;
} & TransferResourcesActionWithPlayer;
export interface Ability {
    type: "ability";
    time: number;
    value: string;
}
export interface Retraining {
    type: "retraining";
    time: number;
}
export interface HeroInfo {
    level: number;
    abilities: {
        [key: string]: number;
    };
    order: number;
    id: string;
    retrainingHistory: {
        time: number;
        abilities: {
            [key: string]: number;
        };
    }[];
    abilityOrder: (Ability | Retraining)[];
}
declare class Player {
    id: number;
    name: string;
    teamid: number;
    color: string;
    race: Race;
    raceDetected: string;
    units: {
        summary: {
            [key: string]: number;
        };
        order: {
            id: string;
            ms: number;
        }[];
    };
    upgrades: {
        summary: {
            [key: string]: number;
        };
        order: {
            id: string;
            ms: number;
        }[];
    };
    items: {
        summary: {
            [key: string]: number;
        };
        order: {
            id: string;
            ms: number;
        }[];
    };
    buildings: {
        summary: {
            [key: string]: number;
        };
        order: {
            id: string;
            ms: number;
        }[];
    };
    heroes: Omit<HeroInfo, "order">[];
    heroCollector: {
        [key: string]: HeroInfo;
    };
    heroCount: number;
    actions: {
        timed: number[];
        assigngroup: number;
        rightclick: number;
        basic: number;
        buildtrain: number;
        ability: number;
        item: number;
        select: number;
        removeunit: number;
        subgroup: number;
        selecthotkey: number;
        esc: number;
    };
    groupHotkeys: {
        [key: number]: {
            assigned: number;
            used: number;
        };
    };
    resourceTransfers: TransferResourcesActionWithPlayerAndTimestamp[];
    _currentlyTrackedAPM: number;
    _retrainingMetadata: {
        [key: string]: {
            start: number;
            end: number;
        };
    };
    _lastRetrainingTime: number;
    _lastActionWasDeselect: boolean;
    currentTimePlayed: number;
    apm: number;
    constructor(id: number, name: string, teamid: number, color: number, race: Race);
    newActionTrackingSegment(timeTrackingInterval?: number): void;
    detectRaceByActionId(actionId: string): void;
    handleStringencodedItemID(actionId: string, gametime: number): void;
    handleHeroSkill(actionId: string, gametime: number): void;
    handleRetraining(gametime: number): void;
    handle0x10(itemid: ItemID, gametime: number): void;
    handle0x11(itemid: ItemID, gametime: number): void;
    handle0x12(itemid: ItemID, gametime: number): void;
    handle0x13(): void;
    handle0x14(itemid: ItemID): void;
    handle0x16(selectMode: number, isAPM: boolean): void;
    handle0x51(action: TransferResourcesActionWithPlayer): void;
    handleOther(action: Action): void;
    determineHeroLevelsAndHandleRetrainings(): void;
    cleanup(): void;
    toJSON(): Partial<Player>;
}
export default Player;
