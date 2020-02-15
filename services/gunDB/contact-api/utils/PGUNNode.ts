/** @format */
import { GUNNode, GUNNodeBase, ValidDataValue } from '../SimpleGUN'

export interface PGUNNode extends GUNNodeBase {
  get(key: string): PGUNNode
  put(data: ValidDataValue | GUNNode): Promise<void>
  set(data: ValidDataValue | GUNNode): Promise<void>
}
