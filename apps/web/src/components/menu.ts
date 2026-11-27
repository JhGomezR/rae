/** Estructura del menú: módulos → categorías → páginas. Un módulo nuevo se agrega aquí. */
export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface Enlace {
  href: string;
  texto: string;
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
];

export const CUENTA: Enlace[] = [{ href: '/perfil', texto: 'Mi perfil' }];

export const esActivo = (ruta: string, href: string) =>
  ruta === href || ruta.startsWith(`${href}/`);
