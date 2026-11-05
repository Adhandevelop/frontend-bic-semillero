# Revisión de seguridad del sistema

Fecha: 4 de noviembre de 2026, America/Bogota.

## Alcance y límites

Revisión estática del frontend y del código del backend disponible localmente, sin modificar Django ni la aplicación. Consulta de avisos mediante npm audit y una petición HEAD pública a https://portalbic.site/. No se iniciaron sesiones, no se intentó acceder a información privada de producción, no se subieron archivos, no se realizaron cobros ni pruebas de fuerza bruta. El código local puede diferir del desplegado.

La ausencia de una explotación demostrada no elimina un riesgo, pero tampoco permite afirmar que un aviso de dependencia sea explotable en esta aplicación. Esta revisión no sustituye una prueba de penetración autorizada ni certifica el sistema.

## Resultado

Hay riesgos altos que requieren corrección antes de considerar endurecido el sistema para operación con datos reales. Las prioridades inmediatas son contraseñas iniciales, permisos sobre conductores, dependencias soportadas y protección de sesiones/navegador. Los pagos y la recuperación de cuenta contienen controles positivos relevantes.

## Hallazgos

### S01 — Alta: contraseña inicial predecible y cambio obligatorio solo en el frontend

Evidencia: `../../backend/Proyecto_Semillero_Backend/DjangoProject1/apps/accounts/serializers.py:266` establece la contraseña del cliente con su identificación y activa la cuenta. El mismo patrón aparece en la creación de usuarios y ventas administrativas. `apps/accounts/tokens.py:27` autentica y comprueba la versión de contraseña, pero no restringe el acceso cuando `password_change_required` es verdadero. La restricción visible está en `src/app/core/guards/passenger.guard.ts:5`.

Impacto: conocer el documento permite intentar apropiarse de una cuenta antes de su titular. La navegación de Angular no impide utilizar directamente una API protegida con el JWT obtenido. Incluso un cambio obligatorio aplicado por el servidor no demostraría por sí mismo que quien conoce el documento es el titular.

Corrección: sustituir el documento por una invitación de un solo uso enviada a un canal verificado. Restringir desde el backend las sesiones que requieren cambio a las operaciones mínimas de cuenta. Comprobar con pruebas que un cliente en ese estado no pueda leer compras, modificar perfil ni crear checkout. Responsable principal: backend.

Estado: confirmado en código local; no se intentó tomar una cuenta real.

### S02 — Alta: datos personales de conductores accesibles a cualquier autenticado

Evidencia: `apps/fleet/views.py:26` usa `IsAdminOrReadOnly`, definido en `DjangoProject1/permissions.py:16`, que permite GET a cualquier usuario autenticado. `DriverSerializer` usa `fields = '__all__'`. El modelo incluye nombre, licencia, dirección y teléfono.

Impacto: un cliente puede consultar `/api/fleet/drivers/` y obtener información personal del personal de conducción. Ocultar el menú administrativo no corrige el permiso del endpoint.

Corrección: restringir el listado y detalle de conductores por rol y propósito; publicar para pasajeros un DTO mínimo si realmente es necesario. Añadir pruebas cliente/admin/conductor sobre listado y detalle. Revisar otros catálogos internos con el mismo permiso. Responsable: backend.

Estado: confirmado por permisos y campos del código local; no se consultó el catálogo privado desplegado.

### S03 — Alta: Angular sin soporte y dependencias con avisos conocidos

El lockfile instala Angular 18.2.14. La documentación oficial indica que Angular 2–19 ya no tiene soporte. npm audit ejecutado en esta revisión reportó:

| Alcance | Baja | Moderada | Alta | Crítica | Total |
|---|---:|---:|---:|---:|---:|
| Árbol completo | 7 | 34 | 32 | 5 | 78 |
| Dependencias de producción | 0 | 4 | 4 | 0 | 8 |

Son conteos de paquetes afectados, no vulnerabilidades únicas ni explotaciones demostradas. Las cinco entradas críticas del árbol completo corresponden a herramientas/dependencias excluidas por `--omit=dev`: piscina, proxy-addr, shell-quote, tar y websocket-driver. Que no formen parte del runtime del navegador no elimina su riesgo para desarrollo/CI.

