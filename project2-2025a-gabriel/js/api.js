(function() {
  'use strict';
  
  const API_CONFIG = {
    baseUrl: 'https://wger.de/api/v2',
    defaultHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    endpoints: {
      token: '/token/',
      tokenRefresh: '/token/refresh/',
      tokenVerify: '/token/verify/',
      exercises: '/exercise/',
      exerciseImages: '/exerciseimage/',
      exerciseCategories: '/exercisecategory/',
      equipment: '/equipment/',
      muscles: '/muscle/'
    }
  };
  
  let authState = {
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    tokenExpiry: localStorage.getItem('tokenExpiry') || null
  };
  
  function buildUrl(endpoint, queryParams = {}) {
    const url = new URL(API_CONFIG.baseUrl + endpoint);
    
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== undefined && queryParams[key] !== null) {
        url.searchParams.append(key, queryParams[key]);
      }
    });
    
    return url.toString();
  }
  
  function getHeaders(requiresAuth = false) {
    const headers = { ...API_CONFIG.defaultHeaders };
    
    if (requiresAuth && authState.accessToken) {
      headers['Authorization'] = `Bearer ${authState.accessToken}`;
    }
    
    return headers;
  }
  
  function isTokenValid() {
    if (!authState.accessToken || !authState.tokenExpiry) {
      return false;
    }
    
    const expiryTime = parseInt(authState.tokenExpiry);
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return expiryTime > (currentTime + fiveMinutes);
  }
  
  function saveTokens(tokens) {
    if (tokens.access) {
      localStorage.setItem('accessToken', tokens.access);
      authState.accessToken = tokens.access;
      
      const expiryTime = Date.now() + (30 * 60 * 1000);
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      authState.tokenExpiry = expiryTime.toString();
    }
    
    if (tokens.refresh) {
      localStorage.setItem('refreshToken', tokens.refresh);
      authState.refreshToken = tokens.refresh;
    }
  }
  
  function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    
    authState = {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null
    };
  }
  
  async function refreshAccessToken() {
    try {
      if (!authState.refreshToken) {
        console.error('Nenhum token de atualização disponível');
        return false;
      }
      
      const response = await fetch(buildUrl(API_CONFIG.endpoints.tokenRefresh), {
        method: 'POST',
        headers: API_CONFIG.defaultHeaders,
        body: JSON.stringify({ refresh: authState.refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar o token');
      }
      
      const data = await response.json();
      saveTokens({ access: data.access });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      clearTokens();
      return false;
    }
  }
  
  async function fetchWithAuth(endpoint, options = {}, requiresAuth = false, retry = true) {
    if (requiresAuth && !isTokenValid() && authState.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        throw new Error('Falha na autenticação. Por favor, faça login novamente.');
      }
    }
    
    const fetchOptions = {
      ...options,
      headers: {
        ...getHeaders(requiresAuth),
        ...(options.headers || {})
      }
    };
    
    try {
      const response = await fetch(buildUrl(endpoint), fetchOptions);
      
      if (response.status === 401 && retry && authState.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchWithAuth(endpoint, options, requiresAuth, false);
        } else {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      throw error;
    }
  }
  
  async function login(username, password) {
    try {
      const response = await fetch(buildUrl(API_CONFIG.endpoints.token), {
        method: 'POST',
        headers: API_CONFIG.defaultHeaders,
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Falha na autenticação');
      }
      
      const tokens = await response.json();
      saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }
  
  function logout() {
    clearTokens();
  }
  
  function isAuthenticated() {
    return isTokenValid();
  }
  
  async function getExercises(params = {}) {
    const defaultParams = {
      limit: 20,
      offset: 0,
      language: 'pt'
    };
    
    const queryParams = { ...defaultParams, ...params };
    return fetchWithAuth(API_CONFIG.endpoints.exercises, { method: 'GET' }, false, queryParams);
  }
  
  async function getExerciseById(id) {
    return fetchWithAuth(`${API_CONFIG.endpoints.exercises}${id}/`, { method: 'GET' });
  }
  
  async function getExerciseImages(exerciseId) {
    return fetchWithAuth(API_CONFIG.endpoints.exerciseImages, { 
      method: 'GET' 
    }, false, { exercise: exerciseId });
  }
  
  async function getExerciseCategories() {
    return fetchWithAuth(API_CONFIG.endpoints.exerciseCategories, { method: 'GET' });
  }
  
  async function getEquipment() {
    return fetchWithAuth(API_CONFIG.endpoints.equipment, { method: 'GET' });
  }
  
  async function getMuscles() {
    return fetchWithAuth(API_CONFIG.endpoints.muscles, { method: 'GET' });
  }
  
  window.api = {
    login,
    logout,
    isAuthenticated,
    getExercises,
    getExerciseById,
    getExerciseImages,
    getExerciseCategories,
    getEquipment,
    getMuscles
  };
})();