// Navegación y comunicación con la API del sistema.
function elemento(id) { return document.getElementById(id); }
let vistaActual = 'flujo';
let modo = 'consulta';
let seleccion = null;
const nombres = {flujo: 'Flujo principal del sistema', registro: 'Registrar incidencia', consulta: 'Consultar incidencia', asignar: 'Asignar responsable', estado: 'Actualizar estado', historial: 'Consultar historial', solucion: 'Registrar solución', cerrar: 'Cerrar incidencia', tiempo: 'Consultar tiempo de atención', confirmacion: 'Confirmación'};

function estadoApi(texto, clase, detalle) {
    elemento('conexion').textContent = texto;
    elemento('conexion').className = clase;
    elemento('ultimaApi').textContent = detalle;
}
async function api(accion, datos = null) {
    const metodo = datos === null ? 'GET' : 'POST';
    let opciones = {method: metodo};
    if (datos !== null) {
        opciones.headers = {'Content-Type': 'application/json'};
        opciones.body = JSON.stringify(datos);
    }
    let respuesta, resultado;
    try {
        respuesta = await fetch('api.php?accion=' + accion, opciones);
        resultado = await respuesta.json();
    } catch (error) {
        estadoApi('API sin conexión', 'error', 'No se recibió una respuesta válida');
        throw new Error('Verifica Apache y abre el sistema desde localhost.');
    }
    estadoApi(respuesta.status >= 500 ? 'Error de servidor' : 'API conectada', respuesta.status >= 500 ? 'error' : 'correcto', metodo + ' api.php?accion=' + accion.split('&')[0] + ' → ' + respuesta.status);
    if (!respuesta.ok) throw new Error(resultado.mensaje);
    return resultado;
}
function mensaje(id, texto, error = false) {
    elemento(id).textContent = texto;
    elemento(id).className = 'mensaje ' + (error ? 'error' : 'correcto');
}
function codigo(id) { return 'INC-' + String(id).padStart(4, '0'); }
function fechaHoy() {
    const hoy = new Date();
    return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
}
function mostrar(id, titulo, activo) {
    vistaActual = id;
    for (const seccion of document.querySelectorAll('main > section')) seccion.hidden = seccion.id !== id;
    elemento('ruta').textContent = titulo;
    for (const boton of document.querySelectorAll('.nav')) boton.classList.toggle('activo', boton.dataset.vista === activo);
    cerrarMenu();
    window.scrollTo(0, 0);
}
function cerrarMenu() {
    elemento('sidebar').classList.remove('abierta');
    elemento('overlay').classList.remove('activa');
}
elemento('abrirMenu').onclick = function() {
    elemento('sidebar').classList.add('abierta');
    elemento('overlay').classList.add('activa');
};
elemento('cerrarMenu').onclick = cerrarMenu;
elemento('overlay').onclick = cerrarMenu;
function abrir(vista) {
    if (vista === 'flujo' || vista === 'registro') {
        mostrar(vista, nombres[vista], vista);
        return;
    }
    // LISTA
}
for (const boton of document.querySelectorAll('[data-vista]')) boton.onclick = function() { abrir(boton.dataset.vista); };
elemento('atras').onclick = function() {
    // ATRAS
    abrir(vistaActual === 'confirmacion' ? modo : 'flujo');
};
function confirmar(titulo, texto) {
    elemento('tituloConfirmacion').textContent = titulo;
    elemento('textoConfirmacion').textContent = texto;
    mostrar('confirmacion', 'Confirmación', modo);
}
const formulario = elemento('formRegistro');
formulario.elements.fecha.value = fechaHoy();
formulario.onsubmit = async function(evento) {
    evento.preventDefault();
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const datos = Object.fromEntries(new FormData(formulario));
        const resultado = await api('registrar', datos);
        formulario.reset();
        formulario.elements.fecha.value = fechaHoy();
        mensaje('mensajeRegistro', '');
        modo = 'registro';
        confirmar('Incidencia registrada', resultado.mensaje + ' Código: ' + codigo(resultado.datos.id));
        // CONTADOR
    } catch (error) {
        mensaje('mensajeRegistro', error.message, true);
    } finally { boton.disabled = false; }
};

api('salud').catch(function() {});
