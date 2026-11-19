import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm"

@Entity()
export class InvoiceSwapFundingLock {
    @PrimaryColumn()
    payment_hash: string

    @Column()
    swap_operation_id: string

    @CreateDateColumn()
    created_at: Date
}
