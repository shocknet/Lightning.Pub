import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class RoutingEvent {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    incoming_channel_id: number

    @Column()
    incoming_htlc_id: number

    @Column()
    outgoing_channel_id: number

    @Column()
    outgoing_htlc_id: number

    @Column()
    timestamp_ns: number

    @Column()
    event_type: string

    @Column({ nullable: true })
    incoming_amt_msat?: number

    @Column({ nullable: true })
    outgoing_amt_msat?: number

    @Column({ nullable: true })
    failure_string?: string

    @Column({ nullable: true })
    settled?: boolean

    @Column({ nullable: true })
    offchain?: boolean

    @Column({ nullable: true })
    forward_fail_event?: boolean

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
