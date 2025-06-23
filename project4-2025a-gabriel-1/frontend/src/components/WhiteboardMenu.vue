<template>
  <div class="whiteboard-menu-wrapper">
    <button @click="toggleMenu" class="whiteboard-menu-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>
    <div v-if="isMenuOpen" class="menu-content" @click.stop>
      <div class="menu-header">
        <div class="user-info">
          <img :src="userInfo?.profile_pic" alt="Avatar" class="user-avatar">
          <div class="user-details">
            <span class="user-name">{{ userInfo?.name }}</span>
            <div class="user-id-container">
              <span class="user-id-label">ID:</span>
              <span class="user-id-value">{{ userInfo?.id }}</span>
              <button @click="copyUserId" class="copy-btn" :title="copyButtonText">
                <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <h3 class="boards-title">Minhas Lousas</h3>
      <ul>
        <li v-for="board in boards" :key="board.id" @click="selectBoard(board)" :class="{ active: board.id === selectedBoardId }">
          <span>{{ board.nickname }}</span>
          <div class="board-actions">
            <button v-if="board.is_owner" @click.stop="shareBoard(board.id)" class="share-board-btn" title="Compartilhar Lousa">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            <button v-if="board.is_owner" @click.stop="deleteBoard(board.id)" class="delete-board-btn" title="Deletar Lousa">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </li>
      </ul>
      <div v-if="!userInfo?.is_guest" class="menu-footer">
        <input v-model="newBoardName" placeholder="Apelido da nova lousa" @keyup.enter="createBoard"/>
        <button @click="createBoard" :disabled="!newBoardName.trim()">+ Criar Lousa</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { userInfo } from '../services/userInfo';

const props = defineProps({
  selectedBoardId: Number
});

const emit = defineEmits(['board-selected', 'board-created', 'board-deleted']);

