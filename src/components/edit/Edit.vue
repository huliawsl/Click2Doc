<template>
  <div class="edit">
    <div class="workspace">
      <button class="back-button" @click="backToHome">
        <img src="/left.png" />
      </button>
      
      <!-- 操作记录展示区域 -->
      <div class="records-container" v-if="steps.length > 0">
        <h3 class="records-title">操作记录</h3>
        <div class="records-list">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="record-card"
            @click="editStep(index)"
          >
            <button
              class="delete-btn"
              @click.stop="deleteStep(index)"
              title="删除此步骤"
            >
              ×
            </button>
            <div class="card-header">
              <span class="step-number">{{ index + 1 }}</span>
              <span class="action-type" :class="step.action">{{ getActionIcon(step.action) }}</span>
              <span class="timestamp">{{ formatTime(step.timestamp) }}</span>
            </div>
            <div class="card-content">
              <div class="screenshot-container" v-if="step.screenshot">
                <img
                  :src="step.screenshot"
                  alt="操作截图"
                  :class="['screenshot', { 'not-editable': recordingState !== 'paused' }]"
                  @click.stop="openImageEditor(index)"
                />
              </div>
              <div class="description">
                <input 
                  v-if="editingIndex === index"
                  v-model="editingDescription"
                  @blur="saveEdit"
                  @keyup.enter="saveEdit"
                  @keyup.esc="cancelEdit"
                  class="description-input"
                  ref="editInput"
                />
                <span v-else>{{ step.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 无记录时的提示 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">📝</div>
        <p>点击右侧 "Start" 按钮开始后台记录</p>
        <p class="empty-tip">系统将在后台记录软件外的操作，不记录本软件内的操作</p>
      </div>
    </div>
    
    <div class="sidebar">
      <div class="control-panel">
        <button class="sap" :class="{active: isRecording}" @click="toggleRecording">
          {{ getRecordingButtonText() }}
        </button>
        
        <div class="recording-status" v-if="isRecording">
          <div class="recording-indicator"></div>
          <span>后台录制中...</span>
        </div>
        
        <button class="export-btn" @click="exportWithSystemDialog" :disabled="steps.length === 0">
          导出记录
        </button>
        
        <button class="clear-btn" @click="clearRecords" :disabled="steps.length === 0">
          清空记录
        </button>

        <div class="screenshot-settings">
          <h5>截图设置</h5>
          <select v-model="screenshotQuality" class="quality-select">
            <option value="low">低质量 (快速)</option>
            <option value="medium">中等质量</option>
            <option value="high">高质量</option>
            <option value="ultra">超高质量</option>
          </select>

          <button class="test-screenshot-btn" @click="testScreenshot">
            测试截图
          </button>
        </div>
      </div>
      
      <div class="stats" v-if="steps.length > 0">
        <h4>统计信息</h4>
        <p>总步骤数: {{ steps.length }}</p>
        <p>录制时长: {{ formatDuration() }}</p>
        <p>点击次数: {{ getActionCount('click') }}</p>
        <p>键盘操作: {{ getActionCount('keydown') }}</p>
        <p>文本输入: {{ getActionCount('input') }}</p>
        <p>滚轮操作: {{ getActionCount('scroll') }}</p>

        <div class="context-info" v-if="currentContext">
          <h5>当前环境</h5>
          <p>活动窗口: {{ currentContext.window?.title || '未知' }}</p>
          <p>应用程序: {{ currentContext.application?.name || '未知' }}</p>
          <p>系统: {{ currentContext.system?.platform || '未知' }}</p>
          <p>内存使用: {{ formatMemory(currentContext.system?.freeMemory) }}</p>
        </div>
      </div>
    </div>

    <!-- 导出格式选择对话框 -->
    <div v-if="showExportFormatDialog" class="export-dialog-modal">
      <div class="export-dialog-content">
        <div class="export-dialog-header">
          <h3>选择导出格式</h3>
          <button class="close-btn" @click="closeExportDialog">×</button>
        </div>

        <div class="export-format-list">
          <div class="export-format-item" @click="exportToMarkdown">
            <div class="format-icon">📝</div>
            <div class="format-info">
              <h4>Markdown (.md)</h4>
              <p>导出为Markdown格式，包含步骤说明和嵌入图片</p>
            </div>
          </div>

          <div class="export-format-item" @click="exportToHTML">
            <div class="format-icon">🌐</div>
            <div class="format-info">
              <h4>HTML (.html)</h4>
              <p>导出为网页格式，可在浏览器中查看</p>
            </div>
          </div>

          <div class="export-format-item" @click="exportToWord">
            <div class="format-icon">📄</div>
            <div class="format-info">
              <h4>Word (.docx)</h4>
              <p>导出为Microsoft Word文档</p>
            </div>
          </div>

          <div class="export-format-item" @click="exportToStepFormat">
            <div class="format-icon">📦</div>
            <div class="format-info">
              <h4>Step格式 (.step)</h4>
              <p>专有格式，包含完整的步骤数据和截图</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图像编辑器模态框 -->
    <div v-if="showImageEditor" class="image-editor-modal" @click="closeImageEditor">
      <div class="image-editor-container" @click.stop>
        <div class="image-editor-header">
          <div class="tool-buttons">
            <button
              v-for="tool in ['mouse', 'brush', 'rectangle', 'circle']"
              :key="tool"
              :class="['tool-btn', { active: selectedTool === tool }]"
              @click="selectedTool = tool as 'mouse' | 'brush' | 'rectangle' | 'circle'"
            >
              {{ getToolIcon(tool) }}
            </button>
          </div>
          <div class="action-buttons">
            <button class="undo-btn" @click="undoDrawing" :disabled="undoHistory.length === 0">↶</button>
            <button class="redo-btn" @click="redoDrawing" :disabled="redoHistory.length === 0">↷</button>
            <button class="save-btn" @click="saveImageEdit" :class="{ 'has-changes': hasUnsavedChanges }">✓</button>
            <button class="close-btn" @click="closeImageEditor">×</button>
          </div>
        </div>
        <div class="image-editor-canvas">
          <canvas
            ref="imageCanvas"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @keydown="handleCanvasKeydown"
            tabindex="0"
          ></canvas>

          <!-- 文本编辑器已移除 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";

// 声明全局类型
declare global {
  interface Window {
    electronAPI?: {
      showSaveDialog: (options: any) => Promise<any>;
      writeFile: (filePath: string, content: string) => Promise<any>;
    };
  }
}

// 数据结构定义
interface OperationStep {
  id: string;
  timestamp: number;
  action: 'click' | 'keydown' | 'input' | 'scroll';
  description: string;
  screenshot?: string;
  position?: { x: number; y: number };
  element?: string;
}

// 录制状态枚举
enum RecordingState {
  STOPPED = 'stopped',
  RECORDING = 'recording',
  PAUSED = 'paused'
}

// 图像编辑工具类型
interface DrawingElement {
  id: string;
  type: 'brush' | 'rectangle' | 'circle' | 'click-annotation';
  data: any;
  selected?: boolean;
}

// 响应式数据
const steps = ref<OperationStep[]>([]);
const recordingState = ref<RecordingState>(RecordingState.STOPPED);
const isRecording = ref(false);
const editingIndex = ref(-1);
const editingDescription = ref('');
const startTime = ref(0);
const router = useRouter();
const editInput = ref();
const screenshotQuality = ref<'low' | 'medium' | 'high' | 'ultra'>('medium');
const currentContext = ref<any>(null);

// 图像编辑相关状态
const showImageEditor = ref(false);
const editingImageIndex = ref(-1);
const editingImageData = ref<string>('');
const drawingElements = ref<DrawingElement[]>([]);
const selectedTool = ref<'mouse' | 'brush' | 'rectangle' | 'circle'>('mouse');
const undoHistory = ref<DrawingElement[][]>([]);
const redoHistory = ref<DrawingElement[][]>([]);

// 导出对话框状态
const showExportFormatDialog = ref(false);

// 笔刷绘制状态
const currentBrushStroke = ref<{ x: number; y: number }[]>([]);
const isDrawingBrush = ref(false);

// 延迟渲染系统状态
const originalImageData = ref<string>(''); // 保存原始图像
const hasUnsavedChanges = ref(false); // 标记是否有未保存的更改

// 离屏画布缓存系统
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;
let backgroundImageLoaded = ref(false);

// 图片缓存
let cachedEditImage: HTMLImageElement | null = null;

// 文本编辑状态已移除

// 绘制状态机
enum DrawingState {
  IDLE = 'idle',
  DRAWING = 'drawing',
  COMMIT = 'commit'
}

const drawingState = ref<DrawingState>(DrawingState.IDLE);
const currentDrawingStart = ref<{ x: number; y: number } | null>(null);
const currentDrawingEnd = ref<{ x: number; y: number } | null>(null);
const isShiftPressed = ref(false);
const isAltPressed = ref(false);

// 拖拽状态管理
const isDragging = ref(false);
const dragStartPosition = ref<{ x: number; y: number } | null>(null);
const draggedElement = ref<DrawingElement | null>(null);
const dragOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 });

// 窗口状态管理
const isAppWindowFocused = ref(true);

// 文本输入和滚轮相关的状态
const inputBuffer = ref('');
const inputTimer = ref<NodeJS.Timeout | null>(null);
const scrollTimer = ref<NodeJS.Timeout | null>(null);

// 事件监听器引用
let keydownListener: ((e: KeyboardEvent) => void) | null = null;
let clickListener: ((e: MouseEvent) => void) | null = null;
let wheelListener: ((e: WheelEvent) => void) | null = null;
let focusListener: ((e: FocusEvent) => void) | null = null;
let blurListener: ((e: FocusEvent) => void) | null = null;

