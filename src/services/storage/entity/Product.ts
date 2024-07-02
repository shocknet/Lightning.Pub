import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class Product {

    @PrimaryGeneratedColumn('uuid')
    product_id: string

    @ManyToOne(type => User, { eager: true })
    owner: User

    @Column()
    name: string

    @Column()
    price_sats: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
