import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

export const dispatchEmailVerificationFn = functions.https.onCall(
  async (
    data: {
      sid: string;
      email: string;
    },
    context
  ) => {
    const { sid, email } = data;

    const sessionRef = admin.firestore().collection('/sessions').doc(sid);
    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists)
      return { ok: false, reason: 'Session has expired' };

    const code = Math.random().toString().slice(2, 8);

    await admin.firestore().collection('/codes').add({
      sessionId: sid,
      method: 'email',
      code,
      email,
    });

    return { ok: true };
  }
);

export const verifyEmailCodeFn = functions.https.onCall(
  async (
    data: {
      sid: string;
      code: string;
    },
    context
  ) => {
    return { ok: true };
  }
);

export const dispatchEmailOnCodeCreate = functions.firestore
  .document('/codes/{codeId}')
  .onCreate(async (change, context) => {
    const data = change.data();

    if (data.method !== 'email') return;

    functions.logger.info('TODO: Dispatch email');
  });
