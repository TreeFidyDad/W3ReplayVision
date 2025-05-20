export default class StatefulBufferParser {
    buffer: Buffer;
    offset: number;
    initialize(buffer: Buffer): void;
    readStringOfLength(length: number, encoding: BufferEncoding): string;
    setOffset(offset: number): void;
    getOffset(): number;
    skip(byteCount: number): void;
    readZeroTermString(encoding: BufferEncoding): string;
    readUInt32LE(): number;
    readUInt16LE(): number;
    readUInt8(): number;
    peekUInt8(): number;
    readFloatLE(): number;
}
