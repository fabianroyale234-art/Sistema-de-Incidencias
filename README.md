# ZYPHER | Sistema de gestión de incidencias institucionales
IESP Simón Bolívar · Aplicaciones con Enfoque Tecnológico · Sesión 11

## 1. Instalación local (XAMPP)
1. Copiar la carpeta del proyecto a `C:\xampp\htdocs\zypher`. `index.html` debe quedar directamente dentro de `zypher`.
2. Encender Apache y MySQL. Si Apache usa 8080, abrir `http://localhost:8080/phpmyadmin/`; con puerto 80, omitir `:8080`.
3. En Importar, seleccionar `database/base_datos.sql`. Crea la BD `zypher` y tres tablas sin borrar registros. Si ya tienes la BD de la versión anterior, exporta una copia primero; la estructura de columnas es compatible. `CREATE TABLE IF NOT EXISTS` no repara tablas que se hayan modificado manualmente.
4. Revisar `backend/conexion.php`: servidor `127.0.0.1`, puerto MySQL `3306`, BD `zypher`, usuario `root`, clave vacía por defecto de XAMPP. Cambiar solo si tu instalación lo requiere. No compartir claves reales.
5. Probar `http://localhost:8080/zypher/api/incidencias.php?accion=salud`. Debe devolver HTTP 200 y un JSON con el mensaje «API y base de datos conectadas».
6. Abrir `http://localhost:8080/zypher/`. No usar Live Server ni abrir el HTML directamente. Apache ejecuta PHP; MySQL almacena datos. GitHub Pages no ejecuta PHP/MySQL.

## 2. Alcance y arquitectura (PDF pp. 9–17, 29)
Cuatro funcionalidades MUST: registrar, consultar, asignar y actualizar estado. Solución y cierre completan el flujo de estado; historial y tiempo de atención son complementarios ya existentes. Fuera de alcance: autenticación, permisos por cuenta, notificaciones y reportes avanzados. Personal de ejemplo; MVP local, no destinado a producción.

`index.html` + `css/estilos.css` → `js/app.js` (fetch HTTP/JSON) → `api/incidencias.php` (método, acción, respuesta) → `backend/incidencias.php` (reglas, consultas) → `backend/conexion.php` (PDO MySQL) → BD `zypher` → respuesta JSON → interfaz.

| Archivo | Responsabilidad |
|---|---|
| index.html | Pantallas y formularios, sin estilos embebidos |
| css/estilos.css | Diseño y adaptación móvil |
| js/app.js | Navegación, formularios, llamadas fetch, mensajes |
| api/incidencias.php | Entrada HTTP, validación de método/JSON, códigos de respuesta |
| backend/conexion.php | Configuración y conexión a MySQL |
| backend/incidencias.php | Validación de datos, reglas, SELECT/INSERT/UPDATE, historial |
| database/base_datos.sql | Tablas, claves y responsables de ejemplo |
| docs/MVP.md | Contrato API, alcance, registro de avances, incidencias y pruebas |
| docs/pruebas_api.ps1 | Prueba de integración opcional en Windows |

## 3. Demostración
Registrar → consultar → asignar → cambiar a En atención → registrar solución → cerrar → revisar historial y tiempos. El mismo código INC-0001 (o el que genere la BD) identifica la incidencia durante toda la demostración. La API valida datos, las consultas preparadas separan datos de SQL y las transacciones mantienen juntas la operación y su movimiento. Las incidencias cerradas no admiten cambios. El tiempo se calcula desde los movimientos reales; los registros sin historial previo pueden no tener duración calculable.

Ver [documentación y pruebas](docs/MVP.md). Completar nombres, resultados y evidencias reales del equipo antes de entregar. Los parches de actualización son propuestas de trabajo; no son commits del equipo.
