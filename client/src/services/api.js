async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  // Health
  health: () => request('/api/health'),

  // Routes
  calculateRoute: (payload) =>
    request('/api/routes/calculate', { method: 'POST', body: JSON.stringify(payload) }),

  // Stateless PDF Download
  downloadRoutePdf: async (routeData, filenameFallback = 'FuelPlan.pdf') => {
    const res = await fetch('/api/routes/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData),
    });
    if (!res.ok) {
      throw new Error('Failed to generate PDF fuel plan.');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('content-disposition');
    const match = disposition?.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : filenameFallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Stations
  getStationStats: () => request('/api/stations/stats'),
  searchLocations: (q) =>
    request(`/api/stations/cities?q=${encodeURIComponent(q || '')}`),
};
