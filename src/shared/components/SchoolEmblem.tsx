/**
 * Escudo oficial de la escuela (recortado en círculo con fondo transparente).
 * Se usan versiones reducidas (generadas con `npm run optimize:images`) en
 * lugar del original de 512 px, que pesa unas 30 veces más.
 */
export function SchoolEmblem({ size = 48 }: { size?: number }) {
  return <img className="school-emblem" src="/escudo-96.png" srcSet="/escudo-96.png 1x, /escudo-180.png 2x" width={size} height={size} alt="" decoding="async" />
}
