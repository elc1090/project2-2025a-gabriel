<template>
  <div class="sidebar-container">
    <button @click="setTool('pencil')" :class="{ 'active-tool': currentTool === 'pencil' }" title="Pincel" class="sidebar-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
    </button>
    <button @click="setTool('shapes')" :class="{ 'active-tool': currentTool === 'shapes' }" title="Formas" class="sidebar-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
    </button>
    <button @click="setTool('eraser')" :class="{ 'active-tool': currentTool === 'eraser' }" title="Borracha" class="sidebar-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 13.5A3.5 3.5 0 0 0 17 10h-2.5a2.5 2.5 0 0 0-5 0H7a3.5 3.5 0 0 0-3.5 3.5V15a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-1.5z"></path><path d="M17 10V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5"></path></svg>
    </button>
    
    <hr class="separator" />

    <WhiteboardMenu
      :selected-board-id="currentBoardId"
      @board-selected="handleBoardSelected"
      @board-created="handleBoardSelected"
      @board-deleted="handleBoardDeleted"
    />

    <button @click="undo" :disabled="!canUndo" title="Desfazer (Ctrl+Z)" class="sidebar-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-up-left"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
    </button>
    <button @click="redo" :disabled="!canRedo" title="Refazer (Ctrl+Y)" class="sidebar-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-up-right"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
    </button>
  </div>
  <canvas
    ref="viewportCanvasRef"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseout="handleMouseOut"
    @wheel.prevent="handleWheel"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
    @contextmenu.prevent="showContextMenu"
    class="viewport-canvas"
  ></canvas>
  <ContextMenu
    :visible="menu.visible"
    :x="menu.x"
    :y="menu.y"
    @select="handleMenuSelection"
  />
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import ContextMenu from './ContextMenu.vue';
import WhiteboardMenu from './WhiteboardMenu.vue';
import { userInfo } from '../services/userInfo';
import { io } from 'socket.io-client';

const props = defineProps({
  user: Object,
});

const socket = ref(null);
const currentBoardId = ref(1);

const viewportCanvasRef = ref(null);
let ctx = null;

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
const WORLD_BACKGROUND_COLOR = '#FFFFFF';
const TARGET_VIEWPORT_ASPECT_RATIO = (800 / 600);

const viewportState = reactive({
  width: 800,
  height: 600,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isPanning: false,
  lastPanX: 0,
  lastPanY: 0,
});

const strokes = ref([]);
const redoStack = ref([]);
let isDrawing = false;
let currentTempStrokeId = null;

const drawingSettings = reactive({
  color: 'black',
  lineWidth: 3,
});

const menu = reactive({
  visible: false,
  x: 0,
  y: 0,
});

const longPressDuration = 500;
let longPressTimer = null;
let touchStartCoords = {};
const longPressMoveThreshold = 10;

let isMultiTouching = false;
let potentialDrawingStart = false;

// Objeto reativo para armazenar informações do gesto de pinça/pan
const initialGestureInfo = reactive({
  pinchDistance: 0,
  worldMidpoint: { x: 0, y: 0 },
});

const otherCursors = reactive({});

const currentTool = ref('pencil');
const eraserSize = 20; // Raio da borracha em pixels do mundo

const canUndo = computed(() => {
  return strokes.value.some(s => s.user_id === userInfo.value?.id);
});

const canRedo = computed(() => {
  return redoStack.value.length > 0;
});

const undo = () => {
  if (!canUndo.value) return;
  socket.value.emit('undo_request', { 
    user_email: userInfo.value.email,
    board_id: currentBoardId.value
  });
};

const redo = () => {
  if (!canRedo.value) return;
  socket.value.emit('redo_request', { 
    user_email: userInfo.value.email,
    board_id: currentBoardId.value
  });
};

const handleKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z') {
      event.preventDefault();
      undo();
    } else if (event.key === 'y') {
      event.preventDefault();
      redo();
    }
  }
};

function switchBoard(board) {
  if (!socket.value || !socket.value.connected) return;

  const boardId = typeof board === 'object' ? board.id : board;
  
  if (currentBoardId.value === boardId) return;

  console.log(`FRONTEND: Trocando para a lousa ${boardId}`);
  
  strokes.value = [];
  redoStack.value = [];
  redraw();

  currentBoardId.value = boardId;
  
  socket.value.emit('join_board', {
    board_id: currentBoardId.value,
    user_email: userInfo.value?.email
  });
}

function handleBoardSelected(board) {
  switchBoard(board);
}

function handleBoardDeleted(deletedBoardId) {
  if (currentBoardId.value === deletedBoardId) {
    console.log(`FRONTEND: A lousa atual (${deletedBoardId}) foi deletada. Voltando para a principal.`);
    switchBoard({ id: 1, nickname: "Lousa Principal" });
  }
}

