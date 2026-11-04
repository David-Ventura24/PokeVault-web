/**
 * Animación de entrada, tilt y parallax del sistema de acceso.
 * Copia fiel del useEffect de login/registro en Next: mismos umbrales, mismas
 * variables (--ry, --rx, --sheen, --plx, --ply) y misma salida por fonts.ready.
 */
const raiz = document.documentElement;

const soltar = () => raiz.classList.add('in');
const aplazar = setTimeout(soltar, 3000);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { clearTimeout(aplazar); soltar(); });
}

const ranura = document.getElementById('ranura');
const escena = document.getElementById('showcase');

if (ranura && escena &&
    window.matchMedia('(hover:hover) and (min-width:1024px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let tx = 0, ty = 0, raf = 0;

  const aplicar = () => {
    raf = 0;
    ranura.style.setProperty('--ry', (-7 + tx * 16).toFixed(2) + 'deg');
    ranura.style.setProperty('--rx', (3 - ty * 10).toFixed(2) + 'deg');
    const brillo = ranura.querySelector('.fx');
    if (brillo) brillo.style.setProperty('--sheen', (44 + tx * 34 - ty * 14).toFixed(1) + '%');
    raiz.style.setProperty('--plx', (tx * -26).toFixed(1) + 'px');
    raiz.style.setProperty('--ply', (ty * -18).toFixed(1) + 'px');
  };

  const mover = e => {
    tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
    ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
    if (!raf) raf = requestAnimationFrame(aplicar);
  };
  const soltarPuntero = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(aplicar); };

  escena.addEventListener('pointermove', mover, { passive: true });
  escena.addEventListener('pointerleave', soltarPuntero);
}