// 返回首页
const backToHome = () => {
  if (isRecording.value) {
    stopRecording();
  }
  router.push("/");
};

// 切换录制状态 - 增强版本支持三种状态
const toggleRecording = () => {
  switch (recordingState.value) {
    case RecordingState.STOPPED:
      startRecording();
      break;
    case RecordingState.RECORDING:
      pauseRecording();
      break;
    case RecordingState.PAUSED:
      continueRecording();
      break;
  }
};

// 获取录制按钮文本
const getRecordingButtonText = (): string => {
  switch (recordingState.value) {
    case RecordingState.STOPPED:
      return 'Start';
    case RecordingState.RECORDING:
      return 'Stop';
    case RecordingState.PAUSED:
      return 'Continue';
    default:
      return 'Start';
  }
};

// 开始录制 - 清空历史记录并开始新的录制
const startRecording = async () => {
  try {
    // Start global recording using Electron APIs
    const result = await (window as any).globalRecorder.startRecording();

    if (result.success) {
      recordingState.value = RecordingState.RECORDING;
      isRecording.value = true;
      startTime.value = Date.now();
      steps.value = []; // 清空所有历史记录

      // Listen for global events
      (window as any).globalRecorder.onEventCaptured(handleGlobalEvent);

      // Collect initial context
      await updateCurrentContext();

      // Also add local event listeners for fallback
      addGlobalEventListeners();
      addWindowFocusListeners();

      // 保存状态到本地存储
      saveRecordingState();

      console.log('Global recording started successfully');
    } else {
      console.error('Failed to start global recording:', result.message);
      // Fallback to local recording
      recordingState.value = RecordingState.RECORDING;
      isRecording.value = true;
      startTime.value = Date.now();
      steps.value = [];
      addGlobalEventListeners();
      addWindowFocusListeners();
      saveRecordingState();
    }
  } catch (error) {
    console.error('Error starting global recording:', error);
    // Fallback to local recording
    recordingState.value = RecordingState.RECORDING;
    isRecording.value = true;
    startTime.value = Date.now();
    steps.value = [];
    addGlobalEventListeners();
    addWindowFocusListeners();
    saveRecordingState();
  }
};

// 暂停录制 - 保留历史记录
const pauseRecording = async () => {
  try {
    if ((window as any).globalRecorder) {
      const result = await (window as any).globalRecorder.stopRecording();
      if (result.success && result.data) {
        console.log('Global recording paused, data preserved');
      }
      (window as any).globalRecorder.removeEventListeners();
    }
  } catch (error) {
    console.error('Error pausing global recording:', error);
  }

  recordingState.value = RecordingState.PAUSED;
  isRecording.value = false;

  // 移除事件监听器但保留数据
  removeGlobalEventListeners();
  removeWindowFocusListeners();
  clearTimers();

  // 保存状态到本地存储
  saveRecordingState();
};

// 继续录制 - 在现有记录基础上继续
const continueRecording = async () => {
  try {
    // Start global recording using Electron APIs
    const result = await (window as any).globalRecorder.startRecording();

    if (result.success) {
      recordingState.value = RecordingState.RECORDING;
      isRecording.value = true;

      // 不重置 startTime 和 steps，继续在现有基础上记录

      // Listen for global events
      (window as any).globalRecorder.onEventCaptured(handleGlobalEvent);

      // Also add local event listeners for fallback
      addGlobalEventListeners();
      addWindowFocusListeners();

      // 保存状态到本地存储
      saveRecordingState();

      console.log('Recording continued successfully');
    } else {
      console.error('Failed to continue global recording:', result.message);
      // Fallback to local recording
      recordingState.value = RecordingState.RECORDING;
      isRecording.value = true;
      addGlobalEventListeners();
      addWindowFocusListeners();
      saveRecordingState();
    }
  } catch (error) {
    console.error('Error continuing global recording:', error);
    // Fallback to local recording
    recordingState.value = RecordingState.RECORDING;
    isRecording.value = true;
    addGlobalEventListeners();
    addWindowFocusListeners();
    saveRecordingState();
  }
};

// 停止录制 - 现在由 pauseRecording 处理
const stopRecording = async () => {
  await pauseRecording();
};

// 添加窗口焦点监听器
const addWindowFocusListeners = () => {
  focusListener = () => {
    isAppWindowFocused.value = true;
  };
  
  blurListener = () => {
    isAppWindowFocused.value = false;
  };
  
  window.addEventListener('focus', focusListener);
  window.addEventListener('blur', blurListener);
};

// 移除窗口焦点监听器
const removeWindowFocusListeners = () => {
  if (focusListener) {
    window.removeEventListener('focus', focusListener);
    focusListener = null;
  }
  if (blurListener) {
    window.removeEventListener('blur', blurListener);
    blurListener = null;
  }
};

// 检查是否应该记录事件
const shouldRecordEvent = (): boolean => {
  // 只有在录制状态且窗口失焦时才记录
  return isRecording.value && !isAppWindowFocused.value;
};

// 处理全局事件
const handleGlobalEvent = (event: any) => {
  if (!isRecording.value) return;

  console.log('Global event captured:', event);

  // Convert global event to our step format
  const step: OperationStep = {
    id: event.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)),
    timestamp: event.timestamp || Date.now(),
    action: mapGlobalEventToAction(event.type),
    description: event.description || `Global ${event.type} event`,
    screenshot: event.screenshot,
    position: event.position
  };

  steps.value.push(step);
};

// 映射全局事件类型到我们的操作类型
const mapGlobalEventToAction = (eventType: string): OperationStep['action'] => {
  switch (eventType) {
    case 'click':
    case 'mouse':
      return 'click';
    case 'key':
    case 'keyboard':
      return 'keydown';
    case 'input':
    case 'text':
      return 'input';
    case 'scroll':
    case 'wheel':
      return 'scroll';
    default:
      return 'click'; // 默认为点击
  }
};

// 添加全局事件监听器
const addGlobalEventListeners = () => {
  // 键盘事件 - 区分单键和文本输入
  keydownListener = async (e: KeyboardEvent) => {
    if (!shouldRecordEvent()) return;

    const target = e.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.contentEditable === 'true';

    // 如果是在输入框中，处理为文本输入
    if (isInputElement && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleTextInput(e);
      return;
    }

    // 增强的键盘事件分类逻辑
    let description = '';
    let needsImmediateScreenshot = false;

    if (e.ctrlKey || e.metaKey || e.altKey) {
      // 分类为快捷键
      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.metaKey) keys.push('Cmd');
      if (e.altKey) keys.push('Alt');
      keys.push(e.key);
      description = `按下了[${keys.join('+')}]`;
      needsImmediateScreenshot = true; // 组合键可能触发快捷操作
    } else if (e.key.match(/^F\d+$/)) {
      // 分类为功能键（快捷键）
      description = `按下了[${e.key}]`;
      needsImmediateScreenshot = true; // 功能键可能触发特殊操作
    } else if (e.key === 'Enter') {
      // 回车键可能触发表单提交或页面跳转
      description = '按下了[回车键]';
      needsImmediateScreenshot = true;
    } else {
      // 单个功能键
      const keyName = getKeyDisplayName(e.key);
      description = `按下了[${keyName}]`;
    }

    if (needsImmediateScreenshot) {
      // 对于可能触发页面变化的按键，立即截图
      let screenshot = '';
      try {
        screenshot = await captureScreenFast();
      } catch (error) {
        console.error('立即截图失败:', error);
      }
      addStepWithScreenshot('keydown', description, undefined, screenshot);
    } else {
      // 对于普通按键，使用常规截图
      addStep('keydown', description);
    }
  };
  
  // 鼠标点击事件
  clickListener = async (e: MouseEvent) => {
    if (!shouldRecordEvent()) return;

    // 立即截图，在页面状态改变之前
    let screenshot = '';
    try {
      screenshot = await captureScreenFast();
    } catch (error) {
      console.error('立即截图失败:', error);
    }

    const target = e.target as HTMLElement;
    const elementInfo = getElementInfo(target);
    // 按照规范格式显示点击坐标
    const description = `${e.button === 0 ? '左键' :
                       e.button === 2 ? '右键' : '中键'}点击坐标(${e.clientX}, ${e.clientY})${elementInfo}`;

    addStepWithScreenshot('click', description, { x: e.clientX, y: e.clientY }, screenshot);
  };
  
  // 滚轮事件 - 防抖处理，连续滚动只记录一次
  wheelListener = (e: WheelEvent) => {
    if (!shouldRecordEvent()) return;
    
    // 清除之前的定时器
    if (scrollTimer.value) {
      clearTimeout(scrollTimer.value);
    }
    
    // 设置新的定时器，1秒后记录滚动事件
    scrollTimer.value = setTimeout(() => {
      const direction = e.deltaY > 0 ? '向下' : '向上';
      addStep('scroll', `鼠标滚轮${direction}滚动`);
    }, 1000);
  };
  
  // 在 Electron 环境中，应该使用 ipcRenderer 来监听全局事件
  document.addEventListener('keydown', keydownListener, true);
  document.addEventListener('click', clickListener, true);
  document.addEventListener('wheel', wheelListener, { passive: true, capture: true });
};

// 处理文本输入
const handleTextInput = (e: KeyboardEvent) => {
  if (!shouldRecordEvent()) return;
  
  inputBuffer.value += e.key;
  
  // 清除之前的定时器
  if (inputTimer.value) {
    clearTimeout(inputTimer.value);
  }
  
  // 设置新的定时器，500ms 后记录输入内容
  inputTimer.value = setTimeout(() => {
    if (inputBuffer.value.trim()) {
      // 按照规范格式显示文本输入
      const description = `输入了"${inputBuffer.value.length > 20 ?
        inputBuffer.value.substring(0, 20) + '...' :
        inputBuffer.value}"`;
      addStep('input', description);
    }
    inputBuffer.value = '';
  }, 500);
};

