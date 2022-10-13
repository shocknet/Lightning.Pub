/**
 * @format
 */
/// <reference path="GunT.ts" />
namespace Smith {
  export interface GunSmithNode {
    _: GunT.Soul
    /**
     * Used only inside the subprocess.
     */
    back(
      path: 'opt'
    ): {
      peers: Record<
        string,
        {
          url: string
          id: string
          wire?: {
            readyState: number
          }
        }
      >
    }
    /**
     *
     */
    get(key: string): GunSmithNode
    /**
     *
     */
    map(): GunSmithNode
    /**
     *
     */
    off(): void
    /**
     *
     */
    on(cb: GunT.Listener): void
    /**
     *
     */
    once(cb?: GunT.Listener, opts?: { wait?: number }): void
    /**
     * A promise version of put().
     * @throws
     */
    pPut(data: GunT.ValidDataValue): Promise<void>
    /**
     * A promise version of set().
     * @throws
     */
    pSet(data: GunT.ValidDataValue): Promise<void>
    /**
     *
     */
    put(data: GunT.ValidDataValue, cb?: GunT.Callback): void
    /**
     *
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
    then(): Promise<GunT.ListenerData>
    user(): UserSmithNode
    user(pub: string): GunSmithNode
  }

  export interface UserSmithNode extends GunSmithNode {
    _: GunT.UserSoul
    auth(alias: string, pass: string, cb: GunT.AuthCB): void
    is?: {
      alias: string
      pub: string
    }
    create(user: string, pass: string, cb: GunT.CreateCB): void
    leave(): void
  }

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
