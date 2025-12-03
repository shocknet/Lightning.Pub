import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class TransactionSwap {
    @PrimaryGeneratedColumn('uuid')
    swap_operation_id: string

    @Column()
    app_user_id: string

    @Column()
    swap_quote_id: string

    @Column()
    swap_tree: string

    @Column()
    lockup_address: string

    @Column()
    refund_public_key: string

    @Column()
    timeout_block_height: number

    @Column()
    invoice: string

    @Column()
    invoice_amount: number

    @Column()
    transaction_amount: number

    @Column()
    swap_fee_sats: number

    @Column()
    chain_fee_sats: number

    @Column()
    preimage: string

    @Column()
    ephemeral_public_key: string

    @Column()
    ephemeral_private_key: string

    @Column({ default: false })
    used: boolean

    @Column({ default: "" })
    failure_reason: string

    @Column({ default: "" })
    tx_id: string

    @Column({ default: "" })
    address_paid: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}