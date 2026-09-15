import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoardImageRecovery } from '../js/data/services/BoardImageRecovery.js';
import { boardImageVersion } from '../js/shared/board-image.js';

const board = { ownerUid: 'teacher', settings: { name: 'New legacy board', banner: { themeId: 'emerald' } } };
function harness() {
    const state = { uid: 'teacher', images: new Map(), renders: 0, writes: 0, changed: false };
    const recovery = createBoardImageRecovery({
        currentUid: () => state.uid,
        readImage: async id => state.images.get(id),
        renderImage: async settings => { state.renders++; return { version: await boardImageVersion(settings), jpeg: '/9j/2Q==' }; },
        commitIfCurrent: async (id, uid, version, image) => {
            if (state.changed || uid !== state.uid) return false;
            state.writes++; state.images.set(id, image); return true;
        },
    });
    return { state, recovery };
}
test('a board created by an old client gains an image automatically when its owner opens it', async () => {
    const { state, recovery } = harness();
    assert.equal(await recovery.ensure('newboard', board), true);
    assert.equal(state.images.get('newboard').version, await boardImageVersion(board.settings));
    await recovery.ensure('newboard', board);
    assert.equal(state.renders, 1);
    assert.equal(state.writes, 1);
});
test('public visitors never generate or write images', async () => {
    const { state, recovery } = harness();
    for (const uid of [undefined, 'other-teacher']) {
        state.uid = uid;
        assert.equal(await recovery.ensure('newboard', board), false);
    }
    assert.equal(state.renders, 0);
});
test('concurrent page and sidebar loads produce only one repair', async () => {
    const { state, recovery } = harness();
    await Promise.all(Array.from({ length: 5 }, () => recovery.ensure('newboard', board)));
    assert.equal(state.renders, 1); assert.equal(state.writes, 1);
});
test('an existing correct image is reused, but a changed banner is repaired', async () => {
    const { state, recovery } = harness();
    state.images.set('newboard', { version: await boardImageVersion(board.settings), jpeg: '/9j/2Q==' });
    await recovery.ensure('newboard', board);
    assert.equal(state.renders, 0);
    await recovery.ensure('newboard', { ...board, settings: { ...board.settings, name: 'Changed' } });
    assert.equal(state.renders, 1);
});
test('a board changed during rendering is not overwritten and can retry', async () => {
    const { state, recovery } = harness();
    state.changed = true;
    assert.equal(await recovery.ensure('newboard', board), false);
    assert.equal(state.writes, 0);
    state.changed = false;
    await recovery.retry();
    assert.equal(state.writes, 1);
});
