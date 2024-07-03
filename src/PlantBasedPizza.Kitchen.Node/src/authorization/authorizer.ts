import { ALBEvent } from "aws-lambda";
import { jwtDecode } from "jwt-decode";
const jwt = require("jsonwebtoken");

export class Authorizer {
  jwtSecretKeyPromise: Promise<string | undefined>;
  jwtSecretKey: string = '';

  constructor(jwtSecretKey: Promise<string | undefined>) {
    this.jwtSecretKeyPromise = jwtSecretKey;
  }

  async authorizeRequest(event: ALBEvent, allowedRoles: string[]): Promise<boolean> {
    try {
      if (this.jwtSecretKey === ''){
        const secretKeyValue = await this.jwtSecretKeyPromise;

        if (secretKeyValue === undefined){
          throw 'Failure to retrieve JWT secret key value'
        }

        this.jwtSecretKey = secretKeyValue;
      }

      if (event.headers!["Authorization"] === undefined) {
        return false;
      }

      const token = event.headers!["Authorization"].replace("Bearer ", "");

      const verified = jwt.verify(token, this.jwtSecretKey);

      if (!verified) {
        return false;
      }

      const decoded = jwtDecode(token);
      const role = (decoded as any).role;

      if (!allowedRoles.includes(role)) {
        return false;
      }

      return true;
    } catch (e) {
      console.log(e);

      return false;
    }
  }
}
