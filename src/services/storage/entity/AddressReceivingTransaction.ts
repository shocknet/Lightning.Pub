import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn } from "typeorm"

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
    amount: number

    @Column()
    service_fee: number
}