onMounted(() => {
  setupViewportAndWorld();
  window.addEventListener('resize', setupViewportAndWorld);
  window.addEventListener('keydown', handleKeyDown);

  const backendUrl = import.meta.env.VITE_API_URL || 'https://project3-2025a-gabriel.onrender.com';
  socket.value = io(backendUrl, {
    transports: ['websocket', 'polling']
  });

  socket.value.on('connect', () => {
    console.log('FRONTEND: Conectado ao servidor Socket.IO com ID:', socket.value.id);
    if (userInfo.value?.email) {
      socket.value.emit('join_board', { board_id: currentBoardId.value, user_email: userInfo.value.email });
    }
  });

  socket.value.on('connection_established', (data) => {
    console.log('FRONTEND: ' + data.message, 'SID do servidor:', data.sid);
  });

  socket.value.on('disconnect', () => {
    console.log('FRONTEND: Desconectado do servidor Socket.IO');
  });

  socket.value.on('initial_drawing', (data) => {
    console.log(`FRONTEND: Recebendo desenho inicial para lousa.`, data.strokes.length, 'traços');
    strokes.value = data.strokes.map(strokeData => ({
      id: strokeData.id,
      user_id: strokeData.user_id,
      points: strokeData.points,
      color: strokeData.color,
      lineWidth: strokeData.lineWidth
    }));
    redraw();
  });

  socket.value.on('cursor_update', (data) => {
    if (data.user_id !== userInfo.value?.id) {
      otherCursors[data.user_id] = {
        position: data.position,
        name: data.user_name,
        timestamp: Date.now()
      };
      redraw();
    }
  });

  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const userId in otherCursors) {
      if (now - otherCursors[userId].timestamp > 10000) { // 10 segundos de timeout
        delete otherCursors[userId];
        changed = true;
      }
    }
    if (changed) {
      redraw();
    }
  }, 2000);

  socket.value.on('drawing_in_progress', (strokeData) => {
    if (!strokeData || strokeData.user_id === userInfo.value?.id) return;
    
    const existingStrokeIndex = strokes.value.findIndex(s => s.id === strokeData.id);
    
    if (existingStrokeIndex !== -1) {
      // Atualiza o traço temporário existente
      strokes.value[existingStrokeIndex].points = strokeData.points;
    } else {
      // Adiciona um novo traço temporário
      strokes.value.push(strokeData);
    }
    redraw();
  });

  socket.value.on('stroke_received', (strokeData) => {
    if (strokeData.board_id !== currentBoardId.value) return;

    // Todos os clientes (desenhista e receptores) devem usar o temp_id para encontrar e substituir.
    if (strokeData.temp_id) {
      const tempStrokeIndex = strokes.value.findIndex(s => s.id === strokeData.temp_id);
      
      if (tempStrokeIndex !== -1) {
        // Substitui o traço temporário pelo final e permanente.
        strokes.value[tempStrokeIndex] = {
          id: strokeData.id,
          user_id: strokeData.user_id,
          points: strokeData.points,
          color: strokeData.color,
          lineWidth: strokeData.lineWidth,
        };
        
        // Lógica específica para o desenhista (limpar o redo stack)
        if (strokeData.user_id === userInfo.value?.id) {
            if (redoStack.value.length > 0) {
                redoStack.value = [];
            }
        }
        redraw();
        return; // Finalizado.
      }
    }
    
    // Fallback: se o traço temporário não foi encontrado (ex: usuário entrou no meio do desenho),
    // apenas adiciona o traço final.
    strokes.value.push(strokeData);
    redraw();
  });

  socket.value.on('stroke_removed', (data) => {
    if (data.board_id !== currentBoardId.value) return;
    
    const index = strokes.value.findIndex(s => s.id === data.stroke_id);
    if (index !== -1) {
      const [removedStroke] = strokes.value.splice(index, 1);

      if (removedStroke.user_id === userInfo.value?.id) {
        redoStack.value.push(removedStroke);
      }
      
    redraw();
    }
  });

  socket.value.on('canvas_cleared', (data) => {
    if (data.board_id !== currentBoardId.value) return;

    console.log(`FRONTEND: Evento de limpar canvas recebido do servidor para a lousa ${data.board_id}.`);
    strokes.value = [];
    redoStack.value = [];
    redraw();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', setupViewportAndWorld);
  window.removeEventListener('keydown', handleKeyDown);
  if (socket.value) {
    socket.value.disconnect();
  }
});

