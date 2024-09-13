import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
import { Application } from "./Application.js"
import { ApplicationUser } from "./ApplicationUser.js"
export type DebitKeyType = 'simpleId' | 'pubKey'
@Entity()
@Index("unique_debit_access", ["app_user_id", "key", "key_type"], { unique: true })
export class DebitAccess {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_user_id: string

    @Column()
    key: string

    @Column()
    key_type: DebitKeyType

    @Column({ default: 0 })
    total_debits: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
