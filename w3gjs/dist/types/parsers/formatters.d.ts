import { Race } from "../types";
type ObjectIdStringencoded = {
    type: "stringencoded";
    value: string;
};
type ObjectIdAlphanumeric = {
    type: "alphanumeric";
    value: number[];
};
export type ItemId = ObjectIdAlphanumeric | ObjectIdStringencoded;
export declare const objectIdFormatter: (arr: number[]) => ItemId;
export declare const raceFlagFormatter: (flag: number) => Race;
export declare const chatModeFormatter: (flag: number) => string;
export {};
