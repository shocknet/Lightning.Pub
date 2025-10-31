import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class AdminSettings {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column({ unique: true })
    env_name: string

    @Column()
    env_value: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
