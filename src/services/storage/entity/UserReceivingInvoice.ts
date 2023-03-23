import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn } from "typeorm"
import { Product } from "./Product.js"
import { User } from "./User.js"

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

    @Column({ default: 0 })
    paid_at_unix: number

    @Column()
    callbackUrl: string

    @Column({ default: 0 })
    paid_amount: number

    @Column({ default: 0 })
    service_fee: number

    @ManyToOne(type => Product, { eager: true })
    product: Product | null
}
