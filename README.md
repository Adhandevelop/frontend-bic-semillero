# Sistema de Gestion de Transporte

Frontend academico desarrollado en Angular para consumir una API REST creada con Django REST Framework.

## Descripcion

La aplicacion permite gestionar:

- Buses
- Conductores
- Rutas
- Viajes

Incluye listado, creacion, edicion, eliminacion y cambio de estado para viajes.

## Tecnologias

- Angular
- TypeScript
- Componentes standalone
- Formularios reactivos
- HttpClient
- CSS propio

## Requisitos

- Node.js 20 o superior
- npm
- Angular CLI
- Backend activo en:

```text
http://72.60.175.200/api/
```

## Instalacion

```bash
npm install
```

## Ejecutar el proyecto

```bash
ng serve
```

Abrir en el navegador:

```text
http://localhost:4200/
```

## Rutas del frontend

- `/dashboard`
- `/buses`
- `/buses/nuevo`
- `/buses/editar/:id`
- `/conductores`
- `/conductores/nuevo`
- `/conductores/editar/:id`
- `/rutas`
- `/rutas/nueva`
- `/rutas/editar/:id`
- `/viajes`
- `/viajes/nuevo`
- `/viajes/editar/:id`

## Estructura principal

```text
src/app/
├── core/
│   ├── models/
│   └── services/
├── pages/
│   ├── dashboard/
│   ├── buses/
│   ├── conductores/
│   ├── rutas/
│   └── viajes/
├── shared/
│   ├── navbar/
│   └── layout/
├── app.config.ts
├── app.routes.ts
└── app.component.ts
```

## Backend

El proyecto consume los siguientes recursos desde Django REST Framework:

- `buses`
- `conductores`
- `rutas`
- `viajes`

URL base usada por los servicios:

```text
http://72.60.175.200/api/
```

## Comandos utiles

```bash
npm install
ng serve
npm run build
```
