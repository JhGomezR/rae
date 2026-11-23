import { nivelDePct } from '../src/escala';

describe('nivelDePct', () => {
  it.each([
    [0, 'Bajo'],
    [59.9, 'Bajo'],
    [60, 'Básico'],
    [74.9, 'Básico'],
    [75, 'Alto'],
    [89.9, 'Alto'],
    [90, 'Superior'],
    [100, 'Superior'],
  ])('%p %% → %s', (pct, nombre) => {
    expect(nivelDePct(pct).nombre).toBe(nombre);
  });
});
