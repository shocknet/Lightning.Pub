import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class ChannelEvent {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    channel_id: string

    @Column()
    event_type: 'activity'

    @Column({ default: 0 })
    inactive_since_unix: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
