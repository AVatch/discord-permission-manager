import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  sid: string;
  session?: Session;

  get isAdmin() {
    return this.session?.isAdmin ?? false;
  }

  get ready() {
    return ![this.session].includes(undefined);
  }

  // http://localhost:8100/verify?sid=nMsOyKkd3mV8DTlQT9rz
  state: 'email' | 'code' | 'success' | 'failure' = 'email';

  emailFormLoading = false;
  emailForm = new FormGroup({
    email: new FormControl(null, [Validators.required, Validators.email]),
  });
  get emailFormDisabled() {
    return this.emailFormLoading || !this.emailForm.valid;
  }

  codeFormLoading = false;
  codeForm = new FormGroup({
    code: new FormControl(null, [Validators.required]),
  });
  get codeFormDisabled() {
    return this.codeFormLoading || !this.codeForm.valid;
  }

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.resolveAuthSession().then(() => {
      this.resolveNavParams();
      this.loadData();
    });
  }

  resolveNavParams() {
    const params = this.route.snapshot.queryParamMap;
    this.sid = params.get('sid');
  }

  async resolveAuthSession() {
    const auth = getAuth();
    if (!auth.currentUser) await signInAnonymously(auth);
  }

  async loadData() {
    const db = getFirestore();
    const docRef = doc(db, `/sessions/`, this.sid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return;

    const data = snapshot.data() as any;

    this.session = {
      ...data,
      timestamp: data.timestamp.toDate(),
    } as Session;
  }

  async submitEmailForm() {
    if (this.emailFormDisabled) return;

    const functions = getFunctions();
    const callable = httpsCallable(functions, 'dispatchEmailVerificationFn');

    try {
      const response = await callable({
        sid: this.sid!,
        email: this.emailForm.value.email!,
      });

      const responseData = response.data as { ok: boolean; reason?: string };
      console.log({ responseData });

      if (!responseData.ok)
        throw responseData?.reason ?? 'Something went wrong';

      this.state = 'code';
    } catch (err) {
      console.error(err);

      this.state = 'failure';
    }
  }

  async submitCodeForm() {
    if (this.codeFormDisabled) return;

    const functions = getFunctions();
    const callable = httpsCallable(functions, 'verifyEmailCodeFn');

    try {
      const response = await callable({
        sid: this.sid!,
        code: this.codeForm.value.code!,
      });

      const responseData = response.data as { ok: boolean; reason?: string };
      console.log({ responseData });

      if (!responseData.ok)
        throw responseData?.reason ?? 'Something went wrong';

      this.state = 'success';
    } catch (err) {
      console.error(err);

      this.state = 'failure';
    }
  }

  reset() {}
}
