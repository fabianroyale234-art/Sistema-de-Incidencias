<?php
// Configuración local de MySQL. No subir contraseñas reales a GitHub.
function conectar() {
    $servidor = '127.0.0.1';
    $puerto = '3306';
    $base = 'zypher';
    $usuario = 'root';
    $clave = '';
    $conexion = new PDO("mysql:host=$servidor;port=$puerto;dbname=$base;charset=utf8mb4", $usuario, $clave);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conexion->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Hora local de Perú para los movimientos registrados.
    $conexion->exec("SET time_zone = '-05:00'");
    return $conexion;
}
