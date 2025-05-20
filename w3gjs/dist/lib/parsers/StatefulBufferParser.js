"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readZeroTermString = (input, startAt = 0, encoding) => {
    let pos = startAt;
    while (input.readInt8(pos) !== 0) {
        pos++;
    }
    return {
        value: input.subarray(startAt, pos).toString(encoding),
        posDifference: pos - startAt + 1,
    };
};
const readStringOfLength = (input, length, startAt = 0, encoding = "utf-8") => {
    return input.subarray(startAt, startAt + length).toString(encoding);
};
class StatefulBufferParser {
    buffer;
    offset = 0;
    initialize(buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }
    readStringOfLength(length, encoding) {
        const result = readStringOfLength(this.buffer, length, this.offset, encoding);
        this.offset += length;
        return result;
    }
    setOffset(offset) {
        this.offset = offset;
    }
    getOffset() {
        return this.offset;
    }
    skip(byteCount) {
        this.offset += byteCount;
    }
    readZeroTermString(encoding) {
        const result = readZeroTermString(this.buffer, this.offset, encoding);
        this.offset += result.posDifference;
        return result.value;
    }
    readUInt32LE() {
        const val = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return val;
    }
    readUInt16LE() {
        const val = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return val;
    }
    readUInt8() {
        const val = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return val;
    }
    peekUInt8() {
        const val = this.buffer.readUInt8(this.offset);
        return val;
    }
    readFloatLE() {
        const val = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return val;
    }
}
exports.default = StatefulBufferParser;
//# sourceMappingURL=StatefulBufferParser.js.map