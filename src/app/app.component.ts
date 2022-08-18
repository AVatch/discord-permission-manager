import { Component, isDevMode } from '@angular/core';

import { initializeApp } from 'firebase/app';

import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor() {
    this.initFirebase();
  }

  initFirebase() {
    //
    // initialize firebase

    const app = initializeApp({ ...environment.secrets.firebase });

    //
    // connect analytics for prod

    if (!isDevMode()) getAnalytics(app);

    //
    // connect to emulators in dev environment

    if (environment.useEmulators) {
      // auth
      const auth = getAuth();
      connectAuthEmulator(
        auth,
        `http://${environment.emulators.auth.host}:${environment.emulators.auth.port}`
      );

      // firestore
      const db = getFirestore();
      connectFirestoreEmulator(
        db,
        environment.emulators.firestore.host,
        environment.emulators.firestore.port
      );

      // functions
      const functions = getFunctions(app);
      connectFunctionsEmulator(
        functions,
        environment.emulators.functions.host,
        environment.emulators.functions.port
      );
    }
  }
}
