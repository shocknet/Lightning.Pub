import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
export class Application {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    @Index({ unique: true })
    app_id: string

    @Column({ unique: true })
    name: string

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    owner: User

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
