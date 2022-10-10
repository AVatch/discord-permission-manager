import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as sgMail from '@sendgrid/mail';

import axios from 'axios';

admin.initializeApp();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const dispatchEmailOnVerificationCreate = functions.firestore
  .document('/verifications/{verificationId}')
  .onCreate(async (change, context) => {
    const data = change.data();
    const { email, code } = data;

    if (!email || !code) return;

    const msg = {
      from: {
        name: 'eatworks',
        email: 'do_not_reply@eatworks.xyz',
      },
      templateId: process.env.SENDGRID_TEMPLATE_ID!,
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
      await change.ref.update({ didDispatch: true });
    } catch (error: any) {
      functions.logger.error(error);
      if (error.response) functions.logger.error(error.response.body);

      await change.ref.update({ didDispatch: false });
    }
  });

export const updateDiscordRoleOnVerificationUpdate = functions.firestore
  .document('/verifications/{verificationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const shouldRun =
      after.isVerified &&
      !before.isVerified &&
      after.isVerified !== before.isVerified;
    if (!shouldRun) return;

    // Get the roles to assign this email

    const { guildId, userId } = after;

    const roleIds = ['1017164566804840478'];

    // https://discord.com/developers/docs/resources/guild#add-guild-member-role
    // PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}

    await Promise.all(
      roleIds.map(async (roleId: string) => {
        try {
          await axios.put(
            `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
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
