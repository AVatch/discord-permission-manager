import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
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

  constructor() {}

  submitEmailForm() {
    if (this.emailFormDisabled) return;

    console.log(this.emailForm.value);
  }

  submitCodeForm() {
    if (this.codeFormDisabled) return;

    console.log(this.codeForm.value);
  }

  reset() {}
}
