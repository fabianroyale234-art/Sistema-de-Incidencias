<?php
// Reglas del sistema y consultas SQL. Se ejecutan desde la API.
function registrarMovimiento($conexion, $id, $accion, $detalle) {
    $consulta = $conexion->prepare('INSERT INTO historial (incidencia_id, accion, detalle) VALUES (?, ?, ?)');
    $consulta->execute([$id, $accion, $detalle]);
}

function texto($datos, $campo) {
    return isset($datos[$campo]) && is_string($datos[$campo]) ? trim($datos[$campo]) : '';
}

function procesarIncidencias($conexion, $accion, $datos) {
    if ($accion === 'salud') {
        // Comprobar la conexión y el esquema antes de afirmar que está operativo.
        $conexion->query('SELECT id, nombre, area FROM responsables LIMIT 0');
        $conexion->query('SELECT id, tipo, lugar, fecha, descripcion, estado, responsable_id, solucion FROM incidencias LIMIT 0');
        $conexion->query('SELECT id, incidencia_id, fecha, accion, detalle FROM historial LIMIT 0');
        responder(200, 'API y base de datos conectadas.');
    }
    if ($accion === 'registrar') {
        $tipo = texto($datos, 'tipo');
        $lugar = texto($datos, 'lugar');
        $fecha = texto($datos, 'fecha');
        $descripcion = texto($datos, 'descripcion');
        $tipos = ['Equipos', 'Redes y conectividad', 'Software institucional', 'Infraestructura', 'Otros'];
        if (!in_array($tipo, $tipos, true) || $lugar === '' || $descripcion === '') {
            responder(400, 'Completa los campos obligatorios.');
        }
        $dia = strpos($fecha, chr(0)) === false ? DateTime::createFromFormat('!Y-m-d', $fecha) : false;
        if (!$dia || $dia->format('Y-m-d') !== $fecha || $fecha < '1000-01-01' || $fecha > '9999-12-31') {
            responder(400, 'Ingresa una fecha válida.');
        }
        if (preg_match_all('/./us', $lugar) > 100 || preg_match_all('/./us', $descripcion) > 500) {
            responder(400, 'El lugar o la descripción exceden el límite permitido.');
        }
        $conexion->beginTransaction();
        $consulta = $conexion->prepare('INSERT INTO incidencias (tipo, lugar, fecha, descripcion) VALUES (?, ?, ?, ?)');
        $consulta->execute([$tipo, $lugar, $fecha, $descripcion]);
        $id = (int) $conexion->lastInsertId();
        registrarMovimiento($conexion, $id, 'Registro', 'Incidencia registrada');
        $conexion->commit();
        responder(201, 'Incidencia registrada correctamente.', ['id' => $id]);
    }
    $sql = 'SELECT i.*, r.nombre AS responsable FROM incidencias i LEFT JOIN responsables r ON i.responsable_id = r.id';
    if ($accion === 'listar') {
        $buscar = texto($_GET, 'buscar');
        $estado = texto($_GET, 'estado');
        $sql .= ' WHERE 1 = 1';
        $parametros = [];
        if ($buscar !== '') {
            if (preg_match('/^INC-(\d+)$/i', $buscar, $partes)) {
                $sql .= ' AND i.id = ?';
                $parametros[] = (int) $partes[1];
            } else {
                $sql .= ' AND (i.tipo LIKE ? OR i.lugar LIKE ? OR i.descripcion LIKE ?)';
                $palabra = '%' . $buscar . '%';
                $parametros = [$palabra, $palabra, $palabra];
            }
        }
        if ($estado !== '') {
            if (!in_array($estado, ['Pendiente', 'En atención', 'Resuelta', 'Cerrada'])) responder(400, 'Estado inválido.');
            $sql .= ' AND i.estado = ?';
            $parametros[] = $estado;
        }
        $consulta = $conexion->prepare($sql . ' ORDER BY i.id DESC');
        $consulta->execute($parametros);
        responder(200, 'Consulta realizada.', $consulta->fetchAll());
    }
    if ($accion === 'detalle') {
        $id = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT);
        if (!$id || $id < 1) responder(400, 'Código inválido.');
        $consulta = $conexion->prepare($sql . ' WHERE i.id = ?');
        $consulta->execute([$id]);
        $incidencia = $consulta->fetch();
        if (!$incidencia) responder(404, 'Incidencia no encontrada.');
        responder(200, 'Incidencia encontrada.', $incidencia);
    }
    if ($accion === 'historial' || $accion === 'tiempo') {
        $id = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT);
        if (!$id || $id < 1) responder(400, 'Código inválido.');
        $consulta = $conexion->prepare('SELECT estado FROM incidencias WHERE id = ?');
        $consulta->execute([$id]);
        $incidencia = $consulta->fetch();
        if (!$incidencia) responder(404, 'Incidencia no encontrada.');
        $consulta = $conexion->prepare('SELECT fecha, accion, detalle FROM historial WHERE incidencia_id = ? ORDER BY id');
        $consulta->execute([$id]);
        $movimientos = $consulta->fetchAll();
        if ($accion === 'historial') responder(200, 'Historial consultado.', $movimientos);
        $registro = null;
        $asignacion = null;
        $solucion = null;
        $cierre = null;
        foreach ($movimientos as $movimiento) {
            if ($movimiento['accion'] === 'Registro') $registro = $movimiento['fecha'];
            if ($movimiento['accion'] === 'Asignación') $asignacion = $movimiento['fecha'];
            if ($movimiento['accion'] === 'Estado') {
                if (in_array($movimiento['detalle'], ['Pendiente', 'En atención'])) $solucion = null;
                if ($movimiento['detalle'] === 'Resuelta') $solucion = $movimiento['fecha'];
                if ($movimiento['detalle'] === 'Cerrada') $cierre = $movimiento['fecha'];
            }
        }
        $minutos = null;
        $minutosCierre = null;
        if ($registro && $solucion && in_array($incidencia['estado'], ['Resuelta', 'Cerrada'])) {
            $minutos = (int) floor(max(0, strtotime($solucion) - strtotime($registro)) / 60);
        }
        if ($registro && $cierre && $incidencia['estado'] === 'Cerrada') {
            $minutosCierre = (int) floor(max(0, strtotime($cierre) - strtotime($registro)) / 60);
        }
        responder(200, 'Tiempo consultado.', ['minutos' => $minutos, 'registro' => $registro, 'asignacion' => $asignacion, 'solucion' => $solucion, 'cierre' => $cierre, 'minutos_cierre' => $minutosCierre]);
    }
    if ($accion === 'responsables') {
        $consulta = $conexion->query('SELECT id, nombre, area FROM responsables ORDER BY nombre');
        responder(200, 'Personal disponible.', $consulta->fetchAll());
    }
    if (in_array($accion, ['asignar', 'estado', 'solucion', 'cerrar'], true)) {
        $id = filter_var($datos['id'] ?? '', FILTER_VALIDATE_INT);
        if (!$id || $id < 1) responder(400, 'Código inválido.');
        $conexion->beginTransaction();
        $consulta = $conexion->prepare('SELECT * FROM incidencias WHERE id = ? FOR UPDATE');
        $consulta->execute([$id]);
        $incidencia = $consulta->fetch();
        if (!$incidencia) responder(404, 'Incidencia no encontrada.');
        if ($incidencia['estado'] === 'Cerrada') responder(400, 'La incidencia está cerrada y no admite cambios.');
        if ($accion === 'asignar' && $incidencia['estado'] === 'Resuelta') responder(400, 'La incidencia ya está resuelta.');
    }
    if ($accion === 'asignar') {
        $responsable = filter_var($datos['responsable_id'] ?? '', FILTER_VALIDATE_INT);
        if (!$responsable || $responsable < 1) responder(400, 'Selecciona un responsable.');
        $consulta = $conexion->prepare('SELECT nombre FROM responsables WHERE id = ?');
        $consulta->execute([$responsable]);
        $persona = $consulta->fetch();
        if (!$persona) responder(404, 'Responsable no encontrado.');
        if ((int) $incidencia['responsable_id'] === $responsable) responder(400, 'Ese responsable ya está asignado.');
        $consulta = $conexion->prepare("UPDATE incidencias SET responsable_id = ? WHERE id = ? AND estado <> 'Cerrada'");
        $consulta->execute([$responsable, $id]);
        registrarMovimiento($conexion, $id, 'Asignación', $persona['nombre']);
        $conexion->commit();
        responder(200, 'Responsable asignado correctamente.');
    }
    if (in_array($accion, ['estado', 'solucion', 'cerrar'], true)) {
        // Cada formulario tiene una acción específica de API.
        $estado = texto($datos, 'estado');
        if ($accion === 'solucion') $estado = 'Resuelta';
        if ($accion === 'cerrar') $estado = 'Cerrada';
        if ($accion === 'estado' && !in_array($estado, ['Pendiente', 'En atención'], true)) {
            responder(400, 'Usa Registrar solución o Cerrar incidencia para ese estado.');
        }
        $observacion = texto($datos, 'observacion');
        if (preg_match_all('/./us', $observacion) > 80) responder(400, 'La observación no puede superar 80 caracteres.');
        $estados = ['Pendiente', 'En atención', 'Resuelta', 'Cerrada'];
        if (!in_array($estado, $estados, true)) responder(400, 'Selecciona un estado válido.');
        if ($estado === $incidencia['estado']) responder(400, 'La incidencia ya tiene ese estado.');
        if ($incidencia['estado'] === 'Resuelta' && $estado !== 'Cerrada') responder(400, 'La incidencia ya está resuelta.');
        if (!$incidencia['responsable_id']) {
            responder(400, 'Primero asigna un responsable.');
        }
        $solucion = texto($datos, 'solucion');
        if ($estado === 'Resuelta' && ($solucion === '' || preg_match_all('/./us', $solucion) > 500)) {
            responder(400, 'Describe la solución aplicada (máximo 500 caracteres).');
        }
        if ($estado === 'Cerrada') {
            if ($incidencia['estado'] !== 'Resuelta' || $incidencia['solucion'] === '') {
                responder(400, 'Primero registra la solución y guarda el estado Resuelta.');
            }
            $solucion = $incidencia['solucion'];
        }
        if ($estado === 'Pendiente' || $estado === 'En atención') $solucion = '';
        $consulta = $conexion->prepare("UPDATE incidencias SET estado = ?, solucion = ? WHERE id = ? AND estado <> 'Cerrada'");
        $consulta->execute([$estado, $solucion, $id]);
        registrarMovimiento($conexion, $id, 'Estado', $estado);
        if ($observacion !== '') registrarMovimiento($conexion, $id, 'Observación', $observacion);
        $conexion->commit();
        if ($accion === 'solucion') responder(200, 'Solución registrada correctamente.');
        if ($accion === 'cerrar') responder(200, 'Incidencia cerrada correctamente.');
        responder(200, 'Estado actualizado correctamente.');
    }
    responder(404, 'Operación no encontrada.');
}