Los avisos de Angular incluyen XSS y otros escenarios; algunos requieren i18n, SSR, hidratación o configuraciones que no identifiqué activas. No encontré `innerHTML`, `bypassSecurityTrust*`, `eval` o `document.write` en el código de la aplicación revisado. Esto reduce superficies concretas, pero no sustituye la actualización.

Corrección: migración gradual a una versión soportada, alineando core/CLI/build/TypeScript/Node, y volver a auditar. No ejecutar `npm audit fix --force` sin revisar sus cambios mayores y probar las funciones de cuenta y pago. Responsable: frontend/CI.

Referencias: https://angular.dev/reference/releases y https://github.com/angular/angular/security/advisories/GHSA-g93w-mfhg-p222.

### S04 — Alta condicionada a XSS: tokens accesibles a JavaScript y sesiones compartiendo origen

Evidencia: `src/app/core/services/auth.service.ts:33` guarda access y refresh administrativos en localStorage. `passenger.service.ts` usa localStorage o sessionStorage. Las claves son diferentes, pero todas pertenecen al mismo origen. El widget externo de Wompi se ejecuta en la página al cargar su script oficial.

Impacto: un XSS o un script del mismo origen comprometido podría leer tokens tanto de cliente como de administrador cuando ambos estén presentes. Separar rutas y nombres de claves no crea aislamiento de seguridad. No se demostró un XSS en la aplicación ni un compromiso de Wompi.

Corrección: evaluar cookies HttpOnly/Secure/SameSite o un BFF, con protección CSRF correspondiente; reducir la persistencia del refresh y aislar el panel administrativo en otro origen. Añadir CSP compatible con Angular y Wompi, sin desactivar controles para hacerla funcionar. Responsable: frontend, backend y despliegue.

Referencia: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html.

### S05 — Media/alta: faltan encabezados de defensa en la página pública desplegada

La petición HEAD a `/` devolvió HTTP 200 sin CSP, CSP Report-Only, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy ni Permissions-Policy. Esto describe esa respuesta concreta; no todas las rutas del dominio. HTTPS sí respondió correctamente con validación normal del certificado.

Impacto: faltan defensas adicionales contra ejecución de contenido, enmarcado de la interfaz, interpretación incorrecta de tipos y degradación de transporte. La ausencia de CSP no prueba por sí sola un XSS.

Corrección: CSP por etapas con nonces/hashes y fuentes mínimas, `frame-ancestors`, `nosniff`, política de referencias y HSTS tras verificar cobertura HTTPS. Aplicar encabezados también a errores y revisar por separado API/media. No copiar una política genérica que bloquee el pago. Responsable: despliegue, coordinado con frontend.

Referencia: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html.

### S06 — Media: cerrar sesión elimina almacenamiento, no revoca el refresh en el servidor

Evidencia: los métodos logout de cliente y administrador solo borran claves locales. No encontré una ruta de revocación de logout. La configuración local da siete días al refresh y desactiva rotación y blacklist tras rotación. La aplicación instalada de blacklist por sí sola no revoca tokens.

Impacto: una copia robada del refresh puede seguir utilizándose después del cierre de sesión mientras no expire o se invalide por otro mecanismo. El control de versión de contraseña sí rechaza accesos emitidos antes de cambiarla; ese es un control positivo distinto del logout.

Corrección: logout con revocación de refresh, rotación con invalidación, gestión de sesiones y pruebas con refresh antiguo tras logout/cambio. Mantener el control de versión de contraseña. Responsable: backend y frontend.

### S07 — Media: controles contra abuso incompletos en la aplicación

Evidencia: no encontré throttle global ni limitación de intentos en la vista JWT de login. Recuperación/activación y soporte usan `cache.add`; no encontré una caché compartida configurada, por lo que el backend local depende de la caché en memoria por proceso. El cooldown visual de Angular se puede evitar llamando la API directamente.

Impacto: riesgo de intentos automatizados de acceso, límites inconsistentes entre workers y abuso de recursos. El checkout limita diez boletas por operación, pero eso no constituye un límite de reservas activas por cuenta/IP. No se comprobó si Nginx/WAF agrega protecciones en producción.

Corrección: límites por cuenta e IP con almacenamiento compartido, controles sobre reservas pendientes y reenvíos de correo, y monitoreo. Evitar bloqueos permanentes que permitan denegar servicio a terceros. Responsable: backend/despliegue.

### S08 — Media: QR público expone identidad completa y no vence automáticamente

