
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UseInterceptors } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { UserDto } from 'src/users/dtos/user.dto';

interface ClassConstructor{
    new(...args:any[]) : {}; 
}

export function Serialize(dto: ClassConstructor){
    return UseInterceptors(new SerializeInterceptor(dto))
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
    constructor(private dto: any){}
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        //Run something before a request handled

        return next.handle().pipe(
            map((data: any) => {
                //the excludeExtraneousValues ensure that only dataa with @expose decorator that will be passed
                return plainToClass(this.dto, data, {
                    excludeExtraneousValues : true
                })
                //Run after handler

            }
            )
        );
    }
}