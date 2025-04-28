(function() {
  'use strict';
  
  const API_CONFIG = {
    baseUrl: 'https://wger.de/api/v2',
    defaultHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    apiKey: '9798b3f1455c99a1d5ec4bfae475f02c2ea9cd56',
    endpoints: {
      token: '/token/',
      tokenRefresh: '/token/refresh/',
      tokenVerify: '/token/verify/',
      exercises: '/exercise/',
      exerciseInfo: '/exerciseinfo/',
      exerciseImages: '/exerciseimage/',
      exerciseCategories: '/exercisecategory/',
	  exerciseSearch: '/exercise/search/',
      equipment: '/equipment/',
      muscles: '/muscle/',
      languages: '/language/'
    }
  };
  
  let authState = {
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    tokenExpiry: localStorage.getItem('tokenExpiry') || null
  };
  
    function buildUrl(baseUrlOrPath, queryParams = {}) {
        let url;
        try {
            url = new URL(baseUrlOrPath.startsWith('http') ? baseUrlOrPath : API_CONFIG.baseUrl + baseUrlOrPath);
        } catch (e) {
            url = new URL(API_CONFIG.baseUrl + baseUrlOrPath);
        }


        Object.keys(queryParams).forEach(key => {
            const value = queryParams[key];

            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    if (url.searchParams.has(key)) {
                        url.searchParams.delete(key);
                    }
                    value.forEach(item => {
                        if (item !== undefined && item !== null && item !== '') {
                             url.searchParams.append(key, item);
                        }
                    });
                } else if (value !== '') {
                    url.searchParams.set(key, value);
                } else {
                     url.searchParams.delete(key);
                }
            } else {
                 url.searchParams.delete(key);
            }
        });

         Array.from(url.searchParams.keys()).forEach(key => {
             if (!url.searchParams.get(key) && !Array.isArray(queryParams[key])) {
                 url.searchParams.delete(key);
             }
         });


        return url.toString();
    }
  
  function getHeaders(requiresAuth = false) {
    const headers = { ...API_CONFIG.defaultHeaders };
    
    headers['Authorization'] = `Token ${API_CONFIG.apiKey}`;
    
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
  
  async function fetchWithAuth(endpoint, options = {}, requiresAuth = false, queryParams = {}, retry = true) {
	  
	const finalUrl = buildUrl(endpoint, queryParams);
	  
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
      const response = await fetch(finalUrl, fetchOptions);
      
      if (response.status === 401 && retry && authState.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchWithAuth(endpoint, options, requiresAuth, queryParams, false);
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
      console.error(`Erro na requisição para ${finalUrl}:`, error);
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
      language: 2,
      status: 2
    };
    
    const queryParams = { ...defaultParams, ...params };
    return fetchWithAuth(API_CONFIG.endpoints.exercises, { method: 'GET' }, false, queryParams);
  }
  
  async function getExerciseInfo(params = {}) {
    const defaultParams = {
      limit: 20,
      offset: 0,
      language: 2
    };
    
    const { id, ...listParams } = params;
    if (id) {
        console.warn('getExerciseInfo NÃO deve ser chamada com ID. Use getSingleExerciseInfo. ID ignorado.');
    }
	
	const queryParams = { ...defaultParams, ...listParams };

    Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
            delete queryParams[key];
        } else if (Array.isArray(queryParams[key])) {
             queryParams[key] = queryParams[key].filter(item => item !== undefined && item !== null && item !== '');
             if (queryParams[key].length === 0) {
                 delete queryParams[key];
             }
        }
    });

    return fetchWithAuth(API_CONFIG.endpoints.exerciseInfo, { method: 'GET' }, false, queryParams);
  }
  
   async function getSingleExerciseInfo(id) {
      if (!id) throw new Error("ID do exercício é necessário para getSingleExerciseInfo");
      console.log(`API: Buscando /exerciseinfo/${id}/`);
      const queryParams = { language: 2 };
      const urlWithPath = `${API_CONFIG.endpoints.exerciseInfo}${id}/`;
      return fetchWithAuth(urlWithPath, { method: 'GET' }, false, queryParams);
  }
  
  async function getExerciseCategories() {
    return fetchWithAuth(API_CONFIG.endpoints.exerciseCategories, { method: 'GET' });
  }
  
  async function getEquipment() {
    return fetchWithAuth(API_CONFIG.endpoints.equipment, { method: 'GET' });
  }
  
  async function getMuscles() {
    return fetchWithAuth(API_CONFIG.endpoints.muscles, { method: 'GET' }, false);
  }
  
  const dataCache = {
    muscles: null,
    equipment: null,
    categories: null,
    lastFetch: null
  };
  
  async function getAuxiliaryData() {
    const now = Date.now();
    if (dataCache.lastFetch && (now - dataCache.lastFetch) < 600000) {
      return dataCache;
    }
    
    try {
      const [muscles, equipment, categories] = await Promise.all([
        getMuscles(),
        getEquipment(),
        getExerciseCategories()
      ]);
      
      dataCache.muscles = new Map(muscles.results.map(m => [m.id, m]));
      dataCache.equipment = new Map(equipment.results.map(e => [e.id, e]));
      dataCache.categories = new Map(categories.results.map(c => [c.id, c]));
      dataCache.lastFetch = now;
      
      return dataCache;
    } catch (error) {
      console.error('Erro ao buscar dados auxiliares:', error);
      return dataCache;
    }
  }
  
