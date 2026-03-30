const API_BASE = '/api';

export async function fetchStations(filters = {}) {
  const params = new URLSearchParams();
  console.log('Fetching stations with filters:', filters);

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.lat) params.set('lat', filters.lat);
  if (filters.lng) params.set('lng', filters.lng);
  if (filters.radius) params.set('radius', filters.radius);
  if (filters.minIndex !== undefined && filters.minIndex !== '') params.set('minIndex', filters.minIndex);
  if (filters.maxIndex !== undefined && filters.maxIndex !== '') params.set('maxIndex', filters.maxIndex);

  const query = params.toString();
  const url = `${API_BASE}/stations${query ? `?${query}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchClusters({ zoom, bbox, dateFrom, dateTo, minIndex, maxIndex } = {}) {
  const params = new URLSearchParams();

  params.set('zoom', zoom);
  params.set('bbox', bbox.join(','));
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (minIndex !== undefined && minIndex !== '') params.set('minIndex', minIndex);
  if (maxIndex !== undefined && maxIndex !== '') params.set('maxIndex', maxIndex);

  const res = await fetch(`${API_BASE}/clusters?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
