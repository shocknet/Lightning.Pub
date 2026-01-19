import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity()
@Index("tracked_provider_unique", ["provider_type", "provider_pubkey"], { unique: true })
export class TrackedProvider {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    provider_type: 'lnd' | 'lnPub'

    @Column()
    provider_pubkey: string

    @Column()
    latest_balance: number

    @Column({ default: 0 })
    latest_distruption_at_unix: number

    @Column({ default: 0 })
    latest_checked_height: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}