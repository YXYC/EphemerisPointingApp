<template>
  <div class="notebook-panel">
    <div class="notebook-header">单次计算</div>
    <div class="notebook-body">
      <form class="notebook-form" @submit.prevent="calculate">
        <div class="notebook-row-group">
          <div class="notebook-row notebook-row-title">本星位置</div>
          <div class="notebook-row-group-content">
            <div class="notebook-row-col">
              <div class="notebook-row">
                <label>X：</label>
                <input 
                  v-model="form.satellitePosition.x" 
                  class="notebook-input" 
                  type="text" 
                  @input="e => handleInput(e, v => form.satellitePosition.x = v)"
                />
                <span class="unit">km</span>
              </div>
              <div class="notebook-row">
                <label>Y：</label>
                <input 
                  v-model="form.satellitePosition.y" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satellitePosition.y = v)"
                />
                <span class="unit">km</span>
              </div>
              <div class="notebook-row">
                <label>Z：</label>
                <input 
                  v-model="form.satellitePosition.z" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satellitePosition.z = v)"
                />
                <span class="unit">km</span>
              </div>
            </div>
          </div>
          <div class="notebook-row notebook-row-title">本星姿态</div>
          <div class="notebook-row-group-content">
            <div class="notebook-row-col">
              <div class="notebook-row">
                <label>W：</label>
                <input 
                  v-model="form.satelliteAttitude.w" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satelliteAttitude.w = v)"
                />
              </div>
              <div class="notebook-row">
                <label>X：</label>
                <input 
                  v-model="form.satelliteAttitude.x" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satelliteAttitude.x = v)"
                />
              </div>
              <div class="notebook-row">
                <label>Y：</label>
                <input 
                  v-model="form.satelliteAttitude.y" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satelliteAttitude.y = v)"
                />
              </div>
              <div class="notebook-row">
                <label>Z：</label>
                <input 
                  v-model="form.satelliteAttitude.z" 
                  class="notebook-input" 
                  type="text"
                  @input="e => handleInput(e, v => form.satelliteAttitude.z = v)"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="notebook-row notebook-row-title">对星位置</div>
        <div class="notebook-row">
          <label>X：</label>
          <input 
            v-model="form.targetPosition.x" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.targetPosition.x = v)"
          />
          <span class="unit">km</span>
        </div>
        <div class="notebook-row">
          <label>Y：</label>
          <input 
            v-model="form.targetPosition.y" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.targetPosition.y = v)"
          />
          <span class="unit">km</span>
        </div>
        <div class="notebook-row">
          <label>Z：</label>
          <input 
            v-model="form.targetPosition.z" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.targetPosition.z = v)"
          />
          <span class="unit">km</span>
        </div>
        <div class="notebook-row notebook-row-title">精测结果</div>
        <div class="notebook-row">
          <label>roll：</label>
          <input 
            v-model="form.measurementMatrix.roll" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.measurementMatrix.roll = v)"
          />
          <span class="unit">μrad</span>
        </div>
        <div class="notebook-row">
          <label>pitch：</label>
          <input 
            v-model="form.measurementMatrix.pitch" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.measurementMatrix.pitch = v)"
          />
          <span class="unit">μrad</span>
        </div>
        <div class="notebook-row">
          <label>yaw：</label>
          <input 
            v-model="form.measurementMatrix.yaw" 
            class="notebook-input" 
            type="text"
            @input="e => handleInput(e, v => form.measurementMatrix.yaw = v)"
          />
          <span class="unit">μrad</span>
        </div>
      </form>

      <!-- 修改结果展示区域，添加计算按钮 -->
      <div class="result-section">
        <div class="result-header">
          <div class="result-header-left">
            <el-icon><DataLine /></el-icon>
            <span>计算结果</span>
          </div>
          <button class="notebook-btn" :disabled="loading" @click="calculate">
            {{ loading ? '计算中...' : '计算' }}
          </button>
        </div>
        <div class="result-content">
          <div v-if="calculationResult" class="result-items">
            <div class="result-item">
              <span class="result-label">本星到对星的距离：</span>
              <span class="result-value">{{ calculationResult.distance.toFixed(6) }} km</span>
            </div>
            <div class="result-item">
              <span class="result-label">方位角：</span>
              <span class="result-value">{{ calculationResult.yaw.toFixed(6) }}°</span>
            </div>
            <div class="result-item">
              <span class="result-label">俯仰角：</span>
              <span class="result-value">{{ calculationResult.pitch.toFixed(6) }}°</span>
            </div>
          </div>
          <div v-else class="result-placeholder">
            <el-icon><InfoFilled /></el-icon>
            <span>点击计算按钮开始计算</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { DataLine, InfoFilled } from '@element-plus/icons-vue'

