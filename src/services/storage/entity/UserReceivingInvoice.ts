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

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
