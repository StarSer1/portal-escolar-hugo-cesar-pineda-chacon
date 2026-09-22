export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    book: 'M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    grades: 'M9 3h6v4H9zM9 5H5v16h14V5h-4M8 12h8M8 16h5',
    calendar: 'M8 2v4M16 2v4M3 10h18M3 4h18v17H3zM7 14h2M13 14h2',
    clock: 'M12 8v5l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    logout: 'M9 3H4v18h5M9 12h12M16 7l5 5-5 5',
    menu: 'M3 6h18M3 12h18M3 18h18',
    check: 'm5 12 4 4L19 6',
    plus: 'M12 5v14M5 12h14',
    shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.book} /></svg>
}