function processExercise(apiExercise, auxiliaryData) {
    const targetLanguageId = 2;
    let translation = apiExercise.translations.find(t => t.language === targetLanguageId);
    if (!translation && apiExercise.translations.length > 0) {
        translation = apiExercise.translations[0];
    }

    const exerciseName = translation ? translation.name : 'Nome Indisponível';
    const exerciseDescription = translation ? cleanHtmlText(translation.description) : 'Sem descrição disponível.';

    const muscleIds = apiExercise.muscles.map(m => typeof m === 'object' ? m.id : m);
    const equipmentIds = apiExercise.equipment.map(e => typeof e === 'object' ? e.id : e);

    const muscleNames = muscleIds.map(id =>
        auxiliaryData.muscles.get(id)?.name || 'Unknown'
    );

    const equipmentNames = equipmentIds.map(id =>
        auxiliaryData.equipment.get(id)?.name || 'Sem equipamento'
    ).filter(name => name !== 'none (bodyweight exercise)');

    const categoryName = auxiliaryData.categories.get(apiExercise.category?.id)?.name || 'Other';

    const mainImage = apiExercise.images?.find(img => img.is_main);
    const imageUrl = mainImage ? mainImage.image : (apiExercise.images?.length > 0 ? apiExercise.images[0].image : 'https://placehold.co/400x300/transparent/grey?text=Sem+imagem');


    return {
        id: apiExercise.id,
        name: exerciseName,
        description: exerciseDescription || 'Sem descrição disponível.',
        muscleGroup: muscleNames[0] || categoryName,
        muscles: muscleNames.length > 0 ? muscleNames : [categoryName],
        equipment: equipmentNames.length > 0 ? equipmentNames : ['Peso Corporal'],
        image: imageUrl
    };
}
  
  function cleanHtmlText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
  
	async function searchExercises(term, languageIds = '4,2') {
		console.log(`Buscando por termo: ${term}, Idiomas: ${languageIds}`); // Debug
		if (!term) {
			return Promise.resolve({ suggestions: [] });
		}
		const queryParams = {
			term: term,
			language: languageIds
		};
		return fetchWithAuth(API_CONFIG.endpoints.exerciseSearch, { method: 'GET' }, false, queryParams);
	}
  
  window.api = {
    login,
    logout,
    isAuthenticated,
    getExercises,
    getExerciseInfo,
	getSingleExerciseInfo,
    getExerciseCategories,
    getEquipment,
    getMuscles,
	searchExercises,
    getAuxiliaryData,
    processExercise
  };
})();