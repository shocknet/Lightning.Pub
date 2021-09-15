/**
 * @prettier
 */
namespace GunT {
  export type Primitive = boolean | string | number

  export interface Data {
    [K: string]: ValidDataValue
  }

  export type ValidDataValue = Primitive | null | Data

  export interface Ack {
    err: string | undefined
  }

  type ListenerObjSoul = {
    '#': string
  }

  export type ListenerObj = Record<
    string,
    ListenerObjSoul | Primitive | null
  > & {
    _: ListenerObjSoul
  }

  export type ListenerData = Primitive | null | ListenerObj | undefined

  interface OpenListenerDataObj {
    [k: string]: OpenListenerData
  }

  export type Listener = (data: ListenerData, key: string) => void

  export type Callback = (ack: Ack) => void

  export interface Peer {
    url: string
    id: string
    wire?: {
      readyState: number
    }
  }

  export interface Soul {
    get: string
    put: Primitive | null | object | undefined
    opt: {
      peers: Record<string, Peer>
    }
  }
  export type OpenListenerData = Primitive | null | OpenListenerDataObj

  export type OpenListener = (data: OpenListenerData, key: string) => void

  export type LoadListenerData = OpenListenerData

  export type LoadListener = (data: LoadListenerData, key: string) => void

  export interface GUNNode {
    _: Soul
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
    get(key: string): GUNNode
    load(this: GUNNode, cb?: LoadListener): void
    map(): GUNNode
    off(): void
    on(this: GUNNode, cb: Listener): void
    once(this: GUNNode, cb?: Listener, opts?: { wait?: number }): void
    user(): UserGUNNode
    user(pub: string): GUNNode
    put(data: ValidDataValue, cb?: Callback): void
    set(data: ValidDataValue, cb?: Callback): GUNNode
    then(): Promise<ListenerData>
  }

  export interface CreateAck {
    pub: string | undefined
    err: string | undefined
  }

  export type CreateCB = (ack: CreateAck) => void

  export interface AuthAck {
    err: string | undefined
    sea: UserPair | undefined
  }

  export type AuthCB = (ack: AuthAck) => void

  export interface UserPair {
    epriv: string
    epub: string
    priv: string
    pub: string
  }

  export interface UserSoul extends Soul {
    sea: UserPair
  }

  export interface UserGUNNode extends GUNNode {
    _: UserSoul
    auth(alias: string, pass: string, cb: AuthCB): void
    is?: {
      alias: string
      pub: string
    }
    create(user: string, pass: string, cb: CreateCB): void
    leave(): void
  }
}
