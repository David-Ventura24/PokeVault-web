/**
 * login.html: validación de UX y llamada a api.iniciarSesion, igual que la vista
 * de Next. El correo y la contraseña viajan crudos al servidor: así entra la
 * inyección SQL y la ausencia de límite de intentos que pide la rúbrica.
 */
import { api } from './api.js';
import { guardarSesion, sesionAlmacenada, seSalioDeSesion, marcarEntradaTienda } from './sesion.js';

if (sesionAlmacenada()) location.replace('index.html');

const correo = document.getElementById('emailInput');
const clave = document.getElementById('pwInput');
const form = document.getElementById('loginForm');
const boton = document.getElementById('loginBtn');
const mensaje = document.getElementById('mensaje');
const campoCorreo = document.getElementById('campo-correo');
const campoClave = document.getElementById('campo-clave');

function escribir(texto, clase) {
  mensaje.textContent = texto;
  mensaje.className = 'msg' + (clase ? ' ' + clase : '');
}

if (seSalioDeSesion()) escribir('Sesión cerrada. Puedes volver a entrar cuando quieras.', '');

correo.addEventListener('input', () => { campoCorreo.classList.remove('err'); });
clave.addEventListener('input', () => { campoClave.classList.remove('err'); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  campoCorreo.classList.remove('err');
  campoClave.classList.remove('err');

  const mailValido = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo.value.trim());
  if (!mailValido || clave.value.length < 6) {
    if (!mailValido) campoCorreo.classList.add('err');
    else campoClave.classList.add('err');
    escribir(!correo.value.trim()
      ? 'Escribe el correo de tu cuenta.'
      : !mailValido
        ? 'El correo no tiene un formato válido.'
        : 'La contraseña debe tener al menos 6 caracteres.', 'err');
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Entrando…';
  try {
    guardarSesion(await api.iniciarSesion(correo.value, clave.value));
    location.replace('index.html');
  } catch (err) {
    escribir(err && err.message ? err.message : 'No pudimos iniciar sesión.', 'err');
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

document.getElementById('demo').addEventListener('click', () => {
  correo.value = 'invitado.demo@pokevault.com';
  clave.value = 'demo1234';
  escribir('Atajo de demostración: pulsa Entrar.', '');
});

document.getElementById('invitado').addEventListener('click', marcarEntradaTienda);
