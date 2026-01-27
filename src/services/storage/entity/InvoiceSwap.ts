import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class InvoiceSwap {
    @PrimaryGeneratedColumn('uuid')
    swap_operation_id: string

    @Column()
    app_user_id: string

    @Column()
    swap_quote_id: string

    @Column()
    swap_tree: string

    @Column()
    claim_public_key: string

    @Column()
    payment_hash: string

    /*     @Column()
        lockup_address: string */

    /*     @Column()
        refund_public_key: string */

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
    ephemeral_public_key: string

    @Column()
    address: string

    // the private key is used on to perform a swap, it does not hold any funds once the swap is completed
    // the swap should only last a few seconds, so it is not a security risk to store the private key in the database
    // the key is stored here mostly for recovery purposes, in case something goes wrong with the swap
    @Column()
    ephemeral_private_key: string

    @Column({ default: false })
    used: boolean

    @Column({ default: "" })
    preimage: string

    @Column({ default: "" })
    failure_reason: string

    @Column({ default: "" })
    tx_id: string

    /*     @Column({ default: "" })
        address_paid: string */

    @Column({ default: "" })
    service_url: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}