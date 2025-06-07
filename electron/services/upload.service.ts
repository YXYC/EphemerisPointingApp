import * as XLSX from 'xlsx'

export function uploadAndParseExcel(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  const rows = jsonData.slice(1) // 跳过表头

  const satelliteData = (rows as any[][])
    .map((row) => ({
      time: row[0] !== undefined ? String(row[0]) : null,
      satellite_name: row[1] !== undefined ? String(row[1]) : null,
      pos_x: row[2] !== undefined ? Number(row[2]) : null,
      pos_y: row[3] !== undefined ? Number(row[3]) : null,
      pos_z: row[4] !== undefined ? Number(row[4]) : null,
      q0: row[5] !== undefined ? Number(row[5]) : null,
      q1: row[6] !== undefined ? Number(row[6]) : null,
      q2: row[7] !== undefined ? Number(row[7]) : null,
      q3: row[8] !== undefined ? Number(row[8]) : null,
    }))
  return satelliteData
}