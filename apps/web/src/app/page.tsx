import { redirect } from 'next/navigation';

/** El middleware envía a cada rol a su inicio; esto cubre cualquier caso restante. */
export default function Inicio() {
  redirect('/login');
}
