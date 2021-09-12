/**
 * @format
 */
/// <reference path="GunT.ts" />
namespace Smith {
  export interface PendingPut {
    cb: GunT.Callback
    data: GunT.ValidDataValue
    id: string
  }

  export interface SmithMsgInit {
    opts: Record<string, any>
    type: 'init'
  }

  export interface SmithMsgAuth {
    alias: string
    pass: string
    type: 'auth'
  }

  export interface SmithMsgOn {
    path: string
    type: 'on'
  }

  export interface SmithMsgPut {
    id: string
    data: GunT.ValidDataValue
    path: string
    type: 'put'
  }

  export type SmithMsg =
    | SmithMsgInit
    | SmithMsgAuth
    | SmithMsgOn
    | SmithMsgPut
    | BatchSmithMsg

  export type BatchSmithMsg = SmithMsg[]

  export interface GunMsgAuth {
    ack: GunT.AuthAck
    type: 'auth'
  }

  export interface GunMsgOn {
    data: any
    path: string
    type: 'on'
  }

  export interface GunMsgPut {
    ack: GunT.Ack
    id: string
    path: string
    type: 'put'
  }

  export type GunMsg = GunMsgAuth | GunMsgOn | GunMsgPut
}