function setupViewportAndWorld() {
  const canvas = viewportCanvasRef.value;
  if (!canvas) return;
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;
  let newViewportWidth = availableWidth;
  let newViewportHeight = availableWidth / TARGET_VIEWPORT_ASPECT_RATIO;
  if (newViewportHeight > availableHeight) {
    newViewportHeight = availableHeight;
    newViewportWidth = availableHeight * TARGET_VIEWPORT_ASPECT_RATIO;
  }
  viewportState.width = Math.floor(newViewportWidth);
  viewportState.height = Math.floor(newViewportHeight);
  canvas.width = viewportState.width;
  canvas.height = viewportState.height;
  ctx = canvas.getContext('2d');
  if (!ctx) return;
  resetView();
}

function resetView() {
  if (!ctx) return;
  const scaleX = viewportState.width / WORLD_WIDTH;
  const scaleY = viewportState.height / WORLD_HEIGHT;
  viewportState.scale = Math.min(scaleX, scaleY) * 0.9;
  
  // Centraliza o mundo no viewport
  viewportState.offsetX = (WORLD_WIDTH / 2) - (viewportState.width / 2 / viewportState.scale);
  viewportState.offsetY = (WORLD_HEIGHT / 2) - (viewportState.height / 2 / viewportState.scale);
  redraw();
}

function redraw() {
  if (!ctx) return;
  
  ctx.clearRect(0, 0, viewportState.width, viewportState.height);

  ctx.save();
  ctx.scale(viewportState.scale, viewportState.scale);
  ctx.translate(-viewportState.offsetX, -viewportState.offsetY);

  // Desenha o fundo do "mundo"
  ctx.fillStyle = WORLD_BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  
  // Desenha todos os traços
  strokes.value.forEach(drawStroke);

  // Desenha os cursores de outros usuários
  drawOtherCursors();

  ctx.restore();
}

