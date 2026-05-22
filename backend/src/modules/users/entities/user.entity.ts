import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  fullName!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', nullable: true })
  activeSandboxWalletPhone!: string | null;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions!: Transaction[];
}
