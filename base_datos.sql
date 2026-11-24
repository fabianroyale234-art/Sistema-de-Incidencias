CREATE DATABASE IF NOT EXISTS zypher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zypher;

CREATE TABLE IF NOT EXISTS responsables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    area VARCHAR(80) NOT NULL
);

INSERT IGNORE INTO responsables (id, nombre, area) VALUES
(1, 'Carlos Mendoza', 'Equipos'),
(2, 'Laura Ramos', 'Redes y conectividad'),
(3, 'Jorge Quispe', 'Infraestructura'),
(4, 'Sofía Vega', 'Software institucional');

CREATE TABLE IF NOT EXISTS incidencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    lugar VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    responsable_id INT NULL,
    solucion VARCHAR(500) NOT NULL DEFAULT '',
    FOREIGN KEY (responsable_id) REFERENCES responsables(id)
);

CREATE TABLE IF NOT EXISTS historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incidencia_id INT NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(30) NOT NULL,
    detalle VARCHAR(100) NOT NULL,
    FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
);
