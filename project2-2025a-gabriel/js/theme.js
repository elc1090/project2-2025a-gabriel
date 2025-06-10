(function() {
  'use strict';
  
  const themeToggle = document.getElementById('theme-toggle');
  
  let currentTheme = localStorage.getItem('theme') || 'light';
  
  function initTheme() {
    if (!localStorage.getItem('theme')) {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
      }
    }
    
    applyTheme(currentTheme);
    
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
  
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
    
    document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
  }
  
  function toggleTheme() {
    themeToggle.classList.add('rotating');
    
    setTimeout(() => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      
      setTimeout(() => {
        themeToggle.classList.remove('rotating');
      }, 300);
    }, 150);
  }
  
  function setupEventListeners() {
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
  });
  
  window.themeManager = {
    getCurrentTheme: () => currentTheme,
    applyTheme,
    toggleTheme
  };
})();

document.head.insertAdjacentHTML('beforeend', `
  <style>
    @keyframes rotateIcon {
      0% { transform: rotate(0); }
      100% { transform: rotate(360deg); }
    }
    
    .rotating i {
      animation: rotateIcon 0.5s ease;
    }
  </style>
`);