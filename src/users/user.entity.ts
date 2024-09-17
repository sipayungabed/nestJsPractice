import { Report } from "src/reports/report.entity";
import { AfterInsert, AfterRemove, AfterUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    email: string;
    @Column()
    password: string;

    @OneToMany(() => Report, (report) => report.user)
    reports: Report[]
 
    @AfterInsert()
    logInsert(){
        console.log('Inserted User with id ', this.id);
    }

    @Column({default: true})
    admin: boolean;
    
    @AfterRemove()
    logRemove(){
        console.log('Remove User with id ', this.id)
    }

    @AfterUpdate()
    logUpdate(){
        console.log('Update User with id ', this.id)

    }
}