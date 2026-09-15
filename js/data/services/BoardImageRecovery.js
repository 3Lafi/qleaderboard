import { boardImageVersion } from '../../shared/board-image.js';

// Repairs boards written by older clients. Rendering and storage are injected
// so recovery is independent of a page and can be exercised without Firebase.
export function createBoardImageRecovery({ currentUid, readImage, renderImage, commitIfCurrent }) {
    const completed = new Map();
    const running = new Map();
    const pending = new Map();
    async function ensure(id, board) {
        const uid = currentUid();
        if (!uid || board?.ownerUid !== uid) return false;
        const version = await boardImageVersion(board.settings);
        const key = `${uid}/${id}/${version}`;
        if (completed.get(id) === key) return true;
        if (running.has(key)) return running.get(key);
        pending.set(id, board);
        const work = (async () => {
            try {
                const existing = await readImage(id);
                const ready = existing?.version === version && existing?.jpeg
                    ? true : await commitIfCurrent(id, uid, version, await renderImage(board.settings));
                if (ready) {
                    completed.set(id, key);
                    if (pending.get(id) === board) pending.delete(id);
                }
                return Boolean(ready);
            } catch (error) {
                console.error('Board image recovery will retry', error);
                return false;
            } finally { running.delete(key); }
        })();
        running.set(key, work);
        return work;
    }
    return { ensure, retry: () => Promise.all([...pending].map(([id, board]) => ensure(id, board))) };
}
