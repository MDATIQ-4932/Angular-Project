import { UserModule } from "./user/user.module";

export interface authresponse {
    token:string;
    user:UserModule;
}
