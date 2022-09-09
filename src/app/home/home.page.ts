import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { guildId, roleId, data } from './data';

interface Session {
  guildId: string;
  userId: string;
  isAdmin?: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const auth = getAuth();
    signInAnonymously(auth)
      .then()
      .catch((err) => console.log(err));
  }

  async setAllowlist() {
    const db = getFirestore();

    await Promise.all(
      data
        .map((email) => email.trim().toLowerCase())
        .map(async (email) => {
          console.log(`setting: ${email}`);
          const ref = doc(db, `/allowlists/${guildId}/emails/${email}`);
          await setDoc(ref, {
            roles: [roleId],
            timestamp: serverTimestamp(),
          });
        })
    );

    console.log('done');
  }
}
