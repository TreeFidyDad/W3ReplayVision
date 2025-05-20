"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModeFormatter = exports.raceFlagFormatter = exports.objectIdFormatter = void 0;
const types_1 = require("../types");
const objectIdFormatter = (arr) => {
    if (arr[3] >= 0x41 && arr[3] <= 0x7a) {
        return {
            type: "stringencoded",
            value: arr
                .map((e) => String.fromCharCode(e))
                .reverse()
                .join(""),
        };
    }
    return { type: "alphanumeric", value: arr };
};
exports.objectIdFormatter = objectIdFormatter;
const raceFlagFormatter = (flag) => {
    switch (flag) {
        case 0x01:
        case 0x41:
            return types_1.Race.Human;
        case 0x02:
        case 0x42:
            return types_1.Race.Orc;
        case 0x04:
        case 0x44:
            return types_1.Race.NightElf;
        case 0x08:
        case 0x48:
            return types_1.Race.Undead;
        case 0x20:
        case 0x60:
            return types_1.Race.Random;
    }
    return types_1.Race.Random;
};
exports.raceFlagFormatter = raceFlagFormatter;
const chatModeFormatter = (flag) => {
    switch (flag) {
        case 0x00:
            return "ALL";
        case 0x01:
            return "ALLY";
        case 0x02:
            return "OBS";
    }
    if (flag >= 3 && flag <= 27) {
        return `PRIVATE${flag}`;
    }
    return "UNKNOWN";
};
exports.chatModeFormatter = chatModeFormatter;
//# sourceMappingURL=formatters.js.map