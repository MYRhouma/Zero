import { privateProcedure, router } from '../trpc';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const userRouter = router({
  delete: privateProcedure.mutation(async ({ ctx }) => {
    const { success, message } = await ctx.c.var.auth.api.deleteUser({
      body: {
        callbackURL: '/',
      },
      headers: ctx.c.req.raw.headers,
      request: ctx.c.req.raw,
    });
    return { success, message };
  }),
  getIntercomToken: privateProcedure.query(async ({ ctx }) => {
    const intercomSecret = ctx.c.env.INTERCOM_IDENTITY_VERIFICATION_SECRET?.trim();

    // Intercom rejects tokens signed with the app's general JWT secret. The
    // support widget is optional, so do not initialize it until its dedicated
    // identity-verification secret has been configured for this deployment.
    if (!intercomSecret) return null;

    const token = await jwt.sign(
      {
        user_id: ctx.sessionUser.id,
        email: ctx.sessionUser.email,
      },
      intercomSecret,
    );
    return token;
  }),
});
