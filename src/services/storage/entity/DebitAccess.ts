import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
export type DebitAccessRules = Record<string/* rule name */, string[]/* rule values */>
@Entity()
@Index("unique_debit_access", ["app_user_id", "npub"], { unique: true })
export class DebitAccess {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_user_id: string

    @Column()
    npub: string

    @Column()
    authorized: boolean

    @Column({ type: 'simple-json', default: null, nullable: true })
    rules: DebitAccessRules | null

    @Column({ default: 0 })
    total_debits: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
