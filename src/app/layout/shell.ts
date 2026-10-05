import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth-store';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { path: '/', label: 'داشبورد', exact: true },
  { path: '/transactions', label: 'تراکنش‌ها' },
  { path: '/accounts', label: 'حساب‌ها' },
  { path: '/categories', label: 'دسته‌بندی‌ها' },
  { path: '/reports', label: 'گزارش‌ها' },
  { path: '/goals', label: 'اهداف' },
  { path: '/assistant', label: 'دستیار هوشمند' },
];

/** The layout of the signed-in area: navigation bar, user menu and the page itself. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthStore);
  protected readonly nav = NAV;
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
