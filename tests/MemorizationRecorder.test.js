import test from 'node:test';
import assert from 'node:assert/strict';
import { Student } from '../js/domain/models/Student.js';
import { createMemorizationRecorder, memorizationChange } from '../js/domain/usecases/MemorizationRecorder.js';

test('rapid cell saves use the latest confirmed progress for completion and reversal', async () => {
    const data = { name:'Student', memorized:[1] };
    const transitions = [];
    const recorder = createMemorizationRecorder({
        getStudent: id => new Student(id,data,[112,113,114]),
        persist: async (entry,change) => {
            transitions.push([entry.surah,change.wasComplete,change.isNowComplete]);
            data.memorized = change.memorized;
        },
    });
    await Promise.all([112,113,114].map(n => recorder.record('a',n,true)));
    assert.deepEqual(transitions,[[112,false,false],[113,false,false],[114,false,true]]);
    assert.deepEqual(data.memorized,[1,112,113,114]);
    await recorder.record('a',113,false);
    assert.deepEqual(transitions.at(-1),[113,true,false]);
    assert.equal(recorder.pendingCount,0);
});

test('a failed cell stays unconfirmed, does not block later saves, and can be retried', async () => {
    const data = { memorized:[] };
    let shouldFail = true;
    const events = [];
    const recorder = createMemorizationRecorder({
        getStudent: id => new Student(id,data,[113,114]),
        persist: async (entry,change) => {
            if (entry.surah === 113 && shouldFail) { shouldFail = false; throw Error('offline'); }
            data.memorized = change.memorized;
        },
        onChange: event => events.push(event.status),
    });
    assert.deepEqual(await Promise.all([recorder.record('a',113,true),recorder.record('a',114,true)]),[false,true]);
    assert.deepEqual(data.memorized,[114]);
    assert.equal(recorder.failedCount,1);
    assert.equal(recorder.state('a',113).selected,true);
    await recorder.retry();
    assert.deepEqual(data.memorized,[114,113]);
    assert.equal(recorder.failedCount,0);
    assert.ok(events.includes('failed'));
});

test('pending duplicates are ignored and student records stay independent', async () => {
    const data = { a:{memorized:[]},b:{memorized:[]} };
    let writes = 0;
    const recorder = createMemorizationRecorder({
        getStudent: id => new Student(id,data[id],[114]),
        persist: async ({id},change) => { writes++; data[id].memorized=change.memorized; },
    });
    const first = recorder.record('a',114,true);
    assert.equal(recorder.isPending('a'),true);
    assert.equal(await recorder.record('a',114,false),false);
    await Promise.all([first,recorder.record('b',114,true)]);
    assert.equal(writes,2);
    assert.deepEqual(data,{a:{memorized:[114]},b:{memorized:[114]}});
});

test('invalid scope cells are rejected without writes and deleted student failures can be forgotten', async () => {
    const s = new Student('a',{memorized:[1]},[114]);
    assert.throws(() => memorizationChange(s,113,true));
    let writes = 0;
    const recorder = createMemorizationRecorder({getStudent:()=>s,persist:async()=>{writes++;}});
    assert.equal(await recorder.record('a',113,true),false);
    assert.equal(writes,0);
    recorder.forget('a');
    assert.equal(recorder.failedCount,0);
});

test('worksheet toggle saves and clears a cell using the latest confirmed record', async () => {
    const data = { name: 'طالب', memorized: [] };
    const scope = [114];
    const recorder = createMemorizationRecorder({
        getStudent: () => new Student('a', data, scope),
        persist: async (_entry, change) => { data.memorized = change.memorized; },
    });
    assert.equal(await recorder.toggle('a', 114), true);
    assert.deepEqual(data.memorized, [114]);
    assert.equal(await recorder.toggle('a', 114), true);
    assert.deepEqual(data.memorized, []);
});
