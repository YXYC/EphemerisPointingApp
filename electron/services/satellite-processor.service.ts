const PI = Math.PI

export class Vector3d {
  x: number
  y: number
  z: number
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x ?? 0
    this.y = y ?? 0
    this.z = z ?? 0
  }
  norm() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }
  normalized() {
    const n = this.norm() || 1
    return new Vector3d(this.x / n, this.y / n, this.z / n)
  }
  minus(other: Vector3d) {
    return new Vector3d(this.x - other.x, this.y - other.y, this.z - other.z)
  }
}

export class Quaternion {
  w: number
  x: number
  y: number
  z: number
  constructor(w: number = 1, x: number = 0, y: number = 0, z: number = 0) {
    this.w = w ?? 1
    this.x = x ?? 0
    this.y = y ?? 0
    this.z = z ?? 0
  }
  normalized() {
    const n = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z) || 1
    return new Quaternion(this.w / n, this.x / n, this.y / n, this.z / n)
  }
}

export class Matrix3d {
  data: number[][]
  constructor() {
    this.data = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  }
  static from(data: number[][]) {
    const m = new Matrix3d()
    m.data = data.map(row => row.slice())
    return m
  }
  multiplyMatrix(other: Matrix3d) {
    const result = new Matrix3d()
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result.data[i][j] = 0
        for (let k = 0; k < 3; k++) {
          result.data[i][j] += this.data[i][k] * other.data[k][j]
        }
      }
    }
    return result
  }
  multiplyVector(v: Vector3d) {
    return new Vector3d(
      this.data[0][0] * v.x + this.data[0][1] * v.y + this.data[0][2] * v.z,
      this.data[1][0] * v.x + this.data[1][1] * v.y + this.data[1][2] * v.z,
      this.data[2][0] * v.x + this.data[2][1] * v.y + this.data[2][2] * v.z
    )
  }
  transpose() {
    const result = new Matrix3d()
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        result.data[i][j] = this.data[j][i]
    return result
  }
  inverse() {
    return this.transpose()
  }
}

export class SatelliteProcessor {
  position: Vector3d = new Vector3d()
  attitude: Quaternion = new Quaternion()
  targetPosition: Vector3d = new Vector3d()
  measurementMatrix: Matrix3d = new Matrix3d()

  setMeasurementMatrix(roll_urad?: number, pitch_urad?: number, yaw_urad?: number) {
    const roll_rad = (roll_urad ?? 0) * 1e-6
    const pitch_rad = (pitch_urad ?? 0) * 1e-6
    const yaw_rad = (yaw_urad ?? 0) * 1e-6
    this.measurementMatrix = this.getRotationMatrixZYX(roll_rad, pitch_rad, yaw_rad)
  }

  setSatelliteState(pos?: Vector3d, att?: Quaternion) {
    this.position = pos ?? new Vector3d()
    this.attitude = (att ?? new Quaternion()).normalized()
  }

  setTargetPosition(targetPos?: Vector3d) {
    this.targetPosition = targetPos ?? new Vector3d()
  }

  getRotationMatrixZYX(roll: number, pitch: number, yaw: number) {
    const sin_roll = Math.sin(roll), cos_roll = Math.cos(roll)
    const sin_pitch = Math.sin(pitch), cos_pitch = Math.cos(pitch)
    const sin_yaw = Math.sin(yaw), cos_yaw = Math.cos(yaw)

    const C_roll = Matrix3d.from([
      [1, 0, 0],
      [0, cos_roll, -sin_roll],
      [0, sin_roll, cos_roll]
    ])
    const C_pitch = Matrix3d.from([
      [cos_pitch, 0, sin_pitch],
      [0, 1, 0],
      [-sin_pitch, 0, cos_pitch]
    ])
    const C_yaw = Matrix3d.from([
      [cos_yaw, -sin_yaw, 0],
      [sin_yaw, cos_yaw, 0],
      [0, 0, 1]
    ])
    return C_yaw.multiplyMatrix(C_pitch).multiplyMatrix(C_roll)
  }

  quaternionToRotationMatrix(q: Quaternion) {
    const q0 = q.w, q1 = q.x, q2 = q.y, q3 = q.z
    const C = new Matrix3d()
    C.data[0][0] = 1 - 2 * (q2 * q2 + q3 * q3)
    C.data[0][1] = 2 * (q1 * q2 - q0 * q3)
    C.data[0][2] = 2 * (q0 * q2 + q1 * q3)
    C.data[1][0] = 2 * (q0 * q3 + q1 * q2)
    C.data[1][1] = 1 - 2 * (q1 * q1 + q3 * q3)
    C.data[1][2] = 2 * (q2 * q3 - q0 * q1)
    C.data[2][0] = 2 * (q1 * q3 - q0 * q2)
    C.data[2][1] = 2 * (q0 * q1 + q2 * q3)
    C.data[2][2] = 1 - 2 * (q1 * q1 + q2 * q2)
    return C
  }

  calculateAngles(p_CPA: Vector3d) {
    const norm_p_CPA = p_CPA.norm() || 1
    let uintvector = new Vector3d(p_CPA.x / norm_p_CPA, p_CPA.y / norm_p_CPA, p_CPA.z / norm_p_CPA)
    if (Math.abs(uintvector.x) < 1e-7) uintvector.x = 1e-7
    const pitch = Math.atan(-uintvector.z / uintvector.x)
    const yaw = Math.atan2(uintvector.y * Math.cos(pitch), uintvector.x)
    return { yaw, pitch }
  }

  calculateRelativeState() {
    const relativePos = this.targetPosition.minus(this.position)
    const distance = relativePos.norm()
    const p_J2000_u = relativePos.normalized()
    const C_J2000_TO_SAT = this.quaternionToRotationMatrix(this.attitude)
    const C_SAT_TO_J2000 = C_J2000_TO_SAT.inverse()
    const C_CPA2LCT = new Matrix3d()
    const p_CPA = C_CPA2LCT.multiplyMatrix(this.measurementMatrix).multiplyMatrix(C_SAT_TO_J2000).multiplyVector(p_J2000_u)
    const { yaw, pitch } = this.calculateAngles(p_CPA)
    return { distance, yaw, pitch }
  }
}
