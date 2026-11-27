/** Estructura del menú: módulos → categorías → páginas. Un módulo nuevo se agrega aquí. */
export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface Enlace {
  href: string;
  texto: string;
  /** Solo para docentes con alguna de estas vinculaciones. */
  vinculaciones?: string[];
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
        { nombre: 'Inicio', enlaces: [{ href: '/admin/panel', texto: 'Panel' }] },
        {
          nombre: 'Resultados',
          enlaces: [
            { href: '/admin/resultados/apreciacion', texto: 'Nivel de apreciación' },
            { href: '/admin/resultados/alcance', texto: 'Nivel de alcance' },
            { href: '/admin/comparativo', texto: 'Comparativo' },
          ],
        },
        {
          nombre: 'Plan de mejoramiento',
          enlaces: [
            { href: '/admin/plan-mejoramiento', texto: 'Indicadores 18–24' },
            { href: '/admin/informes', texto: 'Informes' },
          ],
        },
        {
          nombre: 'Gestión académica',
          enlaces: [
            { href: '/admin/curriculo', texto: 'Base de conocimiento' },
            { href: '/admin/periodos', texto: 'Periodos' },
            { href: '/admin/cursos', texto: 'Cursos' },
            { href: '/admin/importar', texto: 'Importar consolidado' },
          ],
        },
        {
          nombre: 'Administración',
          enlaces: [
            { href: '/admin/usuarios', texto: 'Usuarios' },
            { href: '/admin/notificaciones', texto: 'Correos' },
            { href: '/admin/auditoria', texto: 'Auditoría' },
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
        { nombre: 'Planeación', enlaces: [{ href: '/admin/poa', texto: 'Planes y actividades' }] },
        {
          nombre: 'Seguimiento',
          enlaces: [{ href: '/admin/poa/desempeno', texto: 'Desempeño' }],
        },
        { nombre: 'Informes', enlaces: [{ href: '/admin/poa/informes', texto: 'Informes POA' }] },
        {
          nombre: 'Informes docentes',
          enlaces: [{ href: '/admin/poa/validacion', texto: 'Validación de informes' }],
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
