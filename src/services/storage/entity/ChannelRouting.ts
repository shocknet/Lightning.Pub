import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class ChannelRouting {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    day_unix: number

    @Column()
    channel_id: string

    @Column({ default: 0 })
    send_errors: number

    @Column({ default: 0 })
    receive_errors: number

    @Column({ default: 0 })
    forward_errors_as_input: number

    @Column({ default: 0 })
    forward_errors_as_output: number

    @Column({ default: 0 })
    missed_forward_fee_as_input: number

    @Column({ default: 0 })
    missed_forward_fee_as_output: number

    @Column({ default: 0 })
    forward_fee_as_input: number

    @Column({ default: 0 })
    forward_fee_as_output: number

    @Column({ default: 0 })
    events_as_output: number

    @Column({ default: 0 })
    events_as_input: number

    @Column({ default: 0 })
    latest_index_offset: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
