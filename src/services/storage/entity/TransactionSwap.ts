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

    // the private key is used on to perform a swap, it does not hold any funds once the swap is completed
    // the swap should only last a few seconds, so it is not a security risk to store the private key in the database
    // the key is stored here mostly for recovery purposes, in case something goes wrong with the swap
    @Column()
    ephemeral_private_key: string

    @Column({ default: false })
    used: boolean

    @Column({ default: "" })
    failure_reason: string

    // Confirmed lockup spend txid (our claim or a competing spend). Broadcast
    // of the claim is claim_published, not this field.
    @Column({ default: "" })
    tx_id: string

    @Column({ default: 0 })
    completed_at_unix: number

    @Column({ default: 0 })
    paid_at_unix: number

    @Column({ default: "" })
    address_paid: string

    @Column({ default: "", type: "text" })
    claim_tx_hex: string

    // Set before BroadcastTransaction so a crash still resumes as disclosure.
    // A stored signature is not disclosure until this is set. Once true, this
    // must not be cleared: reconstructed claims keep the same preimage and false
    // is not proof of secrecy after a crash or an earlier backup restore.
    @Column({ default: false })
    claim_published: boolean

    @Column({ default: "", type: "text" })
    lockup_tx_hex: string

    @Column({ default: "" })
    service_url: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}