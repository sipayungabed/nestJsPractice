import { Test } from "@nestjs/testing"
import { AuthService } from "./auth.service"
import { UsersService } from "./users.service";
import { User } from "./user.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { async } from "rxjs";

//give a title of our test
describe('AuthService', () => {
    let service: AuthService;
    let fakeUsersService: Partial<UsersService>
    //create a service instance every befor rrunning our test
    beforeEach(async () => {
        const users : User[] = [];
        //create a fake userservice
        fakeUsersService = {
            find: (email: string) => {
                const filteredUser = users.filter(user => user.email === email)
                return Promise.resolve(filteredUser);
            },
            create: (email: string, password: string) => {
                const user = {id:users.length , email, password} as User
                users.push(user)
                return Promise.resolve(user)
            }
        };


        //create a DI container
        const module = await Test.createTestingModule({
            providers: [
                //Put in Auth service in the DI Container
                AuthService,
                {
                    //if anyone ask for UserService, then give them fakeUserService
                    provide: UsersService,
                    useValue: fakeUsersService
                }]
        }).compile();

        service = module.get(AuthService);
    });

    it(`can create an instance of auth service`, async () => {
        expect(service).toBeDefined();
    })

    it('creates a new user with a salted and hashed password', async () => {
        const user = await service.signUp('asd@asd.com', 'asd');

        expect(user.password).not.toEqual('asd');
        const [salt, hash] = user.password.split('.');
        expect(salt).toBeDefined();
        expect(hash).toBeDefined();
    })

    it('throws an error if user signs up with email that is in use', async () => {
        await service.signUp('asd@asd.com', 'asd');
        await expect(service.signUp('asd@asd.com', 'asd')).rejects.toThrow(BadRequestException)
    });

    it('throws if signin is called with an unused email', async () => {
        await expect(
            service.signIn('a', '1')
        ).rejects.toThrow(
            NotFoundException
        );
    })

    it('throws if an invalid password is provided', async () => {
        await service.signUp('asd@asd.com', 'asd')
        await expect(
            service.signIn('asd@asd.com', '2')
        ).rejects.toThrow(
            BadRequestException
        );
    })

    it('return a user if correct password is provided', async () => {
        await service.signUp('asd@asd.com', 'asd')
        const user = await service.signIn('asd@asd.com', 'asd')
        expect(user).toBeDefined();
    })

})

