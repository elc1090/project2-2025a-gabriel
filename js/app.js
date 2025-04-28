(function() {
  'use strict';
  
  const elements = {
    exerciseGrid: document.getElementById('exercise-grid'),
    favoritesGrid: document.getElementById('favorites-grid'),
    detailPanel: document.getElementById('detail-panel'),
    detailContent: document.getElementById('detail-content'),
    sidebar: document.getElementById('sidebar'),
    
    searchInput: document.getElementById('search-input'),
    navToggle: document.getElementById('nav-toggle'),
    sidebarClose: document.getElementById('sidebar-close'),
    detailPanelClose: document.getElementById('detail-panel-close'),
    filterBtnMobile: document.getElementById('filter-btn-mobile'),
    clearFavorites: document.getElementById('clear-favorites'),
	clearFiltersBtn: document.getElementById('clear-filters-btn'),
    sortFavorites: document.getElementById('sort-favorites'),
    exportFavoritesBtn: document.getElementById('export-favorites-btn'),
    importFavoritesBtn: document.getElementById('import-favorites-btn'),
    importFileInput: document.getElementById('import-file-input'),
	
    categoryFilterSelect: document.getElementById('category-filter-select'),
    newCategoryInput: document.getElementById('new-category-input'),
    addCategoryBtn: document.getElementById('add-category-btn'),
    
    emptyFavorites: document.getElementById('empty-favorites'),
    
    toastContainer: document.getElementById('toast-container'),
	
    deleteCategoriesBtn: document.getElementById('delete-categories-btn'),
    categoryListModalOverlay: document.getElementById('category-list-modal-overlay'),
    categoryListModal: document.getElementById('category-list-modal'),
    categoryListModalClose: document.getElementById('category-list-modal-close'),
    categoryDeleteList: document.getElementById('category-delete-list'),
    confirmDeleteModalOverlay: document.getElementById('confirm-delete-modal-overlay'),
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    confirmDeleteModalClose: document.getElementById('confirm-delete-modal-close'),
    categoryToDeleteName: document.getElementById('category-to-delete-name'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    emptyDeleteListMessage: document.querySelector('.category-delete-list__empty')
  };
  
  const state = {
    isLoading: false,
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    totalItems: 0,
    currentView: window.location.pathname.includes('favorites.html') ? 'favorites' : 'exercises',
    detailOpen: false,
    sidebarOpen: false,
    selectedExercise: null,
    filters: { muscles: [], equipment: [], category: null },
	currentFavoriteFilter: 'all',
    exercises: [],
    searchQuery: '',
    auxiliaryData: null,
    muscleGroups: {
      'Chest': { name: 'Peito', color: 'var(--color-muscle-chest)' },
      'Back': { name: 'Costas', color: 'var(--color-muscle-back)' },
      'Arms': { name: 'Braços', color: 'var(--color-muscle-arms)' },
      'Legs': { name: 'Pernas', color: 'var(--color-muscle-legs)' },
      'Shoulders': { name: 'Ombros', color: 'var(--color-muscle-shoulders)' },
      'Abs': { name: 'Abdômen', color: 'var(--color-muscle-core)' },
      'Calves': { name: 'Panturrilhas', color: 'var(--color-muscle-legs)' },
      'Biceps': { name: 'Bíceps', color: 'var(--color-muscle-arms)' },
      'Triceps': { name: 'Tríceps', color: 'var(--color-muscle-arms)' },
      'Glutes': { name: 'Glúteos', color: 'var(--color-muscle-legs)' },
      'Quadriceps': { name: 'Quadríceps', color: 'var(--color-muscle-legs)' },
      'Hamstrings': { name: 'Posteriores', color: 'var(--color-muscle-legs)' }
    },
    categoryToDelete: null
  };
  
  async function init() {
    console.log("Iniciando aplicação...");
    if (!storage.isAvailable()) {
        showToast('Atenção', 'O armazenamento local não está disponível.', 'warning');
    }

    setupEventListeners();
    console.log("Listeners de eventos configurados.");

    try {
        console.log("Carregando dados auxiliares...");
        const auxDataPromise = api.getAuxiliaryData().catch(err => {
            console.error("Falha crítica ao carregar dados auxiliares:", err);
            showToast('Erro Grave', 'Falha ao carregar dados essenciais da API. Algumas funcionalidades podem estar indisponíveis.', 'error');
            return null;
        });
        state.auxiliaryData = await auxDataPromise;
        console.log("Dados auxiliares carregados:", state.auxiliaryData);

        console.log("Populando filtros e chips...");
        if (state.auxiliaryData && state.auxiliaryData.muscles && state.auxiliaryData.categories && state.auxiliaryData.equipment) {
            populateFiltersDynamically();
            populateCategoryChips();
        } else {
            console.warn("Não foi possível popular filtros/chips devido à falha no carregamento dos dados auxiliares.");
        }
        console.log("Filtros e chips populados (ou ignorados).");

        if (state.currentView === 'favorites') {
            console.log("Inicializando view de Favoritos...");
             if (elements.favoritesGrid) {
                 elements.favoritesGrid.innerHTML = '';
             }
             populateCategoryFilter();
            initFavoritesView();
        } else if (state.currentView === 'exercises') {
            console.log("Inicializando view de Exercícios...");
            await initExercisesView();
        }
         console.log("Inicialização completa.");

    } catch (error) {
        console.error("Erro geral durante a inicialização:", error);
        showToast('Erro', `Falha ao inicializar a aplicação: ${error.message}`, 'error');
        if (elements.exerciseGrid) {
            elements.exerciseGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Erro ao carregar dados iniciais. Tente recarregar a página.</p>';
        }
         if (elements.favoritesGrid) {
             elements.favoritesGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Erro ao carregar dados iniciais. Tente recarregar a página.</p>';
         }
    }
}

  function populateCategoryFilter() {
      if (!elements.categoryFilterSelect) return;

      const categories = storage.customCategories.getAll();
      const selectedValue = elements.categoryFilterSelect.value || state.currentFavoriteFilter || 'all';

      elements.categoryFilterSelect.innerHTML = '';

      categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          if (cat.id === selectedValue) {
              option.selected = true;
          }
          elements.categoryFilterSelect.appendChild(option);
      });
      state.currentFavoriteFilter = elements.categoryFilterSelect.value;
  }
  
  function populateFiltersDynamically() {
    const muscleListElement = document.getElementById('muscle-filter-list');
    const equipmentListElement = document.getElementById('equipment-filter-list');

    if (!muscleListElement || !equipmentListElement || !state.auxiliaryData) return;

    muscleListElement.innerHTML = '';
    equipmentListElement.innerHTML = '';

    state.auxiliaryData.muscles.forEach(muscle => {
        const li = document.createElement('li');
        li.className = 'filter-item';
        li.innerHTML = `
            <label class="filter-checkbox">
              <input type="checkbox" class="filter-checkbox__input" name="muscles" value="${muscle.id}">
              <span class="filter-checkbox__label">${muscle.name}</span>
            </label>
        `;
        muscleListElement.appendChild(li);
    });

    state.auxiliaryData.equipment.forEach(equip => {
         const li = document.createElement('li');
         li.className = 'filter-item';
         li.innerHTML = `
             <label class="filter-checkbox">
               <input type="checkbox" class="filter-checkbox__input" name="equipment" value="${equip.id}">
               <span class="filter-checkbox__label">${equip.name}</span>
             </label>
         `;
         equipmentListElement.appendChild(li);
    });

    document.querySelectorAll('.filter-checkbox__input').forEach(checkbox => {
        checkbox.removeEventListener('change', handleFilterChange);
        checkbox.addEventListener('change', handleFilterChange);
    });
}

	function handleClearFiltersClick() {
		console.log("--- Limpar Filtros Clicado ---"); // Debug

		state.filters = { muscles: [], equipment: [], category: null };

		document.querySelectorAll('#muscle-filter-list .filter-checkbox__input, #equipment-filter-list .filter-checkbox__input').forEach(checkbox => {
			checkbox.checked = false;
		});

		document.querySelectorAll('#chip-container .chip').forEach(chip => {
			if (chip.dataset.filterType === 'all') {
				chip.classList.add('active');
			} else {
				chip.classList.remove('active');
			}
		});

		if (elements.searchInput) {
			elements.searchInput.value = '';
			state.searchQuery = '';
		}


		loadExercises(1, state.filters);

		if (window.innerWidth < 768 && state.sidebarOpen) {
			closeSidebar();
		}
	}
  
  function setupEventListeners() {
    if (elements.navToggle) {
      elements.navToggle.addEventListener('click', toggleSidebar);
    }
    
    if (elements.sidebarClose) {
      elements.sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (elements.filterBtnMobile) {
      elements.filterBtnMobile.addEventListener('click', handleMobileFilterBtn);
    }
    
    if (elements.detailPanelClose) {
      elements.detailPanelClose.addEventListener('click', closeDetailPanel);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearchInput, 3000));

        elements.searchInput.addEventListener('keydown', handleSearchEnter);
    }
	
    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener('click', handleClearFiltersClick);
    }
    
    document.querySelectorAll('.filter-checkbox__input').forEach(checkbox => {
      checkbox.addEventListener('change', handleFilterChange);
    });
    
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', handleChipFilter);
    });
    
    if (state.currentView === 'favorites') {
        if (elements.categoryFilterSelect) {
            elements.categoryFilterSelect.addEventListener('change', handleCategoryFilterChange);
        }
        if (elements.addCategoryBtn) {
            elements.addCategoryBtn.addEventListener('click', handleAddCategory);
        }
        if (elements.newCategoryInput) {
            elements.newCategoryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAddCategory();
                }
            });
        }
         if (elements.sortFavorites) {
            elements.sortFavorites.removeEventListener('change', handleSortFavorites);
            elements.sortFavorites.addEventListener('change', handleSortFavorites);
        }
        if (elements.clearFavorites) {
             elements.clearFavorites.removeEventListener('click', clearAllFavorites);
             elements.clearFavorites.addEventListener('click', clearAllFavorites);
        }
         if (elements.exportFavoritesBtn) {
             elements.exportFavoritesBtn.removeEventListener('click', exportFavorites);
             elements.exportFavoritesBtn.addEventListener('click', exportFavorites);
         }
         if (elements.importFavoritesBtn) {
              elements.importFavoritesBtn.removeEventListener('click', triggerImport);
              elements.importFavoritesBtn.addEventListener('click', triggerImport);
         }
          if (elements.importFileInput) {
              elements.importFileInput.removeEventListener('change', importFavorites);
              elements.importFileInput.addEventListener('change', importFavorites);
          }
        if (elements.deleteCategoriesBtn) {
            elements.deleteCategoriesBtn.addEventListener('click', openCategoryListModal);
        }
        if (elements.categoryListModalOverlay) {
            elements.categoryListModalOverlay.addEventListener('click', (e) => {
                 if (e.target === elements.categoryListModalOverlay) {
                     closeCategoryListModal();
                 }
            });
        }
        if (elements.categoryListModalClose) {
            elements.categoryListModalClose.addEventListener('click', closeCategoryListModal);
        }
        if (elements.confirmDeleteModalOverlay) {
            elements.confirmDeleteModalOverlay.addEventListener('click', (e) => {
                 if (e.target === elements.confirmDeleteModalOverlay) {
                     closeConfirmDeleteModal();
                 }
            });
        }
        if (elements.confirmDeleteModalClose) {
            elements.confirmDeleteModalClose.addEventListener('click', closeConfirmDeleteModal);
        }
        if (elements.cancelDeleteBtn) {
            elements.cancelDeleteBtn.addEventListener('click', closeConfirmDeleteModal);
        }
        if (elements.confirmDeleteBtn) {
            elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
        }
    }
	
     document.querySelectorAll('#chip-container .chip[data-filter-type="all"], #chip-container .chip[data-filter-type="no-equipment"]').forEach(chip => {
         const newChip = chip.cloneNode(true);
         chip.parentNode.replaceChild(newChip, chip);
         newChip.addEventListener('click', handleChipFilter);
     });
    
    document.addEventListener('click', (e) => {
      if (state.sidebarOpen && window.innerWidth < 768) {
        if (!elements.sidebar.contains(e.target) && 
            !elements.navToggle.contains(e.target) && 
            !elements.filterBtnMobile.contains(e.target)) {
          closeSidebar();
        }
      }
    });
    
    window.addEventListener('resize', handleWindowResize);
	
  }

  function openCategoryListModal() {
      populateCategoryDeleteList();
      if (elements.categoryListModalOverlay) {
          elements.categoryListModalOverlay.style.display = 'flex';
          setTimeout(() => elements.categoryListModalOverlay.classList.add('open'), 10);
      }
  }

  function closeCategoryListModal() {
      if (elements.categoryListModalOverlay) {
          elements.categoryListModalOverlay.classList.remove('open');
          setTimeout(() => elements.categoryListModalOverlay.style.display = 'none', 300); // Match transition duration
      }
  }

  function populateCategoryDeleteList() {
      if (!elements.categoryDeleteList || !elements.emptyDeleteListMessage) return;

      const categories = storage.customCategories.getAll();
      const customCategories = categories.filter(cat => cat.id !== 'all' && cat.id !== 'uncategorized');

      elements.categoryDeleteList.innerHTML = '';

      if (customCategories.length === 0) {
          elements.emptyDeleteListMessage.style.display = 'block';
      } else {
          elements.emptyDeleteListMessage.style.display = 'none';
          customCategories.forEach(cat => {
              const listItem = document.createElement('li');
              listItem.className = 'category-delete-list__item';
              listItem.dataset.categoryId = cat.id;
              listItem.dataset.categoryName = cat.name;
              listItem.innerHTML = `
                  <span>${cat.name}</span>
                  <i class="fa-solid fa-trash-can"></i>
              `;
              listItem.addEventListener('click', () => {
                  openConfirmDeleteModal(cat.id, cat.name);
              });
              elements.categoryDeleteList.appendChild(listItem);
          });
      }
  }

  function openConfirmDeleteModal(categoryId, categoryName) {
      state.categoryToDelete = { id: categoryId, name: categoryName };
      if (elements.categoryToDeleteName) {
          elements.categoryToDeleteName.textContent = categoryName;
      }
      if (elements.confirmDeleteModalOverlay) {
          elements.confirmDeleteModalOverlay.style.display = 'flex';
          setTimeout(() => elements.confirmDeleteModalOverlay.classList.add('open'), 10);
      }
  }

  function closeConfirmDeleteModal() {
      if (elements.confirmDeleteModalOverlay) {
          elements.confirmDeleteModalOverlay.classList.remove('open');
          setTimeout(() => {
              elements.confirmDeleteModalOverlay.style.display = 'none';
              state.categoryToDelete = null;
              if (elements.categoryToDeleteName) elements.categoryToDeleteName.textContent = '';
          }, 300);
      }
  }

  function handleConfirmDelete() {
      if (!state.categoryToDelete) return;

      const { id: categoryId, name: categoryName } = state.categoryToDelete;
      const success = storage.customCategories.remove(categoryId);

      if (success) {
          showToast('Sucesso', `Categoria "${categoryName}" deletada.`, 'success');
          closeConfirmDeleteModal();
          closeCategoryListModal();
          populateCategoryFilter();
          applyFavoriteFiltersAndSort();
      } else {
          showToast('Erro', `Não foi possível deletar a categoria "${categoryName}".`, 'error');
      }
  }
	
  function handleAddCategory() {
      if (!elements.newCategoryInput) return;

      const categoryName = elements.newCategoryInput.value.trim();
      if (!categoryName) {
          showToast('Atenção', 'Digite um nome para a nova categoria.', 'warning');
          return;
      }

      const newCategory = storage.customCategories.add(categoryName);

      if (newCategory) {
          showToast('Sucesso', `Categoria "${newCategory.name}" criada!`, 'success');
          elements.newCategoryInput.value = '';
          populateCategoryFilter();
      } else {
          showToast('Erro', `Não foi possível criar a categoria "${categoryName}". Verifique se já existe.`, 'error');
      }
  }
  
  
    function handleCategoryFilterChange(event) {
      state.currentFavoriteFilter = event.target.value;
      applyFavoriteFiltersAndSort();
  }
  
    function handleSortFavorites(event) {
     applyFavoriteFiltersAndSort();
  }
  
    function triggerImport() {
        if (elements.importFileInput) {
            elements.importFileInput.click();
        }
    }
	
   function applyFavoriteFiltersAndSort() {
       if (!elements.favoritesGrid) return;

       const allFavorites = storage.favorites.getAll();
       let filteredFavorites = [];

       const filterId = state.currentFavoriteFilter;
       if (filterId === 'all') {
           filteredFavorites = allFavorites;
       } else if (filterId === 'uncategorized') {
           filteredFavorites = allFavorites.filter(fav => fav.customCategoryId === null || fav.customCategoryId === undefined);
       } else {
           filteredFavorites = allFavorites.filter(fav => fav.customCategoryId === filterId);
       }

       const sortOption = elements.sortFavorites ? elements.sortFavorites.value : 'name';
       const sortedAndFilteredFavorites = storage.favorites.sort.call({ getAll: () => filteredFavorites }, sortOption);

       renderFavorites(sortedAndFilteredFavorites);
   }
  
  function exportFavorites() {
    try {
        // Chama exportData pedindo 'all' para incluir categorias
        const exportResult = storage.exportData('all');
        if (!exportResult || !exportResult.url) {
             throw new Error("Falha ao gerar dados para exportação.");
        }

        const a = document.createElement('a');
        a.href = exportResult.url;
        a.download = exportResult.filename; // Usa o nome de arquivo retornado
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(exportResult.url);
        showToast('Exportado', 'Dados completos (favoritos e categorias) exportados!', 'success');

    } catch (error) {
        console.error('Erro ao exportar dados completos:', error);
        showToast('Erro', `Ocorreu um erro ao exportar: ${error.message}`, 'error');
    }
  }

  function importFavorites(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json') {
        showToast('Erro', 'Por favor, selecione um arquivo .json válido.', 'error');
        event.target.value = null;
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedJson = JSON.parse(e.target.result);

            // Verifica se é o formato novo (objeto) ou antigo (array)
            let dataToImport;
            let importType;
            if (Array.isArray(importedJson)) {
                 // Formato antigo (apenas favoritos)
                 dataToImport = importedJson;
                 importType = 'favorites'; // Indica para storage.importData tratar como legado
                 console.log("Detectado formato legado de importação (apenas favoritos).");
            } else if (typeof importedJson === 'object' && importedJson !== null && (Array.isArray(importedJson.favorites) || Array.isArray(importedJson.custom_categories))) {
                // Formato novo (objeto com chaves)
                dataToImport = importedJson;
                importType = 'all';
                 console.log("Detectado formato novo de importação (favoritos e/ou categorias).");
            } else {
                 throw new Error('Formato de arquivo JSON inválido ou não reconhecido.');
            }


            // Chama storage.importData com o tipo correto
            const success = storage.importData(dataToImport, importType);

            if (success) {
                showToast('Importado', 'Dados importados com sucesso!', 'success');
                 // Atualiza a UI na página de favoritos
                 if (state.currentView === 'favorites') {
                     populateCategoryFilter(); // Atualiza o dropdown de categorias
                     initFavoritesView();      // Recarrega a lista de favoritos
                 }
            } else {
                // storage.importData deve ter logado o erro específico
                throw new Error('Falha ao salvar os dados importados (ver console para detalhes).');
            }

        } catch (error) {
            console.error('Erro ao importar dados:', error);
            showToast('Erro', `Falha ao importar: ${error.message}`, 'error');
        } finally {
             event.target.value = null; // Limpa input
        }
    };

    reader.onerror = function() {
        console.error('Erro ao ler o arquivo de importação.');
        showToast('Erro', 'Não foi possível ler o arquivo selecionado.', 'error');
        event.target.value = null;
    };

    reader.readAsText(file);
  }
  
  async function initExercisesView() {
    try {
      showLoading();
      
      state.auxiliaryData = await api.getAuxiliaryData();
      
      await loadExercises();
      
      setupPagination();
      
    } catch (error) {
      console.error('Erro ao inicializar visualização de exercícios:', error);
      showToast('Erro', 'Falha ao carregar exercícios. Tente novamente.', 'error');
    } finally {
      hideLoading();
    }
  }
  
