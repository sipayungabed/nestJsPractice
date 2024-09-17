import { User } from "src/users/user.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id: number;


  @Column({default: false})
  approved: boolean

  @Column()
  price: number;

  @Column()
  make: string;

  @Column()
  model: string;

  @ManyToOne(() => User, (user) => user.reports)
  user: User;   

  @Column()
  year: number;

  @Column()
  lng: number;

  @Column()
  lat: number;

  @Column()
  mileage: number;
}