Evidencia: `apps/sales/views.py:64` permite verificar sin autenticación y devuelve nombre/documento completos. `apps/sales/ticket_verification.py:25` usa TimestampSigner.unsign sin max_age. La firma impide alterar el código sin conocer el secreto, pero no cifra el contenido ni evita compartir el enlace.

Impacto: quien tenga una copia del QR puede consultar la identidad y viaje. El token va en la query y puede quedar en registros de acceso. La ausencia de vencimiento mantiene esa posibilidad mientras el token siga siendo aceptado. El estado utilizado/cancelado sí se consulta dinámicamente.

Corrección: minimizar/enmascarar datos en la respuesta pública y reservar información completa para inspectores autenticados. Definir vigencia/revocación coherentes con el viaje y evitar registrar tokens en logs/cachés. Revisar el carné con el mismo criterio. Si se usa para abordar, definir consumo atómico del tiquete: el GET de verificación no lo marca utilizado.

## Riesgos adicionales que requieren validación dirigida

- **Subida de fotos:** `ProfilePhotoView` verifica contenido con Pillow, tamaño y dimensiones, lo cual es positivo. Sin embargo, asigna el archivo directamente al modelo y llama save. Aunque el modelo declara FileExtensionValidator, Django no ejecuta full_clean automáticamente al guardar. La vista no normaliza extensión/nombre ni reencodea la imagen. `/media/` se publica desde el mismo origen y la ruta local usa el tipo inferido del archivo. Validar en un entorno de pruebas que una imagen con extensión no permitida sea rechazada y no pueda servirse como HTML. No afirmo haber explotado XSS por esta vía. Preferir nombre aleatorio, extensión derivada del formato validado, reencode y almacenamiento/origen aislado. Referencias: https://docs.djangoproject.com/en/6.0/ref/models/instances/#validating-objects y https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html.
- **Secreto de servidor:** la configuración local permite un valor literal de respaldo para SECRET_KEY. No se leyó ni mostró su contenido en este informe y no se verificó el valor desplegado. Producción debe fallar si falta una clave secreta propia, de suficiente entropía; revisar rotación si alguna vez se usó el respaldo publicado.
- **MFA administrativo:** no identifiqué un flujo MFA en el frontend revisado. Evaluar su incorporación para privilegios de administración.
- **Configuración real:** verificar DEBUG=False, hosts/orígenes exactos, límites de carga, permisos de almacenamiento, aislamiento de base de datos, copias de seguridad y secretos. No se inspeccionaron valores privados del entorno de producción.

## Controles positivos observados

- Perfil y rol se consultan al servidor; los guards no aceptan solo la presencia de un token.
- Ventas, tiquetes y solicitudes se filtran por propietario en los querysets locales.
- Recuperación usa token aleatorio de 32 bytes, hash en base de datos, propósito, vencimiento y consumo dentro de transacción. Las respuestas de solicitud son genéricas.
- Cambio de contraseña valida la contraseña actual y actualiza la versión de sesiones.
- El importe del checkout se calcula en backend; se comprueban referencia, monto y moneda al confirmar pagos. Hay idempotencia y bloqueos transaccionales para sillas/ventas en los flujos revisados.
- Webhook compara una firma mediante compare_digest; falta comprobar el flujo real completo con el proveedor.
- No identifiqué claves privadas de Wompi/Factus ni credenciales reales embebidas en el código frontend revisado.
- Los errores añadidos al frontend registran estados/etapas sin imprimir JWT o contraseñas; los tokens de recuperación no se persisten.

## Orden de corrección y aceptación

1. Eliminar contraseña inicial basada en documento y restringir desde servidor sesiones con cambio pendiente.
2. Cerrar exposición de conductores a clientes; añadir pruebas por rol y propiedad.
3. Revisar la ruta de subida/media en un entorno aislado.
4. Migrar Angular y dependencias; repetir auditoría separando runtime y CI.
5. Endurecer cabeceras, almacenamiento de sesiones, revocación y límites distribuidos.
6. Reducir datos del QR y definir revocación/consumo de tiquetes.

Aceptar cada corrección con pruebas automatizadas de rol/propietario, tokens inválidos/vencidos/reutilizados, reserva simultánea, webhook repetido, upload con nombre/tipo inconsistentes y logout con refresh copiado. Hacer pruebas autenticadas en staging con cuentas autorizadas; no usar cuentas ajenas ni generar pagos reales durante esta validación.
