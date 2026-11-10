// Escudo oficial de la escuela (recortado en círculo con fondo transparente).
// Si se quita, se vuelve a mostrar la marca provisional "HC".
const officialEmblemSrc: string | null = '/escudo.png'

export function SchoolEmblem({ size = 48 }: { size?: number }) {
  if (officialEmblemSrc) return <img className="school-emblem" src={officialEmblemSrc} width={size} height={size} alt="" />
  return <span className="school-emblem school-emblem-provisional" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">HC</span>
}
