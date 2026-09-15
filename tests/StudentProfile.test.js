import test from 'node:test';
import assert from 'node:assert/strict';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { publicStudentProfile, ownerStudentProfile } from '../js/domain/usecases/StudentProfile.js';

function board(isPublic = true) {
    return new Leaderboard('sample', {
        settings: { name: 'حلقة النور', isPublic, scope: { type: 'custom', surahNumbers: [112,113,114] } },
        students: {
            first: { name: 'أحمد', memorized: [112,113,114] },
            second: { name: 'عمر', memorized: [114] },
        },
    });
}

test('student profile uses board ranking and curriculum scope', () => {
    const profile = publicStudentProfile(board(), 'second');
    assert.equal(profile.student.id, 'second');
    assert.equal(profile.rank, 2);
    assert.equal(profile.boardName, 'حلقة النور');
    assert.deepEqual(profile.student.scope, [114,113,112]);
    assert.equal(profile.student.totalSurahsInScope, 3);
    assert.equal(publicStudentProfile(board(), 'first').student.progress, 100);
    assert.deepEqual(profile.students.map(student => student.id), ['first', 'second']);
    assert.equal(profile.students[0].isCompleted, true);
    assert.equal(profile.students[1].isCompleted, false);
});

test('private or missing boards do not expose a student profile', () => {
    assert.equal(publicStudentProfile(board(false), 'first'), null);
    assert.equal(publicStudentProfile(null, 'first'), null);
});

test('a student hidden from a public board remains available to its owner only', () => {
    const current = board();
    current.ownerUid = 'owner';
    current.students.first.hidden = true;
    assert.equal(publicStudentProfile(current, 'first'), null);
    assert.equal(ownerStudentProfile(current, 'first', 'owner')?.student.id, 'first');
});

test('missing and inherited student keys do not resolve to a profile', () => {
    for (const id of ['missing', '__proto__', 'constructor', 'toString', undefined]) {
        assert.equal(publicStudentProfile(board(), id), null);
    }
});

test('profile visibility and existence are reevaluated after board updates', () => {
    const current = board();
    assert.ok(publicStudentProfile(current, 'first'));
    current.settings.isPublic = false;
    assert.equal(publicStudentProfile(current, 'first'), null);
    current.settings.isPublic = true;
    delete current.students.first;
    assert.equal(publicStudentProfile(current, 'first'), null);
    assert.equal(publicStudentProfile(current, 'second').rank, 1);
    assert.deepEqual(publicStudentProfile(current, 'second').students.map(student => student.id), ['second']);
});

test('program completion is revoked and restored from the current saved memorization', () => {
    const current = board();
    assert.equal(publicStudentProfile(current, 'first').student.isCompleted, true);
    current.students.first.memorized = [112, 114, 1];
    assert.equal(publicStudentProfile(current, 'first').student.isCompleted, false);
    current.students.first.memorized.push(113);
    assert.equal(publicStudentProfile(current, 'first').student.isCompleted, true);
});