function drawStroke(stroke) {
  if (stroke.points.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.lineWidth; 
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

function screenToWorldCoordinates(screenX, screenY) {
  return {
    x: screenX / viewportState.scale + viewportState.offsetX,
    y: screenY / viewportState.scale + viewportState.offsetY,
  };
}

function getCanvasCoordinates(event) {
  const rect = viewportCanvasRef.value.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function handleMouseDown(event) {
  menu.visible = false;

  if (event.button === 0) {
    isDrawing = true;
    
    redoStack.value = [];

    const { x, y } = getCanvasCoordinates(event);
    const worldPoint = screenToWorldCoordinates(x, y);
    
    currentTempStrokeId = 'temp_' + Date.now();

    const newStroke = {
      id: currentTempStrokeId,
      user_id: userInfo.value.id,
      points: [worldPoint],
      color: drawingSettings.color,
      lineWidth: drawingSettings.lineWidth,
      is_temp: true,
    };

    strokes.value.push(newStroke);
    redraw();
  }
  else if (event.button === 1) {
    event.preventDefault();
    viewportState.isPanning = true;
    const { x, y } = getCanvasCoordinates(event);
    viewportState.lastPanX = x;
    viewportState.lastPanY = y;
  }
}

let lastEmitTime = 0;
const emitInterval = 50; // Throttling interval for cursor emitting

function handleMouseMove(event) {
  const { x: screenX, y: screenY } = getCanvasCoordinates(event);
  const worldCoords = screenToWorldCoordinates(screenX, screenY);

  // Emit cursor position throttled
  const now = Date.now();
  if (socket.value && socket.value.connected && now - lastEmitTime > emitInterval) {
    socket.value.emit('cursor_move', {
      board_id: currentBoardId.value,
      user_email: userInfo.value.email,
      position: worldCoords
    });

    // If drawing, emit the in-progress stroke here too
    if (isDrawing) {
        const activeStroke = strokes.value.find(s => s.id === currentTempStrokeId);
        if (activeStroke) {
            socket.value.emit('drawing_in_progress', {
                ...activeStroke,
                board_id: currentBoardId.value
            });
        }
    }

    lastEmitTime = now;
  }

  // Panning logic
  if (viewportState.isPanning) {
    const dx = screenX - viewportState.lastPanX;
    const dy = screenY - viewportState.lastPanY;
    viewportState.offsetX -= dx / viewportState.scale;
    viewportState.offsetY -= dy / viewportState.scale;
    viewportState.lastPanX = screenX;
    viewportState.lastPanY = screenY;
    redraw();
    return;
  }

  if (!isDrawing) return;

  // Drawing/Erasing logic
  if (currentTool.value === 'pencil' || currentTool.value === 'shapes') {
    const activeStroke = strokes.value.find(s => s.id === currentTempStrokeId);
    if (activeStroke) {
      activeStroke.points.push({ x: worldCoords.x, y: worldCoords.y });
      redraw();
    }
  } else if (currentTool.value === 'eraser') {
    [...strokes.value].forEach(stroke => {
      if (stroke.is_temp) return;
      const isHit = stroke.points.some(point => {
        const distance = Math.hypot(point.x - worldCoords.x, point.y - worldCoords.y);
        return distance < eraserSize;
      });
      if (isHit) {
        const index = strokes.value.findIndex(s => s.id === stroke.id);
        if (index !== -1) {
          const removedStroke = strokes.value.splice(index, 1)[0];
          redraw();
          socket.value.emit('erase_stroke', {
            stroke_id: removedStroke.id,
            board_id: currentBoardId.value
          });
        }
      }
    });
  }
}

function handleMouseUp(event) {
  if (event.button === 0 && isDrawing && (currentTool.value === 'pencil' || currentTool.value === 'shapes')) {
    isDrawing = false;
    const finalStroke = strokes.value.find(s => s.id === currentTempStrokeId);

    if (!finalStroke) return;

    if (currentTool.value === 'shapes' && finalStroke.points.length > 4) { 
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        finalStroke.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const diagonal = Math.sqrt(width*width + height*height);
        const epsilon = Math.max(2.5, diagonal * 0.04);
        console.log(`Dynamic epsilon: ${epsilon.toFixed(2)} (based on diagonal ${diagonal.toFixed(2)})`);
        
        const simplifiedPoints = rdp(finalStroke.points, epsilon);
        console.log(`Original points: ${finalStroke.points.length}, Simplified to: ${simplifiedPoints.length}`);

        const shape = analyzeShape(simplifiedPoints);

        if (shape.name !== 'unknown' && shape.confidence > 0.80) {
            console.log(`Recognized as ${shape.name} with confidence ${shape.confidence.toFixed(2)}`);
            const perfectPoints = generatePerfectShapePoints(shape.name, finalStroke, simplifiedPoints);
            if (perfectPoints.length > 0) {
              finalStroke.points = perfectPoints;
              redraw();
            }
        }
    }

    finalizeStroke(finalStroke);
    currentTempStrokeId = null;
  }
  
  if (event.button === 0 && isDrawing && currentTool.value === 'eraser') {
    isDrawing = false;
  }
  
  if (event.button === 1) {
    viewportState.isPanning = false;
  }
}

function handleMouseOut(event) {
  if (isDrawing) {
    handleMouseUp({ button: 0 }); 
  }
  if (viewportState.isPanning) {
    viewportState.isPanning = false;
  }
}

function handleWheel(event) {
  event.preventDefault();
  menu.visible = false;

  const scaleAmount = 1.1;
  const screenPoint = getCanvasCoordinates(event);
  const worldPointBeforeZoom = screenToWorldCoordinates(screenPoint.x, screenPoint.y);

  let newScale = viewportState.scale;
  if (event.deltaY < 0) {
    newScale *= scaleAmount;
  } else {
    newScale /= scaleAmount;
  }
  newScale = Math.max(0.1, Math.min(newScale, 20)); // Limita o zoom
  viewportState.scale = newScale;

  const worldPointAfterZoom = screenToWorldCoordinates(screenPoint.x, screenPoint.y);
  viewportState.offsetX += worldPointBeforeZoom.x - worldPointAfterZoom.x;
  viewportState.offsetY += worldPointBeforeZoom.y - worldPointAfterZoom.y;

  redraw();
}

function showContextMenuAt(screenX, screenY) {
  if (socket.value) socket.value.emit('debug_touch_event', { type: 'showContextMenuAt_Triggered', screenX, screenY, sid: socket.value.id });
  
  if (currentTempStrokeId) {
    const index = strokes.value.indexOf(strokes.value.find(s => s.id === currentTempStrokeId));
    if (index > -1) {
      strokes.value.splice(index, 1);
      if (socket.value) socket.value.emit('debug_touch_event', { type: 'showContextMenuAt_ClearedSpeculativeStroke', sid: socket.value.id });
    }
    currentTempStrokeId = null;
  }
  isDrawing = false;

  menu.x = screenX;
  menu.y = screenY;
  menu.visible = true;
}

function handleTouchStart(event) {
  event.preventDefault();
  menu.visible = false;
  const touches = event.touches;
  
  if (touches.length === 1 && !isMultiTouching) {
    potentialDrawingStart = true;
    const touch = touches[0];
    touchStartCoords = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (potentialDrawingStart && !isMultiTouching) {
        showContextMenuAt(touchStartCoords.x, touchStartCoords.y);
      }
      longPressTimer = null;
    }, longPressDuration);

  } else if (touches.length >= 2) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    potentialDrawingStart = false;
    
    if (isDrawing) {
        const index = strokes.value.findIndex(s => s.id === currentTempStrokeId);
        if (index !== -1) strokes.value.splice(index, 1);
        currentTempStrokeId = null;
        redraw();
    isDrawing = false; 
    }

    isMultiTouching = true;
    const t1 = touches[0];
    const t2 = touches[1];
    initialGestureInfo.pinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    
    const rect = viewportCanvasRef.value.getBoundingClientRect();
    const screenMidX = (t1.clientX - rect.left + t2.clientX - rect.left) / 2;
    const screenMidY = (t1.clientY - rect.top + t2.clientY - rect.top) / 2;
    
    initialGestureInfo.worldMidpoint = screenToWorldCoordinates(screenMidX, screenMidY);
  }
}