// 获取按键显示名称
const getKeyDisplayName = (key: string): string => {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'Enter': 'Enter',
    'Escape': 'Esc',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'Page Up',
    'PageDown': 'Page Down',
    'Insert': 'Insert',
    'CapsLock': 'Caps Lock',
    'Shift': 'Shift',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': 'Cmd',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
  };
  
  return keyMap[key] || key.toUpperCase();
};

// 获取元素信息
const getElementInfo = (element: HTMLElement): string => {
  if (element.id) {
    return ` (#${element.id})`;
  }
  if (element.className) {
    return ` (.${element.className.split(' ')[0]})`;
  }
  if (element.tagName) {
    return ` (${element.tagName.toLowerCase()})`;
  }
  return '';
};

// 清理定时器
const clearTimers = () => {
  if (inputTimer.value) {
    clearTimeout(inputTimer.value);
    inputTimer.value = null;
  }
  if (scrollTimer.value) {
    clearTimeout(scrollTimer.value);
    scrollTimer.value = null;
  }
};

// 移除全局事件监听器
const removeGlobalEventListeners = () => {
  if (keydownListener) {
    document.removeEventListener('keydown', keydownListener, true);
    keydownListener = null;
  }
  if (clickListener) {
    document.removeEventListener('click', clickListener, true);
    clickListener = null;
  }
  if (wheelListener) {
    document.removeEventListener('wheel', wheelListener);
    wheelListener = null;
  }
};

// 添加操作步骤
const addStep = async (action: OperationStep['action'], description: string, position?: { x: number; y: number }) => {
  const step: OperationStep = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    action,
    description,
    position
  };

  // 模拟截图（实际项目中需要调用 Electron API）
  try {
    step.screenshot = await captureScreen();
  } catch (error) {
    console.error('截图失败:', error);
  }

  steps.value.push(step);
};

// 添加操作步骤（带预先截取的截图）
const addStepWithScreenshot = (action: OperationStep['action'], description: string, position?: { x: number; y: number }, screenshot?: string) => {
  const step: OperationStep = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    action,
    description,
    position,
    screenshot: screenshot || ''
  };

  steps.value.push(step);
};

// 真实截图功能（使用增强的 Electron API）
const captureScreen = async (): Promise<string> => {
  try {
    // Try to use enhanced screen capture API first
    if ((window as any).screenCapture) {
      const result = await (window as any).screenCapture.captureScreen({
        quality: screenshotQuality.value,
        format: 'png'
      });
      if (result.success && result.screenshot) {
        return result.screenshot;
      }
    }

    // Fallback to basic global recorder
    if ((window as any).globalRecorder) {
      const result = await (window as any).globalRecorder.captureScreen();
      if (result.success && result.screenshot) {
        return result.screenshot;
      }
    }

    // Final fallback to mock screenshot
    return createMockScreenshot('外部窗口截图', '#f0f0f0', '#333');
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return createMockScreenshot('截图失败', '#ffebee', '#d32f2f');
  }
};

// 快速截图功能（用于立即截图，使用较低质量以提高速度）
const captureScreenFast = async (): Promise<string> => {
  try {
    // Try to use enhanced screen capture API with low quality for speed
    if ((window as any).screenCapture) {
      const result = await (window as any).screenCapture.captureScreen({
        quality: 'low', // 使用低质量以提高速度
        format: 'jpeg' // 使用JPEG格式以减少文件大小
      });
      if (result.success && result.screenshot) {
        return result.screenshot;
      }
    }

    // Fallback to basic global recorder
    if ((window as any).globalRecorder) {
      const result = await (window as any).globalRecorder.captureScreen();
      if (result.success && result.screenshot) {
        return result.screenshot;
      }
    }

    // Final fallback to mock screenshot
    return createMockScreenshot('快速截图', '#e3f2fd', '#1976d2');
  } catch (error) {
    console.error('Fast screenshot capture failed:', error);
    return createMockScreenshot('快速截图失败', '#ffebee', '#d32f2f');
  }
};

// 创建模拟截图的辅助函数
const createMockScreenshot = (text: string, bgColor: string, textColor: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = textColor;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 100, 55);
  }
  return canvas.toDataURL();
};

// 编辑步骤
const editStep = (index: number) => {
  editingIndex.value = index;
  editingDescription.value = steps.value[index].description;
  nextTick(() => {
    if (editInput.value && editInput.value[0]) {
      editInput.value[0].focus();
      editInput.value[0].select();
    }
  });
};

// 保存编辑
const saveEdit = () => {
  if (editingIndex.value >= 0) {
    steps.value[editingIndex.value].description = editingDescription.value;
  }
  editingIndex.value = -1;
  editingDescription.value = '';
};

// 取消编辑
const cancelEdit = () => {
  editingIndex.value = -1;
  editingDescription.value = '';
};

