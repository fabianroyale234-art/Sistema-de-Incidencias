// Navegación y comunicación con la API del sistema.
function elemento(id) { return document.getElementById(id); }
let vistaActual = 'flujo';
let modo = 'registro';
let incidencias = [];
let carga = 0;
const nombres = {flujo: 'Flujo principal del sistema', registro: 'Registrar incidencia', consulta: 'Consultar incidencia', asignar: 'Asignar responsable', estado: 'Actualizar estado', historial: 'Consultar historial', solucion: 'Registrar solución', cerrar: 'Cerrar incidencia', tiempo: 'Consultar tiempo de atención', confirmacion: 'Confirmación'};

function estadoApi(texto, clase, detalle) {
    elemento('conexion').textContent = texto;
    elemento('conexion').className = clase;
    elemento('ultimaApi').textContent = detalle;
}
async function api(accion, datos = null) {
    const metodo = datos === null ? 'GET' : 'POST';
    let opciones = {method: metodo, cache: 'no-store'};
    if (datos !== null) {
        opciones.headers = {'Content-Type': 'application/json'};
        opciones.body = JSON.stringify(datos);
    }
    let respuesta, resultado;
    try {
        respuesta = await fetch('api/incidencias.php?accion=' + accion, opciones);
        resultado = await respuesta.json();
    } catch (error) {
        estadoApi('API sin conexión', 'error', 'No se recibió una respuesta válida');
        throw new Error('Verifica Apache y abre el sistema desde localhost.');
    }
    estadoApi(!respuesta.ok ? 'API: revisar respuesta' : 'API conectada', !respuesta.ok ? 'error' : 'correcto', metodo + ' api/incidencias.php?accion=' + accion.split('&')[0] + ' → ' + respuesta.status);
    if (!respuesta.ok) throw new Error(resultado.mensaje || 'No se pudo completar la operación.');
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
    if (!elemento(vista)) return;
    carga++;
    modo = vista;
    mostrar(vista, nombres[vista], vista);
    if (vista === 'consulta') {
        if (!conservarBusqueda && elemento('formBuscar')) elemento('formBuscar').reset();
        cargarLista();
    } else if (elemento('elegir-' + vista)) {
        cargarModulo(vista);
    }
}
for (const boton of document.querySelectorAll('[data-vista]')) {
    boton.onclick = function() { abrir(boton.dataset.vista); };
}
elemento('atras').onclick = function() {
    if (vistaActual === 'detalle') abrir('consulta');
    else if (vistaActual === 'confirmacion') abrir(modo);
    else abrir('flujo');
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
    const turno = carga;
    try {
        const datos = Object.fromEntries(new FormData(formulario));
        const resultado = await api('registrar', datos);
        formulario.reset();
        formulario.elements.fecha.value = fechaHoy();
        mensaje('mensajeRegistro', '');
        if (turno === carga && vistaActual === 'registro') {
            modo = 'registro';
            confirmar('Incidencia registrada', resultado.mensaje + ' Código: ' + codigo(resultado.datos.id));
        }
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
    const turno = ++carga;
    elemento('filas').textContent = '';
    mensaje('mensajeLista', 'Cargando incidencias...');
    try {
        let ruta = 'listar';
        if (elemento('buscar')) ruta += '&buscar=' + encodeURIComponent(elemento('buscar').value.trim()) + '&estado=' + encodeURIComponent(elemento('filtroEstado').value);
        const resultado = await api(ruta);
        if (turno !== carga || vistaActual !== 'consulta') return;
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
            boton.textContent = 'Ver detalle';
            boton.onclick = function() { verDetalle(incidencia.id); };
            fila.insertCell().appendChild(boton);
        }
        mensaje('mensajeLista', resultado.datos.length ? resultado.datos.length + ' incidencia(s) encontrada(s).' : 'No hay incidencias que mostrar.');
    } catch (error) { if (turno === carga) mensaje('mensajeLista', error.message, true); }
}
async function verDetalle(id) {
    const turno = ++carga;
    try {
        const resultado = await api('detalle&id=' + id);
        if (turno !== carga || vistaActual !== 'consulta') return;
        const i = resultado.datos;
        elemento('codigoDetalle').textContent = codigo(id);
        const dl = elemento('datosDetalle');
        dl.textContent = '';
        for (const par of [['Tipo',i.tipo], ['Lugar',i.lugar], ['Fecha',i.fecha], ['Descripción',i.descripcion], ['Estado',i.estado], ['Responsable',i.responsable || 'Sin asignar'], ['Solución',i.solucion || 'Sin registrar']]) {
            const dt = document.createElement('dt'); dt.textContent = par[0]; dl.appendChild(dt);
            const dd = document.createElement('dd'); dd.textContent = par[1]; dl.appendChild(dd);
        }
        mostrar('detalle', 'Detalle de incidencia', 'consulta');
    } catch (error) { if (turno === carga) mensaje('mensajeLista', error.message, true); }
}
elemento('recargar').onclick = cargarLista;
elemento('formBuscar').onsubmit = function(evento) { evento.preventDefault(); cargarLista(); };
elemento('limpiar').onclick = function() { elemento('formBuscar').reset(); cargarLista(); };
elemento('busquedaGlobal').onsubmit = function(evento) {
    evento.preventDefault();
    elemento('buscar').value = elemento('buscarGlobal').value;
    elemento('filtroEstado').value = '';
    abrir('consulta', true);
};
// Cada módulo tiene su propio selector y su propio contenido.
function poner(id, texto) { elemento(id).textContent = texto || '—'; }
function apta(vista, i) {
    if (vista === 'asignar') return ['Pendiente','En atención'].includes(i.estado);
    if (vista === 'estado' || vista === 'solucion') return i.responsable_id && ['Pendiente','En atención'].includes(i.estado);
    if (vista === 'cerrar') return i.estado === 'Resuelta' && i.solucion;
    return true;
}
const mensajesVacios = {
    asignar:'No hay incidencias pendientes o en atención para asignar.',
    estado:'No hay incidencias abiertas con responsable asignado.',
    solucion:'Asigna primero un responsable a una incidencia abierta.',
    cerrar:'No hay incidencias resueltas para cerrar.',
    historial:'Todavía no hay incidencias registradas.',
    tiempo:'Todavía no hay incidencias registradas.'
};
function habilitar(vista, habilitado) {
    const campos = elemento('campos-' + vista);
    if (campos) campos.disabled = !habilitado;
}
async function cargarModulo(vista) {
    const turno = ++carga;
    const combo = elemento('elegir-' + vista);
    combo.innerHTML = '<option value="">Cargando incidencias…</option>';
    combo.disabled = true;
    habilitar(vista, false);
    limpiarModulo(vista);
    mensaje('mensaje-' + vista, '');
    try {
        const resultado = await api('listar');
        if (turno !== carga || vistaActual !== vista) return;
        incidencias = resultado.datos.filter(i => apta(vista, i));
        combo.textContent = '';
        if (!incidencias.length) {
            const opcion = document.createElement('option'); opcion.textContent = 'No hay incidencias disponibles'; opcion.value = ''; combo.appendChild(opcion);
            mensaje('mensaje-' + vista, mensajesVacios[vista]);
            return;
        }
        for (const i of incidencias) {
            const opcion = document.createElement('option'); opcion.value = i.id; opcion.textContent = codigo(i.id) + ' · ' + i.tipo + ' · ' + i.lugar; combo.appendChild(opcion);
        }
        combo.disabled = false;
        await cargarSeleccion(vista);
    } catch (error) { if (turno === carga && vistaActual === vista) mensaje('mensaje-' + vista, error.message, true); }
}
function limpiarModulo(vista) {
    const panel = elemento(vista);
    for (const campo of panel.querySelectorAll('.dato strong')) campo.textContent = '—';
    for (const formulario of panel.querySelectorAll('form')) formulario.reset();
    if (vista === 'historial') { elemento('movimientos').textContent = ''; elemento('sinMovimientos').textContent = 'Selecciona una incidencia para ver su historial.'; elemento('sinMovimientos').hidden = false; }
    if (vista === 'tiempo') { poner('tiempoResultado', '—'); poner('tiempoNota', 'Selecciona una incidencia.'); }
}
async function cargarSeleccion(vista) {
    const turno = ++carga;
    const id = elemento('elegir-' + vista).value;
    habilitar(vista, false);
    limpiarModulo(vista);
    mensaje('mensaje-' + vista, '');
    if (!id) return;
    try {
        const resultado = await api('detalle&id=' + id);
        if (turno !== carga || vistaActual !== vista) return;
        const i = resultado.datos;
        if (!apta(vista, i)) { mensaje('mensaje-' + vista, 'La incidencia ya no está disponible para esta operación. Vuelve a abrir el módulo.', true); return; }
        await completar(vista, i, turno);
        if (turno === carga && vistaActual === vista) habilitar(vista, true);
    } catch (error) { if (turno === carga && vistaActual === vista) mensaje('mensaje-' + vista, error.message, true); }
}
for (const combo of document.querySelectorAll('[id^="elegir-"]')) {
    combo.onchange = function() { cargarSeleccion(combo.id.substring(7)); };
}
async function guardar(evento, vista, accion, datos, titulo) {
    evento.preventDefault();
    const combo = elemento('elegir-' + vista);
    const id = combo.value;
    if (!id) return;
    const turno = carga;
    combo.disabled = true;
    datos.id = Number(id);
    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const resultado = await api(accion, datos);
        if (turno === carga && vistaActual === vista) confirmar(titulo, resultado.mensaje + ' Código: ' + codigo(id));
    } catch (error) { if (turno === carga && vistaActual === vista) mensaje('mensaje-' + vista, error.message, true); }
    finally { boton.disabled = false; if (turno === carga) combo.disabled = false; }
}
async function completar(vista, i, turno) {
    if (vista === 'asignar') {
        poner('asignarLugar', i.lugar);
        poner('asignarActual', i.responsable || 'Sin asignar');
        poner('asignarProblema', i.descripcion);
        const resultado = await api('responsables');
        if (turno !== carga || vistaActual !== vista) return;
        const combo = elemento('responsable');
        combo.innerHTML = '<option value="">Seleccione un responsable</option>';
        for (const persona of resultado.datos) {
            const opcion = document.createElement('option'); opcion.value = persona.id; opcion.textContent = persona.nombre + ' - ' + persona.area; combo.appendChild(opcion);
        }
        combo.value = i.responsable_id || '';
    }
    if (vista === 'estado') {
        poner('estadoActual', i.estado); poner('estadoResponsable', i.responsable); poner('estadoProblema', i.descripcion);
        elemento('estadoNuevo').value = i.estado === 'Pendiente' ? 'En atención' : 'Pendiente';
    }
    if (vista === 'solucion') {
        poner('solucionResponsable', i.responsable); poner('solucionEstado', i.estado); poner('solucionProblema', i.descripcion);
    }
    if (vista === 'cerrar') {
        poner('cerrarResponsable', i.responsable); poner('cerrarEstado', i.estado); poner('cerrarSolucion', i.solucion);
    }
    if (vista === 'historial') {
        poner('historialEstado', i.estado); poner('historialResponsable', i.responsable || 'Sin asignar');
        const resultado = await api('historial&id=' + i.id);
        if (turno !== carga || vistaActual !== vista) return;
        const lista = elemento('movimientos'); lista.textContent = '';
        elemento('sinMovimientos').hidden = resultado.datos.length > 0;
        elemento('sinMovimientos').textContent = 'No hay movimientos registrados para esta incidencia.';
        for (const movimiento of resultado.datos) {
            const li = document.createElement('li');
            const fecha = document.createElement('time'); fecha.textContent = movimiento.fecha; li.appendChild(fecha);
            const titulo = document.createElement('strong'); titulo.textContent = movimiento.accion; li.appendChild(titulo);
            const p = document.createElement('p'); p.textContent = movimiento.detalle; li.appendChild(p);
            lista.appendChild(li);
        }
    }
    if (vista === 'tiempo') {
        const resultado = await api('tiempo&id=' + i.id);
        if (turno !== carga || vistaActual !== vista) return;
        const t = resultado.datos;
        poner('tiempoResultado', duracion(t.minutos));
        poner('tiempoNota', t.minutos == null ? 'Aún no hay una solución o un registro de inicio válido.' : 'Duración registrada de la atención.');
        poner('tiempoRegistro', t.registro); poner('tiempoAsignacion', t.asignacion);
        poner('tiempoSolucion', t.solucion); poner('tiempoCierre', t.cierre);
        poner('tiempoTotalCierre', duracion(t.minutos_cierre));
    }
}
elemento('formAsignar').onsubmit = function(e) { guardar(e, 'asignar', 'asignar', {responsable_id:Number(elemento('responsable').value)}, 'Responsable asignado'); };
elemento('formEstado').onsubmit = function(e) { guardar(e, 'estado', 'estado', {estado:elemento('estadoNuevo').value, observacion:elemento('observacionEstado').value}, 'Estado actualizado'); };
elemento('formSolucion').onsubmit = function(e) { guardar(e, 'solucion', 'solucion', {solucion:elemento('solucionTexto').value}, 'Solución registrada'); };
elemento('formCerrar').onsubmit = function(e) { guardar(e, 'cerrar', 'cerrar', {observacion:elemento('observacionCierre').value}, 'Incidencia cerrada'); };
function duracion(minutos) { return minutos == null ? 'Sin calcular' : Math.floor(minutos / 60) + ' h ' + minutos % 60 + ' min'; }

async function iniciar() {
    try {
        await api('salud');
        await contador();
    } catch (error) {
        elemento('contador').textContent = 'Sin datos disponibles';
    }
}
iniciar();
