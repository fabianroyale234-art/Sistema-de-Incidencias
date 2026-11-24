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
function abrir(vista, conservarBusqueda = false) {
    if (vista === 'flujo' || vista === 'registro') {
        mostrar(vista, nombres[vista], vista);
        return;
    }
    modo = vista;
    seleccion = null;
    elemento('tituloLista').textContent = nombres[vista];
    elemento('descripcionLista').textContent = vista === 'consulta' ? 'Revisa el listado y el detalle de las incidencias.' : 'Selecciona una incidencia para continuar.';
    if (!conservarBusqueda) elemento('formBuscar').reset();
    mostrar('consulta', nombres[vista], vista);
    cargarLista();
}
for (const boton of document.querySelectorAll('[data-vista]')) boton.onclick = function() { abrir(boton.dataset.vista); };
elemento('atras').onclick = function() {
    if (vistaActual === 'detalle') { abrir(modo); return; }
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
        await contador();
    } catch (error) {
        mensaje('mensajeRegistro', error.message, true);
    } finally { boton.disabled = false; }
};

async function contador() {
    try {
        const resultado = await api('listar');
        elemento('contador').textContent = resultado.datos.length + ' incidencias registradas';
    } catch (error) { elemento('contador').textContent = 'Sin datos disponibles'; }
}
async function cargarLista() {
    elemento('filas').textContent = '';
    mensaje('mensajeLista', 'Cargando incidencias...');
    const modoLista = modo;
    try {
        const buscar = encodeURIComponent(elemento('buscar').value.trim());
        const estado = encodeURIComponent(elemento('filtroEstado').value);
        const resultado = await api('listar&buscar=' + buscar + '&estado=' + estado);
        if (modo !== modoLista) return;
        elemento('filas').textContent = '';
        for (const incidencia of resultado.datos) {
            const fila = elemento('filas').insertRow();
            for (const valor of [codigo(incidencia.id), incidencia.tipo, incidencia.lugar]) fila.insertCell().textContent = valor;
            const etiqueta = document.createElement('span');
            const clases = {'Pendiente':'pendiente', 'En atención':'atencion', 'Resuelta':'resuelta'};
            etiqueta.className = 'estado ' + (clases[incidencia.estado] || '');
            etiqueta.textContent = incidencia.estado;
            fila.insertCell().appendChild(etiqueta);
            fila.insertCell().textContent = incidencia.responsable || 'Sin asignar';
            const boton = document.createElement('button');
            boton.className = 'boton secundario boton-tabla';
            boton.textContent = modoLista === 'consulta' ? 'Ver detalle' : 'Seleccionar';
            boton.onclick = function() { verDetalle(incidencia.id); };
            fila.insertCell().appendChild(boton);
        }
        mensaje('mensajeLista', resultado.datos.length ? resultado.datos.length + ' incidencia(s) encontrada(s).' : 'No hay incidencias que mostrar.');
    } catch (error) { mensaje('mensajeLista', error.message, true); }
}
async function verDetalle(id) {
    try {
        const modoDetalle = modo;
        const resultado = await api('detalle&id=' + id);
        if (modo !== modoDetalle || vistaActual !== 'consulta') return;
        seleccion = resultado.datos;
        elemento('tituloDetalle').textContent = (modo === 'consulta' ? 'Detalle de incidencia' : nombres[modo]) + ' · ' + codigo(id);
        for (const campo of ['tipo','lugar','fecha','descripcion','estado','responsable']) {
            elemento('detalle' + campo[0].toUpperCase() + campo.slice(1)).textContent = seleccion[campo] || 'Sin asignar';
        }
        mensaje('mensajeDetalle', '');
        mostrar('detalle', nombres[modo], modo);
        elemento('formAsignar').hidden = modo !== 'asignar' || seleccion.estado === 'Cerrada';
        if (!elemento('formAsignar').hidden) await cargarResponsables();
        elemento('formEstado').hidden = modo !== 'estado' || seleccion.estado === 'Cerrada';
        elemento('estado').value = seleccion.estado;
        if (!elemento('estado').value) elemento('estado').value = 'En atención';
        if (['asignar','estado','solucion','cerrar'].includes(modo) && seleccion.estado === 'Cerrada') mensaje('mensajeDetalle', 'La incidencia está cerrada y no admite cambios.');
    } catch (error) {
        mensaje(vistaActual === 'detalle' ? 'mensajeDetalle' : 'mensajeLista', error.message, true);
    }
}
elemento('recargar').onclick = cargarLista;
elemento('volverLista').onclick = function() { abrir(modo); };

async function cargarResponsables() {
    const resultado = await api('responsables');
    const combo = elemento('responsable');
    combo.innerHTML = '<option value="">Seleccione un responsable</option>';
    for (const persona of resultado.datos) {
        const opcion = document.createElement('option');
        opcion.value = persona.id;
        opcion.textContent = persona.nombre + ' - ' + persona.area;
        combo.appendChild(opcion);
    }
    combo.value = seleccion.responsable_id || '';
}
async function guardar(evento, accion, datos, titulo) {
    evento.preventDefault();
    if (!seleccion) return;
    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        datos.id = seleccion.id;
        const resultado = await api(accion, datos);
        confirmar(titulo, resultado.mensaje + ' Código: ' + codigo(datos.id));
    } catch (error) { mensaje('mensajeDetalle', error.message, true); }
    finally { boton.disabled = false; }
}
elemento('formAsignar').onsubmit = function(evento) {
    guardar(evento, 'asignar', {responsable_id: Number(elemento('responsable').value)}, 'Responsable asignado');
};

elemento('formEstado').onsubmit = function(evento) {
    guardar(evento, 'estado', {estado: elemento('estado').value}, 'Estado actualizado');
};

elemento('formBuscar').onsubmit = function(evento) { evento.preventDefault(); cargarLista(); };
elemento('limpiar').onclick = function() { elemento('formBuscar').reset(); cargarLista(); };
elemento('busquedaGlobal').onsubmit = function(evento) {
    evento.preventDefault();
    elemento('buscar').value = elemento('buscarGlobal').value;
    elemento('filtroEstado').value = '';
    abrir('consulta', true);
};

contador();
