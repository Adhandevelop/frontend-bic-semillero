# Incidencia: asientos duplicados y plano inconsistente

## Causa encontrada

El generador anterior comparaba `str(seat_number)` literalmente. Las sillas existentes `01` a `09` no coincidían con las nuevas etiquetas `1` a `9`; `10` sí coincidía. Al completar un bus de 40 plazas que ya tenía `01` a `10`, podía crear 39 registros en lugar de 30 y terminar con 49.

Además, si una posición natural estaba ocupada, el generador asignaba otra libre. Esto produce números como `1` después de `09` y `10`. El renderizador anterior de Angular también rellenaba otra posición libre cuando había colisiones, ocultando la inconsistencia física.

## Protección aplicada en Angular

- Reconoce como equivalentes los números puramente numéricos `01`, `001` y `1` para detectar duplicados; conserva el texto original y el ID.
- Detecta posiciones físicas repetidas, incluidas equivalencias de fila `01`/`1` y columnas `A`/`1`.
- El plano ya no inventa posiciones ni filas adicionales para acomodar colisiones.
- Bloquea nuevas ventas y compras de un plano inválido y muestra el problema en administración. Los registros no se borran ni se fusionan.
- El dashboard no presenta los conteos inflados de un plano inconsistente como disponibilidad confirmada.
- La consulta de asientos informa inconsistencias y conserva los registros para revisión.

Esta protección no repara la base de datos ni resuelve boletas ya emitidas para dos IDs equivalentes. La verificación de una boleta sigue reflejando el estado que devuelve el backend.

## Trabajo requerido en backend

Actualización de la revisión: el código local del backend ya incluye comparación canónica, diagnóstico y conciliación. Esto no acredita su despliegue ni repara automáticamente registros antiguos. El aviso con pares `01`/`1` e IDs `1`/`130` a `9`/`138` sigue indicando datos equivalentes que deben revisarse. No se ha consultado ni modificado la base de producción en esta revisión.

El comando local existente admite diagnóstico explícito sin completar ni modificar sillas: `python manage.py complete_bus_seats --plate PLACA_REAL --diagnose-only`. Debe ejecutarse en el backend desplegado con la placa correcta y revisar referencias antes de decidir la reparación. La aplicación de conciliación es una operación aparte; no se ejecutó desde Angular ni durante esta revisión.

1. Corregir la comparación del generador antes de seguir completando buses: usar una clave numérica canónica para etiquetas numéricas, sin exigir que se renombren las etiquetas existentes.
2. Normalizar también las claves de posición. No utilizar una posición libre distinta para ocultar una colisión que representa la misma silla física.
3. Antes de crear, validar duplicados canónicos, posiciones repetidas y registros superiores a la capacidad; devolver un conflicto de configuración si el plano existente es inconsistente.
4. Preparar una revisión de datos por bus con ID, número, fila, columna y referencias desde tiquetes, ventas, auditoría de abordaje y sensores. Hacer primero un diagnóstico sin cambios y respaldar antes de una reparación.
5. Resolver los duplicados existentes mediante una migración o procedimiento controlado. Conservar los IDs históricos o migrar sus referencias con auditoría; no borrar ni fusionar a ciegas registros vendidos. Si dos IDs equivalentes tienen boletas activas del mismo viaje, requieren revisión operativa, no una fusión automática.
6. Validar la integridad del plano en venta, checkout y abordaje para que un cliente antiguo del frontend no permita operar sobre datos inconsistentes.
7. Revalidar que el bus quede con exactamente su capacidad, sin duplicados numéricos ni físicos. No corregirlo cortando la respuesta a las primeras N sillas.

## Pruebas de aceptación

- Con capacidad 40 y sillas existentes `01` a `10`, completar solo 30 nuevas y obtener 40 en total, conservando IDs existentes.
- Con capacidad 30 y esas mismas 10 sillas, completar solo 20 y obtener 30.
- Detectar una base que ya contiene `01` y `1` con IDs diferentes y no crear más registros hasta resolverla.
- Consultar repetidamente sin añadir nuevas sillas ni cambiar posiciones.
- Confirmar el plano 2 + pasillo + 2 y las relaciones de todas las boletas existentes después de la reparación.

Comprobaciones frontend: caso de 49 registros reproducido, rechazo de numeración/posiciones duplicadas, fuente sin mutación, compra y venta bloqueadas, dashboard sin conteo inflado y planos válidos de 30, 40 y 42 plazas conservados.
