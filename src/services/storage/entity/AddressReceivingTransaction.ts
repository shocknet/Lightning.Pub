import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User"
import { UserReceivingAddress } from "./UserReceivingAddress"

@Entity()
@Index("address_transaction_unique", ["tx_hash", "output_index"], { unique: true })
export class AddressReceivingTransaction {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => UserReceivingAddress)
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
