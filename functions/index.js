import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { readFile, readdir } from 'node:fs/promises';
import { firstBanner, withMetadata } from './og/model.js';
import { renderBanner } from './og/render.js';

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket('wisam-3lafi.firebasestorage.app');
const options = { region: 'us-central1', minInstances: 0, maxInstances: 2, concurrency: 1, memory: '1GiB', timeoutSeconds: 60 };
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const record = id => db.collection('boardPreviews').doc(id);
const file = id => bucket.file(`board-previews/${id}/first.jpg`);

async function ensureSnapshot(id, settings) {
    try { await record(id).create({ snapshot: firstBanner(settings), status: 'pending', createdAt: FieldValue.serverTimestamp() }); }
    catch (error) { if (error.code !== 6 && error.code !== 'already-exists') throw error; }
    return (await record(id).get()).data();
}

async function ensureImage(id, settings) {
    const initial = await ensureSnapshot(id, settings);
    if (initial.status === 'ready') return initial;
    const acquired = await db.runTransaction(async tx => {
        const current = (await tx.get(record(id))).data();
        if (current.status === 'ready' || current.leaseUntil > Date.now()) return false;
        tx.update(record(id), { leaseUntil: Date.now() + 90000 });
        return true;
    });
    if (!acquired) return (await record(id).get()).data();
    try {
        if (!(await file(id).exists())[0]) {
            const legacyNames = await readdir(new URL('./og/assets/legacy/', import.meta.url));
            const legacy = legacyNames.find(name => name.startsWith(`${id}.`));
            const bytes = legacy ? await readFile(new URL(`./og/assets/legacy/${legacy}`, import.meta.url)) : await renderBanner(initial.snapshot);
            await file(id).save(bytes, { resumable: false, contentType: 'image/jpeg', preconditionOpts: { ifGenerationMatch: 0 } });
        }
        await record(id).update({ status: 'ready', leaseUntil: 0 });
        return { ...initial, status: 'ready' };
    } catch (error) {
        await record(id).update({ leaseUntil: 0 });
        throw error;
    }
}

export const captureFirstBoardBanner = onDocumentWritten({ ...options, document: 'leaderboards/{boardId}', retry: true }, async event => {
    const id = event.params.boardId;
    const after = event.data.after;
    if (!after.exists) {
        await file(id).delete({ ignoreNotFound: true });
        await record(id).delete();
        return;
    }
    // Before-data keeps the original values when bootstrapping an existing board.
    const settings = after.data().initialBanner || (event.data.before.exists ? event.data.before.data().settings : after.data().settings);
    await ensureSnapshot(id, settings);
    if (after.data().settings?.isPublic) {
        const result = await ensureImage(id, settings);
        if (result.status !== 'ready') throw new Error('Preview generation is already running; retry later');
    }
});

export const boardPreview = onRequest({ ...options, invoker: 'public' }, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const match = req.path.match(/^\/(?:b\/([^/]+)(?:\/.*)?|og\/([^/]+)\.jpg)$/);
    const id = match?.[1] || match?.[2];
    if (!id || !idPattern.test(id)) return res.status(404).send('Not found');
    try {
        const board = await db.collection('leaderboards').doc(id).get();
        const template = await readFile(new URL('./og/assets/index.html', import.meta.url), 'utf8');
        if (!board.exists || !board.data().settings?.isPublic) {
            return match[2] ? res.status(404).end() : res.status(200).type('html').send(template);
        }
        const preview = await ensureImage(id, board.data().initialBanner || board.data().settings);
        if (req.query.previewStatus === '1' && !match[2]) return res.json({ ready: preview.status === 'ready' });
        if (preview.status !== 'ready' && match[2]) return res.set('Retry-After', '5').status(503).send('Preparing preview');
        if (match[2]) return res.type('jpeg').send((await file(id).download())[0]);
        return res.type('html').send(withMetadata(template, preview.snapshot, id));
    } catch (error) {
        console.error('Board preview failed', { boardId: id, message: error.message });
        return res.set('Retry-After', '5').status(503).send('Preview temporarily unavailable');
    }
});
