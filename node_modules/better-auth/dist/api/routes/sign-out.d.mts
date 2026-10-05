import * as _$better_call0 from "better-call";
import * as z from "zod";

//#region src/api/routes/sign-out.d.ts
declare const signOut: _$better_call0.StrictEndpoint<"/sign-out", {
  method: "POST";
  body: z.ZodOptional<z.ZodObject<{
    callbackURL: z.ZodOptional<z.ZodString>;
    disableRedirect: z.ZodOptional<z.ZodBoolean>;
    state: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>;
  operationId: string;
  requireHeaders: true;
  metadata: {
    openapi: {
      operationId: string;
      description: string;
      responses: {
        "200": {
          description: string;
          content: {
            "application/json": {
              schema: {
                type: "object";
                properties: {
                  success: {
                    type: string;
                  };
                  url: {
                    type: string;
                    description: string;
                  };
                  redirect: {
                    type: string;
                    description: string;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}, {
  success: boolean;
  url: string | undefined;
  redirect: boolean | undefined;
}>;
//#endregion
export { signOut };