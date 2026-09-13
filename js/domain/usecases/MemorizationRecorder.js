// Serialize cell saves so completion is calculated from the last confirmed record.
export function memorizationChange(student, surah, selected) {
    if (!student || !student.scope.includes(surah)) throw new Error('السورة ليست ضمن خطة الطالب');
    const next = new Set(student.memorized);
    if (selected) next.add(surah); else next.delete(surah);
    return {
        memorized: [...next],
        wasComplete: student.isCompleted,
        isNowComplete: student.scope.length > 0 && student.scope.every(n => next.has(n)),
    };
}

export function createMemorizationRecorder({ getStudent, persist, onChange = () => {} }) {
    const pending = new Map(), failures = new Map();
    let tail = Promise.resolve();
    const keyFor = (id,n) => `${id}:${n}`;
    function record(id, surah, selected) {
        const key = keyFor(id,surah);
        if (pending.has(key)) return Promise.resolve(false);
        const entry = { id, surah, selected };
        pending.set(key,entry);
        failures.delete(key);
        onChange({ ...entry, status:'queued' });
        const job = tail.then(async () => {
            try {
                const change = memorizationChange(getStudent(id),surah,selected);
                await persist(entry,change);
                pending.delete(key);
                onChange({ ...entry, status:'saved' });
                return true;
            } catch (error) {
                pending.delete(key);
                failures.set(key,entry);
                onChange({ ...entry, status:'failed', error });
                return false;
            }
        });
        tail = job.then(()=>{},()=>{});
        return job;
    }
    return {
        record,
        toggle(id, surah) {
            const student = getStudent(id);
            return record(id, surah, !student?.memorized.includes(surah));
        },
        retry: () => Promise.all([...failures.values()].map(e=>record(e.id,e.surah,e.selected))),
        state: (id,n) => pending.has(keyFor(id,n)) ? {...pending.get(keyFor(id,n)),status:'pending'} : failures.has(keyFor(id,n)) ? {...failures.get(keyFor(id,n)),status:'failed'} : null,
        isPending: id => [...pending.values()].some(e=>e.id===id),
        forget: id => { for(const [key,entry] of failures) if(entry.id===id) failures.delete(key); },
        get pendingCount() { return pending.size; },
        get failedCount() { return failures.size; },
    };
}
