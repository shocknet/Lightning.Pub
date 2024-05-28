import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

import { UserReceivingAddress } from "./UserReceivingAddress.js"

@Entity()
@Index("address_receiving_transaction_unique", ["tx_hash", "output_index"], { unique: true })
export class AddressReceivingTransaction {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => UserReceivingAddress, { eager: true })
    @JoinColumn()
    user_address: UserReceivingAddress

    @Column()
    tx_hash: string

    @Column()
    output_index: number

    @Column()
    paid_amount: number

    @Column()
    service_fee: number

    @Column()
    paid_at_unix: number

    @Column({ default: false })
    internal: boolean

    @Column({ default: 0 })
    confs: number

    @Column({ default: 0 })
    broadcast_height: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
