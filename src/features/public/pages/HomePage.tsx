import { HeroCarousel } from '../components/HeroCarousel'
import { SchoolCalendar } from '../components/SchoolCalendar'
import { AboutCards, FindUs, Gallery, SectionTitle, ValuesStrip } from '../components/Sections'
import { useSite } from '../SiteContent'

export function HomePage() {
  const { general: school, home } = useSite().content
  return <>
    <h1 className="sr-only">{school.fullName}</h1>
    <HeroCarousel />
    <section className="section">
      <SectionTitle title="Conócenos">{school.fullName}<br />{school.tagline.charAt(0).toLowerCase() + school.tagline.slice(1)}</SectionTitle>
      <AboutCards />
    </section>
    <section className="section section-tinted">
      <SectionTitle title="Galería">{home.galleryIntro}</SectionTitle>
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
