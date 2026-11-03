import { HeroCarousel } from '../components/HeroCarousel'
import { SchoolCalendar } from '../components/SchoolCalendar'
import { AboutCards, FindUs, Gallery, SectionTitle, ValuesStrip } from '../components/Sections'
import { school } from '../school'

export function HomePage() {
  return <>
    <HeroCarousel />
    <section className="section">
      <SectionTitle title="Conócenos">{school.fullName}<br />{school.tagline.charAt(0).toLowerCase() + school.tagline.slice(1)}</SectionTitle>
      <AboutCards />
    </section>
    <section className="section section-tinted">
      <SectionTitle title="Galería">Nuestras instalaciones dentro del plantel, priorizando siempre la limpieza y el mantenimiento del mobiliario estudiantil.</SectionTitle>
      <Gallery />
    </section>
    <section className="section section-flush" aria-label="Nuestros valores"><ValuesStrip /></section>
    <section className="section"><SchoolCalendar /></section>
    <section className="section section-tinted">
      <SectionTitle title="Encuéntranos" />
      <FindUs />
    </section>
  </>
}
