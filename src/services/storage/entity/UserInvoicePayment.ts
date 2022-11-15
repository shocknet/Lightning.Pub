import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserInvoicePayment {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User)
    user: User

    @Column()
    @Index({ unique: true })
    invoice: string

    @Column()
    amount: number

    @Column()
    routing_fees: number

    @Column()
    service_fees: number
}
