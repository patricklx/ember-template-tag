import { Buffer } from 'buffer';

if (!globalThis.process) {
    // @ts-ignore
    globalThis.process = { env: {} };
}

if (!globalThis.Buffer) {
    // @ts-ignore
    globalThis.Buffer = Buffer;
}