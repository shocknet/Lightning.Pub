import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class BalanceEvent {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    block_height: number

    @Column()
    confirmed_chain_balance: number

    @Column()
    unconfirmed_chain_balance: number

    @Column()
    total_chain_balance: number

    @Column({ default: 0 })
    channels_balance: number

    @Column({ default: 0 })
    external_balance: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
