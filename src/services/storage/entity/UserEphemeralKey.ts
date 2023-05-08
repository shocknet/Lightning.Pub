import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
export type EphemeralKeyType = 'balanceCheck' | 'payInfo' | 'pay' | 'withdraw'
@Entity()
export class UserEphemeralKey {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

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
