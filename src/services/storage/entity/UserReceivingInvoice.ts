import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Product } from "./Product.js"
import { User } from "./User.js"
import { Application } from "./Application.js"
export type ZapInfo = {
    pub: string
    eventId: string
    relays: string[]
    description: string
}
@Entity()
@Index("recv_invoice_paid_serial", ["user.serial_id", "paid_at_unix", "serial_id"], { where: "paid_at_unix > 0" })
export class UserReceivingInvoice {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    @Index({ unique: true })
    invoice: string

    @Column()
    expires_at_unix: number

    @Column({ default: 0 })
    paid_at_unix: number

    @Column({ default: false })
    internal: boolean

    @Column({ default: false })
    paidByLnd: boolean

    @Column({ default: "" })
    callbackUrl: string

    @Column({ default: 0 })
    paid_amount: number

    @Column({ default: 0 })
    service_fee: number

    @ManyToOne(type => Product, { eager: true })
    product: Product | null

    @ManyToOne(type => User, { eager: true })
    payer: User | null

    @ManyToOne(type => Application, { eager: true })
    linkedApplication: Application | null

    @Column({
        nullable: true,
        type: 'simple-json'
    })
    zap_info?: ZapInfo

    @Column({
        nullable: true,
        type: 'simple-json'
    })
    payer_data?: Record<string, string>


    @Column({ default: true })
    rejectUnauthorized: boolean

    @Column({ default: "" })
    bearer_token: string

    @Column({ default: "" })
    offer_id?: string

    @Column({
        nullable: true,
    })
    liquidityProvider?: string

    @Column({ nullable: true })
    clink_requester_pub?: string

    @Column({ nullable: true })
    clink_requester_event_id?: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
