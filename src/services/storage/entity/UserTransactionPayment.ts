import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
@Index("user_transaction_unique", ["tx_hash", "output_index"], { unique: true })
export class UserTransactionPayment {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    address: string

    @Column()
    tx_hash: string

    @Column()
    output_index: number

    @Column()
    paid_amount: number

    @Column()
    chain_fees: number

    @Column()
    service_fees: number

    @Column()
    paid_at_unix: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
