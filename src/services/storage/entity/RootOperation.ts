import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
@Index("unique_root_operation", ["operation_type", "operation_identifier"], { unique: true })
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

    @Column({ default: false })
    pending: boolean

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