async function loadExercises(page = 1, filters = state.filters) {
    console.log(`--- loadExercises chamado --- Página: ${page}, Filtros:`, JSON.stringify(filters), "Busca:", state.searchQuery); // Debug
    const paginationContainer = document.querySelector('.pagination');

    try {
        showLoading();
        const offset = (page - 1) * state.itemsPerPage;
        let response;
        let isSearch = false;

        if (state.searchQuery) {
            console.log(`Executando BUSCA por: "${state.searchQuery}"`); // Debug
            isSearch = true;
            response = await api.searchExercises(state.searchQuery, '4,2');
             state.currentPage = 1;
             state.totalPages = 1;
             state.totalItems = response.suggestions?.length || 0;
             if (paginationContainer) paginationContainer.style.display = 'none';

        } else {
            console.log("Carregando exercícios com filtros/paginação"); // Debug
            isSearch = false;
            const apiParams = {
                limit: state.itemsPerPage,
                offset: offset,
                language: 4
            };
            if (filters.muscles && filters.muscles.length > 0) apiParams.muscles = filters.muscles;
            if (filters.equipment && filters.equipment.length > 0) {
                const validEquipmentIds = filters.equipment.filter(id => !isNaN(parseInt(id)));
                if (validEquipmentIds.length > 0) apiParams.equipment = validEquipmentIds;
            }
            if (filters.category) apiParams.category = filters.category;

            console.log("Parâmetros enviados para API (Info):", apiParams);
            response = await api.getExerciseInfo(apiParams);
            state.currentPage = page;
            state.totalItems = response.count;
            state.totalPages = Math.ceil(response.count / state.itemsPerPage);
             if (paginationContainer) paginationContainer.style.display = 'flex';
        }

        console.log("Resposta da API recebida:", response); // Debug

        if (!isSearch && !state.auxiliaryData) {
             console.log("Recarregando dados auxiliares para processamento..."); // Debug
             state.auxiliaryData = await api.getAuxiliaryData();
        }

        if (isSearch && response.suggestions) {
            console.log("Processando sugestões de busca..."); // Debug
            state.exercises = response.suggestions.map(suggestion =>
                processSearchSuggestion(suggestion.data)
            );
        } else if (!isSearch && response.results) {
             console.log("Processando resultados de exerciseinfo..."); // Debug
            state.exercises = response.results.map(exercise =>
                api.processExercise(exercise, state.auxiliaryData)
            );
        } else {
             console.log("Resposta inesperada ou vazia da API."); // Debug
             state.exercises = [];
             if (!isSearch) {
                 state.currentPage = 1;
                 state.totalPages = 0;
                 state.totalItems = 0;
             }
        }

        renderExercises(state.exercises);

        if (!isSearch) {
             updatePaginationControls();
        }


    } catch (error) {
         console.error('Erro ao carregar exercícios:', error);
         showToast('Erro', `Falha ao carregar exercícios: ${error.message}`, 'error');
         if(elements.exerciseGrid) elements.exerciseGrid.innerHTML = `<p class="text-center" style="grid-column: 1/-1;">Erro ao carregar exercícios: ${error.message}</p>`;
         if (paginationContainer) paginationContainer.style.display = 'none';
     } finally {
         hideLoading();
     }
 }
  
  function renderExercises(exercises) {
    if (!elements.exerciseGrid) return;
    
    elements.exerciseGrid.innerHTML = '';
    
    exercises.forEach(exercise => {
      const card = createExerciseCard(exercise, storage.favorites.isFavorite(exercise.id));
      elements.exerciseGrid.appendChild(card);
    });
    
    setupExerciseCards();
  }
  
  function showLoading() {
    if (!elements.exerciseGrid && state.currentView === 'exercises') return;
    
    state.isLoading = true;
    
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.id = 'loading-indicator';
    loadingElement.innerHTML = '<div class="spinner"></div>';
    
    if (state.currentView === 'exercises' && elements.exerciseGrid) {
      elements.exerciseGrid.parentNode.insertBefore(loadingElement, elements.exerciseGrid);
    }
  }
  
  function hideLoading() {
    state.isLoading = false;
    
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
      loadingElement.remove();
    }
  }
  
  function setupPagination() {
    document.querySelectorAll('.pagination__button').forEach(button => {
      button.addEventListener('click', handlePaginationClick);
    });
  }
  
  function handlePaginationClick(e) {
    const button = e.currentTarget;
    
    if (button.disabled) return;
    
    if (button.classList.contains('pagination__button--prev')) {
      loadExercises(state.currentPage - 1);
    } else if (button.classList.contains('pagination__button--next')) {
      loadExercises(state.currentPage + 1);
    } else {
      const page = parseInt(button.textContent);
      if (!isNaN(page)) {
        loadExercises(page);
      }
    }
  }
  
  function updatePaginationControls() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination__button pagination__button--prev';
    prevButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevButton.disabled = state.currentPage === 1;
    prevButton.addEventListener('click', () => loadExercises(state.currentPage - 1));
    paginationContainer.appendChild(prevButton);
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `pagination__button ${i === state.currentPage ? 'active' : ''}`;
      pageButton.textContent = i;
      pageButton.addEventListener('click', () => loadExercises(i));
      paginationContainer.appendChild(pageButton);
    }
    
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination__button pagination__button--next';
    nextButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextButton.disabled = state.currentPage === state.totalPages;
    nextButton.addEventListener('click', () => loadExercises(state.currentPage + 1));
    paginationContainer.appendChild(nextButton);
  }
  
  function initFavoritesView() {
    if (!elements.favoritesGrid) return;
    console.log('Inicializando página de favoritos com filtro:', state.currentFavoriteFilter);

    if (elements.categoryFilterSelect) {
       elements.categoryFilterSelect.value = state.currentFavoriteFilter;
    }
    if (elements.sortFavorites) {
        // elements.sortFavorites.value = savedSort;
    }

    applyFavoriteFiltersAndSort();
  }

  
  function renderFavorites(favoritesToRender) {
    if (!elements.favoritesGrid) return;

    elements.favoritesGrid.innerHTML = '';

    if (favoritesToRender.length === 0) {
        showEmptyFavorites();
    } else {
        if (elements.emptyFavorites) elements.emptyFavorites.style.display = 'none';
        favoritesToRender.forEach(exercise => {
            const card = createExerciseCard(exercise, true);
            elements.favoritesGrid.appendChild(card);
        });
        setupExerciseCards();
    }
}
  
  function createExerciseCard(exercise, isFavorite = false) {
    const card = document.createElement('article');
    card.className = 'exercise-card';
    card.dataset.id = exercise.id;
    card.dataset.muscle = exercise.muscleGroup.toLowerCase();

    
    card.innerHTML = `
      <div class="exercise-card__image-container">
        <img src="${exercise.image || 'https://placehold.co/400x300/transparent/grey?text=Sem+imagem'}" alt="${exercise.name}" class="exercise-card__image" onerror="this.src='https://placehold.co/400x300/transparent/grey?text=Sem+imagem'">
      </div>
      <div class="exercise-card__body">
        <h3 class="exercise-card__title">${exercise.name || 'Nome Indisponível'}</h3>
        <p class="exercise-card__description">
          ${exercise.description || 'Sem descrição disponível.'}
        </p>
        <div class="exercise-card__footer">
          <span class="exercise-card__muscle-group">${exercise.muscleGroup || 'Indefinido'}</span>
          <button class="exercise-card__favorite ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
        </div>
      </div>
    `;
    
    const muscleColor = state.muscleGroups[exercise.muscleGroup] ? 
      state.muscleGroups[exercise.muscleGroup].color : 
      'var(--color-primary)';
    
    card.style.setProperty('--muscle-color', muscleColor);
    card.style.setProperty('--card-before-background', muscleColor);
    
    return card;
  }
  
  function setupExerciseCards() {
    document.querySelectorAll('.exercise-card').forEach(card => {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.exercise-card__favorite')) {
          return;
        }
        
        const exerciseId = parseInt(this.dataset.id);
        openExerciseDetails(exerciseId);
      });
      
      const favoriteBtn = card.querySelector('.exercise-card__favorite');
      if (favoriteBtn) {
        const newFavoriteBtn = favoriteBtn.cloneNode(true);
        favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);
        
        newFavoriteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleFavorite(card);
        });
        
        const exerciseId = parseInt(card.dataset.id);
        updateFavoriteButton(newFavoriteBtn, storage.favorites.isFavorite(exerciseId));
      }
      
      const muscleGroup = card.dataset.muscle;
      if (muscleGroup && state.muscleGroups[getMuscleGroupId(muscleGroup)]) {
        card.style.setProperty('--muscle-color', state.muscleGroups[getMuscleGroupId(muscleGroup)].color);
        card.style.setProperty('--card-before-background', state.muscleGroups[getMuscleGroupId(muscleGroup)].color);
      }
    });
  }
  
  async function openExerciseDetails(exerciseId) {
    if (!elements.detailPanel || !elements.detailContent || !exerciseId) return;

    state.detailOpen = true;
    elements.detailPanel.classList.add('open');
    elements.detailContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    let exerciseData = null;

    try {
        if (state.currentView === 'favorites') {
            console.log(`Buscando favorito no localStorage ID: ${exerciseId}`);
            exerciseData = storage.favorites.getAll().find(fav => fav.id === exerciseId);
            if (!exerciseData) {
                 throw new Error('Favorito não encontrado no armazenamento local.');
            }
            console.log('Dados do favorito encontrados:', exerciseData);


        } else {
            console.log(`Buscando detalhes na API para ID: ${exerciseId}`);
            const rawDetailedData = await api.getSingleExerciseInfo(exerciseId);

            if (rawDetailedData) {
                if (!state.auxiliaryData) state.auxiliaryData = await api.getAuxiliaryData();
                exerciseData = api.processExercise(rawDetailedData, state.auxiliaryData);
            } else {
                 throw new Error('Detalhes do exercício não encontrados na API.');
            }
        }

        renderExerciseDetails(exerciseData);
        storage.viewed.add(exerciseData);

    } catch (error) {
        console.error(`Erro ao abrir detalhes para ID ${exerciseId}:`, error);
        elements.detailContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        showToast('Erro', `Não foi possível carregar os detalhes do exercício: ${error.message}`, 'error');
    }
  }
  
   function updateFavoriteButton(button, isFavorite) {
    if (!button) return;
    button.innerHTML = `<i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-star"></i>`;
    button.classList.toggle('active', isFavorite);
    button.setAttribute('aria-label', isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
  }
  
  function renderExerciseDetails(exercise) {
    if (!elements.detailContent || !exercise) return;
    
    const isFavorite = storage.favorites.isFavorite(exercise.id);
    const favoriteIconClass = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    const favoriteBtnText = isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos';
    const favoriteBtnClass = isFavorite ? 'btn-secondary' : 'btn-outline';
	
    let categoryDropdownHTML = '';
    if (state.currentView === 'favorites') {
        const categories = storage.customCategories.getAll();
        categoryDropdownHTML = `
            <div class="detail-panel__category-assign">
                <label for="assign-category-${exercise.id}">Categoria:</label>
                <select id="assign-category-${exercise.id}" class="search-input" data-exercise-id="${exercise.id}">
        `;
        categoryDropdownHTML += `<option value="uncategorized" ${!exercise.customCategoryId ? 'selected' : ''}>Sem Categoria</option>`;

        categories.forEach(cat => {
             if (cat.id !== 'all' && cat.id !== 'uncategorized') {
                categoryDropdownHTML += `<option value="${cat.id}" ${exercise.customCategoryId === cat.id ? 'selected' : ''}>${cat.name}</option>`;
            }
        });
        categoryDropdownHTML += `
                </select>
            </div>
        `;
    }
    
    elements.detailContent.innerHTML = `
      <div class="detail-panel__image-container">
        <img src="${exercise.image}" alt="${exercise.name}" class="detail-panel__image" onerror="this.src='https://via.placeholder.com/400x300/transparent/grey?text=Sem+imagem'">
      </div>

      <div class="detail-panel__header">
        <h2 class="detail-panel__title">${exercise.name || 'Nome Indisponível'}</h2>
        <div class="detail-panel__meta">
          <span class="detail-panel__muscle">${exercise.muscleGroup || 'Indefinido'}</span>
          ${exercise.difficulty ? `<span class="detail-panel__difficulty difficulty--${state.difficulties[exercise.difficulty]?.class || 'unknown'}">${state.difficulties[exercise.difficulty]?.name || ''}</span>` : ''}
        </div>
      </div>

      <div class="detail-panel__description">
        <h3>Descrição</h3>
        <p>${exercise.description || 'Sem descrição disponível.'}</p>
      </div>

      ${exercise.muscles && exercise.muscles.length > 0 ? `
      <div class="detail-panel__muscles">
        <h3>Músculos Trabalhados</h3>
        <ul>${exercise.muscles.map(muscle => `<li>${muscle}</li>`).join('')}</ul>
      </div>
      ` : ''}

      ${exercise.equipment && exercise.equipment.length > 0 ? `
      <div class="detail-panel__equipment">
        <h3>Equipamentos</h3>
        <ul>${exercise.equipment.map(equip => `<li>${equip}</li>`).join('')}</ul>
      </div>
      ` : ''}

      <div class="detail-panel__actions">
        <button class="btn ${favoriteBtnClass} detail-panel__favorite" data-id="${exercise.id}">
          <i class="${favoriteIconClass} btn-icon"></i> ${favoriteBtnText}
        </button>
        ${categoryDropdownHTML}
      </div>
    `;
    
    const detailFavoriteBtn = elements.detailContent.querySelector('.detail-panel__favorite');
    if (detailFavoriteBtn) {
      detailFavoriteBtn.addEventListener('click', async function() {
        const exerciseId = parseInt(this.dataset.id);
         const currentlyFavorite = storage.favorites.isFavorite(exerciseId);

         if (currentlyFavorite) {
              storage.favorites.remove(exerciseId);
              showToast('Removido', `${exercise.name} removido dos favoritos.`, 'info');
              updateDetailFavoriteButton(this, false, exercise.name);
              const cardInGrid = document.querySelector(`.exercise-card[data-id="${exerciseId}"] .exercise-card__favorite`);
              if(cardInGrid) updateFavoriteButton(cardInGrid, false);
               if (state.currentView === 'favorites') {
                   applyFavoriteFiltersAndSort();
               }

         } else {
              const spinnerIcon = '<div class="spinner spinner-sm" style="border-color: rgba(var(--color-text-inverse-rgb, 255, 255, 255), 0.3); border-top-color: var(--color-text-inverse, #fff);"></div>';
              const originalText = this.innerHTML;
              this.innerHTML = `${spinnerIcon} Adicionando...`;
              this.disabled = true;

              const added = storage.favorites.add(exercise, exercise.customCategoryId);

              if(added) {
                  showToast('Adicionado', `${exercise.name} adicionado aos favoritos!`, 'success');
                   updateDetailFavoriteButton(this, true, exercise.name);
                  const cardInGrid = document.querySelector(`.exercise-card[data-id="${exerciseId}"] .exercise-card__favorite`);
                  if(cardInGrid) updateFavoriteButton(cardInGrid, true);
              } else {
                  showToast('Erro', `Não foi possível adicionar ${exercise.name} aos favoritos.`, 'error');
                   this.innerHTML = originalText;
              }
              this.disabled = false;
         }
      });
    }
	
    const assignCategorySelect = elements.detailContent.querySelector(`#assign-category-${exercise.id}`);
    if (assignCategorySelect) {
        assignCategorySelect.addEventListener('change', function() {
            const selectedCategoryId = this.value;
            const exerciseId = parseInt(this.dataset.exerciseId);
            const success = storage.favorites.assignCategory(exerciseId, selectedCategoryId);
            if (success) {
                showToast('Sucesso', 'Categoria do exercício atualizada!', 'success');
                exercise.customCategoryId = selectedCategoryId === 'uncategorized' ? null : selectedCategoryId;
                if(state.currentView === 'favorites') {
                    applyFavoriteFiltersAndSort();
                }
            } else {
                 showToast('Erro', 'Não foi possível atualizar a categoria.', 'error');
            }
        });
    }
  }
  
     function updateDetailFavoriteButton(button, isFavorite, exerciseName) {
        if (!button) return;
        const iconClass = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
        const text = isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos';
        const btnClass = isFavorite ? 'btn-secondary' : 'btn-outline'; // Mudar para secundário quando for favorito?
        button.innerHTML = `<i class="${iconClass} btn-icon"></i> ${text}`;
        button.className = `btn ${btnClass} detail-panel__favorite`;
        button.setAttribute('aria-label', text);
    }
  
  function closeDetailPanel() {
    if (!elements.detailPanel) return;
    
    state.detailOpen = false;
    elements.detailPanel.classList.remove('open');
  }
  
  function toggleSidebar() {
    if (!elements.sidebar) return;
    
    state.sidebarOpen = !state.sidebarOpen;
    elements.sidebar.classList.toggle('open', state.sidebarOpen);
    
    document.body.classList.toggle('no-scroll', state.sidebarOpen && window.innerWidth < 768);
  }
  
  function closeSidebar() {
    if (!elements.sidebar) return;
    
    state.sidebarOpen = false;
    elements.sidebar.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }
  
  function handleMobileFilterBtn(e) {
    e.preventDefault();
    
    if (state.currentView === 'exercises') {
      toggleSidebar();
    } 
    else if (state.currentView === 'favorites') {
      if (elements.sortFavorites) {
        elements.sortFavorites.focus();
      }
    }
  }
  
function handleFilterChange(e) {
    const checkbox = e.target;
    const filterType = checkbox.name;
    const filterValue = checkbox.value;
    const isChecked = checkbox.checked;

    if (!state.filters[filterType]) {
        state.filters[filterType] = [];
    }

    if (isChecked) {
        if (!state.filters[filterType].includes(filterValue)) {
            state.filters[filterType].push(filterValue);
        }
    } else {
        state.filters[filterType] = state.filters[filterType].filter(val => val !== filterValue);
    }

    loadExercises(1, state.filters);
}
  
	function handleChipFilter(e) {
		const chip = e.currentTarget;
		const filterType = chip.dataset.filterType;

		state.filters = {
			 muscles: [],
			 equipment: [],
			 category: null
		 };
		 document.querySelectorAll('.filter-checkbox__input').forEach(cb => cb.checked = false);


		if (filterType === 'all') {
			 state.filters.category = null;
			 state.filters.equipment = [];
		} else if (filterType === 'no-equipment') {
			 state.filters.equipment = ['7'];
			 state.filters.category = null;
		} else if (filterType === 'category') {
			 state.filters.category = chip.dataset.categoryId;
			 state.filters.equipment = [];
		}

		document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
		chip.classList.add('active');

		loadExercises(1, state.filters);

		if (window.innerWidth < 768) {
			closeSidebar();
		}
	}
  
	 function populateCategoryChips() {
		const chipContainer = document.getElementById('chip-container');
		if (!chipContainer || !state.auxiliaryData || !state.auxiliaryData.categories) {
			console.warn('Não foi possível popular os chips de categoria.');
			return;
    }

    state.auxiliaryData.categories.forEach(category => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.dataset.filterType = 'category';
        chip.dataset.categoryId = category.id;
        chip.textContent = category.name;

        chip.addEventListener('click', handleChipFilter);
        chipContainer.appendChild(chip);
    });
}
  
