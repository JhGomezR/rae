/** Permisos del área administrativa (RBAC). Cada rol administrativo tiene un subconjunto. */
export const GRUPOS_PERMISOS = [
  {
    grupo: 'Seguimiento RAE',
    permisos: {
      'resultados.ver': 'Ver panel, resultados, comparativo e indicadores',
      'informes.gestionar': 'Gestionar los informes del plan de mejoramiento',
      'curriculo.gestionar': 'Gestionar la base de conocimiento',
      'periodos.gestionar': 'Crear y abrir o cerrar periodos',
      'cursos.gestionar': 'Gestionar cursos e inscripciones',
      'consolidado.importar': 'Importar el consolidado',
    },
  },
  {
    grupo: 'Plan Operativo Anual',
    permisos: {
      'poa.gestionar': 'Gestionar el POA, su seguimiento e informes',
      'docentes.validar': 'Validar informes docentes y configurar firmas',
    },
  },
  {
    grupo: 'Usuarios y roles',
    permisos: {
      'usuarios.ver': 'Ver usuarios',
      'usuarios.crear': 'Crear usuarios',
      'usuarios.editar': 'Editar datos, rol y vinculación',
      'usuarios.estado': 'Activar o inactivar usuarios (individual o masivo)',
      'usuarios.clave': 'Reiniciar contraseñas',
      'usuarios.eliminar': 'Eliminar usuarios sin información asociada',
      'usuarios.administrativos': 'Gestionar cuentas con rol administrativo',
      'roles.gestionar': 'Gestionar roles y permisos',
    },
  },
  {
    grupo: 'Administración',
    permisos: {
      'correos.gestionar': 'Ver y enviar correos',
      'auditoria.ver': 'Ver la auditoría',
    },
  },
] as const;

type Grupo = (typeof GRUPOS_PERMISOS)[number];
type ClavesDe<T> = T extends { permisos: infer P } ? keyof P & string : never;
export type Permiso = ClavesDe<Grupo>;

export const PERMISOS: Record<string, string> = Object.assign(
  {},
  ...GRUPOS_PERMISOS.map((g) => g.permisos),
) as Record<string, string>;
export const TODOS_LOS_PERMISOS = Object.keys(PERMISOS) as Permiso[];

/** Roles fijos del sistema: el administrador tiene todos los permisos, siempre. */
export const ROL_ADMINISTRADOR = 'ADMINISTRADOR';
export const ROLES_SISTEMA = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'] as const;
