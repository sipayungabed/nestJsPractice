import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';

describe('UsersController', () => {
  let controller: UsersController;
  let fakeUsersService : Partial<UsersService>
  let fakeAuthService : Partial<AuthService>
  beforeEach(async () => {
    fakeUsersService = {
      findOne: (id: number) => {
        return Promise.resolve({
          id,
          email: 'asdf@asdf.com',
          password: 'asdf',
        } as User);
      },
      find: (email: string) => {
        return Promise.resolve([{ id: 1, email, password: 'asdf' } as User]);
      },
      // remove: () => {},
      // update: () => {},
    };
    fakeAuthService = {
      // signup: () => {},
      // signin: () => {},
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers : [
        {
          provide: UsersService,
          useValue: fakeUsersService
        }, 
        {
          provide: AuthService,
          useValue: fakeAuthService
        }
      ]
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
 