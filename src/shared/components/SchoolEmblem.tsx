// Provisional mark until the school delivers its official crest: save the file
// in public/ (for example public/escudo.png) and set its path here.
const officialEmblemSrc: string | null = null

export function SchoolEmblem({ size = 48 }: { size?: number }) {
  if (officialEmblemSrc) return <img className="school-emblem" src={officialEmblemSrc} width={size} height={size} alt="" />
  return <span className="school-emblem school-emblem-provisional" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">HC</span>
}
