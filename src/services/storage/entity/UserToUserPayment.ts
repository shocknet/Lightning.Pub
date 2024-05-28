import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
import { Application } from "./Application.js"

@Entity()
export class UserToUserPayment {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    from_user: User

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    to_user: User

    @Column()
    paid_amount: number

    @Column()
    service_fees: number

    @Column()
    paid_at_unix: number

    @ManyToOne(type => Application, { eager: true })
    linkedApplication: Application | null

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
