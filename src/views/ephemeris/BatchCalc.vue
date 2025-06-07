<template>
  <el-card class="browse-card" v-loading="pageLoading" element-loading-text="加载中...">
    <div class="filter-bar">
      <div class="filter-item date-picker-item">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 360px;"
          @change="handleDateChange"
          clearable
        />
      </div>
      <div class="filter-item">
        <el-select
          v-model="selectedSourceSatellite"
          :placeholder="selectedSourceSatellite ? selectedSourceSatellite : '本星'"
          @change="handleSatelliteChange"
          style="width: 200px;"
        >
          <el-option
            v-for="sat in satelliteList"
            :key="sat"
            :label="sat"
            :value="sat"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <el-select
          v-model="selectedTargetSatellite"
          :placeholder="selectedTargetSatellite ? selectedTargetSatellite : '对星'"
          @change="handleSatelliteChange"
          style="width: 200px;"
        >
          <el-option
            v-for="sat in satelliteList"
            :key="sat"
            :label="sat"
            :value="sat"
          />
        </el-select>
      </div>
      <div class="filter-item measurement-matrix">
        <div class="matrix-select-group">
          <el-select
            v-model="selectedMatrixId"
            placeholder="选择精测结果"
            style="width: 200px;"
            @change="handleMatrixChange"
          >
            <el-option
              v-for="matrix in matrixList"
              :key="matrix.id"
              :label="matrix.name"
              :value="matrix.id"
            />
          </el-select>
          <el-button
            type="primary"
            link
            @click="showAddMatrixDialog = true"
          >
            管理精测结果
          </el-button>
        </div>
      </div>
      <div class="action-buttons">
        <el-button 
          type="primary" 
          :disabled="!canCalculate"
          @click="handleBatchCalculate"
          :loading="calculating"
        >
          {{ calculating ? '计算中...' : '开始计算' }}
        </el-button>
        <el-button
          type="primary"
          :icon="isTableView ? 'PieChart' : 'List'"
          @click="toggleView"
        >
          {{ isTableView ? '图表视图' : '表格视图' }}
        </el-button>
      </div>
    </div>
    <div class="table-area">
      <div class="status-bar" v-if="calculating">
        <el-alert
          :title="calculationStatus"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="status-detail">
              <span>正在计算中，请稍候...</span>
            </div>
          </template>
        </el-alert>
      </div>
      <div v-if="isTableView" class="table-container">
        <el-table
          :data="tableData"
          stripe
          border
          size="small"
          header-cell-class-name="table-header"
          empty-text="暂无数据"
          highlight-current-row
          style="width: 100%"
        >
          <el-table-column prop="time" label="计算时间" :formatter="formatTime" align="center" min-width="140"/>
          <el-table-column prop="source_satellite" label="本星名称" align="center" min-width="110"/>
          <el-table-column prop="target_satellite" label="对星名称" align="center" min-width="110"/>
          <el-table-column prop="yaw" label="方位角(°)" align="center" min-width="110">
            <template #default="scope">
              {{ scope.row.yaw ? (scope.row.yaw / 1e6 * (180 / Math.PI)).toFixed(6) : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="pitch" label="俯仰角(°)" align="center" min-width="110">
            <template #default="scope">
              {{ scope.row.pitch ? (scope.row.pitch / 1e6 * (180 / Math.PI)).toFixed(6) : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="distance" label="距离(km)" align="center" min-width="110">
            <template #default="scope">
              {{ scope.row.distance?.toString() || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="chart-container">
        <div class="chart-header">
          <el-select v-model="selectedChartType" placeholder="选择图表类型" style="width: 200px;">
            <el-option label="方位角" value="yaw" />
            <el-option label="俯仰角" value="pitch" />
            <el-option label="距离" value="distance" />
          </el-select>
        </div>
        <div class="chart-wrapper">
          <div ref="chartRef" class="chart"></div>
        </div>
      </div>
      <div class="pagination-bar" v-if="isTableView">
        <el-pagination
          background
          layout="prev, pager, next, jumper, ->, total"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 添加精测矩阵对话框 -->
    <el-dialog
      v-model="showAddMatrixDialog"
      title="管理精测结果"
      width="500px"
    >
      <div class="matrix-dialog-content">
        <div class="matrix-form">
          <el-form :model="newMatrix" label-width="100px">
            <el-form-item label="矩阵名称">
              <el-input v-model="newMatrix.name" placeholder="请输入矩阵名称" />
            </el-form-item>
            <el-form-item label="横滚角">
              <el-input v-model="newMatrix.roll" placeholder="请输入横滚角(μrad)" />
            </el-form-item>
            <el-form-item label="俯仰角">
              <el-input v-model="newMatrix.pitch" placeholder="请输入俯仰角(μrad)" />
            </el-form-item>
            <el-form-item label="偏航角">
              <el-input v-model="newMatrix.yaw" placeholder="请输入偏航角(μrad)" />
            </el-form-item>
          </el-form>
          <div class="matrix-actions">
            <el-button type="primary" @click="handleAddMatrix">添加矩阵</el-button>
          </div>
        </div>
        
        <el-divider>已保存的矩阵</el-divider>
        
        <el-table :data="matrixList" style="width: 100%">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="roll" label="横滚角-roll(μrad)" :formatter="formatAngle" />
          <el-table-column prop="pitch" label="俯仰角-pitch(μrad)" :formatter="formatAngle" />
          <el-table-column prop="yaw" label="偏航角-yaw(μrad)" :formatter="formatAngle" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                type="danger"
                link
                @click="handleDeleteMatrix(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 添加计算结果提示对话框 -->
    <el-dialog
      v-model="showCalcResultDialog"
      title="计算结果"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="calc-result-content" :class="{ 'error-message': !calcResult.success }">
        <el-icon v-if="calcResult.success" class="success-icon" color="#67C23A"><CircleCheckFilled /></el-icon>
        <el-icon v-else class="error-icon" color="#F56C6C"><CircleCloseFilled /></el-icon>
        <p>{{ calcResult.message }}</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCalcResultDialog = false">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </el-card>
</template> 

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, CircleCloseFilled, PieChart, List } from '@element-plus/icons-vue'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import type { CalculationResponse } from '../../types/global'

// 获取今天的日期字符串
function getTodayStr() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const fileType = ref('excel')
const uploading = ref(false)
// 默认时间范围为今天
const todayStr = getTodayStr()
const dateRange = ref<[string, string]>([todayStr, todayStr])

// 状态定义
const selectedSourceSatellite = ref('')
const selectedTargetSatellite = ref('')
const selectedMatrixId = ref('')
const satelliteList = ref<string[]>([])
const matrixList = ref<Array<{ id: string, name: string, roll: number, pitch: number, yaw: number }>>([])
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const calculating = ref(false)
const calculationStatus = ref('')
const showAddMatrixDialog = ref(false)
const showCalcResultDialog = ref(false)
const calcResult = ref<{
  success: boolean
  message: string
}>({
  success: false,
  message: ''
})

// 新矩阵表单
const newMatrix = ref({
  name: '',
  roll: '',
  pitch: '',
  yaw: ''
})

// 视图状态
const isTableView = ref(true)
const chartRef = ref<HTMLElement | null>(null)
const chartLoading = ref(false)
const selectedChartType = ref('yaw')
let chart: echarts.ECharts | null = null

// 页面加载状态
const pageLoading = ref(true)

// 图表数据
const chartData = ref<any[]>([])

// 计算属性
const canCalculate = computed(() => {
  return dateRange.value && 
         selectedSourceSatellite.value && 
         selectedTargetSatellite.value && 
         selectedMatrixId.value
})

// 获取图表数据（不分页）
const fetchChartData = async () => {
  try {
    const result = await window.satellite.getEphemerisResults(
      dateRange.value ? { start: dateRange.value[0], end: dateRange.value[1] } : undefined,
      selectedSourceSatellite.value,
      selectedTargetSatellite.value,
      1, // 页码
      999999 // 获取所有数据
    )
    chartData.value = result.data
  } catch (error) {
    ElMessage.error('获取图表数据失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 获取表格数据（分页）
const fetchCalculationResults = async () => {
  try {
    const result = await window.satellite.getEphemerisResults(
      dateRange.value ? { start: dateRange.value[0], end: dateRange.value[1] } : undefined,
      selectedSourceSatellite.value,
      selectedTargetSatellite.value,
      page.value,
      pageSize.value
    )
    tableData.value = result.data
    total.value = result.total
  } catch (error) {
    ElMessage.error('获取计算结果失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 获取图表数据
const getChartData = () => {
  const times = chartData.value.map(item => item.time)
  const data = {
    yaw: chartData.value.map(item => item.yaw ? (item.yaw / 1e6 * (180 / Math.PI)) : null),
    pitch: chartData.value.map(item => item.pitch ? (item.pitch / 1e6 * (180 / Math.PI)) : null),
    distance: chartData.value.map(item => item.distance || null)
  }
  return { times, data }
}

// 处理日期变化
const handleDateChange = async () => {
  pageLoading.value = true
  try {
    await Promise.all([
      fetchCalculationResults(),
      fetchChartData()
    ])
    // 如果当前是图表视图，需要重新初始化图表
    if (!isTableView.value && chart) {
      await nextTick()
      chart.setOption(getChartOption(selectedChartType.value))
    }
  } finally {
    pageLoading.value = false
  }
}

// 处理卫星选择变化
const handleSatelliteChange = async () => {
  pageLoading.value = true
  try {
    await Promise.all([
      fetchCalculationResults(),
      fetchChartData()
    ])
    // 如果当前是图表视图，需要重新初始化图表
    if (!isTableView.value && chart) {
      await nextTick()
      chart.setOption(getChartOption(selectedChartType.value))
    }
  } finally {
    pageLoading.value = false
  }
}

// 处理矩阵选择变化
const handleMatrixChange = () => {
  // TODO: 实现矩阵选择逻辑
  console.log('选择的矩阵:', selectedMatrixId.value)
}

// 获取精测矩阵列表
const fetchMatrixList = async () => {
  try {
    const matrices = await window.satellite.getMeasurementMatrices()
    matrixList.value = matrices.map((matrix: any) => ({
      id: matrix.name,
      name: matrix.name,
      roll: matrix.roll_urad,
      pitch: matrix.pitch_urad,
      yaw: matrix.yaw_urad
    }))
  } catch (error) {
    ElMessage.error('获取精测矩阵列表失败')
  }
}

// 获取卫星列表
const fetchSatelliteList = async () => {
  try {
    satelliteList.value = await window.satellite.getAllSatelliteNames()
  } catch (error) {
    ElMessage.error('获取卫星列表失败')
  }
}

// 处理添加矩阵
const handleAddMatrix = async () => {
  if (!newMatrix.value.name) {
    ElMessage.warning('请输入矩阵名称')
    return
  }

  const roll = parseFloat(newMatrix.value.roll)
  const pitch = parseFloat(newMatrix.value.pitch)
  const yaw = parseFloat(newMatrix.value.yaw)

  if (isNaN(roll) || isNaN(pitch) || isNaN(yaw)) {
    ElMessage.warning('请输入有效的角度值')
    return
  }

  try {
    await window.satellite.upsertMeasurementMatrix({
      name: newMatrix.value.name,
      roll_urad: roll,
      pitch_urad: pitch,
      yaw_urad: yaw
    })
    
    ElMessage.success('矩阵添加成功')
    showAddMatrixDialog.value = false
    // 重置表单
    newMatrix.value = {
      name: '',
      roll: '',
      pitch: '',
      yaw: ''
    }
    // 刷新列表
    await fetchMatrixList()
  } catch (error) {
    ElMessage.error('矩阵添加失败')
  }
}

// 处理删除矩阵
const handleDeleteMatrix = async (id: string) => {
  try {
    await window.satellite.deleteMeasurementMatrix(id)
    ElMessage.success('矩阵删除成功')
    await fetchMatrixList()
  } catch (error) {
    ElMessage.error('矩阵删除失败')
  }
}

// 处理页码变化
const handlePageChange = async (newPage: number) => {
  page.value = newPage
  await fetchCalculationResults()
}

// 格式化角度
const formatAngle = (row: any, column: any) => {
  const value = row[column.property]
  return value ? value.toFixed(6) : '-'
}

// 格式化时间
const formatTime = (row: any, column: any) => {
  return row.time || '-'
}

// 切换视图
const toggleView = async () => {
  isTableView.value = !isTableView.value
  if (!isTableView.value) {
    chartLoading.value = true
    try {
      // 确保有最新的图表数据
      await fetchChartData()
      await nextTick()
      // 确保图表容器已经渲染完成
      if (chartRef.value) {
        // 如果图表实例存在，先销毁
        if (chart) {
          chart.dispose()
          chart = null
        }
        // 重新初始化图表
        await initChart()
      }
    } finally {
      chartLoading.value = false
    }
  }
}

// 获取图表配置
const getChartOption = (type: string) => {
  const { times, data } = getChartData()
  const typeConfig = {
    yaw: {
      name: '方位角',
      unit: '°',
      formatter: '{value}°',
      color: '#409EFF',
      maxColor: '#F56C6C',  // 红色
      minColor: '#67C23A'   // 绿色
    },
    pitch: {
      name: '俯仰角',
      unit: '°',
      formatter: '{value}°',
      color: '#67C23A',
      maxColor: '#F56C6C',  // 红色
      minColor: '#409EFF'   // 蓝色
    },
    distance: {
      name: '距离',
      unit: 'km',
      formatter: '{value} km',
      color: '#E6A23C',
      maxColor: '#F56C6C',  // 红色
      minColor: '#67C23A'   // 绿色
    }
  }

  const config = typeConfig[type as keyof typeof typeConfig]
  const currentData = data[type as keyof typeof data].filter((val): val is number => val !== null)

  // 计算数据范围
  const min = Math.min(...currentData)
  const max = Math.max(...currentData)
  const range = max - min

  // 计算Y轴范围
  // 根据数据范围添加适当的边距
  const padding = range * 0.1 // 上下各留10%的边距
  const yMin = min - padding
  const yMax = max + padding

  // 计算合适的刻度间隔
  const tickCount = 5 // 期望的刻度数量
  const rawInterval = (yMax - yMin) / tickCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const normalizedInterval = rawInterval / magnitude
  let interval = magnitude
  if (normalizedInterval < 1.5) interval = magnitude * 1
  else if (normalizedInterval < 3) interval = magnitude * 2
  else if (normalizedInterval < 7.5) interval = magnitude * 5
  else interval = magnitude * 10

  // 计算需要的小数位数
  const calculateDecimalPlaces = (value: number) => {
    if (value === 0) return 0
    const absValue = Math.abs(value)
    if (absValue >= 1000) return 0
    if (absValue >= 100) return 1
    if (absValue >= 10) return 2
    if (absValue >= 1) return 3
    if (absValue >= 0.1) return 4
    if (absValue >= 0.01) return 5
    if (absValue >= 0.001) return 6
    if (absValue >= 0.0001) return 7
    if (absValue >= 0.00001) return 8
    if (absValue >= 0.000001) return 9
    return 10
  }

  // 计算数据需要的小数位数
  const decimalPlaces = Math.max(
    calculateDecimalPlaces(min),
    calculateDecimalPlaces(max),
    calculateDecimalPlaces(interval)
  )

  // 格式化数值的函数
  const formatValue = (value: number) => {
    if (value === null || value === undefined) return '-'
    return value.toFixed(decimalPlaces) + config.unit
  }

  return {
    backgroundColor: '#ffffff',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        },
        lineStyle: {
          color: '#6a7985',
          width: 1,
          type: 'dashed'
        }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: {
        color: '#606266',
        fontSize: 13
      },
      padding: [8, 12],
      formatter: (params: any) => {
        const time = params[0].axisValue
        const value = params[0].value
        return `<div style="font-weight: 500; margin-bottom: 4px;">${time}</div>
                <div style="display: flex; align-items: center;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${config.color}; margin-right: 8px;"></span>
                  <span style="color: #606266;">${config.name}: </span>
                  <span style="color: #303133; font-weight: 500; margin-left: 4px;">${formatValue(value)}</span>
                </div>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '60px',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        bottom: 0,
        height: 20,
        borderColor: 'transparent',
        backgroundColor: '#f5f7fa',
        fillerColor: 'rgba(64, 158, 255, 0.1)',
        handleStyle: {
          color: '#409EFF',
          borderColor: '#409EFF'
        },
        moveHandleStyle: {
          color: '#409EFF'
        },
        selectedDataBackground: {
          lineStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: '#409EFF'
          }
        },
        emphasis: {
          handleStyle: {
            borderColor: '#409EFF',
            color: '#409EFF'
          }
        }
      }
    ],
    xAxis: {
      type: 'category',
      data: times,
      axisLine: {
        lineStyle: {
          color: '#e4e7ed'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#606266',
        fontSize: 12,
        rotate: 45,
        interval: (index: number) => index % Math.ceil(times.length / 20) === 0,
        formatter: (value: string) => {
          const date = new Date(value)
          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#ebeef5',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: `${config.name}(${config.unit})`,
      nameTextStyle: {
        color: '#606266',
        fontSize: 13,
        padding: [0, 0, 0, 40]
      },
      min: yMin,
      max: yMax,
      interval: interval,
      splitNumber: tickCount,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#e4e7ed'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#606266',
        fontSize: 12,
        formatter: formatValue
      },
      splitLine: {
        lineStyle: {
          color: '#ebeef5',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: config.name,
        type: 'line',
        data: data[type as keyof typeof data],
        smooth: true,
        showSymbol: false,
        sampling: 'average',
        lineStyle: {
          width: 2,
          color: config.color
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: config.color + '40'
              },
              {
                offset: 1,
                color: config.color + '10'
              }
            ]
          }
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 8,
          data: [
            {
              type: 'max',
              name: '最大值',
              itemStyle: {
                color: config.maxColor,
                borderColor: '#fff',
                borderWidth: 2,
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowBlur: 4
              },
              label: {
                position: 'top',
                distance: 10,
                backgroundColor: config.maxColor,
                color: '#fff',
                fontSize: 12,
                padding: [4, 8],
                borderRadius: 4,
                formatter: (params: any) => {
                  return `最大值: ${formatValue(params.value)}`
                }
              }
            },
            {
              type: 'min',
              name: '最小值',
              itemStyle: {
                color: config.minColor,
                borderColor: '#fff',
                borderWidth: 2,
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowBlur: 4
              },
              label: {
                position: 'bottom',
                distance: 10,
                backgroundColor: config.minColor,
                color: '#fff',
                fontSize: 12,
                padding: [4, 8],
                borderRadius: 4,
                formatter: (params: any) => {
                  return `最小值: ${formatValue(params.value)}`
                }
              }
            }
          ]
        },
        markLine: {
          symbol: ['none', 'none'],
          lineStyle: {
            color: config.color + '80',
            type: 'dashed',
            width: 1
          },
          label: {
            color: '#606266',
            fontSize: 12,
            backgroundColor: '#fff',
            padding: [4, 8],
            borderRadius: 4,
            borderColor: '#e4e7ed',
            borderWidth: 1,
            formatter: (params: any) => {
              return `平均值: ${formatValue(params.value)}`
            }
          },
          data: [
            {
              type: 'average',
              name: '平均值',
              lineStyle: {
                color: config.color + '80'
              }
            }
          ]
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            showSymbol: true,
            borderWidth: 2,
            borderColor: '#fff',
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 4
          }
        }
      }
    ]
  }
}

// 初始化图表
const initChart = async () => {
  if (!chartRef.value) return
  
  // 确保容器有高度
  const containerHeight = chartRef.value.parentElement?.offsetHeight || 400
  chartRef.value.style.height = `${containerHeight}px`
  
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  
  const option = getChartOption(selectedChartType.value)
  chart.setOption(option)
}

// 监听图表类型变化
watch(selectedChartType, async () => {
  if (!isTableView.value && chart) {
    chartLoading.value = true
    try {
      await nextTick()
      chart.setOption(getChartOption(selectedChartType.value))
    } finally {
      chartLoading.value = false
    }
  }
})

// 监听数据变化，更新图表
watch(tableData, async () => {
  if (!isTableView.value && chart) {
    chartLoading.value = true
    try {
      await nextTick()
      chart.setOption(getChartOption(selectedChartType.value))
    } finally {
      chartLoading.value = false
    }
  }
}, { deep: true })

// 监听窗口大小变化
const handleResize = () => {
  if (chart && chartRef.value) {
    // 更新容器高度
    const containerHeight = chartRef.value.parentElement?.offsetHeight || 400
    chartRef.value.style.height = `${containerHeight}px`
    chart.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})

// 在组件挂载时获取初始数据
onMounted(async () => {
  try {
    await Promise.all([
      fetchMatrixList(),
      fetchSatelliteList(),
      fetchCalculationResults(),
      fetchChartData()
    ])
  } finally {
    pageLoading.value = false
  }
})

// 处理批量计算
const handleBatchCalculate = async () => {
  if (!selectedSourceSatellite.value || !selectedTargetSatellite.value || !selectedMatrixId.value) {
    ElMessage.warning('请选择本星、对星和精测矩阵')
    return
  }

  calculating.value = true
  calculationStatus.value = '正在计算中...'

  try {
    const result = await window.satellite.batchCalculate({
      startTime: dateRange.value[0],
      endTime: dateRange.value[1],
      sourceSatellite: selectedSourceSatellite.value,
      targetSatellite: selectedTargetSatellite.value,
      matrixId: selectedMatrixId.value
    })

    calcResult.value = {
      success: result.success,
      message: result.message
    }
    showCalcResultDialog.value = true

    // 如果计算成功，刷新数据
    if (result.success) {
      pageLoading.value = true
      try {
        await Promise.all([
          fetchCalculationResults(),
          fetchChartData()
        ])
        // 如果当前是图表视图，需要重新初始化图表
        if (!isTableView.value && chart) {
          await nextTick()
          chart.setOption(getChartOption(selectedChartType.value))
        }
      } finally {
        pageLoading.value = false
      }
    }
  } catch (error) {
    ElMessage.error('批量计算失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    calculating.value = false
    calculationStatus.value = ''
  }
}
</script>

<style scoped>
.browse-container {
  width: 100%;
  padding: 0;
  margin: 0;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 确保最小高度占满视口 */
}

.browse-card {
  max-width: 1400px;
  margin: 20px auto;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 32px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  flex-shrink: 0;
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
  padding: 16px 24px;
  align-items: flex-start;
  flex-wrap: wrap;
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.table-container {
  overflow: auto;
}

.el-table {
  width: 100% !important;
  --el-table-border-color: #e4e7ed;
  --el-table-header-bg-color: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
}

.el-table :deep(th) {
  background-color: #f0f7ff !important;
  font-weight: 600;
  color: #409EFF !important;
  font-size: 15px;
  height: 50px;
  padding: 8px 0;
}

.el-table :deep(td) {
  padding: 12px 0;
  height: 48px;
}

.pagination-bar {
  flex-shrink: 0;
  background: #fff;
  padding: 16px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  position: relative;
  z-index: 1;
}

.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.filter-item {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.filter-item:last-child {
  margin-left: auto;
}

.date-picker-item {
  min-width: 360px;
}

.filter-item .el-date-editor {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  width: 360px !important;
}

.filter-item .el-select {
  border-radius: 8px;
  flex-shrink: 0;
}

.filter-item .el-select :deep(.el-input__wrapper) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.table-header {
  background: #ecf5ff !important;
  font-weight: 600;
  color: #409EFF !important;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.el-table__row {
  transition: background-color 0.2s ease;
}

.el-table__row:hover {
  background: #f4f9ff !important;
}

.el-table__cell {
  font-size: 14px;
  padding: 12px 8px;
}

@media (max-width: 1400px) {
  .browse-card {
    margin: 16px;
  }
}

@media (max-width: 768px) {
  .browse-card {
    margin: 12px;
    padding: 20px;
  }
  
  .table-area {
    margin-top: 12px;
  }
  
  .pagination-bar {
    padding: 12px;
  }
}

@media (max-width: 700px) {
  .table-header {
    font-size: 13px;
  }
  .el-table__cell {
    font-size: 13px;
    padding: 10px 4px;
  }
}

.progress-dialog-content,
.progress-text,
.el-progress {
  display: none;
}

.matrix-dialog-content {
  padding: 20px;
}

.matrix-form {
  margin-bottom: 20px;
}

.matrix-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.measurement-matrix {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.matrix-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status-bar {
  margin-bottom: 16px;
  padding: 0 16px;
}

.status-detail {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-alert) {
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #f4f9ff;
  border: 1px solid #e6f1ff;
}

:deep(.el-alert__title) {
  font-size: 15px;
  font-weight: 500;
  color: #409EFF;
}

:deep(.el-alert__content) {
  padding: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

/* 添加计算结果对话框样式 */
.calc-result-content {
  text-align: center;
  padding: 20px 0;
}

.calc-result-content p {
  margin: 16px 0;
  font-size: 16px;
  color: #606266;
}

.calc-result-content.error-message p {
  color: #F56C6C;
}

.success-icon,
.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.chart-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.chart-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-header .el-select {
  width: 200px;
}

.chart-header .el-select :deep(.el-input__wrapper) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.chart-wrapper {
  flex: 1;
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.chart {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.9);
}

:deep(.el-loading-spinner .circular) {
  width: 42px;
  height: 42px;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #409EFF;
  margin: 3px 0;
  font-size: 14px;
  font-weight: 500;
}
</style> 