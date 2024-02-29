import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { KVStorageBase } from "./KVStorageBase.js";

@Entity()
export class HtlcFailures extends KVStorageBase {
}
