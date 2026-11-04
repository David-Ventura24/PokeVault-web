export function numeroDeNota(p) {
    const m = /(\d+(?:\.\d+)?)/.exec(p.nota || '');
    return m ? parseFloat(m[1]) : 0;
}
export function puntajeNota(p) {
    if (/sin graduar/i.test(p.certificadora || ''))
        return 0;
    if (/pristine/i.test(p.nota || ''))
        return 3;
    const n = numeroDeNota(p);
    if (!n)
        return 0;
    return n >= 10 ? 2.8 : n >= 9.5 ? 2.2 : n >= 9 ? 1.7 : n >= 8 ? 1 : 0.4;
}
export function puntajeRareza(p) {
    const s = `${p.rareza} ${p.etiqueta}`.toLowerCase();
    if (/1st edition|first edition|1ª ed/.test(s))
        return 3;
    if (/alt art|special illustration|secret/.test(s))
        return 2.4;
    if (/ultra rare|radiant/.test(s))
        return 2;
    if (/holo/.test(s))
        return 1.2;
    return 0.6;
}
/** 0 → 1; se pinta como variable CSS --gl. */
export function halo(p) {
    return Math.round(Math.min(1, puntajeRareza(p) * 0.12 + puntajeNota(p) * 0.21) * 100) / 100;
}
/** RGB sin formato para la variable CSS --glc. */
export function colorHalo(p) {
    const s = `${p.rareza} ${p.etiqueta}`.toLowerCase();
    if (/alt art|special illustration|secret/.test(s))
        return '255,236,190';
    if (/radiant/.test(s))
        return '255,178,84';
    return '255,214,10';
}
export function etiquetaCertificacion(p) {
    if (/sin graduar/i.test(p.certificadora))
        return 'Sin certificar';
    const n = numeroDeNota(p);
    return p.certificadora + (n ? ` ${n}` : '');
}
export function etiquetaNota(p) {
    const s = (p.nota || '').toLowerCase();
    if (/pristine/.test(s))
        return 'PRISTINE';
    if (/gem mint/.test(s))
        return 'GEM MINT';
    if (/near mint/.test(s))
        return 'NEAR MINT';
    if (/mint/.test(s))
        return 'MINT';
    return 'SIN GRADUAR';
}
