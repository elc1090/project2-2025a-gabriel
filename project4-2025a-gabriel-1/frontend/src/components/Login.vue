<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Bem-vindo à Lousa Colaborativa</h1>
      <p>Faça login para continuar ou entre como visitante</p>
      <div id="g_id_onload"
           :data-client_id="googleClientId"
           data-callback="handleGoogleSignIn"
           data-auto_select="false">
      </div>
      <div class="g_id_signin"
           data-type="standard"
           data-size="large"
           data-theme="outline"
           data-text="sign_in_with"
           data-shape="rectangular"
           data-logo_alignment="left">
      </div>
      <div class="guest-login">
        <input v-model="guestName" type="text" placeholder="Digite seu nome de visitante" class="guest-name-input" @keyup.enter="handleGuestLogin" />
        <button @click="handleGuestLogin" class="guest-btn">Entrar como Visitante</button>
      </div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits } from 'vue';

const emit = defineEmits(['login-success']);

const errorMessage = ref('');
const guestName = ref('');
const googleClientId = ref(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const apiUrl = import.meta.env.VITE_API_URL || 'https://project3-2025a-gabriel.onrender.com';

const handleGoogleSignIn = async (response) => {
      console.log("Recebida credencial do Google:", response.credential);
  errorMessage.value = '';
      try {
    const res = await fetch(`${apiUrl}/api/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Falha no login');
        }

        console.log('Login no backend bem-sucedido:', data.user);
    emit('login-success', data.user);
      } catch (error) {
        console.error('Erro ao fazer login:', error);
    errorMessage.value = `Erro: ${error.message}. Verifique o console para mais detalhes.`;
      }
};

const handleGuestLogin = async () => {
  console.log("Tentando login como convidado...");
  errorMessage.value = '';
  try {
    const res = await fetch(`${apiUrl}/api/auth/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: guestName.value }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Falha no login como convidado');
    }

    console.log('Login como convidado bem-sucedido:', data.user);
    emit('login-success', data.user);
  } catch (error) {
    console.error('Erro ao fazer login como convidado:', error);
    errorMessage.value = `Erro: ${error.message}.`;
  }
};

onMounted(() => {
  if (!googleClientId.value) {
      console.error("VITE_GOOGLE_CLIENT_ID não está definida no frontend.");
      errorMessage.value = "Erro de configuração do cliente. O login não funcionará.";
  }
  
  window.handleGoogleSignIn = handleGoogleSignIn;
});

</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}

.login-box {
  text-align: center;
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

p {
  margin-bottom: 20px;
  color: #666;
}

.error-message {
  color: #D8000C; /* Vermelho para erro */
  margin-top: 15px;
}

.guest-login {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guest-name-input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  text-align: center;
}

.guest-btn {
  background-color: #4CAF50; /* Um verde para diferenciar */
  color: white;
  border: none;
  padding: 10px 24px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.guest-btn:hover {
  background-color: #45a049;
}
</style> 