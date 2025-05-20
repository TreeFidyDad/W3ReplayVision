import { Header, SubHeader } from "./RawParser";
import { ReplayMetadata } from "./MetadataParser";
import { GameDataBlock } from "./GameDataParser";
import { EventEmitter } from "node:events";
export type ParserOutput = {
    header: Header;
    subheader: SubHeader;
    metadata: ReplayMetadata;
};
export type BasicReplayInformation = ParserOutput;
export interface ReplayParserEvents {
    on(event: "gamedatablock", listener: (block: GameDataBlock) => void): this;
    on(event: "basic_replay_information", listener: (data: BasicReplayInformation) => void): this;
}
export default class ReplayParser extends EventEmitter implements ReplayParserEvents {
    private rawParser;
    private metadataParser;
    private gameDataParser;
    constructor();
    parse(input: Buffer): Promise<ParserOutput>;
}