// 表单数据
const form = reactive({
  satellitePosition: {
    x: '',
    y: '',
    z: ''
  },
  satelliteAttitude: {
    w: '',
    x: '',
    y: '',
    z: ''
  },
  targetPosition: {
    x: '',
    y: '',
    z: ''
  },
  measurementMatrix: {
    roll: '',
    pitch: '',
    yaw: ''
  }
})

// 计算结果
const calculationResult = ref<{
  distance: number
  yaw: number
  pitch: number
} | null>(null)

// 加载状态
const loading = ref(false)

// 处理输入
const handleInput = (e: Event, setter: (value: string) => void) => {
  const input = e.target as HTMLInputElement
  const value = input.value.replace(/[^\d.-]/g, '')
  setter(value)
}

// 计算函数
const calculate = async () => {
  if (!validateInput()) {
    ElMessage.warning('请填写所有必要的计算参数')
    return
  }
  loading.value = true
  try {
    // 组装参数
    const params = {
      satellitePos: {
        x: Number(form.satellitePosition.x),
        y: Number(form.satellitePosition.y),
        z: Number(form.satellitePosition.z)
      },
      satelliteAtt: {
        w: Number(form.satelliteAttitude.w),
        x: Number(form.satelliteAttitude.x),
        y: Number(form.satelliteAttitude.y),
        z: Number(form.satelliteAttitude.z)
      },
      targetPos: {
        x: Number(form.targetPosition.x),
        y: Number(form.targetPosition.y),
        z: Number(form.targetPosition.z)
      },
      roll_urad: Number(form.measurementMatrix.roll),
      pitch_urad: Number(form.measurementMatrix.pitch),
      yaw_urad: Number(form.measurementMatrix.yaw)
    }
    // 调用主进程计算
    const result = await window.satellite.calculateRelativeState(params)
    calculationResult.value = {
      distance: result.distance,
      yaw: result.yaw * 180 / Math.PI,   // 弧度转角度
      pitch: result.pitch * 180 / Math.PI
    }
    ElMessage.success('计算完成')
  } catch (error) {
    ElMessage.error('计算失败')
  } finally {
    loading.value = false
  }
}

// 验证输入
const validateInput = () => {
  const { satellitePosition, satelliteAttitude, targetPosition, measurementMatrix } = form
  
  // 检查卫星位置
  if (!satellitePosition.x || !satellitePosition.y || !satellitePosition.z) return false
  
  // 检查卫星姿态
  if (!satelliteAttitude.w || !satelliteAttitude.x || 
      !satelliteAttitude.y || !satelliteAttitude.z) return false
  
  // 检查目标位置
  if (!targetPosition.x || !targetPosition.y || !targetPosition.z) return false
  
  // 检查测量矩阵
  if (!measurementMatrix.roll || !measurementMatrix.pitch || !measurementMatrix.yaw) return false
  
  return true
}
</script>

<style scoped>
.notebook-panel {
  background: #fff;
  /* border: 2px dashed #e0e0e0; */
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  padding: 32px 24px 24px 24px;
  margin: 0 auto 32px auto;
  
  min-width: 0;
  width: 100%;
  font-family: 'Comic Sans MS', 'Marker Felt', cursive, sans-serif;
  position: relative;
  overflow: hidden;
}
/* 去掉左侧红线 */
.notebook-panel::after {
  display: none;
}
/* 红线拉长到顶部和底部 */
.notebook-panel::after {
  content: '';
  position: absolute;
  left: 54px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #ff5252 80%, transparent 100%);
  border-radius: 2px;
  z-index: 1;
  opacity: 0.7;
}
/* 纸张纹理 */
.notebook-panel {
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 2px, transparent 2px 10px);
}
.notebook-header {
  font-size: 28px;
  font-weight: bold;
  color: #2196f3;
  margin-bottom: 32px;
  letter-spacing: 3px;
  text-align: center;
  position: relative;
  z-index: 2;
  border-bottom: 2px solid #b3e5fc;
  padding-bottom: 8px;
}
.notebook-body {
  padding: 0 0 0 32px;
  position: relative;
  z-index: 2;
}
.notebook-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.notebook-row {
  display: flex;
  align-items: center;
  font-size: 18px;
  min-height: 44px;
  border-bottom: 1.5px solid transparent;
  position: relative;
}
.notebook-row label {
  min-width: 130px;
  color: #b08519;
  font-weight: 500;
  font-size: 17px;
  letter-spacing: 1px;
  margin-right: 12px;
  font-family: inherit;
  text-align: right;
}
.notebook-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 18px;
  color: #222;
  padding: 4px 0 2px 0;
  border-bottom: 1.5px solid #e3e6ed;
  font-family: inherit;
  transition: border-color 0.2s;
}

