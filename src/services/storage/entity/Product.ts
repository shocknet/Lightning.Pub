import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
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
}
