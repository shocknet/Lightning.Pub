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
}
