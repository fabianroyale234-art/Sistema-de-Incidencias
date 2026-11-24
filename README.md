# ZYPHER - Gestión de incidencias institucionales
IESP Simón Bolívar | Sesión 11: Construcción e integración del MVP

## Ejecutar en XAMPP
1. Descomprime los archivos en `C:\xampp\htdocs\zypher` (los archivos deben quedar directamente en esa carpeta).
2. Enciende Apache y MySQL en XAMPP. En `http://localhost/phpmyadmin` importa `base_datos.sql` una sola vez.
3. Si MySQL tiene contraseña o usa otro puerto, cambia `$clave` o `$puerto` al inicio de `api.php`. No publiques credenciales reales en GitHub. La configuración inicial es local, no de producción.
4. Abre `http://localhost/zypher/`. Si Apache usa otro puerto, inclúyelo en la dirección. No uses Live Server ni abras el HTML directamente.

## Alcance (páginas 9-10, 29 del PDF)
| Funcionalidad | Prioridad | Alcance |
|---|---|---|
| Registrar incidencia | MUST | Incluida |
| Consultar incidencia | MUST | Incluida |
| Asignar responsable | MUST | Incluida |
| Actualizar estado | MUST | Incluida (incluye solución y cierre básico) |
| Historial detallado y tiempo de atención | SHOULD / COULD | Complementaria |

La interfaz recupera la barra lateral, tarjetas, cabecera y formulario del prototipo original. Las ocho opciones son funcionales; no se incluyen etiquetas académicas ni paneles simulados.

No se incluye autenticación, permisos por cuenta, notificaciones ni reportes. Los responsables son datos de demostración del prototipo, no usuarios autenticados. El cierre impide nuevas modificaciones desde la API. Es un MVP local de un solo operador, no un sistema listo para producción. Se empieza sin incidencias; no se migran los datos de LocalStorage. Si ya importaste la versión anterior de MySQL, vuelve a importar base_datos.sql: agrega la tabla historial sin borrar registros. El historial anterior a esta actualización no se puede reconstruir automáticamente.

## Arquitectura y contrato (páginas 11-19)
`index.html` y `estilos.css` → `app.js` (fetch) → `api.php` (PHP) → MySQL (`base_datos.sql`) → respuesta JSON → pantalla.

| Método y acción en api.php?accion= | Datos enviados | Respuesta correcta |
|---|---|---|
| POST registrar | tipo, lugar, fecha (AAAA-MM-DD), descripcion | 201, datos.id |
| GET listar | buscar, estado (opcionales en URL) | 200, arreglo |
| GET detalle | id (en URL) | 200, objeto |
| GET responsables | ninguno | 200, arreglo |
| POST asignar | id, responsable_id (enteros) | 200 |
| POST estado | id, estado, solucion (para Resuelta) | 200 |
| GET historial | id (en URL) | 200, arreglo |
| GET tiempo | id (en URL) | 200, minutos o null |
| GET salud | ninguno | 200 |

Cada respuesta contiene `mensaje` y `datos` (objeto, arreglo o null). Ejemplo de registro: `{"tipo":"Equipos","lugar":"Lab 2","fecha":"2026-11-24","descripcion":"Monitor sin señal"}`. Respuesta: `{"mensaje":"Incidencia registrada correctamente.","datos":{"id":1}}`.
Los errores son 400 (datos inválidos), 404 (no existe), 405 (método incorrecto) y 500 (problema de servidor). Se muestran mensajes en pantalla. Una búsqueda sin coincidencias devuelve 200 con arreglo vacío.

## Avances y evidencias (páginas 20-22, 30-31)
Completar con el integrante real, estado y enlace/hash de su commit después de revisar y probar el aporte. No son commits realizados.

| Incremento | Responsable propuesto | Estado de aporte en GitHub | Evidencia |
|---|---|---|---|
| 1 Registro y BD | Integrante 1 | Pendiente | — |
| 2 Consulta | Integrante 2 | Pendiente | — |
| 3 Asignación | Integrante 3 | Pendiente | — |
| 4 Estado | Integrante 4 | Pendiente | — |
| 5 Búsqueda y filtro | Integrante 5 | Pendiente | — |
| 6 Solución y cierre | Integrante 6 | Pendiente | — |
| 7 Historial, tiempo de atención y comprobación | Integrante 7 | Pendiente | — |

## Incidencias técnicas y cambios (páginas 23-27)
Problemas observados en el HTML original y correcciones implementadas; verificar en XAMPP antes de marcar como resueltos en GitHub.

| ID | Funcionalidad y problema | Prioridad | Corrección | Estado de verificación | Commit |
|---|---|---|---|---|---|
| TEC-01 | Registro: API simulada y datos locales | Alta | PHP + MySQL, respuesta HTTP real | Pendiente en XAMPP | — |
| TEC-02 | Consulta: pantalla de prueba sin detalle real | Alta | SELECT, listado y detalle | Pendiente en XAMPP | — |
| TEC-03 | Asignación y estado: pantallas sin formularios operativos | Alta | Formularios y UPDATE | Pendiente en XAMPP | — |
| TEC-04 | Diseño mezclado con HTML | Media | CSS propio independiente | Pendiente en XAMPP | — |

Cambios necesarios: separar estilos, integrar API y BD, validar datos. Ideas para después: autenticación y reportes.

## Comprobación antes de entregar (página 28)
Sintaxis PHP y JavaScript verificada en los siete incrementos. La interfaz se comprobó en Chromium con respuestas simuladas de fetch (registro, detalle, asignación, estado, solución, cierre, historial, tiempo y envío de búsqueda; pantalla estrecha sin desborde). No se probó la API nueva por HTTP real debido al bloqueo de navegación local; se verificó la sintaxis PHP. La prueba final de operaciones y persistencia con MySQL de XAMPP sigue pendiente: el entorno de preparación no dispone del servidor ni del controlador PDO MySQL.
- Registrar una incidencia y verificar el código y la fila en phpMyAdmin.
- Recargar el navegador: el dato debe permanecer.
- Buscar por código y texto; filtrar por estado; verificar un resultado vacío.
- Abrir detalle y asignar responsable; comprobar que aparezca en la lista.
- Cambiar a En atención. Abrir Registrar solución; luego abrir Cerrar incidencia.
- Confirmar que una incidencia cerrada no admite cambios.
- Enviar campos inválidos y consultar `api.php?accion=detalle&id=999999` (si no existe, 404).
- Detener MySQL temporalmente: debe mostrarse un error comprensible, no una confirmación falsa. Volver a iniciarlo.
- Probar pantalla estrecha y revisar Network en el navegador (solicitudes a api.php).
- Registrar los resultados reales, las incidencias que aparezcan y los hashes de commits.

GitHub Pages no ejecuta PHP ni MySQL. Para demostrar la API se usa XAMPP. No se necesita API/token de GitHub.

## Vista recuperada
Se conserva la estructura visual del primer HTML (menú lateral, cabecera, tarjetas, barra de estado y formulario centrado), con CSS propio. No se reproducen los botones de demostración ni permisos ficticios. Los ocho accesos están activos en el último incremento; los cuatro principales siguen siendo el núcleo MVP.
