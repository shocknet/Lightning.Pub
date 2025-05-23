import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class RootOperation {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    operation_type: string

    @Column()
    operation_amount: number

    @Column()
    operation_identifier: string

    @Column({ default: 0 })
    at_unix: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
