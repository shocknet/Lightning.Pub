import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
@Index("user_transaction_unique", ["tx_hash", "output_index"], { unique: true })
export class UserTransactionPayment {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User)
    user: User

    @Column()
    address: string

    @Column()
    tx_hash: string

    @Column()
    output_index: number

    @Column()
    amount: number

    @Column()
    chain_fees: number

    @Column()
    service_fees: number
}
