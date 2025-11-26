import { decodeMessageBody } from './decodeMessageBody';

export async function findDecodedEvent(abi: any, externals: any[], expectedName: string) {
    for (const m of externals) {
        try {
            const ev = await decodeMessageBody(abi, m.body.toBoc().toString('base64'));
            if (ev?.name === expectedName) return ev;
        } catch (_) {}
    }

    return null;
}
