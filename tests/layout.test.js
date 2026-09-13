import test from 'node:test';
import assert from 'node:assert/strict';
import { AppLayoutManager } from '../js/presentation/layout/AppLayout.js';

function createLayout() {
    let user = { uid: 'a' };
    const pending = [];
    const layout = new AppLayoutManager({
        authState: { user: () => user },
        boards: { listMine: uid => new Promise(resolve => pending.push({ uid, resolve })) },
        authentication: {},
    });
    layout.renderSidebar = () => {};
    return { layout, pending, setUser: next => { user = next; } };
}
test('late board-list results cannot restore another account after sign-out', async () => {
    const h = createLayout();
    const request = h.layout.loadUserBoards('a');
    h.setUser(null); await h.layout.loadUserBoards(null);
    h.pending[0].resolve([{ id:'private-a', ownerUid:'a' }]); await request;
    assert.deepEqual(h.layout.userBoards, []);
});
test('latest board-list request wins when loading accounts in parallel', async () => {
    const h = createLayout();
    const first = h.layout.loadUserBoards('a'); h.setUser({ uid:'b' });
    const second = h.layout.loadUserBoards('b');
    h.pending[1].resolve([{ id:'b', ownerUid:'b' }]); await second;
    h.pending[0].resolve([{ id:'a', ownerUid:'a' }]); await first;
    assert.equal(h.layout.userBoards[0].id, 'b');
});
test('fresh visibility/settings override cached board data', () => {
    const h = createLayout();
    h.layout.userBoards = [{ id:'board', ownerUid:'a', settings:{ name:'Old', isPublic:true } }];
    const fresh = { id:'board', ownerUid:'a', settings:{ name:'New', isPublic:false } };
    h.layout.setActiveBoard(fresh);
    assert.equal(h.layout.activeBoard, fresh);
    assert.equal(h.layout.userBoards[0], fresh);
});