function handleTouchMove(event) {
  event.preventDefault();
  const touches = event.touches;

  if (touches.length === 1 && !isMultiTouching) {
    const touch = touches[0];
    const screenPoint = getCanvasCoordinates(touch);
    const worldPoint = screenToWorldCoordinates(screenPoint.x, screenPoint.y);

    // Emit cursor position throttled
    const now = Date.now();
    if (socket.value && socket.value.connected && now - lastEmitTime > emitInterval) {
      socket.value.emit('cursor_move', {
        board_id: currentBoardId.value,
        user_email: userInfo.value.email,
        position: worldPoint
      });
      
      // If drawing, emit the in-progress stroke here too
      if (isDrawing) {
        const activeStroke = strokes.value.find(s => s.id === currentTempStrokeId);
        if (activeStroke) {
            socket.value.emit('drawing_in_progress', {
                ...activeStroke,
                board_id: currentBoardId.value
            });
        }
      }
      
      lastEmitTime = now;
    }

    if (potentialDrawingStart) {
      const deltaX = touch.clientX - touchStartCoords.x;
      const deltaY = touch.clientY - touchStartCoords.y;

      if (Math.hypot(deltaX, deltaY) > longPressMoveThreshold) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        
        if (!isDrawing) {
           isDrawing = true;
           potentialDrawingStart = false;
           
           redoStack.value = [];
           currentTempStrokeId = 'temp_' + Date.now();
           const newStroke = {
                id: currentTempStrokeId,
                user_id: userInfo.value.id,
                points: [worldPoint],
            color: drawingSettings.color,
            lineWidth: drawingSettings.lineWidth,
                is_temp: true,
            };
            strokes.value.push(newStroke);
          redraw();
        }
      }
    }
    
    if (isDrawing) {
      if (currentTool.value === 'pencil' || currentTool.value === 'shapes') {
        const activeStroke = strokes.value.find(s => s.id === currentTempStrokeId);
        if (activeStroke) {
          activeStroke.points.push(worldPoint);
          redraw();
        }
      } else if (currentTool.value === 'eraser') {
        [...strokes.value].forEach(stroke => {
          if (stroke.is_temp) return;
          const isHit = stroke.points.some(point => {
            const distance = Math.hypot(point.x - worldPoint.x, point.y - worldPoint.y);
            return distance < eraserSize;
          });
          if (isHit) {
            const index = strokes.value.findIndex(s => s.id === stroke.id);
            if (index !== -1) {
              strokes.value.splice(index, 1);
      redraw();
              socket.value.emit('erase_stroke', {
                stroke_id: stroke.id,
                board_id: currentBoardId.value
              });
            }
          }
        });
      }
    }
  } else if (touches.length >= 2 && isMultiTouching) {
    const t1 = touches[0];
    const t2 = touches[1];
    
    const currentPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    let scaleFactor = 1;
    if (initialGestureInfo.pinchDistance > 0) {
        scaleFactor = currentPinchDistance / initialGestureInfo.pinchDistance;
    }
    const newScale = Math.max(0.1, Math.min(viewportState.scale * scaleFactor, 20));

    const rect = viewportCanvasRef.value.getBoundingClientRect();
    const currentScreenMidX = (t1.clientX - rect.left + t2.clientX - rect.left) / 2;
    const currentScreenMidY = (t1.clientY - rect.top + t2.clientY - rect.top) / 2;
    const worldMidpointAfterZoom = {
        x: currentScreenMidX / newScale + viewportState.offsetX,
        y: currentScreenMidY / newScale + viewportState.offsetY
    };
    
    viewportState.offsetX += initialGestureInfo.worldMidpoint.x - worldMidpointAfterZoom.x;
    viewportState.offsetY += initialGestureInfo.worldMidpoint.y - worldMidpointAfterZoom.y;
    viewportState.scale = newScale;
    
    initialGestureInfo.pinchDistance = currentPinchDistance;
    initialGestureInfo.worldMidpoint = screenToWorldCoordinates(currentScreenMidX, currentScreenMidY);

    redraw();
  }
}

