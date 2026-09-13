import test from 'node:test';
import assert from 'node:assert/strict';
import { publicStudentProfile, ownerStudentProfile } from '../js/domain/usecases/StudentProfile.js';
import { Leaderboard } from '../js/domain/models/Leaderboard.js';
import { defaultSettings } from '../js/domain/models/BoardSettings.js';

test('private student profiles require the actual board owner, public rules remain unchanged', () => {
    const board = new Leaderboard('board', { ownerUid: 'owner', settings: { ...defaultSettings(), isPublic: false }, students: { alpha: { name: 'أحمد', memorized: [114] } } });
    assert.equal(publicStudentProfile(board, 'alpha'), null);
    assert.equal(ownerStudentProfile(board, 'alpha', null), null);
    assert.equal(ownerStudentProfile(board, 'alpha', 'other'), null);
    assert.equal(ownerStudentProfile(board, 'missing', 'owner'), null);
    assert.equal(ownerStudentProfile(board, 'alpha', 'owner').student.name, 'أحمد');
});
