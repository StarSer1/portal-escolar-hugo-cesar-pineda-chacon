import { Link } from 'react-router-dom'

export function HomePage() {
  return <main>
    <header className="hero">
      <p className="eyebrow">Portal institucional oficial</p>
      <h1>Escuela Primaria Hugo César Piñeda Chacón</h1>
      <p>Información institucional, avisos y acceso al sistema académico.</p>
      <Link className="button-link" to="/iniciar-sesion">Iniciar sesión</Link>
    </header>
    <section><h2>Sistema académico</h2><p>Personal autorizado puede consultar y gestionar la información académica desde un acceso seguro.</p></section>
  </main>
}
