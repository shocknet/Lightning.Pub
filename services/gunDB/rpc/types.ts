import {Primitive} from '../contact-api/SimpleGUN'


export interface RPCData {
  [K: string]: ValidRPCDataValue
}

export type ValidRPCDataValue = Primitive | null | RPCData | Array<ValidRPCDataValue>