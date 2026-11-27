/** Estructura del menú: módulos → categorías → páginas. Un módulo nuevo se agrega aquí. */
export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface Enlace {
  href: string;
  texto: string;
  /** Solo para docentes con alguna de estas vinculaciones. */
  vinculaciones?: string[];
  /** RBAC: permiso necesario para ver el enlace (área administrativa). */
  permiso?: string;
}
export interface Categoria {
  nombre: string;
  enlaces: Enlace[];
}
export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  categorias: Partial<Record<Rol, Categoria[]>>;
}

export const MODULOS: Modulo[] = [
  {
    id: 'rae',
    nombre: 'Seguimiento RAE',
    descripcion: 'Resultados de aprendizaje',
    categorias: {
      ADMIN: [
        {
          nombre: 'Inicio',
          enlaces: [{ href: '/admin/panel', texto: 'Panel', permiso: 'resultados.ver' }],
        },
        {
          nombre: 'Resultados',
          enlaces: [
            {
              href: '/admin/resultados/apreciacion',
              texto: 'Nivel de apreciación',
              permiso: 'resultados.ver',
            },
            {
              href: '/admin/resultados/alcance',
              texto: 'Nivel de alcance',
              permiso: 'resultados.ver',
            },
            { href: '/admin/comparativo', texto: 'Comparativo', permiso: 'resultados.ver' },
          ],
        },
        {
          nombre: 'Plan de mejoramiento',
          enlaces: [
            {
              href: '/admin/plan-mejoramiento',
              texto: 'Indicadores 18–24',
              permiso: 'resultados.ver',
            },
            { href: '/admin/informes', texto: 'Informes', permiso: 'informes.gestionar' },
          ],
        },
        {
          nombre: 'Gestión académica',
          enlaces: [
            {
              href: '/admin/curriculo',
              texto: 'Base de conocimiento',
              permiso: 'curriculo.gestionar',
            },
            { href: '/admin/periodos', texto: 'Periodos', permiso: 'periodos.gestionar' },
            { href: '/admin/cursos', texto: 'Cursos', permiso: 'cursos.gestionar' },
            {
              href: '/admin/importar',
              texto: 'Importar consolidado',
              permiso: 'consolidado.importar',
            },
          ],
        },
        {
          nombre: 'Administración',
          enlaces: [
            { href: '/admin/usuarios', texto: 'Usuarios', permiso: 'usuarios.ver' },
            { href: '/admin/roles', texto: 'Roles y permisos', permiso: 'roles.gestionar' },
            { href: '/admin/notificaciones', texto: 'Correos', permiso: 'correos.gestionar' },
            { href: '/admin/auditoria', texto: 'Auditoría', permiso: 'auditoria.ver' },
          ],
        },
      ],
      DOCENTE: [
        { nombre: 'Encuestas', enlaces: [{ href: '/mis-encuestas', texto: 'Mis encuestas' }] },
      ],
      ESTUDIANTE: [
        { nombre: 'Encuestas', enlaces: [{ href: '/mis-encuestas', texto: 'Mis encuestas' }] },
      ],
    },
  },
  {
    id: 'poa',
    nombre: 'Plan Operativo Anual',
    descripcion: 'POA · formato F-PIN-001',
    categorias: {
      ADMIN: [
        {
          nombre: 'Planeación',
          enlaces: [
            { href: '/admin/poa', texto: 'Planes y actividades', permiso: 'poa.gestionar' },
          ],
        },
        {
          nombre: 'Seguimiento',
          enlaces: [{ href: '/admin/poa/desempeno', texto: 'Desempeño', permiso: 'poa.gestionar' }],
        },
        {
          nombre: 'Informes',
          enlaces: [
            { href: '/admin/poa/informes', texto: 'Informes POA', permiso: 'poa.gestionar' },
          ],
        },
        {
          nombre: 'Informes docentes',
          enlaces: [
            {
              href: '/admin/poa/validacion',
              texto: 'Validación de informes',
              permiso: 'docentes.validar',
            },
          ],
        },
      ],
      DOCENTE: [
        {
          nombre: 'Informes docentes',
          enlaces: [
            {
              href: '/docente/agenda',
              texto: 'Agenda',
              vinculaciones: ['PLANTA', 'OCASIONAL', 'PROVISIONAL'],
            },
            {
              href: '/docente/ejecucion',
              texto: 'Ejecución de la agenda',
              vinculaciones: ['PLANTA', 'OCASIONAL', 'PROVISIONAL'],
            },
            { href: '/docente/catedra', texto: 'H. Cátedra', vinculaciones: ['CATEDRA'] },
          ],
        },
      ],
    },
  },
];

export const CUENTA: Enlace[] = [{ href: '/perfil', texto: 'Mi perfil' }];

const coincide = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);

const TODOS = [
  ...MODULOS.flatMap((m) => Object.values(m.categorias).flatMap((c) => c ?? [])),
].flatMap((c) => c.enlaces.map((e) => e.href));

/** Activo si la ruta es suya y ningún otro enlace más específico la reclama. */
export const esActivo = (ruta: string, href: string) =>
  coincide(ruta, href) && !TODOS.some((h) => h.length > href.length && coincide(ruta, h));
