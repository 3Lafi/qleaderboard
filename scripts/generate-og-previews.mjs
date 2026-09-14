// Builds crawlable Open Graph pages for public boards.
// WhatsApp does not run the SPA, so /b/{id} needs a real HTML response with the
// board's own image and text before Firebase Hosting's SPA rewrite takes over.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'images', 'og');
const pageDirectory = path.join(root, 'b');
const siteUrl = 'https://wisam.web.app';
const checkOnly = process.argv.includes('--check');
const boardArgument = process.argv.find((argument) => argument.startsWith('--board='));
const requestedBoardId = boardArgument?.slice('--board='.length) || null;
const firebaseApiKey = 'AIzaSyCGW9PNgB-tiRzFbcrvK2aXa1Gs-RZ3GHg';
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function updateMeta(html, property, value) {
    const expression = new RegExp(`(<meta property="${property}"[^>]*content=")[^"]*(")`);
    if (expression.test(html)) return html.replace(expression, (_, start, end) => `${start}${escapeHtml(value)}${end}`);
    return html.replace('</head>', `    <meta property="${property}" content="${escapeHtml(value)}">\n</head>`);
}

function pageHtml(indexHtml, board, imageName) {
    const title = `${board.name} — لوحة حفظ القرآن`;
    const description = [board.schoolName, board.classLabel].filter(Boolean).join(' — ')
        || 'تابع تقدّم حفظ القرآن الكريم مباشرة على لوحة وسام';
    indexHtml = indexHtml.replace(/<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\s*/g, '');
    let html = indexHtml.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = updateMeta(html, 'og:type', 'website');
    html = updateMeta(html, 'og:title', title);
    html = updateMeta(html, 'og:description', description);
    html = updateMeta(html, 'og:url', `${siteUrl}/b/${board.id}`);
    html = updateMeta(html, 'og:image', `${siteUrl}/images/og/${imageName}`);
    html = updateMeta(html, 'og:image:type', 'image/jpeg');
    html = updateMeta(html, 'og:image:width', '1200');
    html = updateMeta(html, 'og:image:height', '630');
    html = html.replace('</head>', [
        `    <meta property="og:site_name" content="وسام">`,
        `    <meta name="twitter:card" content="summary_large_image">`,
        `    <meta name="twitter:title" content="${escapeHtml(title)}">`,
        `    <meta name="twitter:description" content="${escapeHtml(description)}">`,
        `    <meta name="twitter:image" content="${siteUrl}/images/og/${imageName}">`,
        '</head>',
    ].join('\n'));
    return html;
}

function normaliseBoard(id, settings) {
    return {
        id,
        name: String(settings.name || '').trim() || 'لوحة حفظ القرآن',
        schoolName: String(settings.schoolName || '').trim(),
        classLabel: String(settings.classLabel || '').trim(),
    };
}

async function loadRequestedPublicBoard(id) {
    const url = `https://firestore.googleapis.com/v1/projects/wisam-3lafi/databases/(default)/documents/leaderboards/${encodeURIComponent(id)}?key=${firebaseApiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not read board ${id}: ${response.status}`);
    const document = await response.json();
    const data = decodeFirestoreFields(document.fields || {});
    if (data.settings?.isPublic !== true) return null;
    return normaliseBoard(id, data.settings || {});
}

function decodeFirestoreValue(value) {
    if (!value || 'nullValue' in value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
    if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, decodeFirestoreValue(child)]));
    return null;
}

