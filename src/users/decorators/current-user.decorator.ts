import { ExecutionContext, createParamDecorator } from "@nestjs/common";


export const CurrentUser = createParamDecorator(
    (data: any, context: ExecutionContext ) => {
        //with context method bellow we can get the request that is coming into our application
        const request = context.switchToHttp().getRequest();
        return request.CurrentUser;
    }
)