function handleSearchInput(e) {
    state.searchQuery = e.target.value.trim();
    loadExercises(1, state.filters);
}


function handleSearchEnter(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        console.log("Enter pressionado na busca");
        e.preventDefault();

        const searchTerm = e.target.value.trim();

        if (searchTerm !== state.searchQuery) {
            state.searchQuery = searchTerm;
            console.log("Novo termo de busca:", state.searchQuery); // Debug
            loadExercises(1, state.filters);
        } else {
             if(state.searchQuery){
                loadExercises(1, state.filters);
             }
        }

    }
}

function processSearchSuggestion(suggestionData) {
    const categoryName = suggestionData.category || 'Desconhecida';

    let imageUrl = 'https://placehold.co/400x300/transparent/grey?text=Sem+imagem';
    const wgerBaseUrl = 'https://wger.de';

    if (suggestionData.image && typeof suggestionData.image === 'string') {
        if (!suggestionData.image.startsWith('http')) {
            imageUrl = wgerBaseUrl + suggestionData.image;
        } else {
            imageUrl = suggestionData.image;
        }
    } else if (suggestionData.image_thumbnail && typeof suggestionData.image_thumbnail === 'string') {
        if (!suggestionData.image_thumbnail.startsWith('http')) {
            imageUrl = wgerBaseUrl + suggestionData.image_thumbnail;
        } else {
            imageUrl = suggestionData.image_thumbnail;
        }
    }

    return {
        id: suggestionData.id,
        name: suggestionData.name || 'Nome Indisponível',
        description: `Exercício da categoria ${categoryName}. Mais detalhes ao clicar.`,
        muscleGroup: categoryName,
        muscles: [categoryName],
        equipment: [],
        image: imageUrl
    };
}
  
  async function toggleFavorite(card) {
    if (!card) return;

    const exerciseId = parseInt(card.dataset.id);
    const favoriteBtn = card.querySelector('.exercise-card__favorite');
    const isCurrentlyFavorite = storage.favorites.isFavorite(exerciseId);

    if (isCurrentlyFavorite) {
        const removed = storage.favorites.remove(exerciseId);
        if (removed) {
            updateFavoriteButton(favoriteBtn, false);
            showToast('Removido', 'Exercício removido dos favoritos!', 'info');

            if (state.currentView === 'favorites') {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    card.remove();
                    const favorites = storage.favorites.getAll();
                    if (favorites.length === 0) {
                        showEmptyFavorites();
                    }
                }, 300);
            }
        }
    } else {
        if(favoriteBtn) favoriteBtn.innerHTML = '<div class="spinner spinner-sm"></div>';

        try {
            console.log(`Buscando detalhes para favoritar ID: ${exerciseId}`);
            const rawDetailedData = await api.getSingleExerciseInfo(exerciseId);

            if (rawDetailedData) {
                if (!state.auxiliaryData) state.auxiliaryData = await api.getAuxiliaryData();
                const detailedExerciseData = api.processExercise(rawDetailedData, state.auxiliaryData);

                const added = storage.favorites.add(detailedExerciseData);

                if (added) {
                    updateFavoriteButton(favoriteBtn, true);
                    showToast('Adicionado', `${detailedExerciseData.name} adicionado aos favoritos!`, 'success');
                } else {
                     updateFavoriteButton(favoriteBtn, false);
                     showToast('Erro', 'Não foi possível salvar o favorito.', 'error');
                }

        } else {
                 updateFavoriteButton(favoriteBtn, false);
                 showToast('Erro', 'Detalhes do exercício não encontrados para favoritar.', 'error');
                 console.warn("Não foi possível buscar detalhes (getSingleExerciseInfo) para favoritar ID:", exerciseId);
        }
		} catch (error) {
             updateFavoriteButton(favoriteBtn, false);
             console.error("Erro ao buscar detalhes (getSingleExerciseInfo) para favoritar:", error);
             showToast('Erro', `Falha ao buscar detalhes: ${error.message}`, 'error');
        }
    }
  }
  
  function clearAllFavorites() {
    if (confirm('Tem certeza de que deseja remover todos os exercícios favoritos?')) {
      storage.favorites.clear();
      
      const cards = elements.favoritesGrid.querySelectorAll('.exercise-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          setTimeout(() => {
            card.remove();
            if (index === cards.length - 1) {
              showEmptyFavorites();
            }
          }, 300);
        }, index * 100);
      });
      
      showToast('Favoritos Limpos', 'Todos os favoritos foram removidos!', 'info');
    }
  }
  
  function showEmptyFavorites() {
    if (!elements.favoritesGrid || !elements.emptyFavorites) return;
    
    elements.favoritesGrid.innerHTML = '';
    
    elements.emptyFavorites.style.display = 'flex';
    elements.emptyFavorites.style.gridColumn = '1 / -1';
  }
  
  function handleWindowResize() {
    if (window.innerWidth >= 768 && state.sidebarOpen) {
      closeSidebar();
    }
  }
  
  function showToast(title, message, type = 'info') {
    if (!elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    let icon;
    switch (type) {
      case 'success':
        icon = 'fa-circle-check';
        break;
      case 'error':
        icon = 'fa-circle-xmark';
        break;
      case 'warning':
        icon = 'fa-triangle-exclamation';
        break;
      default:
        icon = 'fa-circle-info';
    }
    
    toast.innerHTML = `
      <div class="toast__icon">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="toast__content">
        <div class="toast__title">${title}</div>
        <div class="toast__message">${message}</div>
      </div>
      <button class="toast__close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    const closeBtn = toast.querySelector('.toast__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        removeToast(toast);
      });
    }
    
    setTimeout(() => {
      removeToast(toast);
    }, 5000);
  }
  
  function removeToast(toast) {
    toast.classList.remove('show');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  function getMuscleGroupId(muscleName) {
    return Object.keys(state.muscleGroups).find(key => 
      key.toLowerCase() === muscleName.toLowerCase()
    ) || muscleName;
  }
  
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      .spinner-sm {
        display: inline-block;
        width: 1em; /* Usa o tamanho da fonte do botão */
        height: 1em;
        border: 2px solid rgba(255, 255, 255, 0.3); /* Cor clara para contraste */
        border-radius: 50%;
        border-top-color: #fff; /* Cor sólida */
        animation: spin 1s ease-in-out infinite;
        vertical-align: middle; /* Alinha com o texto se houver */
      }
      .btn-outline .spinner-sm { /* Ajuste para botão outline */
         border-color: rgba(var(--color-primary-rgb, 54, 179, 126), 0.3);
         border-top-color: var(--color-primary);
      }
       /* Define a variável --color-primary-rgb se não existir */
      :root { --color-primary-rgb: 54, 179, 126; }
      [data-theme="dark"] { --color-primary-rgb: 0, 184, 169; }
	  
      .detail-panel__category-assign {
          margin-top: var(--spacing-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
      }
       .detail-panel__category-assign label {
           font-weight: var(--fw-medium);
           font-size: var(--fs-sm);
           white-space: nowrap;
       }
       .detail-panel__category-assign select {
           flex-grow: 1;
           padding: var(--spacing-xs) var(--spacing-sm); /* Padding menor para select */
           max-width: 200px; /* Limita largura máxima */
       }
       .detail-panel__actions {
          display: flex;
          flex-wrap: wrap; /* Permite quebrar linha */
          gap: var(--spacing-md);
          align-items: center; /* Alinha verticalmente */
          margin-top: var(--spacing-lg);
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--color-border);
       }

    </style>
  `);


  document.addEventListener('DOMContentLoaded', init);
})();