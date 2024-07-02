import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
import { Application } from "./Application.js"

@Entity()
export class UserInvoicePayment {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    @Index({ unique: true })
    invoice: string

    @Column()
    paid_amount: number

    @Column()
    routing_fees: number

    @Column()
    service_fees: number

    @Column()
    paid_at_unix: number

    @Column({ default: false })
    internal: boolean

    @ManyToOne(type => Application, { eager: true })
    linkedApplication: Application | null

    @Column({
        nullable: true,
    })
    liquidityProvider?: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
