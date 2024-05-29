import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
import { Application } from "./Application.js"
export type EphemeralKeyType = 'balanceCheck' | 'withdraw' | 'pay'
@Entity()
export class UserEphemeralKey {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @ManyToOne(type => Application, { eager: true })
    @JoinColumn()
    linkedApplication: Application | null

    @Column()
    @Index({ unique: true })
    key: string

    @Column()
    type: EphemeralKeyType

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