const isMenuOpen = ref(false);
const boards = ref([]);
const newBoardName = ref('');
const copied = ref(false);
const copyButtonText = ref('Copiar ID');
const API_URL = import.meta.env.VITE_API_URL || 'https://project3-2025a-gabriel.onrender.com';

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) {
    fetchBoards();
  }
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const fetchBoards = async () => {
  if (!userInfo.value?.email) {
    console.error("Menu: Usuário não logado.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/whiteboards?email=${encodeURIComponent(userInfo.value.email)}`);
    if (!response.ok) throw new Error('Falha ao buscar lousas');
    boards.value = await response.json();
  } catch (error) {
    console.error("Erro ao buscar lousas:", error);
    // TODO: Mostrar erro para o usuário
  }
};

const createBoard = async () => {
  if (!newBoardName.value.trim() || !userInfo.value?.email) return;

  try {
    const response = await fetch(`${API_URL}/api/whiteboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: newBoardName.value.trim(),
        email: userInfo.value.email,
      }),
    });
    if (!response.ok) throw new Error('Falha ao criar lousa');
    const newBoard = (await response.json()).whiteboard;
    newBoardName.value = '';
    fetchBoards(); // Atualiza a lista
    emit('board-created', newBoard);
    selectBoard(newBoard); // Seleciona a nova lousa
  } catch (error) {
    console.error("Erro ao criar lousa:", error);
  }
};

const deleteBoard = async (boardId) => {
  if (!userInfo.value?.email) return;
  if (boardId === 1) {
    alert("Não é possível deletar a lousa principal.");
    return;
  }
  if (!confirm("Tem certeza que deseja deletar esta lousa? Esta ação não pode ser desfeita.")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/whiteboards/${boardId}?email=${encodeURIComponent(userInfo.value.email)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao deletar lousa');
    }
    fetchBoards();
    emit('board-deleted', boardId);
  } catch (error) {
    console.error("Erro ao deletar lousa:", error);
    alert(`Erro: ${error.message}`);
  }
};

const selectBoard = (board) => {
  emit('board-selected', board);
  closeMenu();
};

const copyUserId = () => {
  if (!userInfo.value?.id) return;
  navigator.clipboard.writeText(userInfo.value.id).then(() => {
    copied.value = true;
    copyButtonText.value = 'Copiado!';
    setTimeout(() => {
      copied.value = false;
      copyButtonText.value = 'Copiar ID';
    }, 2000);
  }).catch(err => {
    console.error('Falha ao copiar o ID:', err);
    copyButtonText.value = 'Falha ao copiar';
    setTimeout(() => {
      copyButtonText.value = 'Copiar ID';
    }, 2000);
  });
};

const shareBoard = async (boardId) => {
  if (!userInfo.value?.email) return;

  const targetUserId = prompt("Digite o ID do usuário para convidar para esta lousa:");
  if (!targetUserId || !targetUserId.trim()) {
    return; // Usuário cancelou ou não digitou nada
  }

  try {
    const response = await fetch(`${API_URL}/api/whiteboards/${boardId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesting_user_email: userInfo.value.email,
        target_user_id: targetUserId.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Falha ao compartilhar lousa');
    }
    alert(data.message); // Exibe a mensagem de sucesso
  } catch (error) {
    console.error("Erro ao compartilhar lousa:", error);
    alert(`Erro: ${error.message}`);
  }
};

onMounted(() => {
  // O menu só busca as lousas quando aberto, mas podemos querer buscar na montagem
  // se o menu estiver visível por padrão em algumas visualizações.
});

watch(userInfo, (newUserInfo) => {
  if (isMenuOpen.value && newUserInfo?.email) {
    fetchBoards();
  } else if (!newUserInfo?.email) {
    boards.value = [];
    isMenuOpen.value = false;
  }
}, { deep: true });

</script>

<style scoped>
.whiteboard-menu-wrapper {
  position: relative; /* Necessário para posicionar o menu-content */
}

.whiteboard-menu-button {
  /* O estilo principal vem do pai (DrawingCanvas), o que está correto */
}

.menu-content {
  position: absolute;
  top: 0;
  left: calc(100% + 12px); /* Posiciona ao lado do botão, com um espaçamento */
  z-index: 120;

  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  width: 320px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  color: #202124;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow-y: auto; /* Adiciona scroll se o conteúdo for muito grande */
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-grow: 1;
  overflow: hidden;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
}

.user-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #202124;
}

.user-id-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.user-id-label {
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
}

.user-id-value {
  font-size: 12px;
  color: #5f6368;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  border-radius: 4px;
}
.copy-btn:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.boards-title {
  padding: 16px 16px 8px 16px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #5f6368;
  text-transform: uppercase;
}

.menu-content ul {
  list-style: none;
  margin: 0;
  padding: 0 8px 8px 8px;
  overflow-y: auto;
}

.menu-content li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 6px;
  transition: background-color 0.2s;
  color: #3c4043;
}
.menu-content li:hover {
  background-color: #e8eaed;
}
.menu-content li.active {
  background-color: #e8f0fe;
  color: #1967d2;
  font-weight: 600;
}
.menu-content li.active .delete-board-btn {
    color: #1967d2;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-board-btn,
.delete-board-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #5f6368;
  padding: 4px;
  border-radius: 50%;
  display: none; /* Oculto por padrão */
  transition: background-color 0.2s, color 0.2s;
}

.menu-content li:hover .share-board-btn,
.menu-content li:hover .delete-board-btn {
  display: flex; /* Mudei para flex para centralizar o ícone */
  align-items: center;
  justify-content: center;
}

.share-board-btn:hover {
    color: #1a73e8;
    background-color: #e8f0fe;
}

.delete-board-btn:hover {
  color: #d9534f;
  background-color: #fce8e6;
}

.menu-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.menu-footer input {
  flex-grow: 1;
  padding: 9px 12px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  background-color: #fff;
  color: #202124;
}
.menu-footer input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.menu-footer button {
  padding: 9px 12px;
  border: none;
  background-color: #1a73e8;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}
.menu-footer button:hover {
  background-color: #185abc;
}
.menu-footer button:disabled {
  background-color: #dadce0;
  color: #80868b;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .menu-content {
    padding: 8px 0;
    max-height: 80vh;
  }

  .menu-header {
    padding: 8px 12px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
  }

  .user-name, .user-id-value {
    font-size: 0.9em;
  }
  
  ul li span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px; /* Ajuste conforme necessário */
  }

  li {
    padding: 9px 12px;
  }

  .boards-title {
    font-size: 1em;
    padding: 4px 12px;
  }

  .menu-footer {
    flex-direction: column;
    gap: 10px;
    padding: 10px 12px;
  }
}
</style> 