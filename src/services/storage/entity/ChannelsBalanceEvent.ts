import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { BalanceEvent } from "./BalanceEvent.js"

@Entity()
export class ChannelBalanceEvent {
    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => BalanceEvent, { eager: true })
    @JoinColumn()
    balance_event: BalanceEvent

    @Column()
    channel_id: string

    @Column()
    local_balance_sats: number

    @Column()
    remote_balance_sats: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
