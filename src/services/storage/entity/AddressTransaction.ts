import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User"
import { UserAddress } from "./UserAddress"

@Entity()
@Index("address_transaction_unique", ["tx_hash", "output_index"], { unique: true })
export class AddressTransaction {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => UserAddress)
    user_address: UserAddress

    @Column()
    tx_hash: string

    @Column()
    output_index: number

    @Column()
    amount: number
}
