<template>
  <div id="app-container">
    <Login v-if="!userInfo" @login-success="onLoginSuccess" />
    <DrawingCanvas v-else :user="userInfo" />
  </div>
</template>

<script setup>
import { userInfo } from './services/userInfo.js';
import Login from './components/Login.vue';
import DrawingCanvas from './components/DrawingCanvas.vue';

const onLoginSuccess = (userData) => {
  console.log('Login bem-sucedido no App.vue, mostrando o canvas.', userData);
  userInfo.value = userData;
};
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  max-width: none !important;
  text-align: left !important;
  display: block !important;
}

html, body {
  overflow: hidden; 
}

body {
  background-color: #333;
}

#app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

</style>