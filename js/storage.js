(function() {
  'use strict';
  
  const STORAGE_KEYS = {
	FAVORITES: 'fittrack_favorites_v2',
    CUSTOM_CATEGORIES: 'fittrack_custom_categories',
    FILTERS: 'fittrack_filters',
    LAST_QUERY: 'fittrack_last_query',
    VIEWED_EXERCISES: 'fittrack_viewed_exercises',
    PREFERENCES: 'fittrack_preferences'
  };
  
  const DEFAULT_VALUES = {
	favorites: [],
	customCategories: [{ id: 'all', name: 'Todas as Categorias' }, { id: 'uncategorized', name: 'Sem Categoria' }],
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
      console.warn('localStorage não está disponível.');
      return;
    }

    if (!getItem(STORAGE_KEYS.FAVORITES)) {
       const oldFavorites = localStorage.getItem('fittrack_favorites');
       if (oldFavorites) {
           try {
               const parsedOld = JSON.parse(oldFavorites);
               const migratedFavorites = parsedOld.map(fav => ({ ...fav, customCategoryId: null }));
               setItem(STORAGE_KEYS.FAVORITES, migratedFavorites);
               localStorage.removeItem('fittrack_favorites');
               console.log("Favoritos migrados para nova estrutura.");
           } catch (e) {
                console.error("Erro ao migrar favoritos antigos, iniciando com lista vazia.", e);
               setItem(STORAGE_KEYS.FAVORITES, DEFAULT_VALUES.favorites);
           }
       } else {
            setItem(STORAGE_KEYS.FAVORITES, DEFAULT_VALUES.favorites);
       }
    }

    if (!getItem(STORAGE_KEYS.CUSTOM_CATEGORIES)) {
      setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, DEFAULT_VALUES.customCategories);
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
  
  const customCategories = {
      getAll: function() {
          let categories = getItem(STORAGE_KEYS.CUSTOM_CATEGORIES, [...DEFAULT_VALUES.customCategories]);
          if (!categories.find(c => c.id === 'all')) {
              categories.unshift({ id: 'all', name: 'Todas as Categorias' });
          }
           if (!categories.find(c => c.id === 'uncategorized')) {
               const allIndex = categories.findIndex(c => c.id === 'all');
               categories.splice(allIndex + 1, 0, { id: 'uncategorized', name: 'Sem Categoria' });
           }
           categories = categories.filter((category, index, self) =>
               index === self.findIndex((c) => c.id === category.id)
           );
          setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, categories); // Salva caso tenha corrigido
          return categories;
      },

      add: function(name) {
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
              console.error("Nome de categoria inválido.");
              return null;
          }
          const categories = this.getAll();
          const normalizedName = name.trim();

          if (categories.some(cat => cat.name.toLowerCase() === normalizedName.toLowerCase())) {
              console.warn(`Categoria "${normalizedName}" já existe.`);
              return null;
          }

          const newCategory = {
              id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // ID único simples
              name: normalizedName
          };
          categories.push(newCategory);
          setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, categories);
          return newCategory;
      },

      remove: function(categoryId) {
          if (!categoryId || categoryId === 'all' || categoryId === 'uncategorized') {
              console.error("Não é possível remover categorias padrão.");
              return false;
          }
          let categories = this.getAll();
          const initialLength = categories.length;
          categories = categories.filter(cat => cat.id !== categoryId);

          if (categories.length < initialLength) {
              setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, categories);
              favorites.unassignCategory(categoryId);
              return true;
          }
          return false;
      },

      update: function(categoryId, newName) {
           if (!categoryId || categoryId === 'all' || categoryId === 'uncategorized' || !newName || typeof newName !== 'string' || newName.trim().length === 0) {
              console.error("ID ou nome inválido para atualizar categoria.");
              return false;
          }
          let categories = this.getAll();
          const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
          const normalizedNewName = newName.trim();

          if (categoryIndex === -1) {
              console.error(`Categoria com ID "${categoryId}" não encontrada para atualizar.`);
              return false;
          }

           if (categories.some((cat, index) => index !== categoryIndex && cat.name.toLowerCase() === normalizedNewName.toLowerCase())) {
               console.warn(`Já existe uma categoria com o nome "${normalizedNewName}".`);
               return false;
           }


          categories[categoryIndex].name = normalizedNewName;
          setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, categories);
          return true;
      }
  };
  
  const favorites = {
    getAll: function() {
      return getItem(STORAGE_KEYS.FAVORITES, []);
    },
    
    isFavorite: function(exerciseId) {
      const favorites = this.getAll();
      return favorites.some(fav => fav.id === exerciseId);
    },
    
    add: function(exercise, customCategoryId = null) {
      if (!exercise || typeof exercise.id !== 'number') {
        console.error('Tentativa de adicionar exercício inválido aos favoritos', exercise);
        return false;
      }

      if (this.isFavorite(exercise.id)) {
        console.warn(`Exercício ${exercise.id} já é favorito.`);
        return this.assignCategory(exercise.id, customCategoryId);
      }

      const favorites = this.getAll();
      const exerciseToSave = {
        ...exercise,
        customCategoryId: customCategoryId,
        dateAdded: new Date().toISOString()
      };

      favorites.push(exerciseToSave);
      return setItem(STORAGE_KEYS.FAVORITES, favorites);
    },
    
    remove: function(exerciseId) {
      let favorites = this.getAll();
      const initialLength = favorites.length;
      favorites = favorites.filter(fav => fav.id !== exerciseId);

      if (favorites.length < initialLength) {
         return setItem(STORAGE_KEYS.FAVORITES, favorites);
      }
      return false;
    },
    
    toggle: function(exerciseData) {
        if (this.isFavorite(exerciseData.id)) {
            this.remove(exerciseData.id);
            return false;
        } else {
             console.error("favorites.toggle não deve ser usado para adicionar. Use favorites.add com dados detalhados.");
             return false;
        }
    },
	
    assignCategory: function(exerciseId, categoryId) {
        let favorites = this.getAll();
        const exerciseIndex = favorites.findIndex(fav => fav.id === exerciseId);

        if (exerciseIndex === -1) {
            console.error(`Exercício favorito ${exerciseId} não encontrado para atribuir categoria.`);
            return false;
        }

        const targetCategoryId = categoryId === 'uncategorized' ? null : categoryId;

         if (targetCategoryId !== null && !customCategories.getAll().some(cat => cat.id === targetCategoryId)) {
             console.error(`Categoria customizada com ID "${targetCategoryId}" não existe.`);
             return false;
         }


        favorites[exerciseIndex].customCategoryId = targetCategoryId;
        return setItem(STORAGE_KEYS.FAVORITES, favorites);
    },
	
    unassignCategory: function(deletedCategoryId) {
        let favorites = this.getAll();
        let changed = false;
        favorites.forEach(fav => {
            if (fav.customCategoryId === deletedCategoryId) {
                fav.customCategoryId = null;
                changed = true;
            }
        });
        if (changed) {
            setItem(STORAGE_KEYS.FAVORITES, favorites);
        }
    },
    
    clear: function() {
      return setItem(STORAGE_KEYS.FAVORITES, []);
    },
    
    sort: function(sortBy = 'name') {
        const favorites = this.getAll();
        const categories = customCategories.getAll();
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

         switch (sortBy) {
            case 'name':
              return favorites.sort((a, b) => a.name.localeCompare(b.name));
            case 'recent':
              return favorites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            case 'muscle':
              return favorites.sort((a, b) => (a.muscleGroup || '').localeCompare(b.muscleGroup || ''));
             case 'customCategory':
                 return favorites.sort((a, b) => {
                     const catAName = a.customCategoryId ? categoryMap.get(a.customCategoryId) || 'Sem Categoria' : 'Sem Categoria';
                     const catBName = b.customCategoryId ? categoryMap.get(b.customCategoryId) || 'Sem Categoria' : 'Sem Categoria';
                     return catAName.localeCompare(catBName);
                 });
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
  
  function exportData(type = 'all') {
    let dataToExport = {};
    let fileName = 'fitcat-data.json';

    if (type === 'favorites') {
        dataToExport = { favorites: favorites.getAll() };
        fileName = 'fitcat-favoritos-legacy.json';
    } else {
        dataToExport = {
          favorites: favorites.getAll(),
          custom_categories: customCategories.getAll().filter(c => c.id !== 'all' && c.id !== 'uncategorized'),
          filters: filters.get(),
          preferences: preferences.getAll(),
          viewed: viewed.getRecent(10)
        };
         fileName = 'fitcat-dados-completos.json';
    }


    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    return { url: URL.createObjectURL(blob), filename: fileName };
  }
  
 function importData(data, type = 'all') { // 'all' para importar a estrutura completa
    try {
      if (typeof data !== 'object' || data === null) {
          throw new Error("Dados de importação inválidos: não é um objeto.");
      }

      let favoritesImported = false;
      let categoriesImported = false;

      if (Array.isArray(data.favorites)) {
          const validFavorites = data.favorites.filter(fav => fav && typeof fav.id === 'number' && typeof fav.name === 'string');
          const favoritesToSave = validFavorites.map(fav => ({
              ...fav,
              customCategoryId: fav.customCategoryId !== undefined ? fav.customCategoryId : null
          }));
          setItem(STORAGE_KEYS.FAVORITES, favoritesToSave);
          favoritesImported = true;
          console.log(`${favoritesToSave.length} favoritos importados.`);
      } else if (type === 'favorites' && Array.isArray(data)) {
           const validFavorites = data.filter(fav => fav && typeof fav.id === 'number' && typeof fav.name === 'string');
           const favoritesToSave = validFavorites.map(fav => ({ ...fav, customCategoryId: null }));
           setItem(STORAGE_KEYS.FAVORITES, favoritesToSave);
           favoritesImported = true;
           console.log(`${favoritesToSave.length} favoritos importados (formato legado).`);
      }

      if (type === 'all' && Array.isArray(data.custom_categories)) {
           const validCategories = data.custom_categories.filter(cat => cat && typeof cat.id === 'string' && typeof cat.name === 'string');
           let currentCategories = getItem(STORAGE_KEYS.CUSTOM_CATEGORIES, DEFAULT_VALUES.customCategories);
           const currentIds = new Set(currentCategories.map(c => c.id));

           validCategories.forEach(importedCat => {
               if (!currentIds.has(importedCat.id)) {
                   currentCategories.push(importedCat);
                   currentIds.add(importedCat.id);
               } else {
                   const existingIndex = currentCategories.findIndex(c => c.id === importedCat.id);
                   if (existingIndex > -1) currentCategories[existingIndex].name = importedCat.name;
                   console.warn(`Categoria importada com ID ${importedCat.id} já existe, ignorando.`);
               }
           });
           if (!currentCategories.some(c => c.id === 'all')) currentCategories.unshift({ id: 'all', name: 'Todas as Categorias' });
           if (!currentCategories.some(c => c.id === 'uncategorized')) {
                const allIdx = currentCategories.findIndex(c => c.id === 'all');
                currentCategories.splice(allIdx + 1, 0, { id: 'uncategorized', name: 'Sem Categoria' });
           }

           setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, currentCategories);
           categoriesImported = true;
           console.log(`${validCategories.length} categorias customizadas encontradas para importação/mesclagem.`);
      }

       if (favoritesImported) {
           let finalFavorites = getItem(STORAGE_KEYS.FAVORITES);
           const finalCategories = getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
           const finalCategoryIds = new Set(finalCategories.map(c => c.id));
           let changed = false;
           finalFavorites.forEach(fav => {
               if (fav.customCategoryId !== null && !finalCategoryIds.has(fav.customCategoryId)) {
                   console.warn(`Favorito ${fav.id} apontava para categoria ${fav.customCategoryId} inexistente. Removendo categoria.`);
                   fav.customCategoryId = null;
                   changed = true;
               }
           });
           if (changed) {
               setItem(STORAGE_KEYS.FAVORITES, finalFavorites);
           }
       }


      return favoritesImported || categoriesImported;

    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }
  
  document.addEventListener('DOMContentLoaded', initStorage);
  
  window.storage = {
    favorites,
	customCategories,
    filters,
    preferences,
    viewed,
    exportData,
    importData,
    isAvailable: isStorageAvailable
  };
})();