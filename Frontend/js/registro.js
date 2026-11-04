/**
 * registro.html: misma validación y mismo lenguaje que app/(acceso)/registro.
 * El nombre, correo y dirección viajan crudos al backend (rúbrica §4: inyección
 * SQL y XSS almacenados tienen que ser reales, no escapar en el cliente).
 */
import { api } from './api.js';
import { DEPARTAMENTOS } from './factura.js';
import { guardarSesion, sesionAlmacenada } from './sesion.js';

if (sesionAlmacenada()) location.replace('index.html');

const CONTRASENAS_COMUNES = ['123456', '12345678', 'password', 'contrase', '111111', 'pokeball'];

const campos = {
  nombre: document.getElementById('campo-nombre'),
  email: document.getElementById('campo-correo'),
  telefono: document.getElementById('campo-telefono'),
  direccion: document.getElementById('campo-direccion'),
  pw: document.getElementById('campo-clave'),
  confirm: document.getElementById('campo-confirmar')
};

const entradas = {
  nombre: document.getElementById('regNombre'),
  correo: document.getElementById('regCorreo'),
  telefono: document.getElementById('regTel'),
  departamento: document.getElementById('regDepto'),
  direccion: document.getElementById('regDir'),
  clave: document.getElementById('regPw'),
  confirmar: document.getElementById('regPw2')
};

const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('registroBtn');
const original = mensaje.textContent.trim();

/** clave de la caja -> su input, porque los ids no calcan los nombres del estado. */
const INPUTS = {
  nombre: entradas.nombre,
  email: entradas.correo,
  telefono: entradas.telefono,
  direccion: entradas.direccion,
  pw: entradas.clave,
  confirm: entradas.confirmar
};

entradas.departamento.innerHTML = DEPARTAMENTOS.map(dep => `<option value="${dep}">${dep}</option>`).join('');

/* el error se limpia al escribir, como hacía setMalo({...m, campo:false}) */
Object.entries(campos).forEach(([k, caja]) => {
  INPUTS[k].addEventListener('input', () => {
    caja.classList.remove('err');
    INPUTS[k].setAttribute('aria-invalid', 'false');
  });
});

document.querySelectorAll('.rol-opt input').forEach(radio => {
  radio.addEventListener('change', () => {
    document.querySelectorAll('.rol-opt').forEach(l => l.classList.remove('on'));
    radio.closest('.rol-opt').classList.add('on');
  });
});

function marcar(clave, activo) {
  campos[clave].classList.toggle('err', !!activo);
  INPUTS[clave].setAttribute('aria-invalid', activo ? 'true' : 'false');
}

function decir(texto, esError) {
  mensaje.textContent = texto || original;
  mensaje.className = 'msg' + (esError ? ' err' : '');
}

function validar() {
  const textos = [];
  const mail = entradas.correo.value.trim();
  const tel = entradas.telefono.value.trim();
  const clave = entradas.clave.value;

  Object.keys(campos).forEach(k => marcar(k, false));

  if (entradas.nombre.value.trim().length < 3) {
    marcar('nombre', true); textos.push('Escribe tu nombre completo.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)) {
    marcar('email', true);
    textos.push(mail ? 'El correo no tiene un formato válido.' : 'Escribe un correo para contactarte.');
  }
  if (tel && !/^(\+\d{2,3}[\s-]?)?\d{4}[\s-]?\d{4}$/.test(tel)) {
    marcar('telefono', true); textos.push('El teléfono debe tener 8 dígitos (ej. 7890 1234).');
  }
  if (entradas.direccion.value.trim().length < 6) {
    marcar('direccion', true); textos.push('Necesitamos una dirección de entrega: colonia, calle y número.');
  }
  if (clave.length < 6) {
    marcar('pw', true); textos.push('La contraseña debe tener al menos 6 caracteres.');
  } else if (CONTRASENAS_COMUNES.includes(clave.toLowerCase())) {
    marcar('pw', true); textos.push('Esa contraseña es demasiado común; usa una distinta.');
  }
  if (!entradas.confirmar.value || entradas.confirmar.value !== clave) {
    marcar('confirm', true); textos.push('La confirmación no coincide con la contraseña.');
  }

  return textos[0] || '';
}

document.getElementById('registroForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const primerError = validar();
  if (primerError) {
    decir(primerError, true);
    return;
  }

  const rol = document.querySelector('.rol-opt input:checked').value;
  boton.disabled = true;
  boton.textContent = 'Creando tu cuenta…';
  try {
    guardarSesion(await api.registrarse({
      nombre: entradas.nombre.value.trim(),
      email: entradas.correo.value.trim().toLowerCase(),
      telefono: entradas.telefono.value.trim(),
      direccion: `${entradas.direccion.value.trim()}, ${entradas.departamento.value}, El Salvador`,
      rol,
      password: entradas.clave.value
    }));
    location.replace(rol === 'comprador' ? 'carrito.html' : 'vender.html');
  } catch (err) {
    decir(err && err.message ? err.message : 'No pudimos crear tu cuenta.', true);
    boton.disabled = false;
    boton.textContent = 'Crear cuenta';
  }
});
