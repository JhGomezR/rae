/**
 * Permisos del área administrativa (RBAC) como matriz: cada módulo admite algunas de las
 * acciones Ver, Crear, Editar y Eliminar, y unos pocos tienen permisos especiales.
 * La clave de un permiso es «modulo.accion» (p. ej. «poa.editar»).
 */
export const ACCIONES = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
} as const;
export type Accion = keyof typeof ACCIONES;
export const LISTA_ACCIONES = Object.keys(ACCIONES) as Accion[];

export interface ModuloPermisos {
  clave: string;
  nombre: string;
  descripcion: string;
  /** Icono del módulo en la interfaz. */
  icono: string;
  /** Qué significa cada acción en este módulo (solo las que aplican). */
  acciones: Partial<Record<Accion, string>>;
  /** Permisos que no son ver/crear/editar/eliminar. */
  especiales?: Record<string, string>;
}

export interface ComponentePermisos {
  componente: string;
  modulos: ModuloPermisos[];
}

export const COMPONENTES_PERMISOS: ComponentePermisos[] = [
  {
    componente: 'Seguimiento RAE',
    modulos: [
      {
        clave: 'resultados',
        nombre: 'Panel y resultados',
        descripcion: 'Panel, apreciación, alcance, comparativo e indicadores 18–24',
        icono: 'grafico',
        acciones: { ver: 'Ver el panel, los resultados y descargar matrices' },
      },
      {
        clave: 'informes',
        nombre: 'Informes del plan',
        descripcion: 'Informes del plan de mejoramiento y su configuración',
        icono: 'documento',
        acciones: {
          ver: 'Ver y descargar los informes',
          editar: 'Ajustar informes, firma y configuración',
        },
      },
    ],
  },
  {
    componente: 'Plan Operativo Anual',
    modulos: [
      {
        clave: 'poa',
        nombre: 'POA',
        descripcion: 'Planes, actividades, seguimiento mensual, desempeño e informes',
        icono: 'objetivo',
        acciones: {
          ver: 'Ver planes, desempeño e informes',
          crear: 'Crear o importar planes y actividades',
          editar: 'Editar planes, actividades y seguimiento',
          eliminar: 'Quitar seguimientos mensuales',
        },
      },
    ],
  },
  {
    componente: 'Gestión docente',
    modulos: [
      {
        clave: 'validacion',
        nombre: 'Validación de informes',
        descripcion: 'Programador de clases, agenda, ejecución y hora cátedra',
        icono: 'validar',
        acciones: {
          ver: 'Ver y descargar informes docentes',
          editar: 'Aprobar, pedir ajustes y configurar firmas',
        },
      },
    ],
  },
  {
    componente: 'Gestión académica',
    modulos: [
      {
        clave: 'curriculo',
        nombre: 'Base de conocimiento',
        descripcion: 'Unidades, competencias, resultados y preguntas',
        icono: 'libro',
        acciones: {
          ver: 'Ver la base de conocimiento',
          crear: 'Crear unidades, competencias e ítems',
          editar: 'Editar, desactivar o restaurar',
        },
      },
      {
        clave: 'periodos',
        nombre: 'Periodos',
        descripcion: 'Calendario académico y momentos de evaluación',
        icono: 'calendario',
        acciones: {
          ver: 'Ver los periodos',
          crear: 'Crear periodos',
          editar: 'Abrir o cerrar momentos y fechas',
        },
      },
      {
        clave: 'cursos',
        nombre: 'Cursos',
        descripcion: 'Cursos, docentes e inscripciones',
        icono: 'grupo',
        acciones: {
          ver: 'Ver cursos e inscripciones',
          crear: 'Crear cursos e inscribir estudiantes',
          editar: 'Editar cursos e inscripciones',
        },
      },
      {
        clave: 'consolidado',
        nombre: 'Importar consolidado',
        descripcion: 'Carga del consolidado de matrículas y alias de unidades',
        icono: 'subir',
        acciones: {
          ver: 'Ver importaciones y alias',
          crear: 'Importar el consolidado y crear alias',
        },
      },
    ],
  },
  {
    componente: 'Administración',
    modulos: [
      {
        clave: 'usuarios',
        nombre: 'Usuarios',
        descripcion: 'Cuentas de docentes, estudiantes y administrativos',
        icono: 'usuario',
        acciones: {
          ver: 'Ver usuarios',
          crear: 'Crear usuarios',
          editar: 'Editar datos, rol y vinculación',
          eliminar: 'Eliminar usuarios sin información asociada',
        },
        especiales: {
          'usuarios.estado': 'Activar o inactivar',
          'usuarios.clave': 'Reiniciar contraseñas',
          'usuarios.administrativos': 'Cuentas administrativas',
        },
      },
      {
        clave: 'roles',
        nombre: 'Roles y permisos',
        descripcion: 'Roles administrativos y su matriz de permisos',
        icono: 'escudo',
        acciones: {
          ver: 'Ver roles y permisos',
          crear: 'Crear roles',
          editar: 'Editar roles, permisos y estado',
          eliminar: 'Eliminar roles sin usuarios',
        },
      },
      {
        clave: 'correos',
        nombre: 'Correos',
        descripcion: 'Notificaciones y recordatorios por correo',
        icono: 'correo',
        acciones: { ver: 'Ver los correos enviados', crear: 'Enviar correos y recordatorios' },
      },
      {
        clave: 'auditoria',
        nombre: 'Auditoría',
        descripcion: 'Registro de acciones administrativas',
        icono: 'historial',
        acciones: { ver: 'Ver la auditoría' },
      },
    ],
  },
];

export const MODULOS_PERMISOS: ModuloPermisos[] = COMPONENTES_PERMISOS.flatMap((c) => c.modulos);

/** Clave → descripción de todos los permisos (acciones y especiales). */
export const PERMISOS: Record<string, string> = Object.fromEntries(
  MODULOS_PERMISOS.flatMap((m) => [
    ...Object.entries(m.acciones).map(([a, t]) => [`${m.clave}.${a}`, `${m.nombre}: ${t}`]),
    ...Object.entries(m.especiales ?? {}).map(([k, t]) => [k, `${m.nombre}: ${t}`]),
  ]),
);
export type Permiso = string;
export const TODOS_LOS_PERMISOS = Object.keys(PERMISOS);

/** Permisos de un módulo (acciones y especiales). */
export const permisosDeModulo = (m: ModuloPermisos) => [
  ...Object.keys(m.acciones).map((a) => `${m.clave}.${a}`),
  ...Object.keys(m.especiales ?? {}),
];

/** Quien puede editar roles es «gestor de roles»: siempre debe quedar al menos uno activo. */
export const PERMISO_GESTOR_ROLES = 'roles.editar';

/** Acción que pide cada método HTTP cuando un controlador declara solo el módulo. */
export const ACCION_HTTP: Record<string, Accion> = {
  GET: 'ver',
  HEAD: 'ver',
  POST: 'crear',
  PUT: 'editar',
  PATCH: 'editar',
  DELETE: 'eliminar',
};

/** Roles fijos del sistema: el administrador tiene todos los permisos, siempre. */
export const ROL_ADMINISTRADOR = 'ADMINISTRADOR';
export const ROLES_SISTEMA = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'] as const;
