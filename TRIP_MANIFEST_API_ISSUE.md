# Diferencia entre tiquetes y boletas de ventas

## Evidencia revisada

- El viaje 25 muestra cuatro boletas emitidas de las ventas 30 y 31, y disponibilidad marca cuatro sillas vendidas.
- Esas boletas se recuperan desde `sales[].tickets`; no aparecen como registros coincidentes válidos en el listado independiente de tiquetes recibido por Angular.
- Se confirmó que el navegador envía las solicitudes de páginas posteriores. No se han recibido sus códigos HTTP ni el JSON final, por lo que todavía no se certifica el motivo exacto en producción.
- Se inspeccionaron los archivos JavaScript públicos desplegados: el detalle usa el manifiesto conciliado y el ayudante consulta páginas 2, 3, etc., manteniendo la URL propia HTTPS. No sigue directamente el enlace `next` HTTP.

## Hallazgo en el código local del backend

`TicketViewSet.get_queryset()` consulta `Ticket.objects.select_related("sale", "trip", "seat")` sin `order_by`, y el modelo Ticket no define orden predeterminado. Una consulta paginada sin orden estable puede repetir u omitir registros entre páginas, incluso si se solicitan todas. Es un defecto verificable del código local y una causa posible de la diferencia; no es una confirmación de cómo está ejecutándose la consulta en producción.

## Solicitud para backend

1. Mantener los permisos y el filtro por comprador para usuarios no administradores.
2. Ordenar explícitamente antes de paginar, por ejemplo:

   ```python
   queryset = Ticket.objects.select_related("sale", "trip", "seat").order_by("id")
   ```

3. Incorporar, si aún no existe, `GET /api/sales/tickets/?trip=25`, validando el identificador y aplicándolo junto con los permisos. No devolver tiquetes ajenos a un cliente.
4. Comparar los IDs de todas las páginas del listado con los tiquetes anidados de las ventas del mismo viaje. Revisar también serialización, filtros y respuestas intermedias si sigue habiendo diferencia.
5. Probar más de una página, boletas recientes y compras múltiples: cada ID debe aparecer una vez y coincidir con sus referencias de venta, viaje y silla. Verificar permisos de cliente y administrador.

## Estado del frontend

El manifiesto conserva las cuatro boletas reales, deduplica por ID y advierte de la diferencia. No se retira el aviso sin resolver o explicar la discrepancia. Un error de factura no elimina ni invalida una boleta emitida. La consulta de QR y la confirmación de abordaje siguen verificándose contra sus endpoints del servidor.

Esta revisión no modificó Django ni consultó APIs privadas con credenciales. Tampoco ejecutó ventas, abordajes o cambios de datos en producción.