function handleTouchEnd(event) {
  event.preventDefault();
  clearTimeout(longPressTimer);

  if (isDrawing) {
    const finalStroke = strokes.value.find(s => s.id === currentTempStrokeId);
    
    if (!finalStroke) {
        isDrawing = false;
        potentialDrawingStart = false;
        currentTempStrokeId = null;
        return;
    }

    if (currentTool.value === 'shapes' && finalStroke.points.length > 4) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        finalStroke.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const diagonal = Math.sqrt(width*width + height*height);
        const epsilon = Math.max(2.5, diagonal * 0.04);
        console.log(`Dynamic epsilon (Touch): ${epsilon.toFixed(2)} (based on diagonal ${diagonal.toFixed(2)})`);
        
        const simplifiedPoints = rdp(finalStroke.points, epsilon);
        console.log(`Original points (Touch): ${finalStroke.points.length}, Simplified to: ${simplifiedPoints.length}`);

        const shape = analyzeShape(simplifiedPoints);
        if (shape.name !== 'unknown' && shape.confidence > 0.80) {
            console.log(`Recognized as ${shape.name} (Touch) with confidence ${shape.confidence.toFixed(2)}`);
            const perfectPoints = generatePerfectShapePoints(shape.name, finalStroke, simplifiedPoints);
            if (perfectPoints.length > 0) {
              finalStroke.points = perfectPoints;
            }
        }
    }
    
    finalizeStroke(finalStroke);
  }
  
  if (event.touches.length < 2) {
    isMultiTouching = false;
  }
  if (event.touches.length < 1) {
    isDrawing = false;
    potentialDrawingStart = false;
    currentTempStrokeId = null;
  }
}

function showContextMenu(event) {
  menu.x = event.clientX;
  menu.y = event.clientY;
  menu.visible = true;
}

function handleMenuSelection(action, value) {
  menu.visible = false;
  switch (action) {
    case 'clear':
      if (confirm('Tem certeza que deseja limpar o canvas para todos?')) {
        console.log(`FRONTEND: Enviando evento para limpar canvas da lousa ${currentBoardId.value}`);
        if (socket.value) {
          socket.value.emit('clear_canvas_event', { board_id: currentBoardId.value });
        }
        strokes.value = [];
        redoStack.value = [];
        redraw();
      }
      break;
    case 'resetView':
      resetView();
      break;
    case 'setColor':
      drawingSettings.color = value;
      break;
    case 'setThickness':
      drawingSettings.lineWidth = value;
      break;
  }
}

function getDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const setTool = (tool) => {
  currentTool.value = tool;
};

// Nova função para finalizar um traço (seja enviando para o servidor ou removendo se for um clique)
const finalizeStroke = (stroke) => {
  if (stroke.points.length > 1 && socket.value) {
    socket.value.emit('draw_stroke_event', {
      board_id: currentBoardId.value,
      user_email: userInfo.value?.email,
      points: stroke.points,
      color: stroke.color,
      lineWidth: stroke.lineWidth,
      temp_id: stroke.id,
    });
  } else {
    // Se for apenas um clique, remove o traço temporário
    const index = strokes.value.findIndex(s => s.id === stroke.id);
    if (index !== -1) {
      strokes.value.splice(index, 1);
      redraw();
    }
  }
};

// --- Funções para o Algoritmo Ramer-Douglas-Peucker (RDP) ---

// Calcula a distância perpendicular de um ponto a uma linha.
function perpendicularDistance(pt, lineStart, lineEnd) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) { // lineStart e lineEnd são o mesmo ponto
        dx = pt.x - lineStart.x;
        dy = pt.y - lineStart.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    const t = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    
    let closestPoint;
    if (t < 0) {
        closestPoint = lineStart;
    } else if (t > 1) {
        closestPoint = lineEnd;
    } else {
        closestPoint = { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
    }

    dx = pt.x - closestPoint.x;
    dy = pt.y - closestPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Simplifica um caminho usando o algoritmo RDP.
function rdp(points, epsilon) {
    if (points.length < 3) {
        return points;
    }
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilon) {
        const recResults1 = rdp(points.slice(0, index + 1), epsilon);
        const recResults2 = rdp(points.slice(index, end + 1), epsilon);
        return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    } else {
        return [points[0], points[end]];
    }
}

// Nova função auxiliar para calcular o bounding box, usada para círculos
function getBoundingBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    return { cx, cy, width, height };
}

