import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    @Index({ unique: true })
    user_id: string

    @Column({ type: 'integer', default: 0 })
    balance_sats: number

    @Column({ default: false })
    locked: boolean

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
