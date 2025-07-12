import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserOffer {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_user_id: string

    @Column({ unique: true, nullable: false })
    offer_id: string

    @Column()
    label: string

    @Column({ default: 0 })
    price_sats: number

    @Column({ default: "" })
    callback_url: string

    @Column({
        nullable: true,
        type: 'simple-json',
        default: null
    })
    payer_data: string[] | null

    @Column({ default: "" })
    bearer_token: string

    @Column({ default: true })
    rejectUnauthorized: boolean


    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