.notebook-input:focus {
  border-bottom: 1.5px solid #2196f3;
  background: #f5faff;
}

.notebook-row-title {
  font-size: 18px;
  color: #2196f3;
  font-weight: bold;
  margin-top: 18px;
  margin-bottom: 2px;
  letter-spacing: 1px;
  border-bottom: none;
}
.notebook-row-btn {
  justify-content: flex-end;
  margin-top: 24px;
  margin-bottom: 10px;
}
.notebook-btn {
  background: #2196f3;
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 8px 32px;
  font-size: 16px;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(33,150,243,0.15);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 100px;
}
.notebook-btn:hover {
  background: #1976d2;
  box-shadow: 0 8px 24px rgba(33,150,243,0.18);
  transform: translateY(-2px);
}
.notebook-btn:active {
  background: #1565c0;
  box-shadow: 0 2px 8px rgba(33,150,243,0.10);
  transform: scale(0.98);
}
.notebook-btn:disabled {
  background: #b3e5fc;
  color: #fff;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.7;
  transform: none;
}
.result-card {
  margin-top: 40px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}
@media (max-width: 900px) {
  .notebook-panel {
    padding: 16px 2vw 8px 2vw;
    max-width: 100vw;
  }
  .notebook-header {
    font-size: 22px;
    padding-bottom: 4px;
  }
  .notebook-body {
    padding-left: 8px;
  }
  .notebook-row label {
    min-width: 90px;
    font-size: 15px;
  }
  .notebook-input {
    font-size: 15px;
  }
}
/* 新增并排布局和单位样式 */
.notebook-row-group {
  margin-bottom: 18px;
}
.notebook-row-group-title {
  display: inline-block;
  width: 50%;
  font-size: 18px;
  color: #2196f3;
  font-weight: bold;
  margin-bottom: 2px;
  letter-spacing: 1px;
  border-bottom: none;
  text-align: center;
  position: relative;
}

.notebook-row-group-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: #b3e5fc;
}

.notebook-row-group-content {
  display: flex;
  gap: 32px;
}
.notebook-row-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.unit {
  color: #888;
  font-size: 15px;
  margin-left: 8px;
  min-width: 40px;
  text-align: left;
}
/* 卫星姿态参数不显示单位 */
.notebook-row-col:nth-child(2) .unit {
  display: none;
}
/* 测量矩阵单位为μrad */
.notebook-row label[for='roll'] ~ .unit,
.notebook-row label[for='pitch'] ~ .unit,
.notebook-row label[for='yaw'] ~ .unit {
  content: 'μrad';
  color: #888;
  font-size: 15px;
  margin-left: 8px;
  min-width: 40px;
  text-align: left;
}
.notebook-row:nth-last-of-type(4) .unit,
.notebook-row:nth-last-of-type(3) .unit,
.notebook-row:nth-last-of-type(2) .unit {
  display: inline;
  min-width: 40px;
  color: #888;
  font-size: 15px;
  margin-left: 8px;
  text-align: left;
}
@media (max-width: 900px) {
  .notebook-row-group-content {
    flex-direction: column;
    gap: 0;
  }
  .notebook-row-group-title {
    width: 100%;
    text-align: left;
    margin-bottom: 4px;
  }
}

/* 更新结果区域样式 */
.result-section {
  margin-top: 32px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.result-header {
  background: #e3f2fd;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
}

.result-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-header .el-icon {
  font-size: 20px;
  color: #2196f3;
}

.result-header span {
  font-size: 18px;
  font-weight: 600;
  color: #2196f3;
}

.result-content {
  padding: 24px;
  min-height: 120px;
}

.result-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.result-item:hover {
  background: #f8fafc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.result-label {
  font-size: 15px;
  color: #64748b;
  min-width: 160px;
  font-weight: 500;
}

.result-value {
  font-size: 16px;
  font-weight: 600;
  color: #2196f3;
  font-family: 'Consolas', monospace;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 4px;
  min-width: 120px;
  text-align: right;
}

.result-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  padding: 48px 0;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px dashed #e2e8f0;
}

.result-placeholder .el-icon {
  font-size: 32px;
  color: #cbd5e1;
}

.result-placeholder span {
  font-size: 15px;
}

@media (max-width: 768px) {
  .result-header {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
  }
  
  .result-header-left {
    width: 100%;
    justify-content: center;
  }
  
  .notebook-btn {
    width: 100%;
  }
  
  .result-content {
    padding: 16px;
  }
  
  .result-item {
    padding: 12px 16px;
  }
  
  .result-label {
    font-size: 14px;
    min-width: 140px;
  }
  
  .result-value {
    font-size: 15px;
    min-width: 100px;
    padding: 3px 8px;
  }
}
</style> 