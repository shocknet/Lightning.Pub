import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm"

export type DebitK1Status = "held" | "succeeded" | "released"

@Entity()
@Index("unique_active_consumed_debit_k1", ["app_id", "pointer", "k1"], { unique: true, where: "status != 'released'" })
@Index("unique_consumed_debit_k1_request", ["app_id", "pointer", "request_id"], { unique: true, where: "request_id IS NOT NULL" })
@Index("consumed_debit_k1_rate", ["app_id", "pointer", "created_at"])
@Index("consumed_debit_k1_invoice", ["invoice"])
@Index("consumed_debit_k1_released_at", ["created_at"], { where: "status = 'released'" })
export class ConsumedDebitK1 {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_id: string

    @Column()
    pointer: string

    @Column()
    k1: string

    @Column({ nullable: true })
    invoice?: string

    @Column({ nullable: true })
    request_id?: string

    @Column({ nullable: true })
    npub?: string

    @Column()
    status: DebitK1Status

    @CreateDateColumn()
    created_at: Date
}