// 使用系统对话框导出
const exportWithSystemDialog = async () => {
  try {
    // 检查是否在Electron环境中
    if (window.electronAPI && window.electronAPI.showSaveDialog) {
      const result = await window.electronAPI.showSaveDialog({
        title: '导出记录',
        defaultPath: `操作记录_${formatTime(Date.now(), 'YYYY-MM-DD_HH-mm-ss')}`,
        filters: [
          { name: 'Step格式', extensions: ['step'] },
          { name: 'Markdown', extensions: ['md'] },
          { name: 'HTML', extensions: ['html'] },
          { name: 'JSON', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        const extension = result.filePath.split('.').pop()?.toLowerCase();

        switch (extension) {
          case 'step':
            await exportToStepFormatWithPath(result.filePath);
            break;
          case 'md':
            await exportToMarkdownWithPath(result.filePath);
            break;
          case 'html':
            await exportToHTMLWithPath(result.filePath);
            break;
          case 'json':
            await exportToJSONWithPath(result.filePath);
            break;
          default:
            // 默认导出为step格式
            await exportToStepFormatWithPath(result.filePath);
        }
      }
    } else {
      // 如果不在Electron环境中，回退到原来的对话框方式
      showExportFormatDialog.value = true;
    }
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

// 显示导出格式选择对话框
const showExportDialog = () => {
  showExportFormatDialog.value = true;
};

// 关闭导出对话框
const closeExportDialog = () => {
  showExportFormatDialog.value = false;
};

// 导出为Markdown格式
const exportToMarkdown = () => {
  const title = `操作记录_${formatTime(Date.now(), 'YYYY-MM-DD_HH-mm-ss')}`;
  let markdown = `# ${title}\n\n`;
  markdown += `**导出时间**: ${formatTime(Date.now())}\n`;
  markdown += `**总步骤数**: ${steps.value.length}\n`;
  markdown += `**录制时长**: ${formatDuration()}\n\n`;

  markdown += `## 操作步骤\n\n`;

  steps.value.forEach((step, index) => {
    markdown += `### 步骤 ${index + 1}: ${step.description}\n\n`;
    markdown += `- **操作类型**: ${step.action}\n`;
    markdown += `- **时间**: ${formatTime(step.timestamp)}\n`;

    if (step.position) {
      markdown += `- **位置**: (${step.position.x}, ${step.position.y})\n`;
    }

    if (step.element) {
      markdown += `- **元素**: ${step.element}\n`;
    }

    if (step.screenshot) {
      markdown += `\n![步骤${index + 1}截图](data:image/png;base64,${step.screenshot.split(',')[1]})\n`;
    }

    markdown += `\n---\n\n`;
  });

  downloadFile(markdown, `${title}.md`, 'text/markdown');
  closeExportDialog();
};

// 导出为HTML格式
const exportToHTML = () => {
  const title = `操作记录_${formatTime(Date.now(), 'YYYY-MM-DD_HH-mm-ss')}`;
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .step { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; padding: 20px; }
        .step-header { background: #e6f7ff; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 8px 8px 0 0; }
        .screenshot { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
        .meta { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p><strong>导出时间:</strong> ${formatTime(Date.now())}</p>
        <p><strong>总步骤数:</strong> ${steps.value.length}</p>
        <p><strong>录制时长:</strong> ${formatDuration()}</p>
    </div>
`;

  steps.value.forEach((step, index) => {
    html += `
    <div class="step">
        <div class="step-header">
            <h2>步骤 ${index + 1}: ${step.description}</h2>
        </div>
        <div class="meta">
            <p><strong>操作类型:</strong> ${step.action}</p>
            <p><strong>时间:</strong> ${formatTime(step.timestamp)}</p>`;

    if (step.position) {
      html += `<p><strong>位置:</strong> (${step.position.x}, ${step.position.y})</p>`;
    }

    if (step.element) {
      html += `<p><strong>元素:</strong> ${step.element}</p>`;
    }

    html += `</div>`;

    if (step.screenshot) {
      html += `<img src="${step.screenshot}" alt="步骤${index + 1}截图" class="screenshot">`;
    }

    html += `</div>`;
  });

  html += `
</body>
</html>`;

  downloadFile(html, `${title}.html`, 'text/html');
  closeExportDialog();
};

// 导出为Word格式 (简化版，实际需要docx库)
const exportToWord = () => {
  alert('Word导出功能需要安装docx库，当前导出为HTML格式');
  exportToHTML();
};

// 导出为Step格式
const exportToStepFormat = () => {
  const title = `操作记录_${formatTime(Date.now(), 'YYYY-MM-DD_HH-mm-ss')}`;
  const stepData = {
    version: '1.0',
    title: title,
    description: '此记录包含完整的操作步骤和截图',
    exportTime: Date.now(),
    duration: formatDuration(),
    statistics: {
      totalSteps: steps.value.length,
      clickCount: getActionCount('click'),
      keyboardCount: getActionCount('keydown'),
      inputCount: getActionCount('input'),
      scrollCount: getActionCount('scroll')
    },
    steps: steps.value.map(step => ({
      ...step,
      // 确保截图数据完整
      screenshot: step.screenshot || ''
    }))
  };

  downloadFile(JSON.stringify(stepData, null, 2), `${title}.step`, 'application/json');
  closeExportDialog();
};

// 通用下载文件函数
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// 获取文件名（不含扩展名）
const getFileBasename = (filePath: string, extension: string): string => {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  return fileName.endsWith(extension) ? fileName.slice(0, -extension.length) : fileName;
};

// 使用系统API写入文件
const writeFileWithSystemAPI = async (filePath: string, content: string) => {
  if (window.electronAPI && window.electronAPI.writeFile) {
    const result = await window.electronAPI.writeFile(filePath, content);
    if (!result.success) {
      throw new Error(result.error || '文件写入失败');
    }
  } else {
    throw new Error('系统文件API不可用');
  }
};

// 导出为Step格式（使用文件路径）
const exportToStepFormatWithPath = async (filePath: string) => {
  const title = getFileBasename(filePath, '.step');
  const stepData = {
    version: '1.0',
    title: title,
    description: '此记录包含完整的操作步骤和截图',
    exportTime: Date.now(),
    duration: formatDuration(),
    statistics: {
      totalSteps: steps.value.length,
      clickCount: getActionCount('click'),
      keyboardCount: getActionCount('keydown'),
      inputCount: getActionCount('input'),
      scrollCount: getActionCount('scroll')
    },
    steps: steps.value.map(step => ({
      ...step,
      // 确保截图数据完整
      screenshot: step.screenshot || ''
    }))
  };

  await writeFileWithSystemAPI(filePath, JSON.stringify(stepData, null, 2));
};

// 导出为Markdown格式（使用文件路径）
const exportToMarkdownWithPath = async (filePath: string) => {
  const title = getFileBasename(filePath, '.md');
  let markdown = `# ${title}\n\n`;
  markdown += `**导出时间**: ${formatTime(Date.now())}\n`;
  markdown += `**总步骤数**: ${steps.value.length}\n`;
  markdown += `**录制时长**: ${formatDuration()}\n\n`;

  markdown += `## 操作步骤\n\n`;

  steps.value.forEach((step, index) => {
    markdown += `### 步骤 ${index + 1}: ${step.description}\n\n`;
    markdown += `- **操作类型**: ${step.action}\n`;
    markdown += `- **时间**: ${formatTime(step.timestamp)}\n`;

    if (step.position) {
      markdown += `- **位置**: (${step.position.x}, ${step.position.y})\n`;
    }

    if (step.element) {
      markdown += `- **元素**: ${step.element}\n`;
    }

    if (step.screenshot) {
      markdown += `\n![步骤${index + 1}截图](data:image/png;base64,${step.screenshot.split(',')[1]})\n`;
    }

    markdown += `\n---\n\n`;
  });

  await writeFileWithSystemAPI(filePath, markdown);
};

// 导出为HTML格式（使用文件路径）
const exportToHTMLWithPath = async (filePath: string) => {
  const title = getFileBasename(filePath, '.html');
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .step { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; padding: 20px; }
        .step-header { background: #e6f7ff; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 8px 8px 0 0; }
        .meta { margin-bottom: 15px; }
        .meta p { margin: 5px 0; color: #666; }
        .screenshot { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p><strong>导出时间:</strong> ${formatTime(Date.now())}</p>
        <p><strong>总步骤数:</strong> ${steps.value.length}</p>
        <p><strong>录制时长:</strong> ${formatDuration()}</p>
    </div>`;

  steps.value.forEach((step, index) => {
    html += `
    <div class="step">
        <div class="step-header">
            <h2>步骤 ${index + 1}: ${step.description}</h2>
        </div>
        <div class="meta">
            <p><strong>操作类型:</strong> ${step.action}</p>
            <p><strong>时间:</strong> ${formatTime(step.timestamp)}</p>`;

    if (step.position) {
      html += `<p><strong>位置:</strong> (${step.position.x}, ${step.position.y})</p>`;
    }

    if (step.element) {
      html += `<p><strong>元素:</strong> ${step.element}</p>`;
    }

    html += `</div>`;

    if (step.screenshot) {
      html += `<img src="${step.screenshot}" alt="步骤${index + 1}截图" class="screenshot">`;
    }

    html += `</div>`;
  });

  html += `
</body>
</html>`;

  await writeFileWithSystemAPI(filePath, html);
};

// 导出为JSON格式（使用文件路径）
const exportToJSONWithPath = async (filePath: string) => {
  const title = getFileBasename(filePath, '.json');
  const jsonData = {
    title: title,
    exportTime: Date.now(),
    duration: formatDuration(),
    statistics: {
      totalSteps: steps.value.length,
      clickCount: getActionCount('click'),
      keyboardCount: getActionCount('keydown'),
      inputCount: getActionCount('input'),
      scrollCount: getActionCount('scroll')
    },
    steps: steps.value
  };

  await writeFileWithSystemAPI(filePath, JSON.stringify(jsonData, null, 2));
};



// 清空记录 - 优化版本
const clearRecords = async () => {
  if (confirm('确定要清空所有记录吗？')) {
    try {
      // 1. 停止任何正在进行的录制
      if (isRecording.value) {
        await stopRecording();
      }

      // 2. 重置所有状态
      steps.value = [];
      recordingState.value = RecordingState.STOPPED;
      isRecording.value = false;
      startTime.value = 0;

      // 3. 清理定时器和事件监听器
      clearTimers();
      removeGlobalEventListeners();
      removeWindowFocusListeners();

      // 4. 清理全局录制器
      if ((window as any).globalRecorder) {
        try {
          await (window as any).globalRecorder.stopRecording();
          (window as any).globalRecorder.removeEventListeners();
        } catch (error) {
          console.error('Error cleaning up global recorder:', error);
        }
      }

      // 5. 保存重置状态到本地存储
      saveRecordingState();

      console.log('All records cleared and state reset');
    } catch (error) {
      console.error('Error clearing records:', error);
      alert('清空记录时发生错误，请重试');
    }
  }
};

// 格式化时间
const formatTime = (timestamp: number, format: string = 'HH:mm:ss') => {
  const date = new Date(timestamp);
  if (format === 'YYYY-MM-DD_HH-mm-ss') {
    return date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  }
  return date.toLocaleTimeString();
};

// 格式化录制时长
const formatDuration = () => {
  if (steps.value.length === 0) return '0秒';
  
  const duration = Math.floor((steps.value[steps.value.length - 1].timestamp - startTime.value) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
};

// 获取操作类型图标
const getActionIcon = (action: string): string => {
  const iconMap: Record<string, string> = {
    'click': '🖱️',
    'keydown': '⌨️',
    'input': '📝',
    'scroll': '🔄'
  };
  return iconMap[action] || '📋';
};

// 获取指定操作类型的数量
const getActionCount = (action: string): number => {
  return steps.value.filter(step => step.action === action).length;
};

// 测试截图功能
const testScreenshot = async () => {
  try {
    if ((window as any).screenCapture) {
      const result = await (window as any).screenCapture.captureScreen({
        quality: screenshotQuality.value,
        format: 'png'
      });

      if (result.success && result.screenshot) {
        // 创建一个临时步骤来显示截图
        const testStep: OperationStep = {
          id: 'test-' + Date.now(),
          timestamp: Date.now(),
          action: 'click',
          description: `测试截图 (${screenshotQuality.value}质量)`,
          screenshot: result.screenshot
        };

        // 临时添加到步骤列表的开头
        steps.value.unshift(testStep);

        // 3秒后移除测试截图
        setTimeout(() => {
          const index = steps.value.findIndex(step => step.id === testStep.id);
          if (index !== -1) {
            steps.value.splice(index, 1);
          }
        }, 3000);

        console.log('Test screenshot captured successfully');
        console.log('Metadata:', result.metadata);
      } else {
        console.error('Test screenshot failed:', result.error);
        alert('截图测试失败: ' + (result.error || '未知错误'));
      }
    } else {
      alert('截图功能不可用');
    }
  } catch (error) {
    console.error('Test screenshot error:', error);
    alert('截图测试出错: ' + (error instanceof Error ? error.message : String(error)));
  }
};

// 更新当前上下文信息
const updateCurrentContext = async () => {
  try {
    if ((window as any).contextCollector) {
      const context = await (window as any).contextCollector.getFullContext({
        type: 'window',
        details: { action: 'context_update', timestamp: Date.now() }
      });
      currentContext.value = context;
      console.log('Context updated:', context);
    }
  } catch (error) {
    console.error('Failed to update context:', error);
  }
};

// 格式化内存大小
const formatMemory = (bytes?: number): string => {
  if (!bytes) return '未知';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// 状态持久化
const saveRecordingState = () => {
  try {
    const state = {
      recordingState: recordingState.value,
      steps: steps.value,
      startTime: startTime.value,
      screenshotQuality: screenshotQuality.value
    };
    localStorage.setItem('stepcraft-recording-state', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save recording state:', error);
  }
};

const loadRecordingState = () => {
  try {
    const saved = localStorage.getItem('stepcraft-recording-state');
    if (saved) {
      const state = JSON.parse(saved);
      recordingState.value = state.recordingState || RecordingState.STOPPED;
      steps.value = state.steps || [];
      startTime.value = state.startTime || 0;
      screenshotQuality.value = state.screenshotQuality || 'medium';
    }
  } catch (error) {
    console.error('Failed to load recording state:', error);
  }
};

// 删除步骤
const deleteStep = (index: number) => {
  if (confirm('确定删除此步骤？')) {
    steps.value.splice(index, 1);
    saveRecordingState();
  }
};

// 图像编辑器相关函数
const imageCanvas = ref<HTMLCanvasElement>();
const isDrawing = ref(false);
const lastPosition = ref<{ x: number; y: number } | null>(null);

// 打开图像编辑器 - 专业级绘制系统
const openImageEditor = (index: number) => {
  if (recordingState.value !== RecordingState.PAUSED) {
    alert('只有在暂停记录状态下才能编辑截图');
    return;
  }

  editingImageIndex.value = index;
  editingImageData.value = steps.value[index].screenshot || '';
  originalImageData.value = editingImageData.value; // 保存原始图像
  showImageEditor.value = true;
  drawingElements.value = [];
  undoHistory.value = [];
  redoHistory.value = [];
  hasUnsavedChanges.value = false;

  // 重置绘制状态机
  drawingState.value = DrawingState.IDLE;
  currentDrawingStart.value = null;
  currentDrawingEnd.value = null;
  isShiftPressed.value = false;
  isAltPressed.value = false;

  // 重置离屏画布状态
  offscreenCanvas = null;
  offscreenCtx = null;
  backgroundImageLoaded.value = false;

  // 添加全局键盘监听
  document.addEventListener('keydown', handleGlobalKeyEvent);
  document.addEventListener('keyup', handleGlobalKeyEvent);

  // 下一帧初始化离屏画布缓存系统
  nextTick(() => {
    console.log('开始初始化专业级绘制系统...');
    initializeCanvas();
  });
};

// 关闭图像编辑器 - 清理所有缓存和监听器
const closeImageEditor = () => {
  showImageEditor.value = false;
  editingImageIndex.value = -1;
  editingImageData.value = '';
  originalImageData.value = '';
  drawingElements.value = [];
  selectedTool.value = 'mouse';
  hasUnsavedChanges.value = false;

  // 重置绘制状态机
  drawingState.value = DrawingState.IDLE;
  currentDrawingStart.value = null;
  currentDrawingEnd.value = null;
  isShiftPressed.value = false;
  isAltPressed.value = false;

  // 清理离屏画布缓存
  offscreenCanvas = null;
  offscreenCtx = null;
  backgroundImageLoaded.value = false;

  // 清理图片缓存
  cachedEditImage = null;

  // 移除全局键盘监听
  document.removeEventListener('keydown', handleGlobalKeyEvent);
  document.removeEventListener('keyup', handleGlobalKeyEvent);

  console.log('图像编辑器已关闭，所有缓存和监听器已清理');
};

// 获取工具图标
const getToolIcon = (tool: string): string => {
  const icons: Record<string, string> = {
    mouse: '🖱️',
    brush: '🖌️',
    rectangle: '⬜',
    circle: '⭕'
  };
  return icons[tool] || '🖱️';
};

// 初始化离屏画布缓存
const initOffscreenCanvas = () => {
  if (!originalImageData.value) return;

  // 创建离屏画布
  offscreenCanvas = document.createElement('canvas');
  offscreenCtx = offscreenCanvas.getContext('2d');

  if (!offscreenCtx) return;

  const img = new Image();
  img.onload = () => {
    if (!offscreenCanvas || !offscreenCtx) return;

    // 设置离屏画布尺寸
    offscreenCanvas.width = img.width;
    offscreenCanvas.height = img.height;

    // 将背景图绘制到离屏画布
    offscreenCtx.drawImage(img, 0, 0);

    // 标记背景图已加载
    backgroundImageLoaded.value = true;

    // 初始化主画布
    initializeMainCanvas();

    console.log('离屏画布初始化完成');
  };
  img.src = originalImageData.value;
};

// 初始化主画布
const initializeMainCanvas = () => {
  if (!imageCanvas.value || !offscreenCanvas) return;

  const canvas = imageCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置主画布尺寸与离屏画布一致
  canvas.width = offscreenCanvas.width;
  canvas.height = offscreenCanvas.height;

  // 立即绘制内容（无闪烁）
  fastRedrawCanvas();

  // 如果是点击事件的截图，自动添加红色圆圈注释
  const step = steps.value[editingImageIndex.value];
  if (step && step.action === 'click' && step.position) {
    addClickAnnotation(step.position.x, step.position.y);
  }
};

// 快速重绘画布（使用离屏画布缓存，无闪烁）
const fastRedrawCanvas = () => {
  if (!imageCanvas.value || !offscreenCanvas || !offscreenCtx) return;

  const canvas = imageCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 瞬间复制离屏画布内容（无异步加载，无闪烁）
  ctx.drawImage(offscreenCanvas, 0, 0);

  // 绘制所有绘制元素
  drawingElements.value.forEach(element => {
    drawElement(ctx, element);
  });

  // 标记有未保存的更改
  if (drawingElements.value.length > 0) {
    hasUnsavedChanges.value = true;
  }

  console.log('快速重绘完成，元素数量:', drawingElements.value.length);
};

// 保持原函数名以兼容现有代码
const initializeCanvas = () => {
  initOffscreenCanvas();
};

// 添加点击注释（红色圆圈）
const addClickAnnotation = (x: number, y: number) => {
  const annotation: DrawingElement = {
    id: Date.now().toString(),
    type: 'click-annotation',
    data: { x, y, radius: 15 },
    selected: false
  };

  drawingElements.value.push(annotation);
  saveToUndoHistory();
  redrawCanvas();
};

// 获取准确的画布坐标
const getCanvasCoordinates = (e: MouseEvent): { x: number; y: number } => {
  if (!imageCanvas.value) return { x: 0, y: 0 };

  const canvas = imageCanvas.value;
  const rect = canvas.getBoundingClientRect();

  // 计算缩放比例
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // 考虑滚动偏移和缩放
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  return { x, y };
};

// 开始绘制 - 支持拖拽功能
const startDrawing = (e: MouseEvent) => {
  if (!imageCanvas.value) return;

  const { x, y } = getCanvasCoordinates(e);

  console.log(`开始绘制 ${selectedTool.value} 在位置:`, { x, y });

  if (selectedTool.value === 'mouse') {
    // 选择模式：检查是否点击了某个元素或开始拖拽
    selectElementAt(x, y);

    // 如果点击了已选中的元素，开始拖拽
    if (draggedElement.value && draggedElement.value.selected) {
      isDragging.value = true;
      isDrawing.value = true; // 使用isDrawing来跟踪拖拽状态
      console.log('开始拖拽元素:', draggedElement.value.type);
    }
  } else if (selectedTool.value === 'brush') {
    // 笔刷模式：开始新的笔刷描边
    isDrawing.value = true;
    lastPosition.value = { x, y };
    isDrawingBrush.value = true;
    currentBrushStroke.value = [{ x, y }];
  } else if (selectedTool.value === 'rectangle' || selectedTool.value === 'circle') {
    // 矩形/圆形模式：进入Drawing状态
    drawingState.value = DrawingState.DRAWING;
    currentDrawingStart.value = { x, y };
    currentDrawingEnd.value = { x, y };
    isDrawing.value = true;
    lastPosition.value = { x, y };

    console.log(`进入 ${selectedTool.value} 绘制状态，起点:`, { x, y });
  }
};

// 绘制过程 - 支持拖拽和实时预览
const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !imageCanvas.value) return;

  const { x, y } = getCanvasCoordinates(e);

  // 更新修饰键状态
  isShiftPressed.value = e.shiftKey;
  isAltPressed.value = e.altKey;

  if (selectedTool.value === 'mouse' && isDragging.value && draggedElement.value && dragStartPosition.value) {
    // 拖拽模式：移动选中的元素
    const deltaX = x - dragStartPosition.value.x;
    const deltaY = y - dragStartPosition.value.y;

    // 更新元素位置
    moveElement(draggedElement.value, deltaX, deltaY);

    // 更新拖拽起始位置
    dragStartPosition.value = { x, y };

    // 实时重绘
    fastRedrawCanvas();
  } else if (selectedTool.value === 'brush' && isDrawingBrush.value && lastPosition.value) {
    // 笔刷绘制：添加点到当前描边并实时绘制
    currentBrushStroke.value.push({ x, y });
    drawBrushStroke(lastPosition.value.x, lastPosition.value.y, x, y);
    lastPosition.value = { x, y };
  } else if ((selectedTool.value === 'rectangle' || selectedTool.value === 'circle') &&
             drawingState.value === DrawingState.DRAWING &&
             currentDrawingStart.value) {
    // 矩形/圆形绘制：更新终点并实时预览
    currentDrawingEnd.value = { x, y };

    // 计算实际绘制参数（考虑修饰键）
    const drawingParams = calculateDrawingParams(
      currentDrawingStart.value,
      { x, y },
      selectedTool.value,
      isShiftPressed.value,
      isAltPressed.value
    );

    // 实时预览
    redrawCanvasWithPreview(drawingParams.start, drawingParams.end);
  }
};

// 停止绘制 - 支持拖拽完成
const stopDrawing = (e: MouseEvent) => {
  if (!isDrawing.value) return;

  const { x, y } = getCanvasCoordinates(e);

  console.log('停止绘制:', selectedTool.value, {
    state: drawingState.value,
    isDragging: isDragging.value,
    start: currentDrawingStart.value || lastPosition.value,
    end: { x, y }
  });

  if (selectedTool.value === 'mouse' && isDragging.value) {
    // 完成拖拽：保存到撤销历史
    console.log('拖拽完成，保存到撤销历史');
    saveToUndoHistory();

    // 重置拖拽状态
    isDragging.value = false;
    draggedElement.value = null;
    dragStartPosition.value = null;
  } else if (selectedTool.value === 'brush' && isDrawingBrush.value) {
    // 完成笔刷描边：保存为DrawingElement
    if (currentBrushStroke.value.length > 1) {
      const brushElement: DrawingElement = {
        id: Date.now().toString(),
        type: 'brush',
        data: {
          points: [...currentBrushStroke.value],
          color: '#ff0000',
          lineWidth: 3
        }
      };
      drawingElements.value.push(brushElement);
      console.log('笔刷元素已添加:', brushElement);

      // 保存到撤销历史并重绘
      saveToUndoHistory();
      redrawCanvas();
    }

    // 重置笔刷状态
    isDrawingBrush.value = false;
    currentBrushStroke.value = [];
  } else if ((selectedTool.value === 'rectangle' || selectedTool.value === 'circle') &&
             drawingState.value === DrawingState.DRAWING &&
             currentDrawingStart.value) {
    // 完成矩形或圆形绘制：状态机进入Commit
    drawingState.value = DrawingState.COMMIT;

    // 计算最终绘制参数（考虑修饰键）
    const drawingParams = calculateDrawingParams(
      currentDrawingStart.value,
      { x, y },
      selectedTool.value,
      isShiftPressed.value,
      isAltPressed.value
    );

    // 创建最终元素
    commitDrawingElement(drawingParams.start, drawingParams.end);

    // 重置状态机
    drawingState.value = DrawingState.IDLE;
    currentDrawingStart.value = null;
    currentDrawingEnd.value = null;
  }

  isDrawing.value = false;
  lastPosition.value = null;
};

// 选择指定位置的元素 - 支持拖拽功能
const selectElementAt = (x: number, y: number) => {
  let selectionChanged = false;
  let selectedElement: DrawingElement | null = null;

  // 先查找要选择的元素
  for (let i = drawingElements.value.length - 1; i >= 0; i--) {
    const element = drawingElements.value[i];
    if (isPointInElement(x, y, element)) {
      selectedElement = element;
      break;
    }
  }

  // 检查选择状态是否需要改变
  drawingElements.value.forEach(el => {
    const shouldBeSelected = el === selectedElement;
    if (el.selected !== shouldBeSelected) {
      el.selected = shouldBeSelected;
      selectionChanged = true;
    }
  });

  // 如果选中了元素，准备拖拽
  if (selectedElement) {
    draggedElement.value = selectedElement;
    dragStartPosition.value = { x, y };

    // 计算拖拽偏移量（鼠标点击位置相对于元素位置的偏移）
    dragOffset.value = calculateDragOffset(selectedElement, x, y);

    console.log('元素已选中，准备拖拽:', selectedElement.type);
  } else {
    draggedElement.value = null;
    dragStartPosition.value = null;
  }

  // 只有在选择状态真正改变时才使用快速重绘
  if (selectionChanged) {
    console.log('选择状态改变，执行快速重绘');
    fastRedrawCanvas(); // 使用快速重绘，无闪烁
  } else {
    console.log('选择状态未改变，跳过重绘');
  }
};

// 检查点是否在元素内
const isPointInElement = (x: number, y: number, element: DrawingElement): boolean => {
  switch (element.type) {
    case 'brush':
      // 检查点是否在笔刷描边附近
      if (!element.data.points || element.data.points.length < 2) return false;

      for (let i = 0; i < element.data.points.length - 1; i++) {
        const distance = distanceToLine(
          x, y,
          element.data.points[i].x, element.data.points[i].y,
          element.data.points[i + 1].x, element.data.points[i + 1].y
        );
        if (distance <= element.data.lineWidth / 2 + 3) { // 3像素容差
          return true;
        }
      }
      return false;

    case 'click-annotation':
      const dx = x - element.data.x;
      const dy = y - element.data.y;
      return Math.sqrt(dx * dx + dy * dy) <= element.data.radius;

    case 'rectangle':
      return x >= element.data.x && x <= element.data.x + element.data.width &&
             y >= element.data.y && y <= element.data.y + element.data.height;

    case 'circle':
      const cdx = x - element.data.centerX;
      const cdy = y - element.data.centerY;
      return Math.sqrt(cdx * cdx + cdy * cdy) <= element.data.radius;

    default:
      return false;
  }
};

// 计算点到线段的距离
const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.sqrt(A * A + B * B);

  let param = dot / lenSq;

  if (param < 0) {
    return Math.sqrt(A * A + B * B);
  } else if (param > 1) {
    const E = px - x2;
    const F = py - y2;
    return Math.sqrt(E * E + F * F);
  } else {
    const projX = x1 + param * C;
    const projY = y1 + param * D;
    const G = px - projX;
    const H = py - projY;
    return Math.sqrt(G * G + H * H);
  }
};

// 获取笔刷描边的边界框
const getBrushBounds = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
};

// 计算拖拽偏移量
const calculateDragOffset = (element: DrawingElement, clickX: number, clickY: number) => {
  switch (element.type) {
    case 'rectangle':
      return {
        x: clickX - element.data.x,
        y: clickY - element.data.y
      };
    case 'circle':
      return {
        x: clickX - element.data.centerX,
        y: clickY - element.data.centerY
      };
    case 'brush':
      if (element.data.points && element.data.points.length > 0) {
        const bounds = getBrushBounds(element.data.points);
        return {
          x: clickX - bounds.minX,
          y: clickY - bounds.minY
        };
      }
      return { x: 0, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

// 移动元素位置
const moveElement = (element: DrawingElement, deltaX: number, deltaY: number) => {
  switch (element.type) {
    case 'rectangle':
      element.data.x += deltaX;
      element.data.y += deltaY;
      break;
    case 'circle':
      element.data.centerX += deltaX;
      element.data.centerY += deltaY;
      break;
    case 'brush':
      if (element.data.points) {
        element.data.points.forEach((point: { x: number; y: number }) => {
          point.x += deltaX;
          point.y += deltaY;
        });
      }
      break;
    case 'click-annotation':
      element.data.x += deltaX;
      element.data.y += deltaY;
      break;
  }
};

// 计算绘制参数（支持修饰键）
const calculateDrawingParams = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  tool: string,
  shiftPressed: boolean,
  altPressed: boolean
) => {
  let actualStart = { ...start };
  let actualEnd = { ...end };

  if (tool === 'rectangle') {
    if (shiftPressed) {
      // Shift键：强制正方形
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const size = Math.max(width, height);

      actualEnd.x = start.x + (end.x >= start.x ? size : -size);
      actualEnd.y = start.y + (end.y >= start.y ? size : -size);
    }

    if (altPressed) {
      // Alt键：以起点为中心
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;

      actualStart.x = start.x - deltaX;
      actualStart.y = start.y - deltaY;
      actualEnd.x = start.x + deltaX;
      actualEnd.y = start.y + deltaY;
    }
  } else if (tool === 'circle') {
    if (altPressed) {
      // Alt键：以起点为中心，end点在圆周上
      // 保持原有逻辑：start为圆心，到end的距离为半径
    } else {
      // 默认：start和end为外接矩形的对角
      // 转换为圆心和半径模式
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      const radiusX = Math.abs(end.x - start.x) / 2;
      const radiusY = Math.abs(end.y - start.y) / 2;

      // 移除Shift键功能，始终使用椭圆模式
      actualStart.x = centerX;
      actualStart.y = centerY;
      actualEnd.x = centerX + radiusX;
      actualEnd.y = centerY + radiusY;
    }
  }

  return { start: actualStart, end: actualEnd };
};

// 提交绘制元素（专业级实现）
const commitDrawingElement = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const tool = selectedTool.value;

  console.log(`提交 ${tool} 元素:`, { start, end });

  switch (tool) {
    case 'rectangle':
      // 矩形：计算宽高，确保最小尺寸
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      // 只有当矩形有实际尺寸时才创建（最小3像素）
      if (width >= 3 && height >= 3) {
        const rectElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'rectangle',
          data: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: width,
            height: height,
            strokeColor: '#ff0000',
            fillColor: 'transparent',
            lineWidth: 2
          }
        };
        drawingElements.value.push(rectElement);
        console.log('矩形元素已提交:', rectElement);

        // 立即保存到撤销历史并重绘
        saveToUndoHistory();
        redrawCanvas();
      } else {
        console.log('矩形太小，已忽略:', { width, height });
      }
      break;

    case 'circle':
      // 圆形：根据是否使用Alt键决定计算方式（移除Shift键功能）
      let radius: number;
      let centerX: number;
      let centerY: number;

      if (isAltPressed.value) {
        // Alt模式：start为圆心，到end的距离为半径
        centerX = start.x;
        centerY = start.y;
        radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      } else {
        // 默认模式：start和end为外接矩形的对角
        centerX = (start.x + end.x) / 2;
        centerY = (start.y + end.y) / 2;
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        // 移除Shift键功能，使用椭圆的等效半径
        radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
      }

      // 只有当圆形有实际尺寸时才创建（最小半径3像素）
      if (radius >= 3) {
        const circleElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'circle',
          data: {
            centerX: centerX,
            centerY: centerY,
            radius: radius,
            strokeColor: '#ff0000',
            fillColor: 'transparent',
            lineWidth: 2
          }
        };
        drawingElements.value.push(circleElement);
        console.log('圆形元素已提交:', circleElement);

        // 立即保存到撤销历史并重绘
        saveToUndoHistory();
        redrawCanvas();
      } else {
        console.log('圆形太小，已忽略:', { radius });
      }
      break;
  }

  console.log('当前绘制元素总数:', drawingElements.value.length);
};

// 旧的finishDrawingElement函数已移除，使用commitDrawingElement代替

// 实时预览绘制 - 专业级预览（支持修饰键）
const redrawCanvasWithPreview = (start: { x: number; y: number }, current: { x: number; y: number }) => {
  if (!imageCanvas.value || !offscreenCanvas) return;

  const canvas = imageCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 使用快速重绘基础画布（无闪烁）
  fastRedrawCanvas();

  // 绘制预览形状
  ctx.save();
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  switch (selectedTool.value) {
    case 'rectangle':
      // 矩形预览：支持Shift（正方形）和Alt（中心固定）
      let rectStart = start;
      let rectEnd = current;

      if (isShiftPressed.value) {
        // Shift键：强制正方形
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);
        const size = Math.max(width, height);

        rectEnd.x = start.x + (current.x >= start.x ? size : -size);
        rectEnd.y = start.y + (current.y >= start.y ? size : -size);
      }

      if (isAltPressed.value) {
        // Alt键：以起点为中心
        const deltaX = rectEnd.x - start.x;
        const deltaY = rectEnd.y - start.y;

        rectStart = { x: start.x - deltaX, y: start.y - deltaY };
        rectEnd = { x: start.x + deltaX, y: start.y + deltaY };
      }

      const width = rectEnd.x - rectStart.x;
      const height = rectEnd.y - rectStart.y;
      ctx.strokeRect(rectStart.x, rectStart.y, width, height);
      break;

    case 'circle':
      // 圆形预览：支持Alt（中心/外接矩形模式），移除Shift键功能
      let centerX: number;
      let centerY: number;
      let radius: number;

      if (isAltPressed.value) {
        // Alt模式：start为圆心，到current的距离为半径
        centerX = start.x;
        centerY = start.y;
        radius = Math.sqrt(Math.pow(current.x - start.x, 2) + Math.pow(current.y - start.y, 2));
      } else {
        // 默认模式：start和current为外接矩形的对角
        centerX = (start.x + current.x) / 2;
        centerY = (start.y + current.y) / 2;
        const radiusX = Math.abs(current.x - start.x) / 2;
        const radiusY = Math.abs(current.y - start.y) / 2;

        // 移除Shift键功能，使用椭圆的等效半径
        radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      break;
  }

  ctx.restore();
};



// 绘制笔刷线条
const drawBrushStroke = (x1: number, y1: number, x2: number, y2: number) => {
  if (!imageCanvas.value) return;

  const ctx = imageCanvas.value.getContext('2d');
  if (!ctx) return;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;
  ctx.stroke();
};

// 重绘画布 - 智能选择重绘方式
const redrawCanvas = () => {
  if (backgroundImageLoaded.value && offscreenCanvas) {
    // 如果离屏画布已准备好，使用快速重绘（无闪烁）
    console.log('使用快速重绘');
    fastRedrawCanvas();
  } else {
    // 如果离屏画布还未准备好，使用传统重绘但优化
    console.log('使用传统重绘（离屏画布未就绪）');
    fallbackRedrawCanvas();
  }
};

// 传统重绘方法（作为后备方案）
const fallbackRedrawCanvas = () => {
  if (!imageCanvas.value || !originalImageData.value) return;

  const canvas = imageCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 使用缓存的图片对象减少重复加载
  if (!cachedEditImage) {
    cachedEditImage = new Image();
    cachedEditImage.src = originalImageData.value;
  }

  if (cachedEditImage.complete) {
    // 图片已加载，直接绘制
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cachedEditImage, 0, 0);

    // 绘制所有元素
    drawingElements.value.forEach(element => {
      drawElement(ctx, element);
    });

    if (drawingElements.value.length > 0) {
      hasUnsavedChanges.value = true;
    }
  } else {
    // 图片还在加载，等待完成
    cachedEditImage.onload = () => {
      fallbackRedrawCanvas();
    };
  }
};

// 绘制单个元素
const drawElement = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
  switch (element.type) {
    case 'brush':
      // 绘制笔刷描边
      if (element.data.points && element.data.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(element.data.points[0].x, element.data.points[0].y);

        for (let i = 1; i < element.data.points.length; i++) {
          ctx.lineTo(element.data.points[i].x, element.data.points[i].y);
        }

        ctx.strokeStyle = element.data.color;
        ctx.lineWidth = element.data.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 如果被选中，绘制选择框
        if (element.selected) {
          const bounds = getBrushBounds(element.data.points);
          ctx.strokeStyle = '#0066ff';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(bounds.minX - 5, bounds.minY - 5,
                        bounds.maxX - bounds.minX + 10, bounds.maxY - bounds.minY + 10);
          ctx.setLineDash([]);
        }
      }
      break;

    case 'click-annotation':
      // 绘制红色圆圈和白色十字
      ctx.beginPath();
      ctx.arc(element.data.x, element.data.y, element.data.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 绘制白色十字
      ctx.beginPath();
      ctx.moveTo(element.data.x - 5, element.data.y);
      ctx.lineTo(element.data.x + 5, element.data.y);
      ctx.moveTo(element.data.x, element.data.y - 5);
      ctx.lineTo(element.data.x, element.data.y + 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 如果被选中，绘制选择框
      if (element.selected) {
        ctx.beginPath();
        ctx.arc(element.data.x, element.data.y, element.data.radius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;



    case 'rectangle':
      ctx.strokeStyle = element.data.strokeColor;
      ctx.lineWidth = element.data.lineWidth;
      if (element.data.fillColor !== 'transparent') {
        ctx.fillStyle = element.data.fillColor;
        ctx.fillRect(element.data.x, element.data.y, element.data.width, element.data.height);
      }
      ctx.strokeRect(element.data.x, element.data.y, element.data.width, element.data.height);

      if (element.selected) {
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(element.data.x - 2, element.data.y - 2,
                      element.data.width + 4, element.data.height + 4);
        ctx.setLineDash([]);
      }
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(element.data.centerX, element.data.centerY, element.data.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = element.data.strokeColor;
      ctx.lineWidth = element.data.lineWidth;
      if (element.data.fillColor !== 'transparent') {
        ctx.fillStyle = element.data.fillColor;
        ctx.fill();
      }
      ctx.stroke();

      if (element.selected) {
        ctx.beginPath();
        ctx.arc(element.data.centerX, element.data.centerY, element.data.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;


  }
};

// 保存到撤销历史
const saveToUndoHistory = () => {
  undoHistory.value.push([...drawingElements.value]);
  if (undoHistory.value.length > 20) {
    undoHistory.value.shift();
  }
  redoHistory.value = []; // 清空重做历史
};

// 撤销操作
const undoDrawing = () => {
  if (undoHistory.value.length > 0) {
    redoHistory.value.push([...drawingElements.value]);
    const previousState = undoHistory.value.pop();
    if (previousState) {
      drawingElements.value = previousState;
      redrawCanvas();
    }
  }
};

// 重做操作
const redoDrawing = () => {
  if (redoHistory.value.length > 0) {
    undoHistory.value.push([...drawingElements.value]);
    const nextState = redoHistory.value.pop();
    if (nextState) {
      drawingElements.value = nextState;
      redrawCanvas();
    }
  }
};

// 处理画布键盘事件
const handleCanvasKeydown = (e: KeyboardEvent) => {
  // 更新修饰键状态
  isShiftPressed.value = e.shiftKey;
  isAltPressed.value = e.altKey;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 删除选中的元素
    drawingElements.value = drawingElements.value.filter(el => !el.selected);
    saveToUndoHistory();
    redrawCanvas();
  } else if (e.key === 'Escape') {
    // 取消当前绘制
    cancelCurrentDrawing();
    e.preventDefault();
  } else if (e.key === 'r' || e.key === 'R') {
    // 快捷键切换到矩形工具
    selectedTool.value = 'rectangle';
    e.preventDefault();
  } else if (e.key === 'c' || e.key === 'C') {
    // 快捷键切换到圆形工具
    selectedTool.value = 'circle';
    e.preventDefault();
  }
};

// 取消当前绘制
const cancelCurrentDrawing = () => {
  if (drawingState.value === DrawingState.DRAWING) {
    console.log('取消当前绘制');
    drawingState.value = DrawingState.IDLE;
    currentDrawingStart.value = null;
    currentDrawingEnd.value = null;
    isDrawing.value = false;
    lastPosition.value = null;

    // 重绘画布以移除预览
    redrawCanvas();
  }
};

// 全局键盘事件处理（用于修饰键状态）
const handleGlobalKeyEvent = (e: KeyboardEvent) => {
  isShiftPressed.value = e.shiftKey;
  isAltPressed.value = e.altKey;
};

// 文本编辑功能已移除

// 保存图像编辑 - 延迟渲染系统
const saveImageEdit = () => {
  if (!imageCanvas.value || editingImageIndex.value === -1) return;

  // 将画布内容转换为数据URL
  const dataUrl = imageCanvas.value.toDataURL('image/png');

  // 更新步骤中的截图
  steps.value[editingImageIndex.value].screenshot = dataUrl;

  // 重置未保存更改标记
  hasUnsavedChanges.value = false;

  // 保存状态并关闭编辑器
  saveRecordingState();
  closeImageEditor();
};

// 组件挂载和卸载时的处理
onMounted(() => {
  // 初始化窗口状态
  isAppWindowFocused.value = document.hasFocus();

  // 先检查是否有导入的步骤数据
  checkForImportedData();

  // 如果没有导入数据，则加载保存的录制状态
  const urlParams = new URLSearchParams(window.location.hash.includes('?') ?
    window.location.hash.split('?')[1] : window.location.search);
  const isImport = urlParams.get('import') === 'true';

  if (!isImport) {
    loadRecordingState();
  }
});

// 检查并处理导入的步骤数据
const checkForImportedData = () => {
  // 在hash路由模式下，参数可能在hash中
  let urlParams: URLSearchParams;
  if (window.location.hash.includes('?')) {
    // 从hash中提取查询参数
    const hashParts = window.location.hash.split('?');
    urlParams = new URLSearchParams(hashParts[1]);
  } else {
    // 从search中提取查询参数
    urlParams = new URLSearchParams(window.location.search);
  }

  const isImport = urlParams.get('import') === 'true';

  if (isImport) {
    const importedData = localStorage.getItem('importedStepData');
    if (importedData) {
      try {
        const stepData = JSON.parse(importedData);

        // 加载导入的步骤数据
        steps.value = stepData.steps || [];

        // 更新录制状态为暂停（允许编辑）
        recordingState.value = RecordingState.PAUSED;
        isRecording.value = false;

        // 如果有开始时间，使用导入数据的时间
        if (stepData.steps.length > 0) {
          startTime.value = stepData.steps[0].timestamp;
        }

        // 保存状态
        saveRecordingState();

        // 清理导入数据
        localStorage.removeItem('importedStepData');

        // 清理URL参数
        if (window.location.hash.includes('?')) {
          // 清理hash中的参数
          const hashParts = window.location.hash.split('?');
          window.history.replaceState({}, document.title, window.location.pathname + '#' + hashParts[0]);
        } else {
          // 清理search中的参数
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        console.log('成功导入步骤数据:', stepData.title, '步骤数:', steps.value.length);

      } catch (error) {
        console.error('解析导入数据失败:', error);
        alert('导入数据解析失败');
      }
    }
  } else {
    // 检查是否有localStorage中的导入数据（可能是直接访问编辑页面）
    const importedData = localStorage.getItem('importedStepData');
    if (importedData) {
      try {
        const stepData = JSON.parse(importedData);
        steps.value = stepData.steps || [];
        recordingState.value = RecordingState.PAUSED;
        isRecording.value = false;
        if (stepData.steps.length > 0) {
          startTime.value = stepData.steps[0].timestamp;
        }
        saveRecordingState();
        localStorage.removeItem('importedStepData');
        console.log('处理未处理的导入数据完成，步骤数:', steps.value.length);
      } catch (error) {
        console.error('处理未处理的导入数据失败:', error);
        localStorage.removeItem('importedStepData');
      }
    }
  }
};

onUnmounted(() => {
  // 保存当前状态
  saveRecordingState();

  // 清理所有事件监听器和定时器
  removeGlobalEventListeners();
  removeWindowFocusListeners();
  clearTimers();
});
</script>

<style lang="less">
.edit {
  display: flex;
  min-height: 100vh;
  width: 100%;
  flex-direction: row;

  .workspace {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #fafafa;

    .back-button {
      margin-left: 20px;
      margin-top: 20px;
      width: 24px;
      height: 24px;
      padding: 0;
      cursor: pointer;
      border: none;
      background: transparent;
      transition: 0.2s;

      &:hover {
        opacity: 0.7;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .records-title {
      margin: 20px 0 15px 20px;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }

    .records-list {
      padding: 0 20px;
    }

    .record-card {
      background: white;
      border: 1px solid #e0e6ed;
      border-radius: 8px;
      margin-bottom: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);

        .delete-btn {
          opacity: 1;
        }
      }

      .delete-btn {
        position: absolute;
        bottom: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        border: none;
        background: #ff4d4f;
        color: white;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        opacity: 0;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #ff7875;
        }
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .step-number {
          background: #1890ff;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .action-type {
          font-size: 16px;
          margin-left: 8px;

          &.click { background: rgba(24, 144, 255, 0.1); }
          &.keydown { background: rgba(82, 196, 26, 0.1); }
          &.input { background: rgba(250, 173, 20, 0.1); }
          &.scroll { background: rgba(135, 208, 104, 0.1); }
          
          padding: 2px 6px;
          border-radius: 4px;
        }

        .timestamp {
          color: #666;
          font-size: 12px;
        }
      }

      .card-content {
        display: flex;
        gap: 12px;
        align-items: flex-start;

        .screenshot-container {
          flex-shrink: 0;
          width: 120px;
          height: 68px;
          border: 1px solid #e0e6ed;
          border-radius: 4px;
          overflow: hidden;
          background: #f8f8f8;

          .screenshot {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s;

            &:hover {
              opacity: 0.8;
            }

            &.not-editable {
              cursor: not-allowed;
              position: relative;

              &::after {
                content: '🔒';
                position: absolute;
                top: 4px;
                right: 4px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 4px;
                border-radius: 2px;
                font-size: 12px;
              }

              &:hover {
                opacity: 0.6;
              }
            }
          }
        }

        .description {
          flex: 1;
          font-size: 14px;
          line-height: 1.5;

          .description-input {
            width: 100%;
            border: 1px solid #1890ff;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 14px;
            outline: none;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      color: #999;
      font-size: 16px;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .empty-tip {
        font-size: 14px;
        color: #bbb;
        margin-top: 8px;
      }
    }
  }

  .sidebar {
    width: 246px;
    border-left: 1px solid #cfd6e0;
    padding: 20px;
    background: white;

    .control-panel {
      .sap {
        width: 200px;
        height: 40px;
        border-radius: 20px;
        background: rgba(220, 232, 243, 1);
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
        border: none;
        margin-bottom: 16px;
        font-size: 14px;

        &:hover {
          background: rgba(200, 222, 233, 1);
        }

        &.active {
          background: #ff4d4f;
          color: white;

          &:hover {
            background: #ff7875;
          }
        }
      }

      .recording-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #ff4d4f;
        font-size: 12px;
        padding: 8px;
        background: rgba(255, 77, 79, 0.1);
        border-radius: 4px;

        .recording-indicator {
          width: 8px;
          height: 8px;
          background: #ff4d4f;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
      }

      .export-btn, .clear-btn {
        width: 100%;
        height: 36px;
        border: 1px solid #1890ff;
        background: white;
        color: #1890ff;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 8px;
        transition: 0.2s;
        font-size: 14px;

        &:hover:not(:disabled) {
          background: #1890ff;
          color: white;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #d9d9d9;
          color: #d9d9d9;
        }
      }

      .clear-btn {
        border-color: #ff4d4f;
        color: #ff4d4f;

        &:hover:not(:disabled) {
          background: #ff4d4f;
          color: white;
        }
      }
    }

    .stats {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e6ed;

      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
        font-weight: 600;
      }

      p {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #666;
        padding: 2px 0;
      }
    }

    .context-info {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e0e6ed;

      h5 {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: #333;
        font-weight: 600;
      }

      p {
        margin: 0 0 4px 0;
        font-size: 11px;
        color: #666;
        padding: 1px 0;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .screenshot-settings {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e6ed;

      h5 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
        font-weight: 600;
      }

      .quality-select {
        width: 100%;
        height: 32px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        margin-bottom: 12px;
        background: white;

        &:focus {
          outline: none;
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
      }

      .test-screenshot-btn {
        width: 100%;
        height: 32px;
        border: 1px solid #52c41a;
        background: white;
        color: #52c41a;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: 0.2s;

        &:hover {
          background: #52c41a;
          color: white;
        }

        &:focus {
          outline: none;
        }
      }
    }

    button:focus {
      outline: none;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// 图像编辑器模态框样式
.image-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .image-editor-container {
    background: white;
    border-radius: 8px;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .image-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e6ed;
      background: #f8f9fa;

      .tool-buttons {
        display: flex;
        gap: 8px;

        .tool-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #d9d9d9;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;

          &:hover {
            border-color: #1890ff;
            background: #f0f8ff;
          }

          &.active {
            border-color: #1890ff;
            background: #1890ff;
            color: white;
          }
        }
      }

      .action-buttons {
        display: flex;
        gap: 8px;

        button {
          width: 32px;
          height: 32px;
          border: 1px solid #d9d9d9;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;

          &:hover:not(:disabled) {
            border-color: #1890ff;
            background: #f0f8ff;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          &.save-btn {
            background: #52c41a;
            border-color: #52c41a;
            color: white;

            &:hover {
              background: #73d13d;
              border-color: #73d13d;
            }

            &.has-changes {
              background: #ff9c00;
              border-color: #ff9c00;
              animation: pulse 2s infinite;

              &:hover {
                background: #ffb84d;
                border-color: #ffb84d;
              }
            }
          }

          &.close-btn {
            background: #ff4d4f;
            border-color: #ff4d4f;
            color: white;

            &:hover {
              background: #ff7875;
              border-color: #ff7875;
            }
          }
        }
      }
    }

    .image-editor-canvas {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;

      canvas {
        max-width: 100%;
        max-height: 100%;
        border: 1px solid #d9d9d9;
        background: white;
        cursor: crosshair;

        &:focus {
          outline: 2px solid #1890ff;
          outline-offset: 2px;
        }
      }

      // 文本编辑器样式已移除
    }
  }

  // 导出格式选择对话框样式
  .export-dialog-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;

    .export-dialog-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;

      .export-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #f0f0f0;

        h3 {
          margin: 0;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;

          &:hover {
            color: #333;
          }
        }
      }

      .export-format-list {
        padding: 20px;

        .export-format-item {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            border-color: #1890ff;
            background: #f6f8ff;
          }

          .format-icon {
            font-size: 32px;
            margin-right: 15px;
          }

          .format-info {
            flex: 1;

            h4 {
              margin: 0 0 5px 0;
              color: #333;
              font-size: 16px;
            }

            p {
              margin: 0;
              color: #666;
              font-size: 14px;
            }
          }
        }
      }
    }
  }
}
</style>