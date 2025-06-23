<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="menuStyle"
    @click.stop >
    <ul>
      <li @click="emitSelection('clear')">Limpar Desenho</li> <!- TEXTO ALTERADO -->
      <li @click="emitSelection('resetView')">Resetar Visualização</li>
      
      <li class="separator-label">Cores</li> <li class="color-palette-container"> <span
          v-for="color in palette"
          :key="color"
          :style="{ backgroundColor: color }"
          class="color-swatch"
          @click="emitSelection('setColor', color)"
          :title="color"
        ></span>
      </li>

      <li class="separator-label">Espessura</li>
      <li class="thickness-options-container"> <button 
          v-for="option in thicknessOptions" 
          :key="option.value"
          @click="emitSelection('setThickness', option.value)"
          :title="`${option.label} (${option.value}px)`"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed, watch } from 'vue';

const props = defineProps({
  x: Number,
  y: Number,
  visible: Boolean,
});

const emit = defineEmits(['select']);

const menuRef = ref(null);
const position = ref({ x: props.x, y: props.y });

// Estilo computado que será aplicado ao menu
const menuStyle = computed(() => ({
  top: `${position.value.y}px`,
  left: `${position.value.x}px`,
  visibility: props.visible ? 'visible' : 'hidden',
}));

// Observa quando as coordenadas ou a visibilidade mudam
watch([() => props.x, () => props.y, () => props.visible], ([newX, newY, newVisibility]) => {
  if (newVisibility && menuRef.value) {
    // Primeiro, torna o menu visível fora da tela para medir
    menuRef.value.style.visibility = 'hidden';
    menuRef.value.style.left = '-1000px';
    menuRef.value.style.top = '-1000px';

    // Força o DOM a atualizar para que possamos obter as dimensões
    requestAnimationFrame(() => {
      const menuWidth = menuRef.value.offsetWidth;
      const menuHeight = menuRef.value.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let finalX = newX;
      let finalY = newY;

      // Ajusta a posição para não sair da tela
      if (finalX + menuWidth > windowWidth) {
        finalX = windowWidth - menuWidth - 10;
      }
      if (finalY + menuHeight > windowHeight) {
        finalY = windowHeight - menuHeight - 10;
      }
      
      // Garante que não saia pela esquerda ou topo
      if (finalX < 10) finalX = 10;
      if (finalY < 10) finalY = 10;

      position.value = { x: finalX, y: finalY };
      
      // Agora, torna o menu visível na posição correta
      menuRef.value.style.visibility = 'visible';
    });
  }
});

const palette = [ // Paleta de cores (mantendo a última que definimos)
  '#000000', '#FFFFFF', '#EF5350', '#FFCA28',
  '#66BB6A', '#42A5F5', '#AB47BC', '#78909C',
  '#EC407A', '#FFEE58', '#9CCC65', '#26C6DA',
  '#FFA726', '#8D6E63', '#BDBDBD', '#546E7A',
];

const thicknessOptions = [
  { label: 'Fina', value: 2 },
  { label: 'Média', value: 5 },
  { label: 'Grossa', value: 10 },
  { label: 'Extra Grossa', value: 20 },
];

function emitSelection(action, value = null) {
  emit('select', action, value);
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 190px; /* Um pouco mais de espaço */
  border-radius: 4px; /* Bordas levemente arredondadas */
  padding: 4px 0; /* Pequeno padding vertical interno */
}

.context-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #333333; 
}

.context-menu li {
  padding: 9px 18px; /* Aumentar um pouco o padding dos itens */
  cursor: pointer;
  font-size: 0.95em; /* Tamanho de fonte base para itens */
}

.context-menu li:hover:not(.separator-label):not(.color-palette-container):not(.thickness-options-container) {
  background-color: #f0f0f0;
}

/* Estilo para os rótulos/separadores como "Cores", "Espessura" */
.context-menu li.separator-label {
  font-size: 0.8em;
  font-weight: bold;
  color: #555;
  padding-top: 10px;
  padding-bottom: 6px;
  padding-left: 18px; /* Alinhar com outros itens */
  border-top: 1px solid #eee;
  margin-top: 4px; /* Espaço acima do separador */
  cursor: default; /* Não é clicável */
}
.context-menu li.separator-label:first-child { /* Remover borda e margem do primeiro separador se ele for o primeiro item */
    border-top: none;
    margin-top: 0;
}


.color-palette-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 cores por linha */
  gap: 6px; /* Espaço entre as amostras de cor */
  padding: 8px 18px !important; /* Padding para a área da paleta */
  cursor: default;
}

.color-swatch {
  width: 24px; /* Tamanho maior para as amostras */
  height: 24px;
  border: 1px solid #dbdbdb;
  display: inline-block;
  cursor: pointer;
  border-radius: 3px;
  transition: transform 0.1s ease-in-out;
}
.color-swatch:hover {
  border-color: #888;
  transform: scale(1.15); /* Efeito de hover um pouco maior */
}

.thickness-options-container {
  display: flex;
  flex-wrap: wrap; /* Permite que os botões quebrem a linha se não couberem */
  justify-content: space-around; /* Ou space-between */
  align-items: center;
  padding: 8px 10px !important; /* Padding para a área dos botões */
  gap: 6px; /* Espaço entre os botões */
  cursor: default;
}

.thickness-options-container button {
  padding: 5px 10px;
  font-size: 0.9em;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  color: #000000; /* <<< COR DO TEXTO DEFINIDA PARA PRETO */
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.1s ease;
}
.thickness-options-container button:hover {
  background-color: #e7e7e7;
  border-color: #bbb;
}
</style>