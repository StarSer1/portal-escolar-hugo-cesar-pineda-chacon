export interface NavItem { label: string; href: string; icon: string }
export interface NavSection { label?: string; items: NavItem[] }

/** The panel's information architecture: modules grouped by what the office is doing. */
export const navSections: NavSection[] = [
  { items: [{ label: 'Resumen', href: '/panel', icon: 'home' }] },
  {
    label: 'Comunidad escolar',
    items: [
      { label: 'Alumnos', href: '/panel/alumnos', icon: 'student' },
      { label: 'Tutores', href: '/panel/tutores', icon: 'students' },
      { label: 'Docentes', href: '/panel/docentes', icon: 'teacher' },
    ],
  },
  {
    label: 'Ciclo escolar',
    items: [
      { label: 'Organización escolar', href: '/panel/organizacion', icon: 'layers' },
      { label: 'Inscripciones', href: '/panel/inscripciones', icon: 'enroll' },
      { label: 'Calificaciones', href: '/panel/calificaciones', icon: 'grades' },
    ],
  },
  { label: 'Trazabilidad', items: [{ label: 'Actividad', href: '/panel/actividad', icon: 'history' }] },
]

export const organizationTabs = [
  { value: 'years', label: 'Ciclos escolares' },
  { value: 'plans', label: 'Planes de estudio' },
  { value: 'subjects', label: 'Materias' },
  { value: 'groups', label: 'Grupos' },
  { value: 'periods', label: 'Periodos de evaluación' },
] as const

/** Breadcrumb trail for the current location, without the root "Panel académico". */
export function breadcrumbFor(pathname: string, search: string): string[] {
  for (const section of navSections) {
    const item = section.items.find((entry) => entry.href === pathname)
    if (!item) continue
    const trail = section.label ? [section.label, item.label] : [item.label]
    if (pathname === '/panel/organizacion') {
      const tab = new URLSearchParams(search).get('tab')
      trail.push(organizationTabs.find((entry) => entry.value === tab)?.label ?? organizationTabs[0].label)
    }
    return trail
  }
  return []
}
