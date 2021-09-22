/**
 * @format
 */
/// <reference path="GunT.ts" />
namespace Smith {
  export interface GunSmithNode extends GunT.GUNNode {
    /**
     * @override
     */
    get(key: string): GunSmithNode
    /**
     * @override
     */
    map(): GunSmithNode
    /**
     * @override
     */
    set(data: GunT.ValidDataValue, cb?: GunT.Callback): GunSmithNode
    /**
     * Gun will be restarted to force replication of data
     * if needed.
     * @param cb
     */
    specialOn(cb: GunT.Listener): void
    /**
     * Gun will be restarted to force replication of data
     * if needed.
     * @param cb
     * @param _wait
     */
    specialOnce(cb: GunT.Listener, _wait?: number): GunSmithNode
    /**
     * Gun will be restarted to force replication of data
     * if needed.
     */
    specialThen(): Promise<GunT.ListenerData>
    /**
     * A promise version of put().
     * @throws
     */
    pPut(data: GunT.ValidDataValue): Promise<void>
    /**
     * @protected
     */
    _getProcCounter(): number
  }

  export type UserSmithNode = GunSmithNode & GunT.UserGUNNode

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

  export interface SmithMsgCreate {
    alias: string
    pass: string
    type: 'create'
  }

  export interface SmithMsgLeave {
    type: 'leave'
  }

  export interface SmithMsgOn {
    path: string
    type: 'on'
  }

  export interface SmithMsgLoad {
    id: string
    path: string
    type: 'load'
  }

  export interface SmithMsgMapOn {
    path: string
    type: 'map.on'
  }

  export interface SmithMsgPut {
    id: string
    data: GunT.ValidDataValue
    path: string
    type: 'put'
  }

  export interface SmithMsgMultiPut {
    ids: string[]
    data: GunT.ValidDataValue
    path: string
    type: 'multiPut'
  }

  export type SmithMsg =
    | SmithMsgInit
    | SmithMsgAuth
    | SmithMsgCreate
    | SmithMsgAuth
    | SmithMsgOn
    | SmithMsgLoad
    | SmithMsgMapOn
    | SmithMsgPut
    | SmithMsgMultiPut
    | BatchSmithMsg

  export type BatchSmithMsg = SmithMsg[]

  export interface GunMsgAuth {
    ack: GunT.AuthAck
    type: 'auth'
  }

  export interface GunMsgCreate {
    ack: GunT.CreateAck
    pair: GunT.UserPair
    type: 'create'
  }

  export interface GunMsgOn {
    data: GunT.ListenerData
    path: string
    type: 'on'
  }

  export interface GunMsgMapOn {
    data: GunT.ListenerData
    path: string
    key: string
    type: 'map.on'
  }

  export interface GunMsgLoad {
    id: string
    data: GunT.LoadListenerData
    key: string
    type: 'load'
  }

  export interface GunMsgPut {
    ack: GunT.Ack
    id: string
    path: string
    type: 'put'
  }

  export interface GunMsgMultiPut {
    ack: GunT.Ack
    ids: string[]
    path: string
    type: 'multiPut'
  }

  export type GunMsg =
    | GunMsgAuth
    | GunMsgCreate
    | GunMsgOn
    | GunMsgMapOn
    | GunMsgLoad
    | GunMsgPut
    | GunMsgMultiPut
}
