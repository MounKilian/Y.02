// Pollution index color scale (0-100)
export function getColor(index) {
  if (index <= 20) return '#22c55e';  // Green — Good
  if (index <= 40) return '#84cc16';  // Lime — Fair
  if (index <= 60) return '#eab308';  // Yellow — Moderate
  if (index <= 80) return '#f97316';  // Orange — Poor
  return '#ef4444';                    // Red — Very poor
}

export function getLabel(index) {
  if (index <= 20) return 'Bon';
  if (index <= 40) return 'Correct';
  if (index <= 60) return 'Moyen';
  if (index <= 80) return 'Mauvais';
  return 'Tres mauvais';
}
