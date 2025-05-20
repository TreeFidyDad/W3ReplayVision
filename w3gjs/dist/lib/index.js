"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUncompressedData = exports.ReplayParser = exports.RawParser = exports.MetadataParser = exports.GameDataParser = void 0;
const W3GReplay_1 = __importDefault(require("./W3GReplay"));
const GameDataParser_1 = __importDefault(require("./parsers/GameDataParser"));
exports.GameDataParser = GameDataParser_1.default;
const MetadataParser_1 = __importDefault(require("./parsers/MetadataParser"));
exports.MetadataParser = MetadataParser_1.default;
const RawParser_1 = __importStar(require("./parsers/RawParser"));
exports.RawParser = RawParser_1.default;
Object.defineProperty(exports, "getUncompressedData", { enumerable: true, get: function () { return RawParser_1.getUncompressedData; } });
const ReplayParser_1 = __importDefault(require("./parsers/ReplayParser"));
exports.ReplayParser = ReplayParser_1.default;
exports.default = W3GReplay_1.default;
//# sourceMappingURL=index.js.map