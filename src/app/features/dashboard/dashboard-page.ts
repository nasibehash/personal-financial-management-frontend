import { Component, inject } from '@angular/core';
import { AuthStore } from '../../core/auth-store';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHeader],
  template: `
    <app-page-header
      [title]="'سلام ' + (auth.user()?.fullName ?? '')"
      subtitle="به مدیریت مالی شخصی خوش آمدید."
    />
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthStore);
}