function decodeFirestoreFields(fields) {
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function firebaseCliAccessToken() {
    const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config');
    const configPath = path.join(configHome, 'configstore', 'firebase-tools.json');
    if (!existsSync(configPath)) return null;
    return JSON.parse(readFileSync(configPath, 'utf8')).tokens?.access_token || null;
}

async function loadBoardsWithFirebaseCli() {
    const queryBoards = (accessToken) => fetch('https://firestore.googleapis.com/v1/projects/wisam-3lafi/databases/(default)/documents:runQuery', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: 'leaderboards' }],
                where: { fieldFilter: { field: { fieldPath: 'settings.isPublic' }, op: 'EQUAL', value: { booleanValue: true } } },
            },
        }),
    });
    let accessToken = firebaseCliAccessToken();
    if (!accessToken) throw new Error('Firebase CLI credentials are unavailable. Use GOOGLE_APPLICATION_CREDENTIALS instead.');
    let response = await queryBoards(accessToken);
    // The Firebase CLI refreshes its OAuth token when it makes an authenticated
    // command. This keeps local runs reliable without storing a second secret.
    if (response.status === 401) {
        execFileSync('npx', ['--yes', 'firebase-tools@latest', 'projects:list'], { cwd: root, stdio: 'ignore' });
        accessToken = firebaseCliAccessToken();
        response = await queryBoards(accessToken);
    }
    if (!response.ok) throw new Error(`Firebase board query failed: ${response.status}`);
    const rows = await response.json();
    return rows.filter((row) => row.document).map((row) => {
        const document = row.document;
        const data = decodeFirestoreFields(document.fields || {});
        return normaliseBoard(document.name.split('/').at(-1), data.settings || {});
    });
}

async function loadRequestedBoardWithServiceAccount(id) {
    const firebaseApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'wisam-3lafi', credential: applicationDefault() });
    const document = await getFirestore(firebaseApp).collection('leaderboards').doc(id).get();
    if (!document.exists || document.data().settings?.isPublic !== true) return null;
    return normaliseBoard(document.id, document.data().settings || {});
}

async function loadBoards() {
    if (requestedBoardId) {
        const board = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? await loadRequestedBoardWithServiceAccount(requestedBoardId)
            : await loadRequestedPublicBoard(requestedBoardId);
        return board ? [board] : [];
    }
    if (firebaseCliAccessToken()) return loadBoardsWithFirebaseCli();
    try {
        const firebaseApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'wisam-3lafi', credential: applicationDefault() });
        const snapshot = await getFirestore(firebaseApp).collection('leaderboards').where('settings.isPublic', '==', true).get();
        return snapshot.docs.map((document) => normaliseBoard(document.id, document.data().settings || {}));
    } catch (error) {
        throw new Error(`Could not load public boards with the service account: ${error.message}`);
    }
}

const boards = await loadBoards();

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(pageDirectory, { recursive: true });
const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
const expectedImages = new Set(['wisam-universal-v2.jpg']);
const expectedPages = new Set();

const pagesToWrite = [];

for (const board of boards) {
    const imageName = 'wisam-universal-v2.jpg';
    expectedImages.add(imageName);
    expectedPages.add(`${board.id}.html`);
    const destination = path.join(pageDirectory, `${board.id}.html`);
    const html = pageHtml(indexHtml, board, imageName);
    if (!existsSync(destination) || readFileSync(destination, 'utf8') !== html) pagesToWrite.push({ destination, html });
}

const staleImageNames = readdirSync(outputDirectory).filter((name) => {
    if (!name.endsWith('.jpg') || expectedImages.has(name)) return false;
    return !requestedBoardId || name.startsWith(`${requestedBoardId}.`);
});
const stalePageNames = readdirSync(pageDirectory).filter((name) => {
    if (!name.endsWith('.html') || expectedPages.has(name)) return false;
    return !requestedBoardId || name === `${requestedBoardId}.html`;
});
const staleFiles = [
    ...staleImageNames.map((name) => path.join(outputDirectory, name)),
    ...stalePageNames.map((name) => path.join(pageDirectory, name)),
];
const needsWork = pagesToWrite.length + staleFiles.length > 0;
console.log(`public boards: ${boards.length}`);
console.log(`to write: ${pagesToWrite.length}, to prune: ${staleFiles.length}`);
console.log(`needs_work=${needsWork}`);
if (checkOnly || !needsWork) process.exit(0);

for (const file of staleFiles) rmSync(file);
for (const page of pagesToWrite) writeFileSync(page.destination, page.html);
