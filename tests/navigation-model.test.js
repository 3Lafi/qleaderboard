import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryDestinations, primarySection, boardDestinations } from '../js/application/navigation/navigation-model.js';
import { renderContextHtml, renderGlobalNavHtml } from '../js/presentation/layout/SidebarView.js';
const teacher = { uid: 'teacher' };
const board = { id: 'example', ownerUid: 'teacher', settings: { isPublic: true } };
const hrefs = html => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);

test('primary sidebar destinations stay in the same order across every teacher workflow', () => {
    for (const route of ['dashboard', 'cohorts', 'badges', 'new', 'board-students', 'board-settings', 'board-public']) {
        assert.deepEqual(hrefs(renderGlobalNavHtml(route, teacher)), ['/dashboard', '/cohorts', '/badges']);
    }
});
test('guest navigation offers public destinations and sign-in without teacher links', () => {
    assert.deepEqual(primaryDestinations(null).map(item => item.href), ['/', '/badges', '/login']);
    assert.deepEqual(boardDestinations(board, null).map(item => item.href), ['/b/example']);
    assert.deepEqual(boardDestinations({ ...board, settings: { isPublic: false } }, null), []);
});
test('board navigation separates recording, public viewing and settings; private boards omit public links', () => {
    assert.deepEqual(boardDestinations(board, teacher).map(item => item.href), ['/edit/example/students', '/b/example', '/edit/example']);
    assert.deepEqual(boardDestinations({ ...board, settings: { isPublic: false } }, teacher).map(item => item.href), ['/edit/example/students', '/edit/example']);
    assert.deepEqual(boardDestinations(null, teacher), []);
});
test('nested editing destinations retain their main section without claiming it is the current page', () => {
    assert.equal(primarySection('board-settings', teacher), 'dashboard');
    assert.match(renderGlobalNavHtml('board-settings', teacher), /data-nav-key="dashboard" aria-current="true"/);
    assert.doesNotMatch(renderGlobalNavHtml('board-settings', teacher), /aria-current="page"/);
    assert.doesNotMatch(renderContextHtml(board, 'board-students', teacher, 'student'), /aria-current="page"/);
    assert.match(renderContextHtml(board, 'board-students', teacher), /aria-current="page"/);
});
test('board navigation safely encodes identifiers in generated URLs', () => {
    const links = boardDestinations({ ...board, id: 'a"/><script>' }, teacher);
    assert.ok(links.every(item => !/["<>]/.test(item.href)));
});

test('public viewing retains My Boards selection only for the board owner', () => {
    assert.equal(primarySection('board-public', teacher, board), 'dashboard');
    assert.equal(primarySection('board-public', { uid: 'other' }, board), 'board-public');
});

test('student shortcuts keep a stable alphabetical order when page rankings change', async () => {
    const { normalizeStudents } = await import('../js/presentation/layout/SidebarStudentsNav.js');
    const students = [{ id:'b', name:'بدر', rank:1 }, { id:'a', name:'أحمد', rank:2 }];
    assert.deepEqual(normalizeStudents(students), normalizeStudents(students.toReversed().map(s => ({ ...s, rank: 3 - s.rank }))));
    assert.deepEqual(normalizeStudents([null, { name:'Missing id' }]), []);
});

test('loading a board never guesses a public link before visibility is known', () => {
    assert.deepEqual(boardDestinations({ id:'private-board' }, teacher), []);
    assert.deepEqual(boardDestinations({ id:'private-board' }, null), []);
});

test('cohort detail identifies its parent section without marking the list as the current page', () => {
    assert.equal(primarySection('cohort-detail', teacher), 'cohorts');
    assert.match(renderGlobalNavHtml('cohort-detail', teacher), /data-nav-key="cohorts" aria-current="true"/);
    assert.doesNotMatch(renderGlobalNavHtml('cohort-detail', teacher), /aria-current="page"/);
});
