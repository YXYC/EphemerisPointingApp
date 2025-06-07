import * as XLSX from 'xlsx'

// 定义卫星数据类型
interface SatelliteData {
  time: string | null
  satellite_name: string | null
  pos_x: number | null
  pos_y: number | null
  pos_z: number | null
  q0: number | null
  q1: number | null
  q2: number | null
  q3: number | null
}

export function uploadAndParseExcel(buffer: ArrayBuffer): SatelliteData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  const rows = jsonData.slice(1) // 跳过表头

  // 定义默认值对象
  const defaultRow: SatelliteData = {
    time: null,
    satellite_name: null,
    pos_x: null,
    pos_y: null,
    pos_z: null,
    q0: null,
    q1: null,
    q2: null,
    q3: null,
  }

  const satelliteData = (rows as any[][])
    .map((row) => {
      // 创建一个新对象，使用默认值
      const data: SatelliteData = { ...defaultRow }
      
      // 安全地获取每个字段的值，如果不存在则保持默认值
      if (row[0] !== undefined && row[0] !== null) data.time = String(row[0])
      if (row[1] !== undefined && row[1] !== null) data.satellite_name = String(row[1])
      if (row[2] !== undefined && row[2] !== null) data.pos_x = Number(row[2])
      if (row[3] !== undefined && row[3] !== null) data.pos_y = Number(row[3])
      if (row[4] !== undefined && row[4] !== null) data.pos_z = Number(row[4])
      if (row[5] !== undefined && row[5] !== null) data.q0 = Number(row[5])
      if (row[6] !== undefined && row[6] !== null) data.q1 = Number(row[6])
      if (row[7] !== undefined && row[7] !== null) data.q2 = Number(row[7])
      if (row[8] !== undefined && row[8] !== null) data.q3 = Number(row[8])

      return data
    })
    .filter(item => {
      // 过滤掉完全无效的行（所有字段都是 null）
      return !Object.values(item).every(value => value === null)
    })

  return satelliteData
}