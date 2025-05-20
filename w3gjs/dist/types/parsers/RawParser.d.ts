import StatefulBufferParser from "./StatefulBufferParser";
export type Header = {
    compressedSize: number;
    headerVersion: string;
    decompressedSize: number;
    compressedDataBlockCount: number;
};
export type SubHeader = {
    gameIdentifier: string;
    version: number;
    buildNo: number;
    replayLengthMS: number;
};
type RawReplayData = {
    header: Header;
    subheader: SubHeader;
    blocks: DataBlock[];
};
export type DataBlock = {
    blockSize: number;
    blockDecompressedSize: number;
    blockContent: Buffer;
};
export declare function getUncompressedData(blocks: DataBlock[]): Promise<Buffer>;
export default class CustomReplayParser extends StatefulBufferParser {
    private header;
    private subheader;
    constructor();
    parse(input: Buffer): Promise<RawReplayData>;
    private parseBlocks;
    private parseBlock;
    private parseSubheader;
    private findParseStartOffset;
    private parseHeader;
}
export {};
