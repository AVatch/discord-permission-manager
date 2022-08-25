import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as sgMail from '@sendgrid/mail';

const axios = require('axios').default;

admin.initializeApp();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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

    // TODO: Add a time condition to make sure it was generated recently

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
    const { sid, code } = data;

    //
    // Lookup the code to ensure it is valid

    // TODO: Add a time condition to make sure it was sent recently

    const queryRef = admin
      .firestore()
      .collection('/codes')
      .where('sessionId', '==', sid)
      .where('code', '==', code)
      .limit(1);

    const querySnapshot = await queryRef.get();

    if (querySnapshot.empty)
      return { ok: false, reason: 'Sorry, this code is wrong' };

    const codeDocData = querySnapshot.docs.map((doc) => doc.data())[0];

    //
    // Get the session

    const sessionRef = admin.firestore().collection('/sessions').doc(sid);
    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists)
      return { ok: false, reason: 'Sorry, this code is wrong' };

    const sessionDocData = sessionSnapshot.data();

    const serverId = sessionDocData!.serverId;
    const userId = sessionDocData!.userId;

    //
    // Verify that the email is on the allowlist

    const email = codeDocData.email;

    const validEmail = (
      await admin
        .firestore()
        .collection('/servers')
        .doc(serverId)
        .collection('/allowlist')
        .doc(email)
        .get()
    ).exists;

    if (!validEmail)
      return { ok: false, reason: 'Sorry, this email is not valid.' };

    //
    // Update this discord user's role

    await admin.firestore().collection('/verify').add({
      serverId,
      userId,
      sessionId: sid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  }
);

export const modifyUserRoleOnConfirmCreate = functions.firestore
  .document('/verify/{verifyId}')
  .onCreate(async (change, context) => {
    // https://discord.com/developers/docs/resources/guild#add-guild-member-role
    // PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}

    const data = change.data();
    const { serverId, userId } = data;

    const roleIds: string[] =
      (
        await admin.firestore().collection('/servers').doc(serverId).get()
      ).data()?.roles ?? [];

    await Promise.all(
      roleIds.map(async (roleId) => {
        try {
          await axios.put(
            `https://discord.com/api/v10/guilds/${serverId}/members/${userId}/roles/${roleId}`,
            {},
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            }
          );
        } catch (err) {
          functions.logger.error(err);
        }
      })
    );
  });

export const dispatchEmailOnCodeCreate = functions.firestore
  .document('/codes/{codeId}')
  .onCreate(async (change, context) => {
    const data = change.data();

    const { email, code } = data;

    if (!email || !code) return;

    const msg = {
      from: {
        name: 'eatworks',
        email: 'do_not_reply@eatworks.xyz',
      },
      templateId: 'd-56cc369bcf0a447dad8fb876ec6234dc',
      personalizations: [
        {
          to: [
            {
              email,
            },
          ],
          dynamic_template_data: {
            code,
          },
        },
      ],
    };

    try {
      await sgMail.send(msg);
    } catch (error: any) {
      functions.logger.error(error);

      if (error.response) {
        functions.logger.error(error.response.body);
      }
    }
  });
