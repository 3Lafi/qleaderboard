const paths = {
    book:'M4 4h6a3 3 0 0 1 3 3v13a4 4 0 0 0-3-2H4z M20 4h-4a3 3 0 0 0-3 3v13a4 4 0 0 1 3-2h4z',
    school:'M4 10h16v11H4z M8 10V6l4-3 4 3v4 M10 21v-5h4v5 M7 13h.01 M17 13h.01 M12 7h.01',
    institute:'M4 21h16 M6 21V11h12v10 M6 11c0-4 6-7 6-7s6 3 6 7 M10 21v-6a2 2 0 0 1 4 0v6 M12 4V2',
    college:'m2 7 10-4 10 4H2z M4 10v8 M9 10v8 M15 10v8 M20 10v8 M2 21h20 M3 18h18',
    primary:'M4 20V9l4-3 4 3v11 M12 20V5l4-3 4 3v15 M2 20h20 M7 11h2 M7 15h2 M15 7h2 M15 11h2 M15 15h2',
    layers:'m12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
    grade:'m2 9 10-5 10 5-10 5z M6 11v6c4 3 8 3 12 0v-6 M22 9v7',
    calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M7 3v4 M17 3v4 M3 11h18',
    search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    chevron:'m9 5 7 7-7 7',
};
export function planIcon(name) {
    if (name==='range') return '<img class="plan-icon" src="/images/ui-icons/list-start.svg" alt="" aria-hidden="true">';
    return `<svg class="plan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
}
