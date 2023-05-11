import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Product } from "./Product.js"
import { User } from "./User.js"
import { Application } from "./Application.js"

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

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