// Renamed from createPerfectShape, this function now only returns the points.
function generatePerfectShapePoints(shapeName, originalStroke, simplifiedPoints) {
    let perfectPoints = [];
    switch (shapeName) {
        case 'line':
            perfectPoints = [ 
                { x: originalStroke.points[0].x, y: originalStroke.points[0].y },
                { x: originalStroke.points[originalStroke.points.length - 1].x, y: originalStroke.points[originalStroke.points.length - 1].y }
            ];
      break;
        case 'circle':
            const { cx, cy, width, height } = getBoundingBox(originalStroke.points);
            perfectPoints = createPolygon(32, cx, cy, Math.min(width, height) / 2);
            break;
        case 'rectangle':
            const vertices = simplifiedPoints.slice(0, 4); // Pega os 4 vértices principais

            if (vertices.length === 4) {
                // 1. Achar o centro geométrico
                const centerX = (vertices[0].x + vertices[1].x + vertices[2].x + vertices[3].x) / 4;
                const centerY = (vertices[0].y + vertices[1].y + vertices[2].y + vertices[3].y) / 4;
                const center = { x: centerX, y: centerY };

                // 2. Achar a distância média do centro aos vértices (cria um retângulo com diagonais iguais)
                let totalDist = 0;
                for(let i=0; i < 4; i++){
                    totalDist += getDistance(center, vertices[i]);
                }
                const avgDist = totalDist / 4;

                // 3. Recriar os vértices na distância média, preservando a direção original
                let newVertices = [];
                for(let i=0; i < 4; i++){
                    const originalVector = { x: vertices[i].x - center.x, y: vertices[i].y - center.y };
                    const magnitude = getDistance(center, vertices[i]);
                    if (magnitude > 0) { // Evita divisão por zero
                        const normalizedVector = { x: originalVector.x / magnitude, y: originalVector.y / magnitude };
                        newVertices.push({
                            x: center.x + normalizedVector.x * avgDist,
                            y: center.y + normalizedVector.y * avgDist
                        });
                    } else {
                        newVertices.push({ ...vertices[i] }); // Mantém o ponto original
                    }
                }
                perfectPoints = [...newVertices, newVertices[0]]; // Fecha a forma
            } else {
                // Fallback para o método antigo se não tivermos exatamente 4 pontos
                const rectVertices = simplifiedPoints.slice(0, 4);
                perfectPoints = [...rectVertices, rectVertices[0]];
            }
            break;
        case 'triangle':
            const triVertices = simplifiedPoints.slice(0, 3);
            perfectPoints = [...triVertices, triVertices[0]]; // Fecha a forma
            break;
    }

    return perfectPoints;
};

// Funções auxiliares para criar formas geométricas (usadas por createPerfectShape)
const createPolygon = (sides, cx, cy, radius) => {
    const points = [];
    const angleStep = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
        // O -Math.PI / 2 é para rotacionar e deixar a base do triângulo/quadrado reta
        points.push({
            x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
            y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
        });
    }
    points.push(points[0]); // Fecha o polígono
    return points;
};

const createStar = (cx, cy, outerRadius, innerRadius) => {
    const points = [];
    const sides = 5;
    const angleStep = Math.PI / sides;
    for (let i = 0; i < 2 * sides; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        points.push({
            x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
            y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
        });
    }
    points.push(points[0]); // Fecha a estrela
    return points;
}

function getAngle(p1, p2, p3) {
    const a = getDistance(p2, p3);
    const b = getDistance(p1, p2);
    const c = getDistance(p1, p3);
    // Lei dos cossenos
    const angleRad = Math.acos((b * b + a * a - c * c) / (2 * b * a));
    return angleRad * (180 / Math.PI); // Converte para graus
}

