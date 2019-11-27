/**
 * @prettier
 */
type Primitive = boolean | string | number

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

export type ListenerObj = Record<string, ListenerObjSoul | Primitive | null> & {
  _: ListenerObjSoul
}

export type ListenerData = Primitive | null | ListenerObj | undefined

export type Listener = (data: ListenerData, key: string) => void
export type Callback = (ack: Ack) => void

export interface Soul {
  get: string
  put: Primitive | null | object | undefined
}

export interface GUNNode {
  _: Soul
  get(key: string): GUNNode
  map(): GUNNode
  put(data: ValidDataValue | GUNNode, cb?: Callback): GUNNode
  on(this: GUNNode, cb: Listener): void
  once(this: GUNNode, cb?: Listener): GUNNode
  set(data: ValidDataValue | GUNNode, cb?: Callback): GUNNode
  off(): void
  user(): UserGUNNode
  user(epub: string): GUNNode

  then(): Promise<ListenerData>
  then<T>(cb: (v: ListenerData) => T): Promise<ListenerData>
}

export interface CreateAck {
  pub: string | undefined
  err: string | undefined
}

export type CreateCB = (ack: CreateAck) => void

export interface AuthAck {
  err: string | undefined
  sea:
    | {
        pub: string
      }
    | undefined
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
  auth(user: string, pass: string, cb: AuthCB): void
  is?: {
    alias: string
    pub: string
  }
  create(user: string, pass: string, cb: CreateCB): void
  leave(): void
}

export interface ISEA {
  encrypt(message: string, senderSecret: string): Promise<string>
  decrypt(encryptedMessage: string, recipientSecret: string): Promise<string>
  secret(
    recipientOrSenderEpub: string,
    recipientOrSenderUserPair: UserPair
  ): Promise<string>
}

export interface MySEA {
  encrypt(message: string, senderSecret: string): Promise<string>
  decrypt(encryptedMessage: string, recipientSecret: string): Promise<string>
  secret(
    recipientOrSenderEpub: string,
    recipientOrSenderUserPair: UserPair
  ): Promise<string>
}
