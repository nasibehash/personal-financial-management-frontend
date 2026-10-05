import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authResponse, setValue, submit } from '../../core/testing';
import { LoginPage } from './login-page';
import { RegisterPage } from './register-page';

const providers = () => [provideHttpClient(), provideHttpClientTesting(), provideRouter([])];

const field = (fixture: ComponentFixture<unknown>, id: string) =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;
const form = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector('form')!;
const text = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('LoginPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async (returnUrl?: string) => {
    TestBed.configureTestingModule({ imports: [LoginPage], providers: providers() });
    const fixture = TestBed.createComponent(LoginPage);
    if (returnUrl) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, navigate, http: TestBed.inject(HttpTestingController) };
  };

  it('does not call the API with an empty or invalid form and shows what is wrong', async () => {
    const { fixture, http } = await setup();

    submit(form(fixture));
    await fixture.whenStable();
    expect(text(fixture)).toContain('یک ایمیل معتبر وارد کنید');
    expect(text(fixture)).toContain('رمز عبور را وارد کنید');

    setValue(field(fixture, 'email'), 'not-an-email');
    setValue(field(fixture, 'password'), 'x');
    submit(form(fixture));
    http.expectNone('/api/auth/login');
  });

  it('signs in and goes to the page the user wanted', async () => {
    const { fixture, navigate, http } = await setup('/goals');
    setValue(field(fixture, 'email'), 'sara@example.com');
    setValue(field(fixture, 'password'), 'Passw0rd123');

    submit(form(fixture));
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'sara@example.com', password: 'Passw0rd123' });
    request.flush(authResponse());
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/goals');
  });

  it('refuses return URLs that leave the app', async () => {
    const { fixture, navigate, http } = await setup('https://evil.example');
    setValue(field(fixture, 'email'), 'sara@example.com');
    setValue(field(fixture, 'password'), 'Passw0rd123');

    submit(form(fixture));
    http.expectOne('/api/auth/login').flush(authResponse());
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the problem when the login fails and lets the user try again', async () => {
    const { fixture, navigate, http } = await setup();
    setValue(field(fixture, 'email'), 'sara@example.com');
    setValue(field(fixture, 'password'), 'wrong');

    submit(form(fixture));
    http
      .expectOne('/api/auth/login')
      .flush({ title: 'Unauthorized.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(text(fixture)).toContain('رمز عبور درست نیست');
    expect(navigate).not.toHaveBeenCalled();
    expect(
      field(fixture, 'password')
        .closest('form')!
        .querySelector<HTMLButtonElement>('button[type=submit]')!.disabled,
    ).toBe(false);
  });
});

describe('RegisterPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({ imports: [RegisterPage], providers: providers() });
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, navigate, http: TestBed.inject(HttpTestingController) };
  };

  const fill = (fixture: ComponentFixture<unknown>, password: string, confirm: string) => {
    setValue(field(fixture, 'fullName'), '  سارا احمدی ');
    setValue(field(fixture, 'email'), 'sara@example.com');
    setValue(field(fixture, 'password'), password);
    setValue(field(fixture, 'confirmPassword'), confirm);
  };

  it('applies the same password rules as the API', async () => {
    const { fixture, http } = await setup();

    for (const weak of ['short1', 'onlyletters', '12345678']) {
      fill(fixture, weak, weak);
      submit(form(fixture));
      http.expectNone('/api/auth/register');
    }
  });

  it('requires both passwords to match', async () => {
    const { fixture, http } = await setup();
    fill(fixture, 'Passw0rd123', 'Passw0rd124');

    submit(form(fixture));
    await fixture.whenStable();

    expect(text(fixture)).toContain('رمزها یکسان نیستند');
    http.expectNone('/api/auth/register');
  });

  it('registers with trimmed values and opens the dashboard', async () => {
    const { fixture, navigate, http } = await setup();
    fill(fixture, 'Passw0rd123', 'Passw0rd123');

    submit(form(fixture));
    const request = http.expectOne('/api/auth/register');
    expect(request.request.body).toEqual({
      fullName: 'سارا احمدی',
      email: 'sara@example.com',
      password: 'Passw0rd123',
    });
    request.flush(authResponse());
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows a conflict from the API, for example an email that is taken', async () => {
    const { fixture, navigate, http } = await setup();
    fill(fixture, 'Passw0rd123', 'Passw0rd123');

    submit(form(fixture));
    http
      .expectOne('/api/auth/register')
      .flush(
        { detail: 'An account with this email already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(text(fixture)).toContain('An account with this email already exists.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
