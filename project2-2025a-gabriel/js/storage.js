(function() {
  'use strict';
  
  const STORAGE_KEYS = {
    FAVORITES: 'fittrack_favorites',
    FILTERS: 'fittrack_filters',
    LAST_QUERY: 'fittrack_last_query',
    VIEWED_EXERCISES: 'fittrack_viewed_exercises',
    PREFERENCES: 'fittrack_preferences'
  };
  
  const DEFAULT_VALUES = {
    filters: {
      muscles: [],
      equipment: [],
      difficulty: []
    },
    preferences: {
      showBadges: true,
      cardsPerRow: 'auto',
      sortOption: 'name',
      lastVisitedPage: 'index.html',
      firstVisit: true
    }
  };
  
  function getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Erro ao recuperar item '${key}' do localStorage:`, error);
      return defaultValue;
    }
  }
  
  function setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Erro ao salvar item '${key}' no localStorage:`, error);
      return false;
    }
  }
  
  function removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover item '${key}' do localStorage:`, error);
    }
  }
  
  function isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  function initStorage() {
    if (!isStorageAvailable()) {
      console.warn('localStorage não está disponível. As preferências não serão salvas.');
      return;
    }
    
    if (!getItem(STORAGE_KEYS.FAVORITES)) {
      setItem(STORAGE_KEYS.FAVORITES, []);
    }
    
    if (!getItem(STORAGE_KEYS.FILTERS)) {
      setItem(STORAGE_KEYS.FILTERS, DEFAULT_VALUES.filters);
    }
    
    if (!getItem(STORAGE_KEYS.PREFERENCES)) {
      setItem(STORAGE_KEYS.PREFERENCES, DEFAULT_VALUES.preferences);
    }
  }
  
  const favorites = {
    getAll: function() {
      return getItem(STORAGE_KEYS.FAVORITES, []);
    },
    
    isFavorite: function(exerciseId) {
      const favorites = this.getAll();
      return favorites.some(fav => fav.id === exerciseId);
    },
    
    add: function(exercise) {
      if (!exercise || !exercise.id) {
        console.error('Tentativa de adicionar exercício inválido aos favoritos');
        return false;
      }
      
      if (this.isFavorite(exercise.id)) {
        return true;
      }
      
      const favorites = this.getAll();
      const exerciseToSave = {
        ...exercise,
        dateAdded: new Date().toISOString()
      };
      
      favorites.push(exerciseToSave);
      return setItem(STORAGE_KEYS.FAVORITES, favorites);
    },
    
    remove: function(exerciseId) {
      const favorites = this.getAll();
      const filteredFavorites = favorites.filter(fav => fav.id !== exerciseId);
      
      if (favorites.length === filteredFavorites.length) {
        return false;
      }
      
      return setItem(STORAGE_KEYS.FAVORITES, filteredFavorites);
    },
    
    toggle: function(exercise) {
      if (this.isFavorite(exercise.id)) {
        this.remove(exercise.id);
        return false;
      } else {
        this.add(exercise);
        return true;
      }
    },
    
    clear: function() {
      return setItem(STORAGE_KEYS.FAVORITES, []);
    },
    
    sort: function(sortBy = 'name') {
      const favorites = this.getAll();
      
      switch (sortBy) {
        case 'name':
          return favorites.sort((a, b) => a.name.localeCompare(b.name));
        case 'recent':
          return favorites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        case 'muscle':
          return favorites.sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup));
        case 'difficulty':
          return favorites.sort((a, b) => a.difficulty - b.difficulty);
        default:
          return favorites;
      }
    }
  };
  
  const filters = {
    get: function() {
      return getItem(STORAGE_KEYS.FILTERS, DEFAULT_VALUES.filters);
    },
    
    update: function(newFilters) {
      return setItem(STORAGE_KEYS.FILTERS, {
        ...this.get(),
        ...newFilters
      });
    },
    
    clear: function() {
      return setItem(STORAGE_KEYS.FILTERS, DEFAULT_VALUES.filters);
    }
  };
  
  const preferences = {
    getAll: function() {
      return getItem(STORAGE_KEYS.PREFERENCES, DEFAULT_VALUES.preferences);
    },
    
    get: function(key) {
      const prefs = this.getAll();
      return prefs[key];
    },
    
    update: function(newPrefs) {
      return setItem(STORAGE_KEYS.PREFERENCES, {
        ...this.getAll(),
        ...newPrefs
      });
    },
    
    set: function(key, value) {
      const prefs = this.getAll();
      prefs[key] = value;
      return setItem(STORAGE_KEYS.PREFERENCES, prefs);
    },
    
    reset: function() {
      return setItem(STORAGE_KEYS.PREFERENCES, DEFAULT_VALUES.preferences);
    }
  };
  
  const viewed = {
    getRecent: function(limit = 5) {
      const viewedExercises = getItem(STORAGE_KEYS.VIEWED_EXERCISES, []);
      return viewedExercises.slice(0, limit);
    },
    
    add: function(exercise) {
      if (!exercise || !exercise.id) {
        return false;
      }
      
      let viewedExercises = getItem(STORAGE_KEYS.VIEWED_EXERCISES, []);
      viewedExercises = viewedExercises.filter(ex => ex.id !== exercise.id);
      
      viewedExercises.unshift({
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        timestamp: new Date().toISOString()
      });
      
      if (viewedExercises.length > 10) {
        viewedExercises = viewedExercises.slice(0, 10);
      }
      
      return setItem(STORAGE_KEYS.VIEWED_EXERCISES, viewedExercises);
    },
    
    clear: function() {
      return setItem(STORAGE_KEYS.VIEWED_EXERCISES, []);
    }
  };
  
  function exportData(type = 'favorites') {
    let data;
    
    switch (type) {
      case 'favorites':
        data = favorites.getAll();
        break;
      case 'all':
        data = {
          favorites: favorites.getAll(),
          filters: filters.get(),
          preferences: preferences.getAll(),
          viewed: viewed.getRecent(10)
        };
        break;
      default:
        data = favorites.getAll();
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }
  
  function importData(data, type = 'favorites') {
    try {
      if (type === 'favorites' && Array.isArray(data)) {
        return setItem(STORAGE_KEYS.FAVORITES, data);
      } else if (type === 'all' && typeof data === 'object') {
        if (data.favorites) setItem(STORAGE_KEYS.FAVORITES, data.favorites);
        if (data.filters) setItem(STORAGE_KEYS.FILTERS, data.filters);
        if (data.preferences) setItem(STORAGE_KEYS.PREFERENCES, data.preferences);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }
  
  document.addEventListener('DOMContentLoaded', initStorage);
  
  window.storage = {
    favorites,
    filters,
    preferences,
    viewed,
    exportData,
    importData,
    isAvailable: isStorageAvailable
  };
})();