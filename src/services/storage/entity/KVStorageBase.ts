import { PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"

export abstract class KVStorageBase {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    @Index({ unique: true })
    key: string

    @Column({ type: 'simple-json' })
    value: object

    @Column()
    version: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
