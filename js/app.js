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
    
    emptyFavorites: document.getElementById('empty-favorites'),
    
    toastContainer: document.getElementById('toast-container')
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
    difficulties: {
      1: { name: 'Iniciante', class: 'beginner' },
      2: { name: 'Intermediário', class: 'intermediate' },
      3: { name: 'Avançado', class: 'advanced' }
    }
  };
  
async function init() {
    console.log("Iniciando aplicação..."); // Debug
    if (!storage.isAvailable()) {
        showToast('Atenção', 'O armazenamento local não está disponível. Suas preferências não serão salvas.', 'warning');
    }

    setupEventListeners();
    console.log("Listeners de eventos configurados."); // Debug

    try {
        console.log("Carregando dados auxiliares..."); // Debug
        state.auxiliaryData = await api.getAuxiliaryData();
        console.log("Dados auxiliares carregados:", state.auxiliaryData); // Debug

        console.log("Populando filtros e chips..."); // Debug
        populateFiltersDynamically();
        populateCategoryChips();
        console.log("Filtros e chips populados."); // Debug

        if (state.currentView === 'favorites') {
            console.log("Inicializando view de Favoritos..."); // Debug
            if (elements.favoritesGrid) {
                elements.favoritesGrid.innerHTML = '';
            }
            initFavoritesView();
        } else if (state.currentView === 'exercises') {
            console.log("Inicializando view de Exercícios..."); // Debug
            await initExercisesView();
        }
         console.log("Inicialização completa."); // Debug

    } catch (error) {
        console.error("Falha ao carregar dados auxiliares ou inicializar view:", error);
        showToast('Erro', 'Falha ao inicializar a aplicação.', 'error');
        if (elements.exerciseGrid) {
            elements.exerciseGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Erro ao carregar dados iniciais. Tente recarregar a página.</p>';
        }
    }
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
    
    if (elements.clearFavorites) {
      elements.clearFavorites.addEventListener('click', clearAllFavorites);
    }
    
    if (elements.sortFavorites) {
      elements.sortFavorites.addEventListener('change', handleSortFavorites);
    }
	
    if (elements.exportFavoritesBtn) {
        elements.exportFavoritesBtn.addEventListener('click', exportFavorites);
    }

    if (elements.importFavoritesBtn) {
        elements.importFavoritesBtn.addEventListener('click', () => {
            elements.importFileInput.click();
        });
    }

    if (elements.importFileInput) {
        elements.importFileInput.addEventListener('change', importFavorites);
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
  
   function exportFavorites() {
    const favoritesData = storage.favorites.getAll();
    if (favoritesData.length === 0) {
        showToast('Aviso', 'Você não tem favoritos para exportar.', 'warning');
        return;
    }

    try {
        const jsonData = JSON.stringify(favoritesData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'fitcat-favoritos.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
        showToast('Exportado', 'Lista de favoritos exportada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao exportar favoritos:', error);
        showToast('Erro', 'Ocorreu um erro ao exportar seus favoritos.', 'error');
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
            const importedData = JSON.parse(e.target.result);

            if (!Array.isArray(importedData)) {
                throw new Error('O arquivo JSON não contém um array de favoritos válido.');
            }

            const isValid = importedData.every(item =>
                item &&
                typeof item.id === 'number' &&
                typeof item.name === 'string' &&
                typeof item.description === 'string' &&
                Array.isArray(item.muscles) &&
                Array.isArray(item.equipment) &&
                typeof item.muscleGroup === 'string' &&
                typeof item.image === 'string'
            );

            if (!isValid) {
                 throw new Error('Alguns itens no arquivo JSON não contêm todos os detalhes esperados.');
            }

            const success = storage.importData(importedData, 'favorites');

            if (success) {
                showToast('Importado', 'Favoritos importados com sucesso!', 'success');
                initFavoritesView();
            } else {
                throw new Error('Falha ao salvar os dados importados.');
            }

        } catch (error) {
            console.error('Erro ao importar favoritos:', error);
            showToast('Erro', `Falha ao importar: ${error.message}`, 'error');
        } finally {
             event.target.value = null;
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
    
    console.log('Inicializando página de favoritos');
    
    const favorites = storage.favorites.getAll();
    
    console.log('Favoritos carregados:', favorites);
    
    if (favorites.length === 0) {
      showEmptyFavorites();
    } else {
      const sortOption = elements.sortFavorites ? elements.sortFavorites.value : 'name';
      const sortedFavorites = storage.favorites.sort(sortOption);
      
      renderFavorites(sortedFavorites);
    }
  }
  
  function renderFavorites(favorites) {
    if (!elements.favoritesGrid) return;
    
    elements.favoritesGrid.innerHTML = '';
    
    if (elements.emptyFavorites) {
      elements.emptyFavorites.style.display = 'none';
    }
    
    if (favorites.length === 0) {
      showEmptyFavorites();
      return;
    }
    
    favorites.forEach(exercise => {
      const card = createExerciseCard(exercise, true);
      elements.favoritesGrid.appendChild(card);
    });
    
    setupExerciseCards();
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
    if (!elements.detailContent) return;
    
    const isFavorite = storage.favorites.isFavorite(exercise.id);
    const favoriteIconClass = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    const favoriteBtnClass = isFavorite ? 'btn-primary' : 'btn-outline';
    
    elements.detailContent.innerHTML = `
      <div class="detail-panel__image-container">
        <img src="${exercise.image}" alt="${exercise.name}" class="detail-panel__image" onerror="this.src='https://via.placeholder.com/400x300?text=Sem+imagem'">
      </div>
      
      <div class="detail-panel__header">
        <h2 class="detail-panel__title">${exercise.name}</h2>
        <div class="detail-panel__meta">
          <span class="detail-panel__muscle">${exercise.muscleGroup}</span>
        </div>
      </div>
      
      <div class="detail-panel__description">
        <h3>Descrição</h3>
        <p>${exercise.description}</p>
      </div>
      
      ${exercise.muscles && exercise.muscles.length > 0 ? `
      <div class="detail-panel__muscles">
        <h3>Músculos Trabalhados</h3>
        <ul>
          ${exercise.muscles.map(muscle => `<li>${muscle}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${exercise.equipment && exercise.equipment.length > 0 ? `
      <div class="detail-panel__equipment">
        <h3>Equipamentos</h3>
        <ul>
          ${exercise.equipment.map(equip => `<li>${equip}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div class="detail-panel__actions">
        <button class="btn ${favoriteBtnClass} detail-panel__favorite" data-id="${exercise.id}">
          <i class="${favoriteIconClass} btn-icon"></i> 
          ${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
        </button>
      </div>
    `;
    
    const favoriteBtn = elements.detailContent.querySelector('.detail-panel__favorite');
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', function() {
        const exerciseId = parseInt(this.dataset.id);
        const exerciseCard = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
        
        if (exerciseCard) {
          toggleFavorite(exerciseCard);
          
          const newIsFavorite = storage.favorites.isFavorite(exerciseId);
          this.innerHTML = `
            <i class="${newIsFavorite ? 'fa-solid' : 'fa-regular'} fa-star btn-icon"></i> 
            ${newIsFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
          `;
          this.className = `btn ${newIsFavorite ? 'btn-primary' : 'btn-outline'} detail-panel__favorite`;
        }
      });
    }
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
  
  function handleSortFavorites(e) {
    const sortBy = e.target.value;
    
    storage.preferences.set('sortOption', sortBy);
    
    const sortedFavorites = storage.favorites.sort(sortBy);
    renderFavorites(sortedFavorites);
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
  
  function simulateLoading() {
    state.isLoading = true;
    
    if (state.currentView === 'exercises' && elements.exerciseGrid) {
      
      
    }
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
  
  function updateFilterCounts() {
    const favorites = storage.favorites.getAll();
    
    const muscleCounts = {};
    favorites.forEach(exercise => {
      const muscle = exercise.muscleGroup.toLowerCase();
      muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
    });
    
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      const filterValue = checkbox.querySelector('.filter-checkbox__input').value;
      const countElement = checkbox.querySelector('.filter-checkbox__count');
      
      if (countElement && checkbox.querySelector('.filter-checkbox__input').name === 'muscle') {
        const count = muscleCounts[filterValue] || 0;
      }
    });
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
    </style>
  `);


  document.addEventListener('DOMContentLoaded', init);
})();