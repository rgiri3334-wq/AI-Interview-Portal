export const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export const customFetch = async (url, options = {}) => {
  const token = sessionStorage.getItem('adminToken');
  const headers = { ...options.headers };
  
  // Only add Content-Type if it's not a FormData object
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminRole');
    window.location.href = '/';
  }
  
  return response;
};
