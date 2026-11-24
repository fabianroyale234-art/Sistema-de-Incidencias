<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Datos de conexión de XAMPP (cambiar si MySQL usa otra clave o puerto).
$servidor = '127.0.0.1';
$puerto = '3306';
$base = 'zypher';
$usuario = 'root';
$clave = '';

function responder($codigo, $mensaje, $datos = null) {
    http_response_code($codigo);
    echo json_encode(['mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

function registrarMovimiento($conexion, $id, $accion, $detalle) {
    $consulta = $conexion->prepare('INSERT INTO historial (incidencia_id, accion, detalle) VALUES (?, ?, ?)');
    $consulta->execute([$id, $accion, $detalle]);
}

function texto($datos, $campo) {
    return isset($datos[$campo]) && is_string($datos[$campo]) ? trim($datos[$campo]) : '';
}

$accion = $_GET['accion'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];
$permitidas = ['salud' => 'GET', 'registrar' => 'POST'];
if (!is_string($accion) || !isset($permitidas[$accion])) responder(404, 'Operación no encontrada.');
if ($metodo !== $permitidas[$accion]) responder(405, 'Método no permitido.');
$datos = [];
if ($metodo === 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) responder(400, 'Los datos enviados no son válidos.');
}

try {
    $conexion = new PDO("mysql:host=$servidor;port=$puerto;dbname=$base;charset=utf8mb4", $usuario, $clave);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conexion->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    if ($accion === 'salud') responder(200, 'API conectada.');
    if ($accion === 'registrar') {
        $tipo = texto($datos, 'tipo');
        $lugar = texto($datos, 'lugar');
        $fecha = texto($datos, 'fecha');
        $descripcion = texto($datos, 'descripcion');
        $tipos = ['Equipos', 'Redes y conectividad', 'Software institucional', 'Infraestructura', 'Otros'];
        if (!in_array($tipo, $tipos) || $lugar === '' || $descripcion === '') {
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
    responder(404, 'Operación no encontrada.');
} catch (Throwable $error) {
    error_log($error->getMessage());
    responder(500, 'No se pudo completar la operación. Verifica que MySQL esté activo y que la base de datos esté configurada.');
}
