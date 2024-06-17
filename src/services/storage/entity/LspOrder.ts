import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class LspOrder {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    service_name: string

    @Column()
    invoice: string

    @Column()
    order_id: string

    @Column()
    total_paid: number

    @Column()
    fees: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
