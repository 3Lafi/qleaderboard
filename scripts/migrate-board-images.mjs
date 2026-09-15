// Deployment migration only. Future boards and edits generate their own images
// atomically in BoardRepository; no ongoing local process is required.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { boardImageVersion } from '../js/shared/board-image.js';
import { imageBrowser } from './lib/board-image-browser.mjs';

const project = 'wisam-3lafi';
const database = `projects/${project}/databases/(default)/documents`;
const root = `https://firestore.googleapis.com/v1/${database}`;
const apply = process.argv.includes('--apply');
const tokenPath = path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config'), 'configstore', 'firebase-tools.json');
const token = () => JSON.parse(readFileSync(tokenPath, 'utf8')).tokens.access_token;
let accessToken = token();
async function api(suffix, body, allowMissing = false) {
    const options = () => ({
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let response = await fetch(root + suffix, options());
    if (response.status === 401) {
        execFileSync('npx', ['--yes', 'firebase-tools@latest', 'projects:list'], { stdio: 'ignore' });
        accessToken = token(); response = await fetch(root + suffix, options());
    }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${suffix.split('?')[0]}`);
    return response.json();
}
function settingsOf(document) {
    const fields = document.fields?.settings?.mapValue?.fields || {};
    return {
        name: fields.name?.stringValue || '', schoolName: fields.schoolName?.stringValue || '',
        classLabel: fields.classLabel?.stringValue || '',
        banner: { themeId: fields.banner?.mapValue?.fields?.themeId?.stringValue },
    };
}
const rows = await api(':runQuery', { structuredQuery: {
    from: [{ collectionId: 'leaderboards' }], select: { fields: [{ fieldPath: 'settings' }] },
} });
const boards = rows.filter(row => row.document).map(row => row.document);
const renderer = apply ? await imageBrowser() : null;
let changed = 0;
try {
    for (const board of boards) {
        const id = board.name.split('/').at(-1);
        const current = await api(`/boardPreviews/${id}`, null, true);
        if (current?.fields?.version?.stringValue === await boardImageVersion(settingsOf(board))) continue;
        changed++;
        if (!apply) continue;
        // Read inside a transaction so an edit during rendering cannot install
        // an image for obsolete settings. Re-running skips completed boards.
        const { transaction } = await api(':beginTransaction', {});
        try {
            const fresh = await api(`/leaderboards/${id}?transaction=${encodeURIComponent(transaction)}`);
            const image = await renderer.render(settingsOf(fresh));
            await api(':commit', { transaction, writes: [{ update: {
                name: `${database}/boardPreviews/${id}`,
                fields: { version: { stringValue: image.version }, jpeg: { stringValue: image.jpeg } },
            } }] });
        } catch (error) {
            await api(':rollback', { transaction }).catch(() => {});
            throw error;
        }
    }
    console.log(JSON.stringify({ boards: boards.length, [apply ? 'imagesCreated' : 'imagesMissing']: changed }));
} finally { await renderer?.close(); }
