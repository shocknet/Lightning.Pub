/**
 * @format
 */
/// <reference path="GunT.ts" />
namespace Smith {
  export interface SmithMsgOn {
    path: string
    type: 'on'
  }

  export interface SmithMsgOnce {
    id: string
    path: string
    type: 'once'
  }

  export interface SmithMsgPut {
    id: string
    path: string
    type: 'put'
    value: any
  }

  export type SmithMsg = SmithMsgOn | SmithMsgOnce | SmithMsgPut | BatchSmithMsg

  export type BatchSmithMsg = SmithMsg[]

  export interface GunMsgOn {
    data: any
    key: string
    path: string
    type: 'on'
  }

  export interface GunMsgOnce {
    data: any
    id: string
    key: string
    type: 'once'
  }

  export interface GunMsgPut {
    ack: GunT.Ack
    id: string
    path: string
    type: 'put'
  }

  export type GunMsg = GunMsgOn | GunMsgOnce | GunMsgPut
}
