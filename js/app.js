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
    sortFavorites: document.getElementById('sort-favorites'),
    
    emptyFavorites: document.getElementById('empty-favorites'),
    
    toastContainer: document.getElementById('toast-container')
  };
  
  const state = {
    isLoading: false,
    currentPage: 1,
    totalPages: 1,
    currentView: window.location.pathname.includes('favorites.html') ? 'favorites' : 'exercises',
    detailOpen: false,
    sidebarOpen: false,
    selectedExercise: null,
    filters: storage.filters.get(),
    exercises: [],
    searchQuery: '',
    muscleGroups: {
      1: { name: 'Peito', color: 'var(--color-muscle-chest)' },
      2: { name: 'Costas', color: 'var(--color-muscle-back)' },
      3: { name: 'Braços', color: 'var(--color-muscle-arms)' },
      4: { name: 'Pernas', color: 'var(--color-muscle-legs)' },
      5: { name: 'Ombros', color: 'var(--color-muscle-shoulders)' },
      6: { name: 'Abdômen', color: 'var(--color-muscle-core)' }
    },
    difficulties: {
      1: { name: 'Iniciante', class: 'beginner' },
      2: { name: 'Intermediário', class: 'intermediate' },
      3: { name: 'Avançado', class: 'advanced' }
    }
  };
  
  function init() {
    if (!storage.isAvailable()) {
      showToast('Atenção', 'O armazenamento local não está disponível. Suas preferências não serão salvas.', 'warning');
    }
    
    setupEventListeners();
    
    if (state.currentView === 'favorites') {
      initFavoritesView();
    } else {
      initExercisesView();
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
      elements.searchInput.addEventListener('input', debounce(handleSearch, 500));
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
  
  function initExercisesView() {
    simulateLoading();
    
    setupExerciseCards();
  }
  
  function initFavoritesView() {
    if (!elements.favoritesGrid) return;
    
    const favorites = storage.favorites.getAll();
    
    if (favorites.length === 0) {
      showEmptyFavorites();
    } else {
      const sortOption = elements.sortFavorites ? elements.sortFavorites.value : 'name';
      const sortedFavorites = storage.favorites.sort(sortOption);

      setupExerciseCards();
    }
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
        favoriteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleFavorite(card);
        });
        
        const exerciseId = parseInt(card.dataset.id);
        updateFavoriteButton(favoriteBtn, storage.favorites.isFavorite(exerciseId));
      }
      
      const muscleGroup = card.dataset.muscle;
      if (muscleGroup && state.muscleGroups[getMuscleGroupId(muscleGroup)]) {
        card.style.setProperty('--muscle-color', state.muscleGroups[getMuscleGroupId(muscleGroup)].color);
        card.style.setProperty('--card-before-background', state.muscleGroups[getMuscleGroupId(muscleGroup)].color);
      }
    });
  }
  
  function openExerciseDetails(exerciseId) {
    if (!elements.detailPanel || !elements.detailContent) return;
    
    state.detailOpen = true;
    elements.detailPanel.classList.add('open');
    
    elements.detailContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    const exerciseCard = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
    if (!exerciseCard) return;
    
    setTimeout(() => {
      const exerciseTitle = exerciseCard.querySelector('.exercise-card__title').textContent;
      const exerciseDescription = exerciseCard.querySelector('.exercise-card__description').textContent;
      const muscleGroup = exerciseCard.querySelector('.exercise-card__muscle-group').textContent;
      const exerciseImage = exerciseCard.querySelector('.exercise-card__image').src;
      const difficultyBadge = exerciseCard.querySelector('.exercise-card__badge');
      const difficulty = difficultyBadge ? difficultyBadge.textContent : 'Intermediário';
      
      renderExerciseDetails({
        id: exerciseId,
        name: exerciseTitle,
        description: exerciseDescription,
        muscleGroup: muscleGroup,
        image: exerciseImage,
        difficulty: difficulty
      });
      
      storage.viewed.add({
        id: exerciseId,
        name: exerciseTitle,
        muscleGroup: muscleGroup
      });
    }, 500);
  }
  
  function renderExerciseDetails(exercise) {
    if (!elements.detailContent) return;
    
    const isFavorite = storage.favorites.isFavorite(exercise.id);
    const favoriteIconClass = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    const favoriteBtnClass = isFavorite ? 'btn-primary' : 'btn-outline';
    
    elements.detailContent.innerHTML = `
      <div class="detail-panel__image-container">
        <img src="${exercise.image}" alt="${exercise.name}" class="detail-panel__image">
      </div>
      
      <div class="detail-panel__header">
        <h2 class="detail-panel__title">${exercise.name}</h2>
        <div class="detail-panel__meta">
          <span class="detail-panel__muscle">${exercise.muscleGroup}</span>
          <span class="detail-panel__difficulty">${exercise.difficulty}</span>
        </div>
      </div>
      
      <div class="detail-panel__description">
        <h3>Descrição</h3>
        <p>${exercise.description}</p>
      </div>
      
      <div class="detail-panel__instructions">
        <h3>Instruções</h3>
        <ol>
          <li>Posicione-se corretamente no equipamento.</li>
          <li>Mantenha a forma adequada durante todo o movimento.</li>
          <li>Controle o movimento na fase excêntrica.</li>
          <li>Respire corretamente: expire na fase concêntrica.</li>
        </ol>
      </div>
      
      <div class="detail-panel__muscles">
        <h3>Músculos Trabalhados</h3>
        <ul>
          <li>Principal: ${exercise.muscleGroup}</li>
          <li>Secundários: Músculos estabilizadores</li>
        </ul>
      </div>
      
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
    
    const filters = storage.filters.get();
    
    if (!filters[filterType]) {
      filters[filterType] = [];
    }
    
    if (isChecked && !filters[filterType].includes(filterValue)) {
      filters[filterType].push(filterValue);
    } else if (!isChecked && filters[filterType].includes(filterValue)) {
      filters[filterType] = filters[filterType].filter(val => val !== filterValue);
    }
    
    storage.filters.update(filters);
    state.filters = filters;
    
    simulateLoading();
  }
  
  function handleChipFilter(e) {
    const chip = e.currentTarget;
    
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    
    chip.classList.add('active');
    
    const filterValue = chip.textContent.trim();
    
    simulateLoading();
    
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  }
  
  function handleSearch(e) {
    state.searchQuery = e.target.value.trim();
    
    simulateLoading();
  }
  
  function handleSortFavorites(e) {
    const sortBy = e.target.value;
    
    storage.preferences.set('sortOption', sortBy);
    
    simulateLoading();
  }
  
  function toggleFavorite(card) {
    if (!card) return;
    
    const exerciseId = parseInt(card.dataset.id);
    const favoriteBtn = card.querySelector('.exercise-card__favorite');
    
    const exerciseData = {
      id: exerciseId,
      name: card.querySelector('.exercise-card__title').textContent,
      description: card.querySelector('.exercise-card__description').textContent,
      muscleGroup: card.querySelector('.exercise-card__muscle-group').textContent,
      image: card.querySelector('.exercise-card__image').src,
      difficulty: card.querySelector('.exercise-card__badge') ? 
                  card.querySelector('.exercise-card__badge').textContent : 'Intermediário'
    };
    
    const isFavorite = storage.favorites.toggle(exerciseData);
    
    updateFavoriteButton(favoriteBtn, isFavorite);
    
    if (isFavorite) {
      showToast('Adicionado', 'Exercício adicionado aos favoritos!', 'success');
    } else {
      showToast('Removido', 'Exercício removido dos favoritos!', 'info');
      
      if (state.currentView === 'favorites') {
        const favorites = storage.favorites.getAll();
        if (favorites.length === 0) {
          showEmptyFavorites();
        }
        
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => {
          card.remove();
        }, 300);
      }
    }
  }
  
  function updateFavoriteButton(button, isFavorite) {
    if (!button) return;
    
    button.classList.toggle('active', isFavorite);
    
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    }
  }
  
  function clearAllFavorites() {
    if (confirm('Tem certeza de que deseja remover todos os exercícios favoritos?')) {
      storage.favorites.clear();
      showEmptyFavorites();
      showToast('Favoritos Limpos', 'Todos os favoritos foram removidos!', 'info');
    }
  }
  
  function showEmptyFavorites() {
    if (!elements.favoritesGrid || !elements.emptyFavorites) return;
    
    elements.favoritesGrid.querySelectorAll('.exercise-card').forEach(card => {
      card.remove();
    });
    
    elements.emptyFavorites.style.display = 'flex';
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
    const muscleMap = {
      'peito': 1,
      'chest': 1,
      'costas': 2,
      'back': 2,
      'bracos': 3,
      'braços': 3,
      'arms': 3,
      'pernas': 4,
      'legs': 4,
      'ombros': 5,
      'shoulders': 5,
      'abdomen': 6,
      'abdômen': 6,
      'abs': 6,
      'core': 6
    };
    
    const normalizedName = muscleName.toLowerCase().trim();
    return muscleMap[normalizedName] || 1;
  }
  
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      .no-scroll {
        overflow: hidden;
      }
    </style>
  `);
  
  document.addEventListener('DOMContentLoaded', init);
})();