// O novo analisador de formas, baseado em características
function analyzeShape(points) {
    const numPoints = points.length;

    if (numPoints < 2) return { name: 'unknown', confidence: 0 };

    // Calcula o bounding box e o comprimento total para normalização
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let pathLength = 0;
    for (let i = 0; i < points.length; i++) {
        minX = Math.min(minX, points[i].x);
        minY = Math.min(minY, points[i].y);
        maxX = Math.max(maxX, points[i].x);
        maxY = Math.max(maxY, points[i].y);
        if (i > 0) {
            pathLength += getDistance(points[i-1], points[i]);
        }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const diagonal = Math.sqrt(width*width + height*height);

    // Linha: 2 pontos após RDP.
    if (numPoints === 2) {
        return { name: 'line', confidence: 1.0 };
    }
    
    // Verifica se a forma é fechada (distância entre início e fim é pequena em relação ao tamanho)
    const start = points[0];
    const end = points[numPoints - 1];
    const isClosed = getDistance(start, end) < diagonal * 0.25; // Limiar de fechamento dinâmico

    // Análise para polígonos fechados
    if (isClosed && numPoints >= 4) {
        // Usa `numPoints-1` como o número de vértices únicos, assumindo que o último ponto fecha no primeiro.
        const vertices = points.slice(0, numPoints - 1);
        const numVertices = vertices.length;

        if (numVertices < 3) return { name: 'unknown', confidence: 0 };
        
        let angles = [];
        for (let i = 0; i < numVertices; i++) {
            const p1 = vertices[(i + numVertices - 1) % numVertices];
            const p2 = vertices[i];
            const p3 = vertices[(i + 1) % numVertices];
            angles.push(getAngle(p1, p2, p3));
        }

        // Retângulo: Deve ter 4 vértices.
        if (numVertices === 4) {
            // Faixa de ângulo um pouco mais permissiva.
            const nearRightAngles = angles.filter(angle => angle > 78 && angle < 102).length;
            
            // Prioriza 4 ângulos retos, mas aceita 3, já que o usuário está no modo de formas.
            if (nearRightAngles === 4) {
                return { name: 'rectangle', confidence: 0.95 };
            }
            if (nearRightAngles === 3) {
                return { name: 'rectangle', confidence: 0.82 }; // Confiança menor, mas aceitável
            }
        }

        // Triângulo: Deve ter 3 vértices.
        if (numVertices === 3) {
             const sharpAngles = angles.filter(angle => angle > 30 && angle < 140).length;
             // Exige 3 ângulos razoáveis.
             if (sharpAngles === 3) {
                 return { name: 'triangle', confidence: 0.9 };
             }
        }
    }
    
    // Análise para Círculo/Elipse
    if (isClosed && numPoints > 5) {
        // Área aproximada usando a fórmula de Shoelace
        let area = 0;
        for (let i = 0; i < numPoints - 1; i++) {
            area += (points[i].x * points[i+1].y - points[i+1].x * points[i].y);
        }
        area = Math.abs(area / 2);

        const circularity = (4 * Math.PI * area) / (pathLength * pathLength);
        
        console.log("Circularity score:", circularity);
        // Limiar aumentado. Um quadrado perfeito tem circularidade ~0.785.
        // Isso evita que quadrados sejam classificados como círculos.
        if (circularity > 0.80) {
            return { name: 'circle', confidence: circularity };
        }
    }

    return { name: 'unknown', confidence: 0 };
}

function worldToViewport(worldX, worldY) {
  const viewportX = (worldX - viewportState.offsetX) * viewportState.scale;
  const viewportY = (worldY - viewportState.offsetY) * viewportState.scale;
  return { x: viewportX, y: viewportY };
}

function stringToColor(str) {
  if (!str) return '#000000';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

function drawOtherCursors() {
  for (const userId in otherCursors) {
    const cursor = otherCursors[userId];
    const { x, y } = cursor.position;
    const name = cursor.name;

    const userColor = stringToColor(userId);
    ctx.fillStyle = userColor;

    // Draw cursor icon
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 18);
    ctx.lineTo(8, 19);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw name
    const maxNameLength = 20;
    const displayName = name.length > maxNameLength ? name.substring(0, maxNameLength) + '...' : name;

    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 3;
    ctx.fillText(displayName, x + 16, y + 28);
    ctx.shadowBlur = 0;
  }
}

function startDrawing(worldX, worldY) {
  if (isDrawing) return;
  isDrawing = true;
  // ... existing code ...
}
</script>

<style scoped>
.sidebar-container {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  z-index: 100;
  
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 12px;
  
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.separator {
  width: 100%;
  border: none;
  border-top: 1px solid #e8eaed;
  margin: 0;
}

/* Estilo para os botões da sidebar, incluindo o do componente WhiteboardMenu */
:deep(.whiteboard-menu-button),
.sidebar-button {
  background-color: transparent;
  border: none;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #5f6368;
  transition: background-color 0.2s;
  padding: 0;
}

:deep(.whiteboard-menu-button:hover:not(:disabled)),
.sidebar-button:hover:not(:disabled) {
  background-color: #f1f3f4;
}

.sidebar-button.active-tool {
  background-color: #e8f0fe; /* Um azul claro para indicar seleção */
  color: #1967d2; /* Um azul mais escuro para o ícone */
}

.sidebar-button:disabled {
  color: #bdc1c6;
  cursor: not-allowed;
}

.viewport-canvas {
  border: 1px solid #505050;
  background-color:rgb(255, 255, 255);
  display: block;
  touch-action: none; /* Previne o scroll do navegador em touch screens */
}

@media (max-width: 768px) {
  .sidebar-container {
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    padding: 8px;
    gap: 8px;
    width: auto;
  }

  :deep(.whiteboard-menu-wrapper) {
    position: static; /* Permite que o menu se posicione em relação à viewport */
  }

  :deep(.menu-content) {
    position: fixed; /* Posicionamento relativo à janela do navegador */
    top: 80px; /* Distância do topo para aparecer abaixo da topbar */
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100vw - 32px); /* Garante que não saia da tela */
  }
}
</style>