(function() {
  'use strict';
  
  const state = {
    currentPage: window.location.pathname.split('/').pop() || 'index.html',
    lastVisitedPage: localStorage.getItem('lastVisitedPage') || 'index.html'
  };
  
  function init() {
    updateActiveLinks();
    saveLastVisitedPage();
  }
  
  function updateActiveLinks() {
    const currentPath = state.currentPage;
    
    document.querySelectorAll('.nav__link').forEach(link => {
      const linkPath = link.getAttribute('href');
      link.classList.toggle('active', linkPath === currentPath);
    });
    
    document.querySelectorAll('.nav-mobile__link').forEach(link => {
      const linkPath = link.getAttribute('href');
      if (linkPath && linkPath !== '#') {
        link.classList.toggle('active', linkPath === currentPath);
      }
    });
  }
  
  function saveLastVisitedPage() {
    localStorage.setItem('lastVisitedPage', state.currentPage);
  }
  
  function navigateTo(page) {
    window.location.href = page;
  }
  
  function goBack() {
    window.history.back();
  }
  
  function goToLastVisited() {
    navigateTo(state.lastVisitedPage);
  }
  
  document.addEventListener('DOMContentLoaded', init);
  
  window.router = {
    navigateTo,
    goBack,
    goToLastVisited,
    getCurrentPage: () => state.currentPage
  };
})();